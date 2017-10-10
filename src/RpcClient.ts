import ClientConfig from './models/ClientConfig';
import { TsRpcPtl, TsRpcError, TsRpcReq, TsRpcRes } from 'tsrpc-protocol';
import SuperPromise from 'k8w-super-promise';
import { DefaultClientConfig } from './models/ClientConfig';
import 'k8w-extend-native';

export default class RpcClient {
    readonly config: ClientConfig;
    private _sn = 0;

    constructor(config: Partial<ClientConfig> & {
        serverUrl: string
    }) {
        this.config = Object.merge({}, DefaultClientConfig, config);
        //serverUrl统一不用/结尾 因为rpcUrl是/开头的
        this.config.serverUrl = this.config.serverUrl.replace(/\/$/, '');
    }

    callApi<Req, Res>(ptl: TsRpcPtl<Req, Res>, req: Req = {} as Req, headers: object = {}): SuperPromise<Res, TsRpcError> {
        let sn = ++this._sn;
        let rpcUrl = this.getPtlUrl(ptl);

        //debug log
        this.config.showDebugLog && console.debug('[ApiReq]', `#${sn}`, rpcUrl, req);

        //hook
        this.onRequest && this.onRequest(ptl, req);

        let rs, rj;
        let output = new SuperPromise<Res, TsRpcError>(async (rs, rj) => {
            //TODO request
            let xhr = new XMLHttpRequest();
            xhr.responseType = this.config.binaryTransport ? 'arraybuffer' : 'text';
            xhr.onreadystatechange = async () => {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    console.log('response', xhr.response)
                    let res: TsRpcRes = this.config.binaryTransport ? await this.config.binaryDecoder(xhr.response) : await this.config.ptlDecoder(xhr.response);
                    if (res.errmsg != null) {
                        rj(new TsRpcError(res.errmsg, res.errinfo))
                    }
                    else {
                        rs(res as Res);
                    }
                }
            }

            xhr.open('POST', this.config.hideApiPath ? this.config.serverUrl : (this.config.serverUrl + rpcUrl), true);

            if (this.config.hideApiPath) {
                (req as TsRpcReq).__tsrpc_url__ = rpcUrl;
            }
            
            console.log('abcd', this.config.binaryTransport ? await this.config.binaryEncoder(req) : await this.config.ptlEncoder(req))
            xhr.send(this.config.binaryTransport ? new Blob([await this.config.binaryEncoder(req)]) : await this.config.ptlEncoder(req));
        })

        output.onCancel = () => {
            this.config.showDebugLog && console.debug('[ApiCancel]', '#' + sn, rpcUrl)
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