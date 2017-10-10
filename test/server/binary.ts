import * as path from 'path';
import { RpcServer } from 'tsrpc';
import PtlHelloWorld from '../protocol/PtlHelloWorld';
import ApiHelloWorld from './api/ApiHelloWorld';

let Server = new RpcServer({
    protocolPath: path.resolve(__dirname, '../protocol'),
    binaryTransport: true
});
Server.implementPtl(PtlHelloWorld, ApiHelloWorld);
Server.start(3302);

export default Server;