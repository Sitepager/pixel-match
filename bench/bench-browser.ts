import { pixelmatch } from '../dist/browser/index.mjs';
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

function runBench() {
    console.time('match');
    let pixelDiffs: number[] = [];
    for (let i = 0; i < 10; i++) {
        for (const { img1, img2, options } of cases) {
            const pixelDiff = pixelmatch(
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

runBench();
