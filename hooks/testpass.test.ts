import { test, expect, describe } from 'claude-code/testing';
import { looksLikePassingTests } from './testpass.js';

describe('looksLikePassingTests', () => {
  const passes = [
    'Tests:       12 passed, 12 total',
    '===== 12 passed in 0.31s =====',
    '12 passed, 0 failed',
    '  5 passing (20ms)',
    'ok  \tgithub.com/acme/pkg\t0.012s',
    'ok  \tgithub.com/acme/pkg\t(cached)',
    'Ran 4 tests in 0.002s\n\nOK',
    'test result: ok. 8 passed; 0 failed; 0 ignored',
    '10 examples, 0 failures',
    'Test Files  3 passed (3)\n     Tests  20 passed (20)',
    'All 7 tests passed',
    '42 tests passed',
  ];
  for (const text of passes) {
    test(`pass: ${JSON.stringify(text).slice(0, 40)}`, async () => {
      expect(looksLikePassingTests(text)).toBe(true);
    });
  }

  const fails = [
    '0 passed, 3 failed',
    'Tests:       3 failed, 10 passed, 13 total',
    '===== 1 failed, 11 passed in 0.4s =====',
    '  5 passing (20ms)\n  1 failing',
    '--- FAIL: TestThing (0.00s)\nFAIL\tgithub.com/acme/pkg\t0.01s\nok  \tgithub.com/acme/other\t0.01s',
    'Ran 4 tests in 0.002s\n\nFAILED (failures=1)',
    'test result: FAILED. 7 passed; 1 failed',
    '10 examples, 2 failures',
    '12 passed, 1 error',
    'not ok 3 - adds numbers\nok 1 - first\n# pass 2',
    '0 passed',
    'no tests ran in 0.01s',
    'ok',
    'everything is ok',
    'Build OK',
    '',
    'Tests: 2 passed, 1 skipped\nAssertionError: expected 1 to be 2',
  ];
  for (const text of fails) {
    test(`not a pass: ${JSON.stringify(text).slice(0, 40)}`, async () => {
      expect(looksLikePassingTests(text)).toBe(false);
    });
  }

  test('non-strings are not a pass', async () => {
    expect(looksLikePassingTests(undefined as any)).toBe(false);
    expect(looksLikePassingTests(12 as any)).toBe(false);
  });
});
