import { BaseWsClient, BaseWsClientOptions, defaultBaseWsClientOptions } from "tsrpc-base-client";
import { BaseServiceType, ServiceProto } from "tsrpc-proto";
import { WebSocketProxy } from "./WebSocketProxy";

/**
 * Client for TSRPC WebSocket Server.
 * @typeParam ServiceType - `ServiceType` from generated `proto.ts`
 */
export class WsClient<ServiceType extends BaseServiceType = any> extends BaseWsClient<ServiceType> {

    readonly options!: Readonly<WsClientOptions>;

    constructor(proto: ServiceProto<ServiceType>, options?: Partial<BaseWsClientOptions>) {
        let wsp = new WebSocketProxy();
        super(proto, wsp, {
            ...defaultWsClientOptions,
            ...options
        })
    }

}

const defaultWsClientOptions: WsClientOptions = {
    ...defaultBaseWsClientOptions,
}

export interface WsClientOptions extends BaseWsClientOptions {

}