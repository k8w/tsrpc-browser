TSRPC Browser
===

`TSRPC` Client for browser

> `TSRPC` is a full-stack rpc framework in TypeScript, see it at [https://github.com/k8w/tsrpc](https://github.com/k8w/tsrpc)

### Usage

```
npm install tsrpc-browser
```

```typescript
import {RpcClient} from 'tsrpc-browser';
import PtlHelloWorld from './protocol/PtlHelloWorld';

let client = new RpcClient({
    serverUrl: 'http://localhost:3000'
    // Don't need protocolPath for Browser usage
})

// Rest is the same with NodeJS
client.callApi(PtlHelloWorld, { name: 'k8w' }).then(res=>{
    console.log(res.reply); //Hello, k8w!
})
```

# Browser Support
1. Support IE9+, Chrome
1. Not Test: Firefox
1. BinaryTransport only support: Chrome, IE10+

# Note
暂时不支持IE8，因为TypeScript的 `default`->`'default'` 的BUG