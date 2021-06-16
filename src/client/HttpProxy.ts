import { IHttpProxy } from "tsrpc-base-client";
import { TsrpcError } from "tsrpc-proto";
import { HttpClientTransportOptions } from "./HttpClient";

/**
 * @internal
 */
export class HttpProxy implements IHttpProxy {
    fetch(options: Parameters<IHttpProxy['fetch']>[0]): ReturnType<IHttpProxy['fetch']> {
        let rs!: (v: { isSucc: true, res: string | Uint8Array } | { isSucc: false, err: TsrpcError }) => void;
        let promise: ReturnType<IHttpProxy['fetch']>['promise'] = new Promise(_rs => {
            rs = _rs;
        })

        let xhr = new XMLHttpRequest();
        if (navigator.userAgent.indexOf('MSIE 8.0;') > -1) {
            //IE8 不支持onload onabort onerror事件
            xhr.onreadystatechange = async () => {
                if (xhr.readyState == 4) {
                    //Network Error
                    if (xhr.status == 0 || (xhr.response == null && xhr.responseText == null)) {
                        rs({
                            isSucc: false,
                            err: new TsrpcError('Network Error', {
                                type: TsrpcError.Type.NetworkError,
                                httpCode: xhr.status
                            })
                        })
                        return;
                    }

                    //IE9 wrongURL 会返回12029
                    if (xhr.status == 12029) {
                        rs({
                            isSucc: false,
                            err: new TsrpcError({
                                message: 'Network Error',
                                type: TsrpcError.Type.NetworkError,
                                httpCode: xhr.status
                            })
                        })
                        return;
                    }

                    // Res
                    rs({
                        isSucc: true,
                        res: options.responseType === 'text' ? xhr.responseText : new Uint8Array(xhr.response as ArrayBuffer)
                    })
                }
            }
        }
        else {
            xhr.onerror = () => {
                rs({
                    isSucc: false,
                    err: new TsrpcError({
                        message: 'Network Error',
                        type: TsrpcError.Type.NetworkError,
                        httpCode: xhr.status
                    })
                });
            }

            // 有的平台 超时不触发onerror
            xhr.ontimeout = () => {
                rs({
                    isSucc: false,
                    err: new TsrpcError({
                        message: 'Request Timeout',
                        type: TsrpcError.Type.NetworkError,
                        code: 'TIMEOUT'
                    })
                });
            }

            // Res
            xhr.onload = async () => {
                rs({
                    isSucc: true,
                    res: options.responseType === 'text' ? xhr.responseText : new Uint8Array(xhr.response as ArrayBuffer)
                })
            }

            let transportOptions = options.transportOptions as HttpClientTransportOptions;
            if (!!transportOptions.onProgress) {
                xhr.upload.onprogress = e => {
                    transportOptions.onProgress?.(e.loaded / e.total);
                }
            }
        }
        xhr.open(options.method, options.url, true);
        if (options.headers) {
            for (let key in options.headers) {
                xhr.setRequestHeader(key, options.headers[key]);
            }
        }
        xhr.responseType = options.responseType;
        let timeout = options.timeout;
        if (timeout) {
            xhr.timeout = timeout;
        }

        let data: string | ArrayBuffer;
        if (typeof options.data === 'string') {
            data = options.data;
        }
        else {
            let buf = options.data;
            if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) {
                data = buf.buffer;
            }
            else {
                data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
            }
        }

        xhr.send(data);

        let abort = xhr.abort.bind(xhr);

        return {
            promise: promise,
            abort: abort
        }
    }

}