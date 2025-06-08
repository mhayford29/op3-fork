import { isOptionalString, isString, isStringRecord } from '../check.ts';
import { ErrorInterface, isErrorInterface } from '../errors.ts';
import { ItunesCategory } from '../feed_parser.ts';

export type WorkRecord = FeedWorkRecord | PodcastGuidWorkRecord;

export function isWorkRecord(obj: unknown): obj is WorkRecord {
    return isStringRecord(obj)
        && typeof obj.uuid === 'string'
        && typeof obj.attempt === 'number'
        && (obj.notBeforeInstant === undefined || typeof obj.notBeforeInstant === 'string')
        && typeof obj.kind === 'string'
        && ((obj.kind === 'lookup-pg' && typeof obj.podcastGuid === 'string') || typeof obj.feedUrl === 'string')
        ;
}

interface BaseWorkRecord {
    readonly uuid: string;
    readonly attempt: number;
    readonly notBeforeInstant?: string;
}

export interface FeedWorkRecord extends BaseWorkRecord {
    readonly kind: 'update-feed' | 'lookup-feed' | 'index-items';
    readonly feedUrl: string;
}

export interface PodcastGuidWorkRecord extends BaseWorkRecord {
    readonly kind: 'lookup-pg';
    readonly podcastGuid: string;
}

export interface FeedRecord {
    readonly id: string; // sha256(url)
    readonly url: string; // clean url
    readonly lastNotModifiedInstant?: string // based on lastOkFetch
    readonly lastOkFetch?: FetchInfo;
    readonly lastErrorFetch?: FetchInfo;
    readonly nextUpdateInstant?: string;
    readonly nextUpdateFeedWorkKey?: string;
    readonly state: 'new' | 'failing' | 'succeeding' | 'disabled';
    readonly piFeed?: PodcastIndexFeed;
    readonly piCheckedInstant?: string;
    readonly nextLookupFeedWorkKey?: string;
    readonly relevantUrls?: Record<string, string>;  // jpath string (image.0.url): <op3 url>
    readonly showUuid?: string;
    readonly title?: string;
    readonly podcastGuid?: string;
    readonly created?: string; // instant
    readonly updated?: string; // instant
    readonly generator?: string;
    readonly link?: string;
    readonly itunesAuthor?: string;
    readonly itunesType?: string;
    readonly itunesCategories?: ItunesCategory[];
    readonly medium?: string;
    readonly itemFilters?: string[]; // only include items with enclosures meeting the filter e.g. /example.com/path/prefix/
}

export function isFeedRecord(obj: unknown): obj is FeedRecord {
    return isStringRecord(obj)
        && typeof obj.id === 'string'
        && typeof obj.url === 'string'
        && (obj.lastNotModifiedInstant === undefined || typeof obj.lastNotModifiedInstant === 'string')
        && (obj.lastOkFetch === undefined || isFetchInfo(obj.lastOkFetch))
        && (obj.lastErrorFetch === undefined || isFetchInfo(obj.lastErrorFetch))
        && (obj.nextUpdateInstant === undefined || typeof obj.nextUpdateInstant === 'string')
        && (obj.nextUpdateFeedWorkKey === undefined || typeof obj.nextUpdateFeedWorkKey === 'string')
        && typeof obj.state === 'string'
        && (obj.piFeed === undefined || isPodcastIndexFeed(obj.piFeed))
        && (obj.piCheckedInstant === undefined || typeof obj.piCheckedInstant === 'string')
        && (obj.nextLookupFeedWorkKey === undefined || typeof obj.nextLookupFeedWorkKey === 'string')
        && (obj.relevantUrls === undefined || isStringRecord(obj.relevantUrls) && Object.values(obj.relevantUrls).every(v => typeof v === 'string'))
        && (obj.showUuid === undefined || typeof obj.showUuid === 'string')
        && (obj.title === undefined || typeof obj.title === 'string')
        && (obj.podcastGuid === undefined || typeof obj.podcastGuid === 'string')
        && (obj.created === undefined || typeof obj.created === 'string')
        && (obj.updated === undefined || typeof obj.updated === 'string')
        && (obj.generator === undefined || typeof obj.generator === 'string')
        // && (obj.link === undefined || typeof obj.link === 'string')
        // && (obj.itunesAuthor === undefined || typeof obj.itunesAuthor === 'string')
        // && (obj.itunesType === undefined || typeof obj.itunesType === 'string')
        // && (obj.itunesCategories === undefined || Array.isArray(obj.itunesCategories) && obj.itunesCategories.every(isItunesCategory))
        && (obj.medium === undefined || typeof obj.medium === 'string')
        && (obj.itemFilters === undefined || Array.isArray(obj.itemFilters) && obj.itemFilters.every(v => typeof v === 'string'))
        ;
}

export interface FetchInfo {
    readonly requestInstant: string; // instant
    readonly responseInstant: string; // instant
    readonly status?: number;
    readonly headers?: string[][];
    readonly body?: string; // r2 pointer, or storage if small enough?
    readonly bodyLength?: number; // since we're buffering
    readonly error?: ErrorInterface;
    readonly responses?: ResponseInfo[];
    readonly log?: string[];
}

export function isFetchInfo(obj: unknown): obj is FetchInfo {
    return isStringRecord(obj)
        && typeof obj.requestInstant === 'string'
        && typeof obj.responseInstant === 'string'
        && (obj.status === undefined || typeof obj.status === 'number')
        && (obj.headers === undefined || Array.isArray(obj.headers) && obj.headers.every(v => Array.isArray(v) && v.every(w => typeof w === 'string')))
        && (obj.body === undefined || typeof obj.body === 'string')
        && (obj.bodyLength === undefined || typeof obj.bodyLength === 'number')
        && (obj.error === undefined || isErrorInterface(obj.error))
        && (obj.responses === undefined || Array.isArray(obj.responses) && obj.responses.every(isResponseInfo))
        && (obj.log === undefined || Array.isArray(obj.log) && obj.log.every(isString))
        ;
}

export interface ResponseInfo {
    readonly url: string;
    readonly status: number;
    readonly fetcher?: string;
}

export function isResponseInfo(obj: unknown): obj is ResponseInfo {
    return isStringRecord(obj)
        && typeof obj.url === 'string'
        && typeof obj.status === 'number'
        && (obj.fetcher === undefined || typeof obj.fetcher === 'string')
        ;
}

export function getHeader(headers: Headers | string[][] | undefined, name: string): string | undefined {
    if (headers === undefined) return undefined;
    const nameLower = name.toLowerCase();
    if (Array.isArray(headers)) {
        const rt = headers.find(v => v[0].toLowerCase() === nameLower);
        return rt ? rt[1] : undefined;
    }
    return headers.get(name) ?? undefined;
}

export interface PodcastIndexFeed {
    readonly id: number;
    readonly url: string;
    readonly podcastGuid?: string;
}

export function isPodcastIndexFeed(obj: unknown): obj is PodcastIndexFeed {
    return isStringRecord(obj)
        && typeof obj.id === 'number'
        && typeof obj.url === 'string'
        && (obj.podcastGuid === undefined || typeof obj.podcastGuid === 'string')
        ;
}

export interface FeedItemRecord {
    readonly feedRecordId: string; // fk
    readonly id: string; // sha256(trimmed guid node value)
    readonly guid: string; // non-empty raw guid substring to 8k
    readonly title?: string;
    readonly pubdate?: string;
    readonly pubdateInstant?: string;
    readonly firstSeenInstant: string;
    readonly lastSeenInstant: string;
    readonly lastOkFetch?: FetchInfo;
    readonly relevantUrls: Record<string, string>; // tiny jpath string (e.0.url or ae.0.s.0.uri) -> op3 url
    readonly hasTranscripts?: boolean;
}

export function isFeedItemRecord(obj: unknown): obj is FeedItemRecord {
    return isStringRecord(obj)
        && typeof obj.feedRecordId === 'string'
        && typeof obj.id === 'string'
        && typeof obj.guid === 'string'
        && (obj.title === undefined || typeof obj.title === 'string')
        && (obj.pubdate === undefined || typeof obj.pubdate === 'string')
        && (obj.pubdateInstant === undefined || typeof obj.pubdateInstant === 'string')
        && typeof obj.firstSeenInstant === 'string'
        && typeof obj.lastSeenInstant === 'string'
        && (obj.lastOkFetch === undefined || isFetchInfo(obj.lastOkFetch))
        && isStringRecord(obj.relevantUrls) && Object.values(obj.relevantUrls).every(v => typeof v === 'string')
        && (obj.hasTranscripts === undefined || typeof obj.hasTranscripts === 'boolean')
        ;
}

export interface ShowgroupRecord {
    readonly id: string; // unique immutable readable tag
    readonly showUuidWeights: Record<string, number>; // key=show-uuid  if multiple matches but within the same showgroup, pick the show with the highest value here
}

export function isShowgroupRecord(obj: unknown): obj is ShowgroupRecord {
    return isStringRecord(obj)
        && typeof obj.id === 'string' && isValidShowgroupId(obj.id)
        && isStringRecord(obj.showUuidWeights) && Object.values(obj.showUuidWeights).every(v => typeof v === 'number')
        ;
}

export function isValidShowgroupId(id: string): boolean {
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id);
}

export interface ShowRecord {
    readonly uuid: string;
    readonly podcastGuid?: string;
    readonly title?: string;
    readonly link?: string;
    readonly itunesAuthor?: string;
    readonly medium?: string;
}

export function isShowRecord(obj: unknown): obj is ShowRecord {
    return isStringRecord(obj)
        && typeof obj.uuid === 'string'
        && isOptionalString(obj.podcastGuid)
        && isOptionalString(obj.title)
        && isOptionalString(obj.link)
        && isOptionalString(obj.itunesAuthor)
        && isOptionalString(obj.medium)
        ;
}

export interface EpisodeRecord {
    readonly showUuid: string;
    readonly id: string; // sha256(itemGuid)
    readonly itemGuid: string; // trimmed substring 8k, must be non-empty unique within the show
    readonly title?: string;
    readonly pubdate?: string;
    readonly pubdateInstant?: string;
    readonly firstSeenInstant?: string;
    readonly lastSeenInstant?: string;
    readonly hasTranscripts?: boolean;
}

export function isEpisodeRecord(obj: unknown): obj is EpisodeRecord {
    return isStringRecord(obj)
        && typeof obj.showUuid === 'string'
        && typeof obj.id === 'string'
        && typeof obj.itemGuid === 'string'
        && (obj.title === undefined || typeof obj.title === 'string')
        && (obj.pubdate === undefined || typeof obj.pubdate === 'string')
        && (obj.pubdateInstant === undefined || typeof obj.pubdateInstant === 'string')
        && (obj.firstSeenInstant === undefined || typeof obj.firstSeenInstant === 'string')
        && (obj.lastSeenInstant === undefined || typeof obj.lastSeenInstant === 'string')
        && (obj.hasTranscripts === undefined || typeof obj.hasTranscripts === 'boolean')
        ;
}

export interface FeedItemIndexRecord {
    readonly feedItemRecordKey: string;
}

export function isFeedItemIndexRecord(obj: unknown): obj is FeedItemIndexRecord {
    return isStringRecord(obj)
        && typeof obj.feedItemRecordKey === 'string'
        ;
}

export interface MediaUrlIndexRecord {
    readonly url: string;
    readonly updateInstant: string;
    readonly error?: string;
    readonly responseInstant?: string;
    readonly responseHeaders?: [string, string][];
    readonly redirectUrls?: string[]; // may not be comprehensive, filtered to op3 references only
    readonly refetch?: string;
}

export function isMediaUrlIndexRecord(obj: unknown): obj is MediaUrlIndexRecord {
    return isStringRecord(obj)
        && typeof obj.url === 'string'
        && typeof obj.updateInstant === 'string'
        && (obj.error === undefined || typeof obj.error === 'string')
        && (obj.responseInstant === undefined || typeof obj.responseInstant === 'string')
        && (obj.responseHeaders === undefined || Array.isArray(obj.responseHeaders) && obj.responseHeaders.every(v => Array.isArray(v) && v.length === 2 && v.every(w => typeof w === 'string')))
        && (obj.redirectUrls === undefined || Array.isArray(obj.redirectUrls) && obj.redirectUrls.every(v => typeof v === 'string'))
        && (obj.refetch === undefined || typeof obj.refetch === 'string')
        ;
}

export interface ShowEpisodesByPubdateIndexRecord {
    // show-level
    readonly showUuid: string;
    readonly podcastGuid?: string;
    // item-level
    readonly episodeId: string;
    readonly itemGuid: string;
    readonly pubdateInstant: string;
    readonly hasTranscripts?: boolean;
}

export function isShowEpisodesByPubdateIndexRecord(obj: unknown): obj is ShowEpisodesByPubdateIndexRecord {
    return isStringRecord(obj)
        && typeof obj.showUuid === 'string'
        && (obj.podcastGuid === undefined || typeof obj.podcastGuid === 'string')
        && typeof obj.episodeId === 'string'
        && typeof obj.itemGuid === 'string'
        && typeof obj.pubdateInstant === 'string'
        && (obj.hasTranscripts === undefined || typeof obj.hasTranscripts === 'boolean')
        ;
}

export interface ShowPartitionsRecord {
    readonly partitions: Record<string, string>; // key=show-uuid  value=partition-id
}

export function isShowPartitionsRecord(obj: unknown): obj is ShowPartitionsRecord {
    return isStringRecord(obj)
        && isStringRecord(obj.partitions) && Object.values(obj.partitions).every(v => typeof v === 'string')
        ;
}

export const isValidPartition = (str: string) => /^[a-z0-9-]+$/.test(str);
