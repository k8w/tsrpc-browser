import KUnit from 'kunit';
import { test } from 'kunit';
import { assert } from 'chai';
import { HttpClient } from '../src/HttpClient';
import { serviceProto } from './proto/serviceProto';
import { MsgChat } from './proto/MsgChat';
import { TsrpcError } from 'tsrpc-proto';

let client = new HttpClient({
    server: 'https://honghegame.cn/t2',
    proto: serviceProto
});

const output = document.getElementById('output')!;
function log(...args: string[]) {
    output.innerText += args.join(' ') + '\n';
}
log('Test Start!');

let n = 0;
function done() {
    log(`√ Done: ${++n}`);
}

test('CallApi normally', async function () {
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
    done();
});

test('Inner Error', async function () {
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
    done();
})

test('TsrpcError', async function () {
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
    done();
})

test('sendMsg', async function () {
    let msg: MsgChat = {
        channel: 123,
        userName: 'fff',
        content: '666',
        time: Date.now()
    };

    await client.sendMsg('Chat', msg);
    done();
})

test('cancel', async function () {
    let result: any | undefined;
    let promise = client.callApi('Test', { name: 'aaaaaaaa' });
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
        }, 100)
    })
    done();
})

test('error', async function () {
    let client1 = new HttpClient({
        server: 'http://localhost:9999',
        proto: serviceProto
    })

    let err1: TsrpcError | undefined;
    await client1.callApi('Test', { name: 'xx' }).catch(e => {
        err1 = e
    })
    console.log(err1);
    assert.deepStrictEqual(err1!.info.isNetworkError, true);
    done();
})

test('client timeout', async function () {
    let client = new HttpClient({
        timeout: 100,
        proto: serviceProto
    });
    let result = await client.callApi('Test', { name: 'Timeout' }).catch(e => e);
    assert.strictEqual(result.message, 'Request Timeout');
    assert.strictEqual(result.info, 'TIMEOUT');
    done();
})

KUnit.instance.runAll().then(v => {
    let succ = v.children!.count(v => !!v.isSucc);
    let fail = v.children!.count(v => !v.isSucc);
    log(`Finished, succ=${succ}, fail=${fail}`);
});