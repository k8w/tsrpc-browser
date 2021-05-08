import { BaseClient, TransportOptions, PendingApiItem, defaultBaseClientOptions, BaseClientOptions } from "tsrpc-base-client";
import { BaseServiceType, ServiceProto, TsrpcError, TsrpcErrorType } from "tsrpc-proto";

/**
 * WebSocket Client for TSRPC.
 * It uses native `WebSocket` of browser.
 * @typeParam ServiceType - `ServiceType` from generated `proto.ts`
 */
export class WsClient<ServiceType extends BaseServiceType> extends BaseClient<ServiceType> {

    readonly type = 'LONG';

    readonly options!: WsClientOptions;
    constructor(proto: ServiceProto<ServiceType>, options?: Partial<WsClientOptions>) {
        super(proto, {
            ...defaultWsClientOptions,
            ...options
        });
        this.logger?.log('TSRPC WebSocket Client :', this.options.server);
    }

    protected async _sendBuf(buf: Uint8Array, options: TransportOptions, serviceId: number, pendingApiItem?: PendingApiItem): Promise<{ err?: TsrpcError; }> {
        // Pre Flow
        let pre = await this.flows.preSendBufferFlow.exec({ buf: buf, sn: pendingApiItem?.sn }, this.logger);
        if (!pre) {
            return {};
        }
        buf = pre.buf;

        if (!this._ws) {
            return {
                err: new TsrpcError('WebSocket is not connected', {
                    code: 'WS_NOT_OPEN',
                    type: TsrpcErrorType.ClientError
                })
            };
        }

        // Do Send
        this.options.debugBuf && this.logger?.debug('[SendBuf]' + (pendingApiItem ? (' #' + pendingApiItem.sn) : ''), `length=${buf.byteLength}`, buf);
        this._ws.send(buf);
        return {};
    }

    get status(): WsClientStatus {
        if (this._promiseConnect) {
            return WsClientStatus.Opening
        }
        else if (this._ws) {
            if (this._ws.readyState === WebSocket.OPEN) {
                return WsClientStatus.Opened;
            }
            else if (this._ws.readyState === WebSocket.CLOSING) {
                return WsClientStatus.Closing;
            }
        }

        return WsClientStatus.Closed;
    }

    private _ws?: WebSocket;

    private _promiseConnect?: Promise<{ isSucc: true } | { isSucc: false, errMsg: string }>;
    /**
     * Connect to the server
     * @throws never
     */
    async connect(): Promise<{ isSucc: true } | { isSucc: false, errMsg: string }> {
        // 已连接中
        if (this._promiseConnect) {
            return this._promiseConnect;
        }

        // 已连接成功
        if (this._ws) {
            return { isSucc: true };
        }

        let ws = new WebSocket(this.options.server);
        ws.binaryType = 'arraybuffer';
        this.logger?.log(`Start connecting ${this.options.server}...`)
        this._promiseConnect = new Promise<{ isSucc: true } | { isSucc: false, errMsg: string }>(rs => {
            ws.onopen = () => {
                this._promiseConnect = undefined;
                ws.onopen = null;
                this._ws = ws;
                this.logger?.log('Connected succ');
                rs({ isSucc: true });
                this.options.onStatusChange?.(WsClientStatus.Opened);
            };

            ws.onerror = e => {
                this.logger?.error('[WebSocket Error]', e);
                // 还在连接中，则连接失败
                if (this._promiseConnect) {
                    this._promiseConnect = undefined;
                    rs({
                        isSucc: false,
                        errMsg: 'WebSocket Connect Error'
                    });
                }
            }

            ws.onclose = e => {
                if (this._promiseConnect) {
                    this._promiseConnect = undefined;
                    rs({
                        isSucc: false,
                        errMsg: e.reason ? `Error: ${e.reason}` : 'WebSocket closed'
                    });
                }

                // 清空WebSocket Listener
                ws.onopen = ws.onclose = ws.onmessage = ws.onerror = null;
                this._ws = undefined;

                this.options.onStatusChange?.(WsClientStatus.Closed);

                if (this._rsDisconnecting) {
                    this._rsDisconnecting();
                    this._rsDisconnecting = undefined;
                    this.logger?.log('Disconnected succ', `code=${e.code} reason=${e.reason}`);
                }
                // 已连接上 非主动关闭 触发掉线
                else {
                    this.logger?.log(`Lost connection to ${this.options.server}`, `code=${e.code} reason=${e.reason}`);
                    this.options.onLostConnection?.();
                }
            };
        })

        ws.onmessage = e => {
            if (e.data instanceof ArrayBuffer) {
                this._onRecvBuf(new Uint8Array(e.data));
            }
            else {
                this.logger?.log('[Unresolved Recv]', e.data)
            }
        }

        this.options.onStatusChange?.(WsClientStatus.Opening);
        return this._promiseConnect;
    }

    private _rsDisconnecting?: () => void;
    /**
     * Disconnect immediately
     * @throws never
     */
    async disconnect() {
        // 连接不存在
        if (!this._ws) {
            return;
        }

        this.logger?.log('Disconnecting...');
        this.options.onStatusChange?.(WsClientStatus.Closing);
        return new Promise<void>(rs => {
            this._rsDisconnecting = rs;
            this._ws!.close();
        })
    }
}

const defaultWsClientOptions: WsClientOptions = {
    ...defaultBaseClientOptions,
    server: 'ws://localhost:3000'
}

export interface WsClientOptions extends BaseClientOptions {
    /** Server URL, starts with `ws://` or `wss://`. */
    server: string;

    // Events
    /** Event when connection status is changed */
    onStatusChange?: (newStatus: WsClientStatus) => void;
    /** Event when the connection is closed accidently (not manually closed). */
    onLostConnection?: () => void;
}

export enum WsClientStatus {
    Opening = 'OPENING',
    Opened = 'OPENED',
    Closing = 'CLOSING',
    Closed = 'CLOSED'
}