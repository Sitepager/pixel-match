import { PNG } from 'pngjs';
import fs from 'node:fs';

export function readImage(name: string): PNG {
    console.time('readImage');
    const val = PNG.sync.read(
        fs.readFileSync(
            new URL('../test/fixtures/' + name + '.png', import.meta.url),
        ),
    );
    console.timeEnd('readImage');
    return val;
}
