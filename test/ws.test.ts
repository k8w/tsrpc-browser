import KUnit from 'kunit';
import { assert } from 'chai';
import { WsClient } from '../src/WsClient';
import { serviceProto } from './proto/serviceProto';
import { MsgChat } from './proto/MsgChat';
import { TsrpcError } from 'tsrpc-proto';

export let client = new WsClient({
    server: 'ws://127.0.0.1:4000',
    proto: serviceProto,
    onStatusChange: v => {
        console.log('[WS] Client Status Change', v)
    }
});

export const kunit = new KUnit();

kunit.test('Connect', async function () {
    await client.connect();
})

kunit.test('CallApi normally', async function () {
    // Succ
    assert.deepStrictEqual(await client.callApi('Test', {
        name: 'Req1'
    }), {
            reply: 'Test reply: Req1'
        });
    assert.deepStrictEqual(await client.callApi('a/b/c/Test', {
        name: 'Req2'
    }), {
            reply: 'a/b/c/Test reply: Req2'
        });
});

kunit.test('Inner Error', async function () {
    for (let v of ['Test', 'a/b/c/Test']) {
        assert.deepStrictEqual(await client.callApi(v as any, {
            name: 'InnerError'
        }).catch(e => ({
            isSucc: false,
            message: e.message,
            info: e.info
        })), {
                isSucc: false,
                message: 'Internal server error',
                info: 'INTERNAL_ERR'
            });
    }
})

kunit.test('TsrpcError', async function () {
    for (let v of ['Test', 'a/b/c/Test']) {
        assert.deepStrictEqual(await client.callApi(v as any, {
            name: 'TsrpcError'
        }).catch(e => ({
            isSucc: false,
            message: e.message,
            info: e.info
        })), {
                isSucc: false,
                message: v + ' TsrpcError',
                info: 'ErrInfo ' + v
            });
    }
})

kunit.test('sendMsg', async function () {
    let msg: MsgChat = {
        channel: 123,
        userName: 'fff',
        content: '666',
        time: Date.now()
    };

    await client.sendMsg('Chat', msg);
})

kunit.test('cancel', async function () {
    let result: any | undefined;
    let promise = client.callApi('Test', { name: 'Delay' });
    setTimeout(() => {
        promise.cancel();
    }, 0);
    promise.then(v => {
        result = v;
    });

    await new Promise(rs => {
        setTimeout(() => {
            assert.strictEqual(result, undefined);
            rs();
        }, 500)
    })
})

kunit.test('error', async function () {
    let client1 = new WsClient({
        server: 'ws://localhost:9999',
        proto: serviceProto
    })

    let err1: TsrpcError | undefined;
    await client1.connect().catch(e => {
        err1 = e
    })
    console.log(err1);
    assert(err1);
})

kunit.test('client timeout', async function () {
    let client = new WsClient({
        server: 'ws://127.0.0.1:4000',
        timeout: 100,
        proto: serviceProto
    });
    await client.connect();

    let result = await client.callApi('Test', { name: 'Timeout' }).catch(e => e);
    assert.strictEqual(result.message, 'Request Timeout');
    assert.strictEqual(result.info, 'TIMEOUT');
});

kunit.test('send/listen Msg', async function () {
    let recved: MsgChat[] = [];
    let handler = (v: MsgChat) => {
        recved.push(v);
    };

    client.listenMsg('Chat', handler);

    client.sendMsg('Chat', {
        channel: 111,
        userName: 'Peter',
        content: 'Good morning~',
        time: Date.now()
    });

    await new Promise(rs => {
        setTimeout(() => {
            rs();
        }, 1000);
    })

    // client.unlistenMsg('Chat', handler);
    assert.deepStrictEqual(recved, [
        {
            channel: 111,
            userName: 'System',
            content: 'Good morning~',
            time: 111
        },
        {
            channel: 111,
            userName: 'System',
            content: 'Good morning~',
            time: 222
        }
    ])
})