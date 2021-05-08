# Browser Client of TSRPC

> TSRPC is a TypeScript RPC framework with runtime type checking and binary serialization.
See more detail at [https://github.com/k8w/tsrpc](https://github.com/k8w/tsrpc).

## Introduction
`HttpClient` is using `XMLHttpRequest`, and `WebSocketClient` is using `WebSocket` of browser. 
Platform adapted to `XMLHttpRequest` and `WebSocket` (like `ReactNative`) can also use this library.

## Usage
[WIP]

## Browser Support
The library is compiled to target `ES2015`, so if you need legacy browser support, you can use Babel to transform the final code to `ES5`. After that it can support all these browser:
- IE8+
- Chrome
- Firefox
- Safari
- etc...

> WebSocket only support IE10+.