export function initTracer(tracer: (event: TraceEvent) => void) {
    if (_tracer) return;
    _tracer = tracer;
}

export function writeTraceEvent(event: TraceEvent | (() => TraceEvent)) {
    if (!_tracer) return;
    let ev: TraceEvent;
    try {
        ev = typeof event === 'function' ? event() : event;
    } catch (e) {
        // tracing should never throw
        ev = { kind: 'error-computing-trace-event', error: `${(e as Error).stack || e}` };
    }
    try {
        _tracer(ev);
    } catch (e) {
        // tracing should never throw
        console.warn(`writeTraceEvent: Error writing ${ev.kind} event to tracer: ${(e as Error).stack || e}`);
    }
}

export function consoleInfo(spot: string, message: string) {
    console.info(message);
    writeTraceEvent({ kind: 'console-info', spot, message });
}

export function consoleWarn(spot: string, message: string) {
    console.warn(message);
    writeTraceEvent({ kind: 'console-warning', spot, message });
}

export function consoleError(spot: string, message: string) {
    console.error(message);
    writeTraceEvent({ kind: 'console-error', spot, message });
}

//

let _tracer: undefined | ((event: TraceEvent) => void) = undefined;

//

export type TraceEvent = 
    ErrorSavingRedirect
    | ValidRedirect
    | InvalidRedirect
    | BannedRedirect
    | ErrorComputingTraceEvent
    | WorkerRequest
    | DurableObjectFetchRequest
    | DurableObjectAlarmRequest
    | ConsoleInfo
    | ConsoleWarning
    | ConsoleError
    | AdminDataJob
    | Generic
    | StorageWrite
    | HitsBatch
    ;

export interface ErrorSavingRedirect {
    readonly kind: 'error-saving-redirect';
    readonly colo: string;
    readonly error: string;
    readonly country: string;
    readonly uuids: readonly string[];
}

interface Redirect {
    readonly colo: string;
    readonly url: string;
    readonly country: string;
    readonly destinationHostname: string;
    readonly userAgent: string;
    readonly referer: string;
    readonly hasForwarded: boolean;
    readonly hasXForwardedFor: boolean;
    readonly usedXForwardedFor: boolean;
    readonly ipAddressShape: string;
    readonly ipAddressVersion: 0 | 4 | 6;
    readonly ipAddressKnown?: string;
    readonly errors: string[];
    readonly asn?: number;
    readonly apVersion?: number;
    readonly cfVersion?: number;
    readonly dwVersion?: number;
    readonly timeUuid?: string; // <instant>-<uuid>
    readonly botType?: string;
    readonly hashedIpAddress?: string;
    readonly hashedIpAddressForDownload?: string;
    readonly audienceIdDownloadId?: string; // <audienceid>-<downloadid>
    readonly audienceIdDownloadId2?: string; // <audienceid>-<downloadid>
    readonly agentTypeAgentName?: string; // <agentType>-<agentName> // maxtype: bot-library maxname: (312) Mozilla/5.0 (Linux armv7l) AppleWebKit/602.1.28+ (KHTML, like Gecko) Version/9.1 Safari/601.5.17 WPE/2.22.1, VirginMedia_STB_/VIP5002W-mon-web-03.02-169-ac-AL-20230513204624-na001 (Arris_liberty,VIP5002W-PRD,Wireless) HZN/5.04 (MN=VIP5002W-PRD;PC=APLSTB;FV=VIP5002W-mon-web-03.02-169-ac-AL-20230513204624-na001;)
    readonly deviceTypeDeviceName?: string; // <deviceType>-<deviceName> // maxtype: smart_speaker   maxname: Amazon Smart Speaker
    readonly referrerTypeReferrerName?: string; // <referrerType>-<referrerName> // maxtype: domain  maxname: (unlimited) unknown:[http://localhost:...]
    readonly regionCodeRegionName?: string; // <regionCode>-<regionName>  // code: [0-9A-Z]{1,3}  maxname: Administrative-Territorial Units of the Left Bank of the Dniester
    readonly timezone?: string, // max: America/Argentina/Buenos_Aires
    readonly metroCode?: string, // [0-9]{3}
    readonly cfWorker?: string, // https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-worker
}

export interface ValidRedirect extends Redirect {
    readonly kind: 'valid-redirect';
}

export interface InvalidRedirect extends Redirect {
    readonly kind: 'invalid-redirect';
}

export interface BannedRedirect extends Redirect {
    readonly kind: 'banned-redirect';
}

export interface ErrorComputingTraceEvent {
    readonly kind: 'error-computing-trace-event';
    readonly error: string;
}

export interface WorkerRequest {
    readonly kind: 'worker-request';
    readonly colo: string;
    readonly pathname: string;
    readonly search: string;
    readonly country: string;
    readonly method: string;
    readonly userAgent?: string;
    readonly millis: number;
    readonly status: number;
    readonly contentType: string;
    readonly asn?: number;
}

export interface DurableObjectFetchRequest {
    readonly kind: 'do-fetch';
    readonly colo: string;
    readonly durableObjectName: string;
    readonly durableObjectId: string;
    readonly durableObjectClass: string;
    readonly isolateId: string;
    readonly method: string;
    readonly pathname: string;
}

export interface DurableObjectAlarmRequest {
    readonly kind: 'do-alarm';
    readonly colo: string;
    readonly durableObjectName: string;
    readonly durableObjectId: string;
    readonly durableObjectClass: string;
    readonly isolateId: string;
}

export interface ConsoleInfo {
    readonly kind: 'console-info';
    readonly spot: string;
    readonly message: string;
}

export interface ConsoleWarning {
    readonly kind: 'console-warning';
    readonly spot: string;
    readonly message: string;
}

export interface ConsoleError {
    readonly kind: 'console-error';
    readonly spot: string;
    readonly message: string;
}

export interface AdminDataJob {
    readonly kind: 'admin-data-job';
    readonly colo: string;
    readonly messageId: string;
    readonly messageInstant: string;
    readonly operationKind: 'select' | 'delete' | 'update';
    readonly targetPath: string;
    readonly parameters?: Record<string, string>;
    readonly dryRun?: boolean;
    readonly millis: number;
    readonly results?: unknown[];
    readonly message?: string;
}

export interface Generic {
    readonly kind: 'generic';
    readonly type: string;
    readonly strings?: string[];
    readonly doubles?: number[];
}

export interface StorageWrite {
    readonly kind: 'storage-write';
    readonly durableObjectName: string;
    readonly spot: string;
    readonly alarms?: number;
}

export interface HitsBatch {
    readonly kind: 'hits-batch';
    readonly strings: string[];
    readonly doubles: number[];
}
