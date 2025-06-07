import pixelmatch from '../src';
import { PNG } from 'pngjs';
import fs from 'node:fs';

function readImage(name: string): PNG {
    return PNG.sync.read(
        fs.readFileSync(
            new URL('../test/fixtures/' + name + '.png', import.meta.url),
        ),
    );
}

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
