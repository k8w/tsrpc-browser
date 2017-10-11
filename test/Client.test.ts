import RpcClient from '../src/RpcClient';
import PtlHelloWorld from './protocol/PtlHelloWorld';
import PtlHelloKing from './protocol/PtlHelloKing';
import { TsRpcError } from 'tsrpc-protocol';
import * as assert from 'assert';

const urlApi = 'api';
const clientConfig = {

}

describe('Client', function () {
    let client: RpcClient;

    before(function () {
        client = new RpcClient(Object.merge({}, clientConfig, {
            serverUrl: `http://localhost:8080/${urlApi}/`
        }))
    })

    describe('serverUrl', function () {
        it('absolute URL with postfix /', async function () {            
            let res = await new RpcClient(Object.merge({}, clientConfig, {
                serverUrl: `http://localhost:8080/${urlApi}/`
            })).callApi(PtlHelloWorld, { name: 'test' });
            assert.equal(res.reply, 'Hello, test!');
        });

        it('absolute URL without postfix /', async function () {
            let res = await new RpcClient(Object.merge({}, clientConfig, {
                serverUrl: `http://localhost:8080/${urlApi}`
            })).callApi(PtlHelloWorld, { name: 'test' });
            assert.equal(res.reply, 'Hello, test!');
        });

        it('relative URL with postfix /', async function () {
            
            let res = await new RpcClient(Object.merge({}, clientConfig, {
                serverUrl: `${urlApi}/`
            })).callApi(PtlHelloWorld, { name: 'test' });
            assert.equal(res.reply, 'Hello, test!');
        });

        it('relative URL without postfix /', async function () {            
            let res = await new RpcClient(Object.merge({}, clientConfig, {
                serverUrl: `${urlApi}`
            })).callApi(PtlHelloWorld, { name: 'test' });
            assert.equal(res.reply, 'Hello, test!');
        });

        it('wrong URL', async function () {
            this.timeout(999999)
            try {
                await new RpcClient(Object.merge({}, clientConfig, {
                    serverUrl: 'http://localhost:12345'
                })).callApi(PtlHelloWorld, { name: 'test' });
                assert.fail('Should not be here')
            }
            catch (e) {
                assert.equal((e as TsRpcError).info, 'NETWORK_ERROR');
            }            
        });
    })

    it('client call', async function () {
        let reqStr = '', resStr = '';
        client.onRequest = () => {
            reqStr = 'reqStr';
        }
        client.onResponse = () => {
            resStr = 'resStr'
        }
        assert.equal((await client.callApi(PtlHelloWorld, { name: 'Peter' })).reply, 'Hello, Peter!')
        assert.equal(reqStr, 'reqStr')
        assert.equal(resStr, 'resStr')

        client.onRequest = client.onResponse = undefined;
    })

    it('default param', async function () {
        assert.equal((await client.callApi(PtlHelloWorld)).reply, 'Hello, world!')
    })

    it('404', async function () {
        try {
            await client.callApi(PtlHelloKing);
            assert(false, 'Should not get res')
        }
        catch (e) {
            assert.equal(e.info, 'PTL_NOT_FOUND');
        }
    })

    it('500', async function () {
        try {
            await client.callApi(PtlHelloWorld, { name: 'Error' });
            assert(false, 'Should not get res')
        }
        catch (e) {
            assert.ok(e.message.startsWith('Internal Server Error'));
            assert.equal(e.info, 'UNHANDLED_API_ERROR');
        }
    })

    it('TsRpcError', async function () {
        try {
            await client.callApi(PtlHelloWorld, { name: 'TsRpcError' });
            assert(false, 'Should not get res')
        }
        catch (e) {
            assert.ok(e.message.startsWith('TsRpcError'));
            assert.equal(e.info, 'TsRpcError');
        }
    })

    it('Client Cancel', function (done) {
        let req = client.callApi(PtlHelloWorld, { name: 'Delay' }).then(res => {
            assert.fail('Have canceled, should not be here');
        }).catch(e => {
            assert.fail('Have canceled, should not be here');
        });

        setTimeout(() => {
            req.cancel();
        }, 80)

        setTimeout(() => {
            done();
        }, 200)
    })
})