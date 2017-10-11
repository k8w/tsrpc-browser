import { TsRpcPtl } from "tsrpc-protocol";

/**
 * 返回 `Hello, ${name}!`
 * name为空时返回 `Hello, world!`
 */
const PtlHelloKing = new TsRpcPtl<ReqHelloKing, ResHelloKing>(typeof window == 'undefined' ? __filename : '/PtlHelloKing.ts');
export default PtlHelloKing;

export interface ReqHelloKing {
    name?: string;
}

export interface ResHelloKing {
    reply: string;
}