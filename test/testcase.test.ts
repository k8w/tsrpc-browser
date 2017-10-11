import * as assert from 'assert';

// async function delay(ms: number) {
//     return new Promise<void>(rs => {
//         setTimeout(() => { rs(); }, ms);
//     })
// }

describe('Test', function () {
    it('Succ', async function () {
        assert.equal(1,1)
    })

    it('Fail', async function () {
        assert.equal(1, 2)
    })
})