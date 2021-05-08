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
exports.HttpClient = void 0;
const tsrpc_base_client_1 = require("tsrpc-base-client");
const tsrpc_proto_1 = require("tsrpc-proto");
/**
 * HTTP Client for TSRPC.
 * It uses XMLHttpRequest to send requests.
 * @typeParam ServiceType - `ServiceType` from generated `proto.ts`
 */
class HttpClient extends tsrpc_base_client_1.BaseClient {
    constructor(proto, options) {
        var _a;
        super(proto, Object.assign(Object.assign({}, defaultHttpClientOptions), options));
        /** @internal */
        this.type = 'SHORT';
        this._jsonServer = this.options.server + (this.options.server.endsWith('/') ? '' : '/');
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.log('TSRPC HTTP Client :', this.options.server);
    }
    _encodeApiReq(service, req, pendingItem) {
        if (this.options.json) {
            if (this.options.jsonPrune) {
                let opPrune = this.tsbuffer.prune(req, pendingItem.service.reqSchemaId);
                if (!opPrune.isSucc) {
                    return opPrune;
                }
                req = opPrune.pruneOutput;
            }
            return {
                isSucc: true,
                buf: JSON.stringify(req)
            };
        }
        else {
            return tsrpc_base_client_1.TransportDataUtil.encodeApiReq(this.tsbuffer, service, req, undefined);
        }
    }
    _encodeClientMsg(service, msg) {
        if (this.options.json) {
            if (this.options.jsonPrune) {
                let opPrune = this.tsbuffer.prune(msg, service.msgSchemaId);
                if (!opPrune.isSucc) {
                    return opPrune;
                }
                msg = opPrune.pruneOutput;
            }
            return {
                isSucc: true,
                buf: JSON.stringify(msg)
            };
        }
        else {
            return tsrpc_base_client_1.TransportDataUtil.encodeClientMsg(this.tsbuffer, service, msg);
        }
    }
    _sendBuf(buf, options, serviceId, pendingApiItem) {
        return __awaiter(this, void 0, void 0, function* () {
            let sn = pendingApiItem === null || pendingApiItem === void 0 ? void 0 : pendingApiItem.sn;
            let promise = new Promise((rs) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                // Pre Flow
                if (!this.options.json) {
                    let pre = yield this.flows.preSendBufferFlow.exec({ buf: buf, sn: pendingApiItem === null || pendingApiItem === void 0 ? void 0 : pendingApiItem.sn }, this.logger);
                    if (!pre) {
                        return;
                    }
                    buf = pre.buf;
                }
                // Do Send
                this.options.debugBuf && ((_a = this.logger) === null || _a === void 0 ? void 0 : _a.debug('[SendBuf]' + (sn ? (' #' + sn) : ''), `length=${buf.length}`, buf));
                let xhr = new XMLHttpRequest();
                if (navigator.userAgent.indexOf('MSIE 8.0;') > -1) {
                    //IE8 不支持onload onabort onerror事件
                    xhr.onreadystatechange = () => __awaiter(this, void 0, void 0, function* () {
                        if (xhr.readyState == 4) {
                            //Network Error
                            if (xhr.status == 0 || (xhr.response == null && xhr.responseText == null)) {
                                rs({
                                    err: new tsrpc_proto_1.TsrpcError('Network Error', {
                                        type: tsrpc_proto_1.TsrpcErrorType.NetworkError,
                                        httpCode: xhr.status
                                    })
                                });
                                return;
                            }
                            //IE9 wrongURL 会返回12029
                            if (xhr.status == 12029) {
                                rs({
                                    err: new tsrpc_proto_1.TsrpcError({
                                        message: 'Network Error',
                                        type: tsrpc_proto_1.TsrpcErrorType.NetworkError,
                                        httpCode: xhr.status
                                    })
                                });
                                return;
                            }
                            // Res
                            rs({});
                            pendingApiItem && this._onApiRes(xhr, pendingApiItem);
                        }
                    });
                }
                else {
                    xhr.onerror = () => {
                        rs({
                            err: new tsrpc_proto_1.TsrpcError({
                                message: 'Network Error',
                                type: tsrpc_proto_1.TsrpcErrorType.NetworkError,
                                httpCode: xhr.status
                            })
                        });
                    };
                    // 有的平台 超时不触发onerror
                    xhr.ontimeout = () => {
                        rs({
                            err: new tsrpc_proto_1.TsrpcError({
                                message: 'Request Timeout',
                                type: tsrpc_proto_1.TsrpcErrorType.NetworkError,
                                code: 'TIMEOUT'
                            })
                        });
                    };
                    if (pendingApiItem) {
                        xhr.onload = () => __awaiter(this, void 0, void 0, function* () {
                            this._onApiRes(xhr, pendingApiItem);
                        });
                    }
                    xhr.onloadend = () => {
                        rs({});
                    };
                    if (options.onProgress) {
                        xhr.upload.onprogress = e => {
                            var _a;
                            (_a = options.onProgress) === null || _a === void 0 ? void 0 : _a.call(options, e.loaded / e.total);
                        };
                    }
                }
                xhr.open('POST', this.options.json ? this._jsonServer + this.serviceMap.id2Service[serviceId].name : this.options.server, true);
                if (this.options.json) {
                    xhr.setRequestHeader('Content-Type', 'application/json');
                }
                xhr.responseType = this.options.json ? 'text' : 'arraybuffer';
                let timeout = (_b = options.timeout) !== null && _b !== void 0 ? _b : this.options.timeout;
                if (timeout) {
                    xhr.timeout = timeout;
                }
                xhr.send(buf);
                if (pendingApiItem) {
                    pendingApiItem.onAbort = () => {
                        xhr.onreadystatechange = null;
                        xhr.abort();
                    };
                }
            }));
            promise.catch().then(() => {
                if (pendingApiItem) {
                    pendingApiItem.onAbort = undefined;
                }
            });
            return promise;
        });
    }
    _onApiRes(xhr, pendingApiItem) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // JSON
            if (this.options.json) {
                let retStr = xhr.responseText;
                let ret;
                try {
                    ret = JSON.parse(retStr);
                }
                catch (e) {
                    ret = {
                        isSucc: false,
                        err: {
                            message: e.message,
                            type: tsrpc_proto_1.TsrpcErrorType.ServerError,
                            responseText: retStr
                        }
                    };
                }
                if (ret.isSucc) {
                    if (this.options.jsonPrune) {
                        let opPrune = this.tsbuffer.prune(ret.res, pendingApiItem.service.resSchemaId);
                        if (opPrune.isSucc) {
                            ret.res = opPrune.pruneOutput;
                        }
                        else {
                            ret = {
                                isSucc: false,
                                err: new tsrpc_proto_1.TsrpcError('Invalid Server Output', {
                                    type: tsrpc_proto_1.TsrpcErrorType.ClientError,
                                    innerErr: opPrune.errMsg
                                })
                            };
                        }
                    }
                }
                else {
                    ret.err = new tsrpc_proto_1.TsrpcError(ret.err);
                }
                (_a = pendingApiItem.onReturn) === null || _a === void 0 ? void 0 : _a.call(pendingApiItem, ret);
            }
            // ArrayBuffer
            else {
                let ab = xhr.response;
                let buf = new Uint8Array(ab);
                this._onRecvBuf(buf, pendingApiItem);
            }
        });
    }
}
exports.HttpClient = HttpClient;
const defaultHttpClientOptions = Object.assign(Object.assign({}, tsrpc_base_client_1.defaultBaseClientOptions), { server: 'http://localhost:3000', json: false, jsonPrune: true });
