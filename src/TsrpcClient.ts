import ClientConfig from './models/ClientConfig';
import { TsrpcPtl, TsrpcError, TsrpcReq, TsrpcRes, ITsrpcClient } from 'tsrpc-protocol';
import SuperPromise from 'k8w-super-promise';
import { DefaultClientConfig } from './models/ClientConfig';
import 'k8w-extend-native';

export default class TsrpcClient implements ITsrpcClient {
    readonly config: ClientConfig;
    private static _sn = 0;

    constructor(config: Partial<ClientConfig> & {
        serverUrl: string
    }) {
        this.config = Object.merge({}, DefaultClientConfig, config);
        //serverUrl统一不用/结尾 因为rpcUrl是/开头的
        this.config.serverUrl = this.config.serverUrl.replace(/\/$/, '');
        this.config.protocolPath = this.config.protocolPath.replace(/\\/g, '/').replace(/\/+$/, '');
    }

    static getLastReqSn(): number {
        return this._sn;
    }

    callApi<Req, Res>(ptl: TsrpcPtl<Req, Res>, req: Req = {} as Req, headers: object = {}): SuperPromise<Res, TsrpcError> {
        let sn = ++TsrpcClient._sn;
        let rpcUrl = this.getPtlUrl(ptl);

        let isPrevented = false;
        let prevent = () => {
            isPrevented = true
        };

        //hook 
        this.onRequest && this.onRequest({
            ptl: ptl,
            req: req,
            prevent: prevent
        });

        if (isPrevented) {
            return new SuperPromise((rs, rj) => { rj(new TsrpcError('Request was prevented', 'REQ_PREVENT')) });
        }

        //debug log
        this.config.showDebugLog && console.debug(`%cApiReq%c #${sn}%c ${rpcUrl}`,
            'border:solid 1px #4ea85f; color: #4ea85f; line-height: 1.5em; padding: 1px 3px;',
            'color: #1b63bd;',
            'color: #999;', req);

        let rs, rj, xhr: XMLHttpRequest, isAborted = false;
        let output = new SuperPromise<Res, TsrpcError>(async (rs, rj) => {
            xhr = new XMLHttpRequest();

            if (navigator.userAgent.indexOf('MSIE 8.0;') > -1) {
                //IE8 不支持onload onabort onerror事件
                xhr.onreadystatechange = async () => {
                    if (xhr.readyState == 4 && !isAborted) {
                        //Network Error
                        if (xhr.status == 0 || (xhr.response == null && xhr.responseText == null)) {
                            setTimeout(() => {
                                this._throwApiError(ptl, req, sn, rpcUrl, rj);
                            }, 0)
                            return;
                        }

                        //ApiRes
                        this._resolveApiRes(xhr, req, ptl, sn, rpcUrl, rs, rj);
                    }
                }
            }
            else {
                //IE9+, Chrome ...
                xhr.onabort = () => {
                    xhr.onload = xhr.onerror = null as any;
                }

                xhr.onerror = () => {
                    this._throwApiError(ptl, req, sn, rpcUrl, rj);
                    return;
                }

                xhr.onload = async () => {
                    this._resolveApiRes(xhr, req, ptl, sn, rpcUrl, rs, rj);
                }
            }


            xhr.open('POST', this.config.hideApiPath ? this.config.serverUrl : (this.config.serverUrl + rpcUrl), true);
            xhr.responseType = this.config.binaryTransport ? 'arraybuffer' : 'text';

            if (this.config.hideApiPath) {
                (req as TsrpcReq).__tsrpc_url__ = rpcUrl;
            }

            xhr.send(this.config.binaryTransport ? new Blob([await this.config.binaryEncoder(req)]) : await this.config.ptlEncoder(req));
        })

        output.onCancel(() => {
            this.config.showDebugLog && console.debug(`%cApiCancel%c #${sn}%c ${rpcUrl}`,
                'background: #999; color: #fff; line-height: 1.5em; padding: 2px 4px;',
                'color: #1b63bd;',
                'color: #999;');
            isAborted = true;
            xhr.abort();
        })

        return output;
    }

    /**
     * filename should be generate by tsrpc-cli or tsrpc-protocol-loader(webpack)
     * @param ptl 
     */
    private getPtlUrl(ptl: TsrpcPtl<any, any>): string {
        //ensure output like /a/b/c (^\/.+[\/]$)
        let output = ptl.filename.replace(/\\/g, '/');
        if (this.config.protocolPath) {
            if (output.indexOf(this.config.protocolPath) !== 0) {
                console.log('PTL_PATH_ERR', ptl.name, output, this.config.protocolPath);
                throw new Error(`Protocol ${ptl.name} not in protocolPath.`);
            }
            output = output.substr(this.config.protocolPath.length);
        }
        output = output.replace(/Ptl([^\/]+)\.[tj]s$/, '$1');
        if (output[0] !== '/') {
            output = '/' + output;
        }
        return output;
    }

    private _throwApiError(ptl: TsrpcPtl<any, any>, req: any, sn: number, rpcUrl: string, rj: Function) {
        //debug log
        this.config.showDebugLog && console.debug(`%cApiErr%c #${sn}%c ${rpcUrl}`,
            'background: #d81e06; color: #fff; line-height: 1.5em; padding: 2px 4px;',
            'color: #1b63bd;',
            'color: #999;', req, 'Network error');

        this._resReject(ptl, req, rj, new TsrpcError('Network error', 'NETWORK_ERROR'));
    }

    private _resReject(ptl: TsrpcPtl<any, any>, req: any, rj: Function, err: TsrpcError) {
        rj(err);

        //hook
        this.onError && this.onError({
            ptl: ptl,
            req: req,
            err: err
        });
    }

    private async _resolveApiRes(xhr: XMLHttpRequest, req: any, ptl: TsrpcPtl<any, any>, sn: number, rpcUrl: string, rs: Function, rj: Function) {
        //IE9 wrongURL 会返回12029
        if (xhr.status == 12029) {
            this._throwApiError(ptl, req, sn, rpcUrl, rj);
            return;
        }

        let res: TsrpcRes;
        try {
            res = this.config.binaryTransport ? await this.config.binaryDecoder(xhr.response) : await this.config.ptlDecoder(xhr.responseText || xhr.response);
        }
        catch (e) {
            //debug log
            this.config.showDebugLog && console.debug(`%cApiErr%c #${sn}%c ${rpcUrl}`,
                'background: #d81e06; color: #fff; line-height: 1.5em; padding: 2px 4px;',
                'color: #1b63bd;',
                'color: #999;', req, 'Response cannot be resolved');

            this._resReject(ptl, req, rj, new TsrpcError('Response cannot be resolved', 'RES_CANNOT_BE_RESOLVED'))
            return;
        }

        if (res.errmsg != null) {
            //debug log
            this.config.showDebugLog && console.debug(`%cApiErr%c #${sn}%c ${rpcUrl}`,
                'background: #d81e06; color: #fff; line-height: 1.5em; padding: 2px 4px;',
                'color: #1b63bd;',
                'color: #999;', req, res);

            this._resReject(ptl, req, rj, new TsrpcError(res.errmsg, res.errinfo))
        }
        else {
            //debug log
            this.config.showDebugLog && console.debug(`%cApiRes%c #${sn}%c ${rpcUrl}`,
                'background: #4ea85f; color: #fff; line-height: 1.5em; padding: 2px 4px;',
                'color: #1b63bd;',
                'color: #999;', req, res);

            //hook
            this.onResponse && this.onResponse({
                ptl: ptl,
                req: req,
                res: res
            });

            rs(res);
        }
    }

    //hooks
    onRequest: ((e: TsrpcRequestEvent) => void) | null | undefined;
    onResponse: ((e: TsrpcResponseEvent) => void) | null | undefined;
    onError: ((e: TsrpcErrorEvent) => void) | null | undefined;
}

export interface TsrpcRequestEvent<Req=any, Res=any> {
    ptl: TsrpcPtl<Req, Res>,
    req: Req,
    prevent: ()=>void
}

export interface TsrpcResponseEvent<Req=any, Res=any> {
    ptl: TsrpcPtl<Req, Res>,
    req: Req,
    res: Res
}

export interface TsrpcErrorEvent<Req=any, Res=any> {
    ptl: TsrpcPtl<Req, Res>,
    req: Req,
    err: TsrpcError
}