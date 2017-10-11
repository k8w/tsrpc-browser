import ClientConfig from './models/ClientConfig';
import { TsRpcPtl, TsRpcError, TsRpcReq, TsRpcRes } from 'tsrpc-protocol';
import SuperPromise from 'k8w-super-promise';
import { DefaultClientConfig } from './models/ClientConfig';
import 'k8w-extend-native';

//应对某些浏览器没有console.debug的情况
if (!console.debug) {
    console.debug = console.log;
}

export default class RpcClient {
    readonly config: ClientConfig;
    private static _sn = 0;

    constructor(config: Partial<ClientConfig> & {
        serverUrl: string
    }) {
        this.config = Object.merge({}, DefaultClientConfig, config);
        //serverUrl统一不用/结尾 因为rpcUrl是/开头的
        this.config.serverUrl = this.config.serverUrl.replace(/\/$/, '');
    }

    callApi<Req, Res>(ptl: TsRpcPtl<Req, Res>, req: Req = {} as Req, headers: object = {}): SuperPromise<Res, TsRpcError> {
        let sn = ++RpcClient._sn;
        let rpcUrl = this.getPtlUrl(ptl);

        //debug log
        this.config.showDebugLog && console.debug(`%cApiReq%c #${sn}%c ${rpcUrl}`,
            'border:solid 1px #4ea85f; color: #4ea85f; line-height: 1.5em; padding: 1px 3px;',
            'color: #1b63bd;',
            'color: #999;', req);

        //hook 
        this.onRequest && this.onRequest(ptl, req);

        let rs, rj, xhr:XMLHttpRequest;
        let output = new SuperPromise<Res, TsRpcError>(async (rs, rj) => {
            xhr = new XMLHttpRequest();

            xhr.onabort = () => {
                xhr.onload = xhr.onerror = null as any;
            }

            xhr.onerror = () => {
                //debug log
                this.config.showDebugLog && console.debug(`%cApiErr%c #${sn}%c ${rpcUrl}`,
                    'background: #d81e06; color: #fff; line-height: 1.5em; padding: 2px 4px;',
                    'color: #1b63bd;',
                    'color: #999;', req, 'Network error');

                rj(new TsRpcError('Network error', 'NETWORK_ERROR'));
                return;
            }

            xhr.onload = async () => {
                //IE9 wrongURL 会返回12029
                if (xhr.status == 12029) {
                    xhr.onerror && xhr.onerror.call(xhr);
                    return;
                }

                let res: TsRpcRes;
                try {
                    res = this.config.binaryTransport ? await this.config.binaryDecoder(xhr.response) : await this.config.ptlDecoder(xhr.responseText || xhr.response);
                }
                catch (e) {
                    //debug log
                    this.config.showDebugLog && console.debug(`%cApiErr%c #${sn}%c ${rpcUrl}`,
                        'background: #d81e06; color: #fff; line-height: 1.5em; padding: 2px 4px;',
                        'color: #1b63bd;',
                        'color: #999;', req, 'Response cannot be resolved');

                    rj(new TsRpcError('Response cannot be resolved', 'RES_CANNOT_BE_RESOLVED'))
                    return;
                }

                if (res.errmsg != null) {
                    //debug log
                    this.config.showDebugLog && console.debug(`%cApiErr%c #${sn}%c ${rpcUrl}`,
                        'background: #d81e06; color: #fff; line-height: 1.5em; padding: 2px 4px;',
                        'color: #1b63bd;',
                        'color: #999;', req, res);

                    rj(new TsRpcError(res.errmsg, res.errinfo))
                }
                else {
                    //debug log
                    this.config.showDebugLog && console.debug(`%cApiRes%c #${sn}%c ${rpcUrl}`,
                        'background: #4ea85f; color: #fff; line-height: 1.5em; padding: 2px 4px;',
                        'color: #1b63bd;',
                        'color: #999;', req, res);
                    rs(res as Res);
                }

                //hook
                this.onResponse && this.onResponse(ptl, req, res);
            }

            xhr.open('POST', this.config.hideApiPath ? this.config.serverUrl : (this.config.serverUrl + rpcUrl), true);
            xhr.responseType = this.config.binaryTransport ? 'arraybuffer' : 'text';

            if (this.config.hideApiPath) {
                (req as TsRpcReq).__tsrpc_url__ = rpcUrl;
            }
            
            xhr.send(this.config.binaryTransport ? new Blob([await this.config.binaryEncoder(req)]) : await this.config.ptlEncoder(req));
        })

        output.onCancel = () => {
            this.config.showDebugLog && console.debug(`%cApiCancel%c #${sn}%c ${rpcUrl}`,
                'background: #999; color: #fff; line-height: 1.5em; padding: 2px 4px;',
                'color: #1b63bd;',
                'color: #999;',);
            xhr.abort();
        }

        return output;
    }

    /**
     * filename should be generate by tsrpc-cli or tsrpc-protocol-loader(webpack)
     * @param ptl 
     */
    private getPtlUrl(ptl: TsRpcPtl<any, any>): string {
        //ensure output like /a/b/c (^\/.+[\/]$)
        return ptl.filename.replace(/Ptl([^\/]+)\.[tj]s$/, '$1')
    }

    //hooks
    onRequest: ((ptl: TsRpcPtl<any, any>, req: TsRpcReq) => void) | null | undefined;
    onResponse: ((ptl: TsRpcPtl<any, any>, req: TsRpcReq, res: TsRpcRes) => void) | null | undefined;
}