import * as path from 'path';
import { TsrpcServer } from 'tsrpc';
import PtlHelloWorld from '../protocol/PtlHelloWorld';
import ApiHelloWorld from './api/ApiHelloWorld';

let Server = new TsrpcServer({
    protocolPath: path.resolve(__dirname, '../protocol'),
    urlRootPath: '/api'
});
Server.implementPtl(PtlHelloWorld, ApiHelloWorld);
Server.start(3301);

export default Server;