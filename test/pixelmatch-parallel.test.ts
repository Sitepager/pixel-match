import { diffTestAsync } from './test-utils';

function runAllParallelTests() {
    diffTestAsync(
        '10main',
        '10baseline',
        '10main-diff',
        { horizontalShiftPixels: 0, verticalShiftPixels: 50, threshold: 0.1 },
        70240,
        false,
    );

    diffTestAsync(
        '10main',
        '10baseline',
        '10main-original-diff',
        { horizontalShiftPixels: 0, verticalShiftPixels: 0, threshold: 0.1 },
        1935304,
        false,
    );
}

// --- run tests on small files ---
runAllParallelTests();
