import { runTestSuite, testCases } from './test-utils';

runTestSuite(
    testCases.filter((tc) => tc.isLargeFile),
    'browser',
);
