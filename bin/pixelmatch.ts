#!/usr/bin/env node
import { Command } from 'commander';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import { pixelmatch, PixelmatchOptions } from '../src/node/index.js';
import { version } from '../package.json';

const program = new Command();

program
    .name('pixelmatch')
    .description('Compare two PNG images and optionally output a diff image.')
    .version(version)
    .argument('<image1>', 'First PNG image path')
    .argument('<image2>', 'Second PNG image path')
    .option('-o, --output <diff>', 'Output diff PNG image path')
    .option('-t, --threshold <number>', 'Matching threshold (0-1)', parseFloat)
    .option('--include-aa', 'Detect and ignore anti-aliased pixels', false)
    .option('--no-include-aa', 'Do not ignore anti-aliased pixels')
    .option(
        '--horizontal-shift <pixels>',
        'Horizontal shift in pixels',
        parseInt,
    )
    .option('--vertical-shift <pixels>', 'Vertical shift in pixels', parseInt)
    .option('--alpha <number>', 'Alpha value for diff mask (0-1)', parseFloat)
    .option('--diff-mask', 'Output only the diff mask', false)
    .option('--help-options', 'Show all pixelmatch options and exit')
    .showHelpAfterError();

program.action(async (image1, image2, options) => {
    if (options.helpOptions) {
        console.log('Pixelmatch options:');
        console.log(
            '  -t, --threshold <number>         Matching threshold (0-1)',
        );
        console.log(
            '  --include-aa/--no-include-aa     Detect and ignore anti-aliased pixels',
        );
        console.log(
            '  --horizontal-shift <pixels>      Horizontal shift in pixels',
        );
        console.log(
            '  --vertical-shift <pixels>        Vertical shift in pixels',
        );
        console.log(
            '  --alpha <number>                 Alpha value for diff mask (0-1)',
        );
        console.log(
            '  --diff-mask                      Output only the diff mask',
        );
        process.exit(0);
    }

    let img1, img2;
    try {
        img1 = PNG.sync.read(fs.readFileSync(image1));
    } catch (e) {
        console.error(`Failed to read image1: ${image1}`);
        process.exit(1);
    }
    try {
        img2 = PNG.sync.read(fs.readFileSync(image2));
    } catch (e) {
        console.error(`Failed to read image2: ${image2}`);
        process.exit(1);
    }

    const { width, height } = img1;
    if (img2.width !== width || img2.height !== height) {
        console.error(
            `Image dimensions do not match: ${width}x${height} vs ${img2.width}x${img2.height}`,
        );
        process.exit(2);
    }

    const diff = options.output ? new PNG({ width, height }) : null;
    const pmOptions: PixelmatchOptions = {};
    if (options.threshold !== undefined)
        pmOptions.threshold = options.threshold;
    if (options.includeAa !== undefined)
        pmOptions.includeAA = options.includeAa;
    if (options.horizontalShift !== undefined)
        pmOptions.horizontalShiftPixels = options.horizontalShift;
    if (options.verticalShift !== undefined)
        pmOptions.verticalShiftPixels = options.verticalShift;
    if (options.alpha !== undefined) pmOptions.alpha = options.alpha;
    if (options.diffMask !== undefined) pmOptions.diffMask = options.diffMask;

    try {
        console.time('matched in');
        const diffs = await pixelmatch(
            img1.data,
            img2.data,
            diff ? diff.data : null,
            width,
            height,
            pmOptions,
        );
        console.timeEnd('matched in');
        console.log(`pixel diff count: ${diffs}`);
        console.log(
            `pixel diff percentage: ${Math.round((100 * 100 * diffs) / (width * height)) / 100}%`,
        );
        if (diff && options.output) {
            fs.writeFileSync(options.output, PNG.sync.write(diff));
            console.log(`Diff image written to ${options.output}`);
        }
        process.exit(diffs ? 66 : 0);
    } catch (err) {
        console.error('Error running pixelmatch:', err);
        process.exit(3);
    }
});

program.parseAsync(process.argv);
