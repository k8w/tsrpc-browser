"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsClientStatus = exports.WsClient = void 0;
const tsrpc_base_client_1 = require("tsrpc-base-client");
const tsrpc_proto_1 = require("tsrpc-proto");
/**
 * WebSocket Client for TSRPC.
 * It uses native `WebSocket` of browser.
 * @typeParam ServiceType - `ServiceType` from generated `proto.ts`
 */
class WsClient extends tsrpc_base_client_1.BaseClient {
    constructor(proto, options) {
        var _a;
        super(proto, Object.assign(Object.assign({}, defaultWsClientOptions), options));
        /** @internal */
        this.type = 'LONG';
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.log('TSRPC WebSocket Client :', this.options.server);
    }
    _sendBuf(buf, options, serviceId, pendingApiItem) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Pre Flow
            let pre = yield this.flows.preSendBufferFlow.exec({ buf: buf, sn: pendingApiItem === null || pendingApiItem === void 0 ? void 0 : pendingApiItem.sn }, this.logger);
            if (!pre) {
                return {};
            }
            buf = pre.buf;
            if (!this._ws) {
                return {
                    err: new tsrpc_proto_1.TsrpcError('WebSocket is not connected', {
                        code: 'WS_NOT_OPEN',
                        type: tsrpc_proto_1.TsrpcErrorType.ClientError
                    })
                };
            }
            // Do Send
            this.options.debugBuf && ((_a = this.logger) === null || _a === void 0 ? void 0 : _a.debug('[SendBuf]' + (pendingApiItem ? (' #' + pendingApiItem.sn) : ''), `length=${buf.byteLength}`, buf));
            this._ws.send(buf);
            return {};
        });
    }
    get status() {
        if (this._promiseConnect) {
            return WsClientStatus.Opening;
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
    /**
     * Connect to the server
     * @throws never
     */
    connect() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
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
            (_a = this.logger) === null || _a === void 0 ? void 0 : _a.log(`Start connecting ${this.options.server}...`);
            this._promiseConnect = new Promise(rs => {
                ws.onopen = () => {
                    var _a, _b, _c;
                    this._promiseConnect = undefined;
                    ws.onopen = null;
                    this._ws = ws;
                    (_a = this.logger) === null || _a === void 0 ? void 0 : _a.log('Connected succ');
                    rs({ isSucc: true });
                    (_c = (_b = this.options).onStatusChange) === null || _c === void 0 ? void 0 : _c.call(_b, WsClientStatus.Opened);
                };
                ws.onerror = e => {
                    var _a;
                    (_a = this.logger) === null || _a === void 0 ? void 0 : _a.error('[WebSocket Error]', e);
                    // 还在连接中，则连接失败
                    if (this._promiseConnect) {
                        this._promiseConnect = undefined;
                        rs({
                            isSucc: false,
                            errMsg: 'WebSocket Connect Error'
                        });
                    }
                };
                ws.onclose = e => {
                    var _a, _b, _c, _d, _e, _f;
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
                    (_b = (_a = this.options).onStatusChange) === null || _b === void 0 ? void 0 : _b.call(_a, WsClientStatus.Closed);
                    if (this._rsDisconnecting) {
                        this._rsDisconnecting();
                        this._rsDisconnecting = undefined;
                        (_c = this.logger) === null || _c === void 0 ? void 0 : _c.log('Disconnected succ', `code=${e.code} reason=${e.reason}`);
                    }
                    // 已连接上 非主动关闭 触发掉线
                    else {
                        (_d = this.logger) === null || _d === void 0 ? void 0 : _d.log(`Lost connection to ${this.options.server}`, `code=${e.code} reason=${e.reason}`);
                        (_f = (_e = this.options).onLostConnection) === null || _f === void 0 ? void 0 : _f.call(_e);
                    }
                };
            });
            ws.onmessage = e => {
                var _a;
                if (e.data instanceof ArrayBuffer) {
                    this._onRecvBuf(new Uint8Array(e.data));
                }
                else {
                    (_a = this.logger) === null || _a === void 0 ? void 0 : _a.log('[Unresolved Recv]', e.data);
                }
            };
            (_c = (_b = this.options).onStatusChange) === null || _c === void 0 ? void 0 : _c.call(_b, WsClientStatus.Opening);
            return this._promiseConnect;
        });
    }
    /**
     * Disconnect immediately
     * @throws never
     */
    disconnect() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            // 连接不存在
            if (!this._ws) {
                return;
            }
            (_a = this.logger) === null || _a === void 0 ? void 0 : _a.log('Disconnecting...');
            (_c = (_b = this.options).onStatusChange) === null || _c === void 0 ? void 0 : _c.call(_b, WsClientStatus.Closing);
            return new Promise(rs => {
                this._rsDisconnecting = rs;
                this._ws.close();
            });
        });
    }
}
exports.WsClient = WsClient;
const defaultWsClientOptions = Object.assign(Object.assign({}, tsrpc_base_client_1.defaultBaseClientOptions), { server: 'ws://localhost:3000' });
var WsClientStatus;
(function (WsClientStatus) {
    WsClientStatus["Opening"] = "OPENING";
    WsClientStatus["Opened"] = "OPENED";
    WsClientStatus["Closing"] = "CLOSING";
    WsClientStatus["Closed"] = "CLOSED";
})(WsClientStatus = exports.WsClientStatus || (exports.WsClientStatus = {}));
