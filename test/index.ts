// import { kunit as kunitWs } from "./ws.test";
import { Logger } from "kunit/src/Logger";
import { kunit } from "./http.test";
import { kunit as kunitWs } from "./WS.test";

function getLogger(originalLogger: Logger, element: HTMLElement, prefix: string) {
    let logger = (['debug', 'log', 'warn', 'error'] as const).reduce((prev, next) => {
        prev[next] = function (...args: any[]) {
            originalLogger[next](prefix, ...args);
            let node = document.createElement(next);
            node.innerText = args.map(v => v).join(' ');
            element.appendChild(node);
            window.scrollTo(0, 99999);
        }
        return prev;
    }, {} as Logger);
    return logger;
}

async function main() {
    kunit.logger = getLogger(kunit.logger, document.getElementById('http')!, '[HTTP]')
    await kunit.runAll();
    document.querySelector('#http>h2>small')?.remove();

    kunitWs.logger = getLogger(kunitWs.logger, document.getElementById('ws')!, '[WS]')
    await kunitWs.runAll();
    document.querySelector('#ws>h2>small')?.remove();
}
main();