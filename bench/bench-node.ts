import { pixelmatch } from '../dist/node/index.mjs';
import { readImage } from './utils';

const caseOne = {
    img1: readImage('10main'),
    img2: readImage('10baseline'),
    options: {
        horizontalShiftPixels: 0,
        verticalShiftPixels: 50,
        threshold: 0.1,
    },
};

const caseTwo = {
    img1: readImage('10main'),
    img2: readImage('10baseline'),
    options: {
        horizontalShiftPixels: 0,
        verticalShiftPixels: 0,
        threshold: 0.1,
    },
};

const cases = [caseOne, caseTwo];

async function runBench() {
    console.time('match');
    let pixelDiffs: number[] = [];
    for (let i = 0; i < 10; i++) {
        for (const { img1, img2, options } of cases) {
            const pixelDiff = await pixelmatch(
                img1.data,
                img2.data,
                null,
                img1.width,
                img1.height,
                options,
            );
            pixelDiffs.push(pixelDiff);
        }
    }
    console.timeEnd('match');
    console.log(pixelDiffs);
}

runBench().finally(() => {
    process.exit(0);
});
