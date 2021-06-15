import { IWebSocketProxy } from "tsrpc-base-client";
import { TsrpcError } from "tsrpc-proto";

/**
 * @internal
 */
export class WebSocketProxy implements IWebSocketProxy {
    options!: IWebSocketProxy['options'];

    private _ws?: WebSocket;
    connect(server: string): void {
        this._ws = new WebSocket(server);
        this._ws.binaryType = 'arraybuffer';

        this._ws.onopen = this.options.onOpen;
        this._ws.onclose = e => {
            this.options.onClose(e.code, e.reason);
            this._ws = undefined;
        }
        this._ws.onmessage = e => {
            if (e.data instanceof ArrayBuffer) {
                this.options.onMessage(new Uint8Array(e.data));
            }
            else if (typeof e.data === 'string') {
                this.options.onMessage(e.data);
            }
            else {
                this.options.logger?.warn('[Unresolved Recv]', e.data)
            }
        }
    }
    close(code?: number, reason?: string): void {
        this._ws?.close(code, reason);
        this._ws = undefined;
    }
    async send(data: string | Uint8Array): Promise<{ err?: TsrpcError | undefined; }> {
        try {
            this._ws!.send(data);
            return {};
        }
        catch (err) {
            return {
                err: new TsrpcError('Network Error', {
                    code: 'SEND_BUF_ERR',
                    type: TsrpcError.Type.NetworkError,
                    innerErr: err
                })
            }
        }
    }

}