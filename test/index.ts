// import { kunit as kunitWs } from "./ws.test";
import { Logger } from "kunit/src/Logger";
import { kunit as httpCase } from "./http.test";
import { kunit as httpJsonCase } from "./httpJSON.test";
import { kunit as wsCase } from "./WS.test";

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
    httpCase.logger = getLogger(httpCase.logger, document.getElementById('http')!, '[HTTP]')
    await httpCase.runAll();
    document.querySelector('#http>h2>small')?.remove();

    httpJsonCase.logger = getLogger(httpJsonCase.logger, document.getElementById('httpJSON')!, '[HTTP JSON]')
    await httpJsonCase.runAll();
    document.querySelector('#httpJSON>h2>small')?.remove();

    wsCase.logger = getLogger(wsCase.logger, document.getElementById('ws')!, '[WS]')
    await wsCase.runAll();
    document.querySelector('#ws>h2>small')?.remove();
}
main();