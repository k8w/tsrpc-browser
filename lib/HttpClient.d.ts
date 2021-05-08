import { EncodeOutput } from 'tsbuffer';
import { ApiService, BaseClient, BaseClientOptions, MsgService, PendingApiItem, TransportOptions } from "tsrpc-base-client";
import { BaseServiceType, ServiceProto, TsrpcError } from 'tsrpc-proto';
/**
 * HTTP Client for TSRPC.
 * It uses XMLHttpRequest to send requests.
 * @typeParam ServiceType - `ServiceType` from generated `proto.ts`
 */
export declare class HttpClient<ServiceType extends BaseServiceType> extends BaseClient<ServiceType> {
    /** @internal */
    readonly type = "SHORT";
    private _jsonServer;
    readonly options: HttpClientOptions;
    constructor(proto: ServiceProto<ServiceType>, options?: Partial<HttpClientOptions>);
    protected _encodeApiReq(service: ApiService, req: any, pendingItem: PendingApiItem): EncodeOutput;
    protected _encodeClientMsg(service: MsgService, msg: any): EncodeOutput;
    protected _sendBuf(buf: Uint8Array, options: HttpClientTransportOptions, serviceId: number, pendingApiItem?: PendingApiItem): Promise<{
        err?: TsrpcError | undefined;
    }>;
    private _onApiRes;
}
export interface HttpClientTransportOptions extends TransportOptions {
    /**
     * Event when progress of data sent is changed
     * @param ratio - 0~1
     */
    onProgress: (ratio: number) => void;
}
export interface HttpClientOptions extends BaseClientOptions {
    /** Server URL, starts with `http://` or `https://`. */
    server: string;
    /**
     * Use JSON instead of binary as transfering
     * @defaultValue false
     */
    json: boolean;
    /**
     * Whether to automatically delete excess properties that not defined in the protocol.
     * @defaultValue `true`
     * @internal
     */
    jsonPrune: boolean;
}
//# sourceMappingURL=HttpClient.d.ts.map