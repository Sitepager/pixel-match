import { pixelmatch } from '../dist/browser/index.mjs';
import { PNG } from 'pngjs';

import { readImage } from './utils';

const data: [PNG, PNG][] = [1, 2, 3, 4, 5, 6, 7, 9].map((i) => [
    readImage(`${i}a`),
    readImage(`${i}b`),
]);

console.time('match');
let sum = 0;
for (let i = 0; i < 100; i++) {
    for (const [img1, img2] of data) {
        sum += pixelmatch(img1.data, img2.data, null, img1.width, img1.height);
    }
}
console.timeEnd('match');
console.log(sum);
