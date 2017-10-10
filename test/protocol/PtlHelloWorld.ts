import { TsRpcPtl } from "tsrpc-protocol";

/**
 * 返回 `Hello, ${name}!`
 * name为空时返回 `Hello, world!`
 */
const PtlHelloWorld = new TsRpcPtl<ReqHelloWorld, ResHelloWorld>(typeof window == 'undefined' ? __filename : '/PtlHelloWorld.ts');
export default PtlHelloWorld;

export interface ReqHelloWorld {
    name?: string;
}

export interface ResHelloWorld {
    reply: string;
}