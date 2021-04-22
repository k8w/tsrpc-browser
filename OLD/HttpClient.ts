import { BaseServiceType, ServiceProto, TsrpcError } from 'tsrpc-proto';
import { Logger } from './models/Logger';
import { ServiceMap, ServiceMapUtil } from '../src/models/ServiceMapUtil';
import { TSBuffer } from 'tsbuffer';
import { Counter } from '../src/models/Counter';
import { TransportDataUtil, ParsedServerOutput } from '../src/models/TransportDataUtil';
import SuperPromise from 'k8w-super-promise';
import { TransportOptions } from '../src/models/TransportOptions';

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
                throw new TsrpcError('Parse server output error', { isServerError: true, innerError: e, resBuf: resBuf });
            }
            if (parsed.type !== 'api') {
                throw new TsrpcError('Invalid response', { isServerError: true, parsed: parsed });
            }

            // succ or error
            if (parsed.isSucc) {
                this.logger.log(`[ApiRes] #${sn}`, apiName, parsed.res)
                return parsed.res;
            }
            else {
                throw new TsrpcError(parsed.error.message, parsed.error.info);
            }
        }).catch(e => {
            // 统一报错
            this.logger.log(`[ApiErr] #${sn}`, apiName, e?.message, e?.info);
            throw e;
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

        this._options.debugBuf && this.logger.debug('[SendBuf]', '#' + sn, buf);
        if (this._options.encrypter) {
            buf = this._options.encrypter(buf);
        }
        this._options.debugBuf && this.logger.debug('[EncryptedBuf]', '#' + sn, buf);

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
                }

                // 有的平台 超时不触发onerror
                xhr.ontimeout = () => {
                    rj(new TsrpcError('Network Error', { isNetworkError: true, code: 'TIMEOUT' }));
                }

                xhr.onload = async () => {
                    this._resolveBufRes(xhr, sn, rs, rj);
                }

                if (options.onProgress) {
                    xhr.upload.onprogress = e => {
                        options.onProgress?.(e.loaded / e.total);
                    }
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
                    promiseRj(new TsrpcError('Network Error', { isNetworkError: true, code: 'TIMEOUT' }));
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

        let ab: ArrayBuffer = xhr.response;
        if (!ab) {
            this.logger.warn(`Response is empty, SN=${sn}`);
            rj(new TsrpcError('Response is empty', { isServerError: true, code: 'EMPTY_RES', httpCode: xhr.status }))
            return;
        }
        let buf = new Uint8Array(ab);

        // Decrypt
        this._options.debugBuf && this.logger.debug('[RecvBuf]', '#' + sn, buf);
        if (this._options.decrypter) {
            buf = this._options.decrypter(buf);
        }
        this._options.debugBuf && this.logger.debug('[DecryptedBuf]', '#' + sn, buf);

        rs(buf);
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

    // 加密选项
    encrypter?: (src: Uint8Array) => Uint8Array;
    decrypter?: (cipher: Uint8Array) => Uint8Array;
    /** 为true时将会把buf信息打印在log中 */
    debugBuf?: boolean
}