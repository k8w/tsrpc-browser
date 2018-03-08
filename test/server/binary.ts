import * as path from 'path';
import { TsrpcServer } from 'tsrpc';
import PtlHelloWorld from '../protocol/PtlHelloWorld';
import ApiHelloWorld from './api/ApiHelloWorld';
import BinaryTextCoder from 'tsrpc/src/models/BinaryTextCoder';

let Server = new TsrpcServer({
    protocolPath: path.resolve(__dirname, '../protocol'),
    hideApiPath: true,
    binaryTransport: true,
    binaryEncoder: content => {
        let output = BinaryTextCoder.encode(content);
        for (let i = 0; i < output.length; ++i){
            output[i] ^= 0xf0;
        }
        return output;
    },
    binaryDecoder: buf => {
        for (let i = 0; i < buf.length; ++i) {
            buf[i] ^= 0xf0;
        }
        let output = BinaryTextCoder.decode(buf);
        return output;
    }
});
Server.implementPtl(PtlHelloWorld, ApiHelloWorld);
Server.start(3302);

export default Server;