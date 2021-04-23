// import { kunit as kunitWs } from "./ws.test";
import { PrefixLogger } from "kunit/src/Logger";
import { kunit } from "./http.test";

// function getLogger(originalLogger: Logger, element: HTMLElement, prefix: string) {
//     let logger = (['debug', 'log', 'warn', 'error'] as const).reduce((prev, next) => {
//         prev[next] = function (...args: any[]) {
//             originalLogger[next](prefix, ...args);
//             let node = document.createElement(next);
//             node.innerText = args.map(v => v).join(' ');
//             element.appendChild(node)
//         }
//         return prev;
//     }, {} as Logger);
//     return logger;
// }

// kunit.logger = getLogger(kunit.logger, document.getElementById('http')!, '[HTTP]')
kunit.logger = new PrefixLogger({
    logger: console,
    prefix: '[HTTP]'
})
kunit.options.disableColorLog = true;
kunit.runAll();

// kunitWs.logger = getLogger(kunitWs.logger, document.getElementById('ws')!, '[WS]')
// kunitWs.options.disableColorLog = true;
// kunitWs.runAll();