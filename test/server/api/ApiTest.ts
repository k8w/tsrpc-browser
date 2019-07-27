import { ApiCallHttp } from "tsrpc";
import { ReqTest, ResTest } from "../../proto/PtlTest";
import { TsrpcError } from "tsrpc-proto";

export async function ApiTest(call: ApiCallHttp<ReqTest, ResTest>) {
    if (call.req.name === 'InnerError') {
        throw new Error('Test InnerError')
    }
    else if (call.req.name === 'TsrpcError') {
        throw new TsrpcError('Test TsrpcError', 'ErrInfo Test');
    }
    else if (call.req.name === 'Timeout') {
        await new Promise(rs => {
            setTimeout(() => {
                call.succ({
                    reply: 'Reply Timeout'
                });
                rs();
            }, 5000)
        })
    }
    else {
        call.succ({
            reply: 'Test reply: ' + call.req.name
        })
    }
}