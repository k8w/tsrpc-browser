# CHANGELOG


## [3.0.6-dev.0] - 2021-08-30
### Fixed
- `HttpProxy` 检查返回码是否为 200

## [3.0.5] - 2021-08-14

### Changed
- `callApi` 返回错误非业务错误时，通过 `logger.error` 打印日志而不是 `logger.log`。
- handler of `client.listenMsg` changed to `(msg, msgName, client)=>void` 
