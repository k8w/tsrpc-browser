import { HandlerManager } from './models/HandlerManager';
import { Counter } from './models/Counter';
import { TransportDataUtil, ParsedServerOutput } from './models/TransportDataUtil';
import { TSBuffer } from 'tsbuffer';
import { ServiceMap, ServiceMapUtil } from './models/ServiceMapUtil';
import { Logger } from './models/Logger';
import { ServiceProto, BaseServiceType, TsrpcError, ApiError } from 'tsrpc-proto';
import SuperPromise from 'k8w-super-promise';
import { TransportOptions } from './models/TransportOptions';

export class WsClient<ServiceType extends BaseServiceType = any> {

    options: WsClientOptions<ServiceType>;
    tsbuffer: TSBuffer;
    serviceMap: ServiceMap;
    logger: Logger;

    private _ws?: WebSocket;
    private _msgHandlers: HandlerManager;
    private _apiReqSnCounter = new Counter(1);

    constructor(options: Partial<WsClientOptions<ServiceType>>) {
        this.options = Object.assign({}, defaultClientOptions, options);
        this.tsbuffer = new TSBuffer(this.options.proto.types);
        this.serviceMap = ServiceMapUtil.getServiceMap(this.options.proto);
        this.logger = this.options.logger;
        this._msgHandlers = new HandlerManager(this.logger);
    }

    private _connecting?: Promise<void>;
    async connect(): Promise<void> {
        // 已连接中
        if (this._connecting) {
            return this._connecting;
        }

        // 已连接成功
        if (this._ws) {
            return;
        }

        let ws = new WebSocket(this.options.server);
        ws.binaryType = 'arraybuffer';
        this.logger.log(`Start connecting ${this.options.server}...`)
        this._connecting = new Promise<void>((rs: Function, rj?: Function) => {
            ws.onopen = () => {
                this._connecting = undefined;
                rs();
                rj = undefined;
                ws.onopen = undefined as any;
                this._ws = ws;
                this.logger.log('Connected succ');
                this.options.onStatusChange && this.options.onStatusChange('open');
            };

            ws.onerror = e => {
                this.logger.error('[WebSocket Error]', e);
                // 还在连接中，则连接失败
                if (rj) {
                    this._connecting = undefined;
                    rj(new TsrpcError('Network Error', 'WS_ERROR'));
                }
            }

            ws.onclose = e => {
                if (rj) {
                    this._connecting = undefined;
                    rj(new TsrpcError('Network Error', e.reason));
                }

                // 清空WebSocket Listener
                ws.onopen = ws.onclose = ws.onmessage = ws.onerror = undefined as any;
                this._ws = undefined;

                this.options.onStatusChange && this.options.onStatusChange('closed');

                if (this._rsDisconnecting) {
                    this._rsDisconnecting();
                    this._rsDisconnecting = undefined;
                    this.logger.log('Disconnected succ', `code=${e.code} reason=${e.reason}`);
                }
                // 已连接上 非主动关闭 触发掉线
                else if (!rj) {
                    this.logger.log(`Lost connection to ${this.options.server}`, `code=${e.code} reason=${e.reason}`);
                    this.options.onLostConnection && this.options.onLostConnection();
                }
            };
        })

        ws.onmessage = e => {
            if (e.data instanceof ArrayBuffer) {
                this._onBuffer(new Uint8Array(e.data));
            }
            else {
                this.logger.error('[Unresolved Data]', e.data)
            }
        }

        this.options.onStatusChange && this.options.onStatusChange('connecting');
        return this._connecting;
    }

    private _rsDisconnecting?: () => void;
    async disconnect() {
        // 连接不存在
        if (!this._ws) {
            return;
        }

        this.logger.log('Disconnecting...');
        return new Promise(rs => {
            this._rsDisconnecting = rs;
            this._ws!.close();
        })
    }

    private _onBuffer(buf: Uint8Array) {
        let parsed: ParsedServerOutput;
        try {
            parsed = TransportDataUtil.parseServerOutout(this.tsbuffer, this.serviceMap, buf);
        }
        catch (e) {
            this.logger.error('Cannot resolve buffer:', buf);
            return;
        }

        if (parsed.type === 'api') {
            let pending = this._pendingApi[parsed.sn];
            if (pending) {
                delete this._pendingApi[parsed.sn];
                if (parsed.isSucc) {
                    this.logger.log(`[ApiRes] #${parsed.sn}`, parsed.res)
                    pending.rs(parsed.res);
                }
                else {
                    this.logger.log(`[ApiErr] #${parsed.sn}`, parsed.error)
                    pending.rj(new TsrpcError(parsed.error.message, parsed.error.info));
                }
            }
            else {
                this.logger.debug(`Invalid SN: ${parsed.sn}`);
            }
        }
        else if (parsed.type === 'msg') {
            if (!this._msgHandlers.forEachHandler(parsed.service.name, parsed.msg)) {
                this.logger.debug('Unhandled msg:', parsed.msg)
            }
        }
    }

    private _pendingApi: {
        [sn: number]: { rs: (data: any) => void, rj: (err: any) => void } | undefined;
    } = {};
    callApi<T extends keyof ServiceType['req']>(apiName: T, req: ServiceType['req'][T], options: TransportOptions = {}): SuperPromise<ServiceType['res'][T], TsrpcError> {
        let sn = this._apiReqSnCounter.getNext();
        this.logger.log(`[ApiReq] #${sn}`, apiName, req);

        if (!this._ws) {
            throw new TsrpcError('Not connected', { isClientError: true })
        }

        // GetService
        let service = this.serviceMap.apiName2Service[apiName as string];
        if (!service) {
            throw new TsrpcError('Invalid api name: ' + apiName, { isClientError: true });
        }

        // Encode        
        let buf = TransportDataUtil.encodeApiReq(this.tsbuffer, service, req, sn);

        // Wait Res
        let promise = new SuperPromise<ServiceType['res'][T], TsrpcError>((rs, rj) => {
            this._pendingApi[sn] = {
                rs: rs,
                rj: rj
            }
        });

        // Send
        this._ws.send(buf);

        // onCancel
        promise.onCancel(() => {
            this.logger.log(`[ApiCancel] #${sn}`);
        })

        // Timeout
        let timeout = options.timeout !== undefined ? options.timeout : this.options.timeout;
        let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
        let clear = () => {
            if (timeoutTimer) {
                clearTimeout(timeoutTimer);
                timeoutTimer = undefined;
            }
            if (this._pendingApi[sn]) {
                delete this._pendingApi[sn];
            }
        }
        if (timeout > 0) {
            timeoutTimer = setTimeout(() => {
                if (this._pendingApi[sn]) {
                    this.logger.log(`[ApiTimeout] #${sn}`);
                    this._pendingApi[sn]!.rj(new TsrpcError('Request Timeout', { isNetworkError: true, code: 'TIMEOUT' }));
                }
                clear();
            }, timeout);
        }
        // Finnaly clear timeout
        promise.then(v => {
            clear();
            return v;
        }).catch(e => {
            clear();
            throw e;
        });

        return promise;
    }

    get status(): WsClientStatus {
        if (this._connecting) {
            return 'connecting'
        }
        else if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            return 'open';
        }
        else {
            return 'closed';
        }

    }

    listenMsg<T extends keyof ServiceType['msg']>(msgName: T, handler: ClientMsgHandler<ServiceType['msg'][T]>) {
        this._msgHandlers.addHandler(msgName as string, handler)
    }
    unlistenMsg<T extends keyof ServiceType['msg']>(msgName: T, handler?: ClientMsgHandler<ServiceType['msg'][T]>) {
        this._msgHandlers.removeHandler(msgName as string, handler)
    }

    sendMsg<T extends keyof ServiceType['msg']>(msgName: T, msg: ServiceType['msg'][T]): void {
        this.logger.log('[SendMsg]', msgName, msg);

        if (!this._ws) {
            throw new TsrpcError('Not connected', { isClientError: true })
        }

        // GetService
        let service = this.serviceMap.msgName2Service[msgName as string];
        if (!service) {
            throw new TsrpcError('Invalid msg name: ' + msgName, { isClientError: true })
        }

        // Encode
        let buf = TransportDataUtil.encodeMsg(this.tsbuffer, service, msg);

        // Send Data
        this._ws.send(buf);
    }
}

const defaultClientOptions: WsClientOptions<any> = {
    server: 'ws://127.0.0.1:3000',
    proto: { services: [], types: {} },
    logger: console,
    timeout: 30000
}

export interface WsClientOptions<ServiceType extends BaseServiceType> {
    server: string;
    proto: ServiceProto<ServiceType>;
    logger: Logger;
    timeout: number;

    onStatusChange?: (newStatus: WsClientStatus) => void;
    /** 掉线 */
    onLostConnection?: () => void;

    // 加密选项
    // encrypter?: (src: Uint8Array) => Uint8Array;
    // decrypter?: (cipher: Uint8Array) => Uint8Array;
    /** 为true时将会把buf信息打印在log中 */
    // debugBuf?: boolean
}

export type WsClientStatus = 'open' | 'connecting' | 'closed';

export type ClientMsgHandler<Msg> = (msg: Msg) => void | Promise<void>;