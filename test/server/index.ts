import { TsrpcServer, TsrpcServerWs, consoleColorLogger } from 'tsrpc';
import { serviceProto } from '../proto/serviceProto';
import * as path from "path";
import { PrefixLogger } from '../../src/models/Logger';
let server = new TsrpcServer({
    proto: serviceProto,
    cors: '*',
    logger: new PrefixLogger({
        logger: consoleColorLogger,
        prefix: '[HTTP]'
    })
})
server.autoImplementApi(path.resolve(__dirname, 'api'));
server.start();

let wsServer = new TsrpcServerWs({
    port: 4000,
    proto: serviceProto,
    logger: new PrefixLogger({
        logger: consoleColorLogger,
        prefix: '[WS]'
    })
})
wsServer.autoImplementApi(path.resolve(__dirname, 'api'));
wsServer.listenMsg('Chat', async call => {
    call.conn.sendMsg('Chat', {
        ...call.msg,
        userName: 'System',
        time: 111
    });

    setTimeout(() => {
        call.conn.sendMsg('Chat', {
            ...call.msg,
            userName: 'System',
            time: 222
        });
    }, 200);

    await new Promise(rs => {
        setTimeout(() => {
            rs();
        }, 1000)
    })
})
wsServer.start();