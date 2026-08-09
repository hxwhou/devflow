// tests/runner.js — minimal zero-dependency test runner.

const tests = [];

export function it(name, fn) {
  tests.push({ name, fn });
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a == null || b == null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

function fmt(v) {
  try { return JSON.stringify(v); } catch { return String(v); }
}

export function expect(actual) {
  const api = {
    toBe: (expected) => {
      if (actual !== expected) throw new Error(`expected ${fmt(expected)}, got ${fmt(actual)}`);
      return api;
    },
    toEqual: (expected) => {
      if (!deepEqual(actual, expected)) throw new Error(`expected ${fmt(expected)}, got ${fmt(actual)}`);
      return api;
    },
    toBeCloseTo: (expected, digits = 9) => {
      if (Math.abs(actual - expected) > Math.pow(10, -digits)) throw new Error(`expected ~${expected}, got ${actual}`);
      return api;
    },
    toBeGreaterThan: (n) => {
      if (!(actual > n)) throw new Error(`expected > ${n}, got ${actual}`);
      return api;
    },
    toBeGreaterThanOrEqual: (n) => {
      if (!(actual >= n)) throw new Error(`expected >= ${n}, got ${actual}`);
      return api;
    },
    toBeLessThan: (n) => {
      if (!(actual < n)) throw new Error(`expected < ${n}, got ${actual}`);
      return api;
    },
    toBeTrue: () => {
      if (actual !== true) throw new Error(`expected true, got ${fmt(actual)}`);
      return api;
    },
    toBeTruthy: () => {
      if (!actual) throw new Error(`expected truthy, got ${fmt(actual)}`);
      return api;
    },
    toBeInRange: (lo, hi) => {
      if (!(actual >= lo && actual <= hi)) throw new Error(`expected in [${lo}, ${hi}], got ${actual}`);
      return api;
    },
    toThrow: () => {
      if (typeof actual !== 'function') throw new Error('expected a function');
      try { actual(); } catch { return api; }
      throw new Error('expected to throw, but did not');
    },
  };
  return api;
}

export function run(targetId = 'results') {
  let passed = 0;
  const failed = [];
  for (const t of tests) {
    try {
      t.fn();
      passed++;
    } catch (e) {
      failed.push({ name: t.name, error: e?.message ?? String(e) });
    }
  }
  const summary = `${passed} passed / ${failed.length} failed (${tests.length} total)`;
  const failLines = failed.map((f) => `  ✗ ${f.name}\n      ${f.error}`).join('\n');
  const out = `${summary}\n${failLines}`;
  const el = typeof document !== 'undefined' ? document.getElementById(targetId) : null;
  if (el) el.textContent = out;
  console.log(out);
  if (typeof document !== 'undefined') document.title = `${passed}/${tests.length}`;
  return { passed, failed: failed.length, total: tests.length };
}
