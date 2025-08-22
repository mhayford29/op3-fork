import { isStringRecord } from "./check.ts";
import { Bytes } from "./deps.ts";
import { StatusError } from "./errors.ts";
import { sleep } from "./sleep.ts";

export class PodcastIndexClient {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly userAgent: string;

  private lastCallTime = 0;

  constructor({
    apiKey,
    apiSecret,
    userAgent,
  }: {
    apiKey: string;
    apiSecret: string;
    userAgent: string;
  }) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.userAgent = userAgent;
  }

  static of(opts: {
    userAgent: string;
    podcastIndexCredentials: string | undefined;
  }): PodcastIndexClient | undefined {
    const { userAgent, podcastIndexCredentials } = opts;
    function parseCreds(s = "") {
      const i = s.indexOf(":");
      if (i < 0) return null;
      const apiKey = s.slice(0, i).trim();
      const apiSecret = s.slice(i + 1).trim();
      return apiKey && apiSecret ? [s, apiKey, apiSecret] : null;
    }
    const m = parseCreds(podcastIndexCredentials);
    console.warn({ userAgent, m });
    if (m) {
      const [_, apiKey, apiSecret] = m;
      return new PodcastIndexClient({ apiKey, apiSecret, userAgent });
    }
  }


  async searchPodcastsByTerm(q: string): Promise<SearchPodcastsByTermResponse> {
    const u = new URL("https://api.podcastindex.org/api/1.0/search/byterm");
    u.searchParams.set("q", q);
    return await this.makeApiCall(u, checkSearchPodcastsByTermResponse);
  }

  async getPodcastByFeedId(id: number): Promise<GetPodcastResponse> {
    const u = new URL("https://api.podcastindex.org/api/1.0/podcasts/byfeedid");
    u.searchParams.set("id", id.toString());
    return await this.makeApiCall(u, checkGetPodcastResponse);
  }

  async getPodcastByGuid(guid: string): Promise<GetPodcastResponse> {
    const u = new URL("https://api.podcastindex.org/api/1.0/podcasts/byguid");
    u.searchParams.set("guid", guid);
    return await this.makeApiCall(u, checkGetPodcastResponse);
  }

  async getPodcastByFeedUrl(url: string): Promise<GetPodcastResponse> {
    const u = new URL(
      "https://api.podcastindex.org/api/1.0/podcasts/byfeedurl"
    );
    u.searchParams.set("url", url);
    return await this.makeApiCall(u, checkGetPodcastResponse);
  }

  async getEpisodeById(id: number): Promise<GetEpisodeResponse> {
    // https://podcastindex-org.github.io/docs-api/#get-/episodes/byid
    const u = new URL("https://api.podcastindex.org/api/1.0/episodes/byid");
    u.searchParams.set("id", id.toString());
    return await this.makeApiCall(u, checkGetEpisodeResponse);
  }

  //

  private async makeApiCall<T>(
    url: URL,
    responseCheck: (obj: unknown) => obj is T
  ): Promise<T> {
    const time = Math.round(Date.now() / 1000);
    const authorization = (
      await Bytes.ofUtf8(`${this.apiKey}${this.apiSecret}${time}`).sha1()
    ).hex();
    const wait = 500 - (Date.now() - this.lastCallTime);
    if (wait > 0) await sleep(wait);
    const res = await fetch(url.toString(), {
      headers: {
        "user-agent": this.userAgent,
        "x-auth-key": this.apiKey,
        "x-auth-date": time.toString(),
        authorization,
      },
    });
    this.lastCallTime = Date.now();
    if (res.status !== 200) {
      throw new StatusError(await res.text(), res.status);
    }
    const rt = await res.json();
    // console.log(JSON.stringify(rt, undefined, 2));
    if (!responseCheck(rt))
      throw new StatusError(`Unexpected response: ${JSON.stringify(rt)}`);
    return rt;
  }
}

//

export interface GetPodcastResponse {
  readonly status: string; // "true"
  readonly feed: Feed | [];
}

function checkGetPodcastResponse(obj: unknown): obj is GetPodcastResponse {
  if (!isStringRecord(obj))
    throw new StatusError(
      `Unexpected GetPodcastResponse obj: ${JSON.stringify(obj)}`
    );
  const { status, feed } = obj;
  if (status !== "true")
    throw new StatusError(`Unexpected status: ${JSON.stringify(status)}`);
  if (Array.isArray(feed)) {
    if (feed.length !== 0)
      throw new StatusError(`Unexpected feed array: ${JSON.stringify(feed)}`);
  } else {
    checkFeed(feed);
  }
  return true;
}

export interface SearchPodcastsByTermResponse {
  readonly status: string; // "true"
  readonly feeds: readonly Feed[];
  readonly count: number;
}

function checkSearchPodcastsByTermResponse(
  obj: unknown
): obj is SearchPodcastsByTermResponse {
  if (!isStringRecord(obj))
    throw new StatusError(
      `Unexpected SearchPodcastsByTermResponse obj: ${JSON.stringify(obj)}`
    );
  const { status, feeds, count } = obj;
  if (status !== "true")
    throw new StatusError(`Unexpected status: ${JSON.stringify(status)}`);
  if (typeof count !== "number")
    throw new StatusError(`Unexpected count: ${JSON.stringify(count)}`);
  if (!Array.isArray(feeds))
    throw new StatusError(`Unexpected feeds: ${JSON.stringify(feeds)}`);
  if (feeds.length !== count)
    throw new StatusError(
      `Unexpected feeds.length: ${feeds.length}, expected ${count}`
    );
  for (const feed of feeds) {
    checkFeed(feed);
  }
  return true;
}

export interface Feed {
  readonly id: number;
  readonly title: string;
  readonly author: string | null;
  readonly ownerName: string;
  readonly url: string; // feed url
  readonly originalUrl: string; // feed url
  readonly image: string; // url ("The channel-level image element")
  readonly artwork: string; // url ("The seemingly best artwork we can find for the feed. Might be the same as image in most instances")
  readonly podcastGuid?: string; // not set in search!
}

function checkFeed(obj: unknown): obj is Feed {
  if (!isStringRecord(obj))
    throw new StatusError(`Unexpected Feed obj: ${JSON.stringify(obj)}`);
  const { id, title, author, ownerName, url, originalUrl, image, artwork } =
    obj;
  if (typeof id !== "number")
    throw new StatusError(`Unexpected id: ${JSON.stringify(id)}`);
  if (typeof title !== "string")
    throw new StatusError(`Unexpected title: ${JSON.stringify(title)}`);
  if (!(author === null || typeof author === "string"))
    throw new StatusError(`Unexpected author: ${JSON.stringify(author)}`);
  if (typeof ownerName !== "string")
    throw new StatusError(`Unexpected ownerName: ${JSON.stringify(ownerName)}`);
  if (typeof url !== "string")
    throw new StatusError(`Unexpected url: ${JSON.stringify(url)}`);
  if (typeof originalUrl !== "string")
    throw new StatusError(
      `Unexpected originalUrl: ${JSON.stringify(originalUrl)}`
    );
  if (typeof image !== "string")
    throw new StatusError(`Unexpected image: ${JSON.stringify(image)}`);
  if (typeof artwork !== "string")
    throw new StatusError(`Unexpected artwork: ${JSON.stringify(artwork)}`);
  return true;
}

//

export interface GetEpisodeResponse {
  readonly status: string; // "true"
  readonly count?: number; // 0, only present when not found!
  readonly id: string; // "16795089"
  readonly episode: Episode | [];
  readonly description: string; // Found matching item.
}

function checkGetEpisodeResponse(obj: unknown): obj is GetEpisodeResponse {
  if (!isStringRecord(obj))
    throw new StatusError(
      `Unexpected GetEpisodeResponse obj: ${JSON.stringify(obj)}`
    );
  const { status, id, count, episode, description } = obj;
  if (status !== "true")
    throw new StatusError(`Unexpected status: ${JSON.stringify(status)}`);
  if (typeof id !== "string")
    throw new StatusError(`Unexpected id: ${JSON.stringify(id)}`);
  if (count !== undefined && count !== count)
    throw new StatusError(`Unexpected count: ${JSON.stringify(count)}`);
  if (
    !((Array.isArray(episode) && episode.length === 0) || checkEpisode(episode))
  )
    throw new Error();
  if (typeof description !== "string")
    throw new StatusError(
      `Unexpected description: ${JSON.stringify(description)}`
    );
  return true;
}

export type Episode = Record<string, unknown>; // TODO fill out when needed

function checkEpisode(obj: unknown): obj is Episode {
  if (!isStringRecord(obj))
    throw new StatusError(`Unexpected Episode obj: ${JSON.stringify(obj)}`);
  return true;
}
