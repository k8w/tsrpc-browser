import TsrpcClient from '../src/TsrpcClient';
import PtlHelloWorld from './protocol/PtlHelloWorld';
import PtlHelloKing from './protocol/PtlHelloKing';
import { TsrpcError } from 'tsrpc-protocol';
import ClientConfig from '../src/models/ClientConfig';
import BinaryTextCoder from '../src/models/BinaryTextCoder';
import * as assert from 'assert';

const urlApi = 'bapi';
const clientConfig: Partial<ClientConfig> = {
    hideApiPath: true,
    binaryTransport: true,
    binaryEncoder: async content => {
        let output = await BinaryTextCoder.encode(content);
        let arr = new Uint8Array(output);
        for (let i = 0; i < arr.length; ++i) {
            arr[i] ^= 0xf0;
        }
        return output;
    },
    binaryDecoder: buf => {
        let arr = new Uint8Array(buf);
        for (let i = 0; i < arr.length; ++i) {
            arr[i] ^= 0xf0;
        }
        let output = BinaryTextCoder.decode(buf);
        return output;
    }
}

describe('BinaryClient', function () {
    let client: TsrpcClient;

    before(function () {
        client = new TsrpcClient(Object.merge({}, clientConfig, {
            serverUrl: `http://localhost:8080/${urlApi}/`
        }))
    })

    describe('serverUrl', function () {
        it('absolute URL with postfix /', async function () {            
            let res = await new TsrpcClient(Object.merge({}, clientConfig, {
                serverUrl: `http://localhost:8080/${urlApi}/`
            })).callApi(PtlHelloWorld, { name: 'test' });
            assert.equal(res.reply, 'Hello, test!');
        });

        it('absolute URL without postfix /', async function () {
            let res = await new TsrpcClient(Object.merge({}, clientConfig, {
                serverUrl: `http://localhost:8080/${urlApi}`
            })).callApi(PtlHelloWorld, { name: 'test' });
            assert.equal(res.reply, 'Hello, test!');
        });

        it('relative URL with postfix /', async function () {
            
            let res = await new TsrpcClient(Object.merge({}, clientConfig, {
                serverUrl: `${urlApi}/`
            })).callApi(PtlHelloWorld, { name: 'test' });
            assert.equal(res.reply, 'Hello, test!');
        });

        it('relative URL without postfix /', async function () {            
            let res = await new TsrpcClient(Object.merge({}, clientConfig, {
                serverUrl: `${urlApi}`
            })).callApi(PtlHelloWorld, { name: 'test' });
            assert.equal(res.reply, 'Hello, test!');
        });

        it('wrong URL', async function () {
            this.timeout(999999)
            try {
                await new TsrpcClient(Object.merge({}, clientConfig, {
                    serverUrl: 'http://localhost:12345'
                })).callApi(PtlHelloWorld, { name: 'test' });
                assert.fail('Should not be here')
            }
            catch (e) {
                assert.equal((e as TsrpcError).info, 'NETWORK_ERROR');
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

    it('TsrpcError', async function () {
        try {
            await client.callApi(PtlHelloWorld, { name: 'TsrpcError' });
            assert(false, 'Should not get res')
        }
        catch (e) {
            assert.ok(e.message.startsWith('TsrpcError'));
            assert.equal(e.info, 'TsrpcError');
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