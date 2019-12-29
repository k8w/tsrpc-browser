import { BaseServiceType, ServiceProto, TsrpcError } from 'tsrpc-proto';
import { Logger } from './models/Logger';
import { ServiceMap, ServiceMapUtil } from './models/ServiceMapUtil';
import { TSBuffer } from 'tsbuffer';
import { Counter } from './models/Counter';
import { TransportDataUtil, ParsedServerOutput } from './models/TransportDataUtil';
import SuperPromise from 'k8w-super-promise';
import { TransportOptions } from './models/TransportOptions';

export class HttpClient<ServiceType extends BaseServiceType = any> {

    private _options: HttpClientOptions<ServiceType>;
    serviceMap: ServiceMap;
    tsbuffer: TSBuffer;
    logger: Logger;

    private _snCounter = new Counter(1);

    constructor(options?: Partial<HttpClientOptions<ServiceType>>) {
        this._options = Object.assign({}, defaultOptions, options);
        this.serviceMap = ServiceMapUtil.getServiceMap(this._options.proto);
        this.tsbuffer = new TSBuffer(this._options.proto.types);
        this.logger = this._options.logger;

        this.logger.log('TSRPC HTTP Client :', this._options.server);
    }

    callApi<T extends keyof ServiceType['req']>(apiName: T, req: ServiceType['req'][T], options: TransportOptions = {}): SuperPromise<ServiceType['res'][T], TsrpcError> {
        // GetService
        let service = this.serviceMap.apiName2Service[apiName as string];
        if (!service) {
            throw new TsrpcError('Invalid api name: ' + apiName, { isClientError: true });
        }

        // Encode
        let buf = TransportDataUtil.encodeApiReq(this.tsbuffer, service, req);
        let sn = this._snCounter.getNext();
        this.logger.log(`[ApiReq] #${sn}`, apiName, req);

        // Send
        return this._sendBuf('api', buf, sn, options).then(resBuf => {
            // Parsed res
            let parsed: ParsedServerOutput;
            try {
                parsed = TransportDataUtil.parseServerOutout(this.tsbuffer, this.serviceMap, resBuf);
            }
            catch (e) {
                this.logger.log(`[ApiErr] #${sn}`, 'parse server output error', e);
                throw new TsrpcError('Parse server output error', { isServerError: true, innerError: e });
            }
            if (parsed.type !== 'api') {
                throw new TsrpcError('Invalid response', { isServerError: true });
            }
            if (parsed.isSucc) {
                this.logger.log(`[ApiRes] #${sn}`, parsed.res)
                return parsed.res;
            }
            else {
                this.logger.log(`[ApiErr] #${sn}`, parsed.error)
                throw new TsrpcError(parsed.error.message, parsed.error.info);
            }
        })
    }

    sendMsg<T extends keyof ServiceType['msg']>(msgName: T, msg: ServiceType['msg'][T], options: TransportOptions = {}): SuperPromise<void, TsrpcError> {
        // GetService
        let service = this.serviceMap.msgName2Service[msgName as string];
        if (!service) {
            throw new TsrpcError('Invalid msg name: ' + msgName, { isClientError: true });
        }

        let buf = TransportDataUtil.encodeMsg(this.tsbuffer, service, msg);
        let sn = this._snCounter.getNext();
        this.logger.log(`[SendMsg] #${sn}`, msgName, msg);

        return this._sendBuf('msg', buf, sn, options).then(() => { })
    }

    protected _sendBuf(type: 'api' | 'msg', buf: Uint8Array, sn: number, options: TransportOptions = {}): SuperPromise<Uint8Array, TsrpcError> {
        let rs: Function, rj: Function, xhr: XMLHttpRequest, isAborted = false;

        let timeout = options.timeout || this._options.timeout;
        let timer: number | undefined;
        let promiseRj: Function;

        let promise = new SuperPromise<Uint8Array, TsrpcError>(async (rs, rj) => {
            promiseRj = rj;
            xhr = new XMLHttpRequest();

            if (navigator.userAgent.indexOf('MSIE 8.0;') > -1) {
                //IE8 不支持onload onabort onerror事件
                xhr.onreadystatechange = async () => {
                    if (xhr.readyState == 4 && !isAborted) {
                        //Network Error
                        if (xhr.status == 0 || (xhr.response == null && xhr.responseText == null)) {
                            setTimeout(() => {
                                rj(new TsrpcError('Network Error', { isNetworkError: true, code: xhr.status }))
                            }, 0)
                            return;
                        }

                        //ApiRes
                        this._resolveBufRes(xhr, sn, rs, rj);
                    }
                }
            }
            else {
                //IE9+, Chrome ...
                xhr.onabort = () => {
                    xhr.onload = xhr.onerror = null as any;
                    if (!promise.isDone) {
                        this.logger.log(`[${type === 'api' ? 'ApiCancel' : 'MsgCancel'}] #${sn}`);
                    }
                }

                xhr.onerror = () => {
                    rj(new TsrpcError('Network Error', { isNetworkError: true, code: xhr.status }));
                    return;
                }

                xhr.onload = async () => {
                    this._resolveBufRes(xhr, sn, rs, rj);
                }
            }

            xhr.open('POST', this._options.server, true);
            xhr.responseType = 'arraybuffer';
            if (timeout) {
                xhr.timeout = timeout;
            }

            xhr.send(buf);
        })

        promise.onCancel(() => {
            isAborted = true;
            xhr.abort();
        });

        // Timeout Timer
        if (timeout) {
            timer = window.setTimeout(() => {
                if (!promise.isCanceled && !promise.isDone) {
                    this.logger.log(`[${type === 'api' ? 'ApiTimeout' : 'MsgTimeout'}] #${sn}`);
                    promiseRj(new TsrpcError('Request Timeout', 'TIMEOUT'));
                    xhr.abort();
                }
            }, timeout);
        }
        promise.then(v => {
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
            return v;
        });
        promise.catch(e => {
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
            throw e;
        })

        return promise;
    }

    private async _resolveBufRes(xhr: XMLHttpRequest, sn: number, rs: Function, rj: Function) {
        //IE9 wrongURL 会返回12029
        if (xhr.status == 12029) {
            rj(new TsrpcError('Network Error', { isNetworkError: true, code: xhr.status }))
            return;
        }

        let buf: ArrayBuffer = xhr.response;
        if (!buf) {
            this.logger.warn(`Response is empty, SN=${sn}`);
            rj(new TsrpcError('Response is empty', { isServerError: true, code: 'EMPTY_RES', httpCode: xhr.status }))
            return;
        }

        rs(new Uint8Array(buf));
    }

}

const defaultOptions: HttpClientOptions<any> = {
    server: 'http://localhost:3000',
    proto: { types: {}, services: [] },
    logger: console
}

export interface HttpClientOptions<ServiceType extends BaseServiceType> {
    server: string;
    proto: ServiceProto<ServiceType>;
    logger: Logger;
    /** API超时时间（毫秒） */
    timeout?: number;
}