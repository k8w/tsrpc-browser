import { assert } from 'chai';
import { KUnit } from 'kunit';
import { TsrpcError, TsrpcErrorType, WsClient } from '../src/index';
import { MsgChat } from './proto/MsgChat';
import { serviceProto } from './proto/serviceProto';

export let client = new WsClient(serviceProto, {
    server: 'ws://127.0.0.1:4000'
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
        isSucc: true,
        res: {
            reply: 'Test reply: Req1'
        }
    });
    assert.deepStrictEqual(await client.callApi('a/b/c/Test', {
        name: 'Req2'
    }), {
        isSucc: true,
        res: {
            reply: 'a/b/c/Test reply: Req2'
        }
    });
});

kunit.test('Inner Error', async function () {
    for (let v of ['Test', 'a/b/c/Test']) {
        assert.deepStrictEqual(await client.callApi(v as any, {
            name: 'InnerError'
        }), {
            isSucc: false,
            err: new TsrpcError('Internal Server Error', {
                code: 'INTERNAL_ERR',
                type: TsrpcErrorType.ServerError,
                innerErr: v + ' InnerError',
            })
        });
    }
})

kunit.test('TsrpcError', async function () {
    for (let v of ['Test', 'a/b/c/Test']) {
        assert.deepStrictEqual(await client.callApi(v as any, {
            name: 'TsrpcError'
        }), {
            isSucc: false,
            err: new TsrpcError({
                message: v + ' TsrpcError',
                type: TsrpcErrorType.ApiError,
                info: 'ErrInfo ' + v
            })
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

kunit.test('abort', async function () {
    let result: any | undefined;
    let promise = client.callApi('Test', { name: 'aaaaaaaa' });
    setTimeout(() => {
        client.abort(client.lastSN);
    }, 0);
    promise.then(v => {
        result = v;
    });

    await new Promise<void>(rs => {
        setTimeout(() => {
            assert.strictEqual(result, undefined);
            rs();
        }, 100)
    })
})

kunit.test('error', async function () {
    let client1 = new WsClient(serviceProto, {
        server: 'ws://localhost:9999'
    })

    let ret = await client1.connect()
    assert.strictEqual(ret.isSucc, false);
})

kunit.test('client timeout', async function () {
    let client = new WsClient(serviceProto, {
        server: 'ws://127.0.0.1:4000',
        timeout: 100
    });
    await client.connect();

    let result = await client.callApi('Test', { name: 'Timeout' });
    assert.deepStrictEqual(result, {
        isSucc: false,
        err: new TsrpcError({
            message: 'Request Timeout',
            code: 'TIMEOUT',
            type: TsrpcErrorType.NetworkError
        })
    });
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

    await new Promise<void>(rs => {
        setTimeout(() => {
            rs();
        }, 1000);
    })

    client.unlistenMsg('Chat', handler);
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