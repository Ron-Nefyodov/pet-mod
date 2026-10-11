const FAILURE_PATTERNS = [
  /\b[1-9]\d*\s+(failed|failing|failures?|errors?|errored)\b/i,
  /\b[1-9]\d*\s+tests?\s+failed\b/i,
  /\bfail(?:ures|ed)?\s*[:=]\s*[1-9]/i,
  /\bFAIL(?:ED)?\b/,
  /^\s*not ok\b/m,
  /\bAssertionError\b|\bpanic:|Traceback \(most recent call last\)/,
];

const PASS_PATTERNS = [
  /\b[1-9]\d*\s+(passed|passing)\b/i,
  /\b[1-9]\d*\s+tests?\s+passed\b/i,
  /^ok\s+\S+\s+(\(cached\)|\d+(\.\d+)?s)/m,
  /^OK(\s+\(.*\))?\s*$/m,
  /\btest result: ok\./,
  /\b[1-9]\d*\s+examples?,\s+0\s+failures\b/,
];

export function looksLikePassingTests(text) {
  if (typeof text !== 'string' || text === '') return false;
  if (FAILURE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  return PASS_PATTERNS.some((pattern) => pattern.test(text));
}

export function bashOutputOf(result) {
  if (!result || result.deny || result.isError) return '';
  const record = result.result;
  const streams = record && typeof record === 'object'
    ? [record.stdout, record.stderr].filter((s) => typeof s === 'string').join('\n')
    : '';
  return streams || (typeof result.text === 'string' ? result.text : '');
}
