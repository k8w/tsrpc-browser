# CHANGELOG

## [3.0.9] - 2021-10-09
### Fixed
- Missing log when encode request error

## [3.0.8] - 2021-10-08
### Changed
- Update dependencies, many deps rename `index.cjs` to `index.js` to fit webpack.

## [3.0.7] - 2021-09-13
### Changed
- `index.cjs` renamed to `index.js` to support `umi`

## [3.0.6] - 2021-09-01
### Fixed
- `HttpProxy` 检查返回码是否为 200
- 更新 `tsrpc-base-client` 修复一些问题

## [3.0.5] - 2021-08-14

### Changed
- `callApi` 返回错误非业务错误时，通过 `logger.error` 打印日志而不是 `logger.log`。
- handler of `client.listenMsg` changed to `(msg, msgName, client)=>void` 
