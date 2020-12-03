import { HttpClient } from "./src/HttpClient";
import { TsrpcError } from "tsrpc-proto";
import { WsClient } from './src/WsClient';

/**
 * TSRPC Browser Client
 * See TSRPC at https://github.com/k8w/tsrpc
 * @author k8w
 * @copyright 2017 k8w
 * @license Apache-2.0
 */

export { HttpClient as TsrpcClient };
export { HttpClient };
export { WsClient };
export { TsrpcError };