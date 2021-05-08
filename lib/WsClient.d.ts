import { BaseClient, TransportOptions, PendingApiItem, BaseClientOptions } from "tsrpc-base-client";
import { BaseServiceType, ServiceProto, TsrpcError } from "tsrpc-proto";
/**
 * WebSocket Client for TSRPC.
 * It uses native `WebSocket` of browser.
 * @typeParam ServiceType - `ServiceType` from generated `proto.ts`
 */
export declare class WsClient<ServiceType extends BaseServiceType> extends BaseClient<ServiceType> {
    /** @internal */
    readonly type = "LONG";
    readonly options: WsClientOptions;
    constructor(proto: ServiceProto<ServiceType>, options?: Partial<WsClientOptions>);
    protected _sendBuf(buf: Uint8Array, options: TransportOptions, serviceId: number, pendingApiItem?: PendingApiItem): Promise<{
        err?: TsrpcError;
    }>;
    get status(): WsClientStatus;
    private _ws?;
    private _promiseConnect?;
    /**
     * Connect to the server
     * @throws never
     */
    connect(): Promise<{
        isSucc: true;
    } | {
        isSucc: false;
        errMsg: string;
    }>;
    private _rsDisconnecting?;
    /**
     * Disconnect immediately
     * @throws never
     */
    disconnect(): Promise<void>;
}
export interface WsClientOptions extends BaseClientOptions {
    /** Server URL, starts with `ws://` or `wss://`. */
    server: string;
    /** Event when connection status is changed */
    onStatusChange?: (newStatus: WsClientStatus) => void;
    /** Event when the connection is closed accidently (not manually closed). */
    onLostConnection?: () => void;
}
export declare enum WsClientStatus {
    Opening = "OPENING",
    Opened = "OPENED",
    Closing = "CLOSING",
    Closed = "CLOSED"
}
//# sourceMappingURL=WsClient.d.ts.map