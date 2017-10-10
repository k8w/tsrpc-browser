import RpcClient from '../src/RpcClient';
import PtlHelloWorld from './protocol/PtlHelloWorld';
const assert = chai.assert;

describe('BinaryClient', function () {
    it('ServerURL with postfix /', async function () {
        let client = new RpcClient({
            serverUrl: `http://localhost:8080/bapi/`,
            binaryTransport: true
        })

        let res = await client.callApi(PtlHelloWorld, { name: 'test' });
        assert.equal(res.reply, 'Hello, test!');
    });

    it('ServerURL without postfix /', async function () {
        let client = new RpcClient({
            serverUrl: `http://localhost:8080/bapi`,
            binaryTransport: true
        })

        let res = await client.callApi(PtlHelloWorld, { name: 'test' });
        assert.equal(res.reply, 'Hello, test!');
    });

    it('relative url with out /$', async function () {
        let res = await new RpcClient({
            serverUrl: `bapi`,
            binaryTransport: true
        }).callApi(PtlHelloWorld, { name: 'test' });
        assert.equal(res.reply, 'Hello, test!');
    });

    it('relative url with /$', async function () {
        let res = await new RpcClient({
            serverUrl: `bapi/`,
            binaryTransport: true
        }).callApi(PtlHelloWorld, { name: 'test' });
        assert.equal(res.reply, 'Hello, test!');
    });
})