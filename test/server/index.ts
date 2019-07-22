import { TsrpcServer } from 'tsrpc';
import { serviceProto } from '../proto/serviceProto';
import * as path from "path";
let server = new TsrpcServer({
    proto: serviceProto,
    cors: '*'
})
server.autoImplementApi(path.resolve(__dirname, 'api'));
server.start();