import * as storage from '../js/storage.js';
import { it, expect } from './runner.js';

const HEX = /^#[0-9a-fA-F]{6}$/;

it('VERSION is 1', () => {
  expect(storage.VERSION).toBe(1);
});

it('DEFAULT_PRIZES is a valid non-empty set with unique ids', () => {
  const p = storage.DEFAULT_PRIZES;
  expect(Array.isArray(p)).toBe(true);
  expect(p.length >= 6).toBe(true);
  const ids = new Set();
  for (const x of p) {
    expect(typeof x.id === 'string' && x.id.length > 0).toBe(true);
    expect(typeof x.name === 'string' && x.name.length > 0).toBe(true);
    expect(typeof x.weight === 'number' && x.weight > 0).toBe(true);
    expect(HEX.test(x.color)).toBe(true);
    ids.add(x.id);
  }
  expect(ids.size).toBe(p.length);
});

const ok = { version: 1, prizes: [{ id: 'a', name: 'x', weight: 1, color: '#000000' }], history: [] };

it('validate accepts a valid state', () => {
  expect(storage.validate(ok)).toBe(true);
});

it('validate rejects version mismatch', () => {
  expect(storage.validate({ ...ok, version: 2 })).toBe(false);
});

it('validate rejects empty prizes', () => {
  expect(storage.validate({ ...ok, prizes: [] })).toBe(false);
});

it('validate rejects empty name', () => {
  expect(storage.validate({ ...ok, prizes: [{ ...ok.prizes[0], name: '' }] })).toBe(false);
});

it('validate rejects non-positive weight', () => {
  expect(storage.validate({ ...ok, prizes: [{ ...ok.prizes[0], weight: 0 }] })).toBe(false);
  expect(storage.validate({ ...ok, prizes: [{ ...ok.prizes[0], weight: -1 }] })).toBe(false);
});

it('validate rejects non-number weight', () => {
  expect(storage.validate({ ...ok, prizes: [{ ...ok.prizes[0], weight: 'big' }] })).toBe(false);
});

it('validate rejects bad color', () => {
  expect(storage.validate({ ...ok, prizes: [{ ...ok.prizes[0], color: 'red' }] })).toBe(false);
});

it('validate rejects non-array history', () => {
  expect(storage.validate({ ...ok, history: 'x' })).toBe(false);
});

it('validate rejects missing required field', () => {
  expect(storage.validate({ version: 1, prizes: [{ id: 'a', name: 'x', weight: 1 }], history: [] })).toBe(false);
});

// ---- 2.2 load() ----

function installLS(fake) {
  const prev = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try { Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true, writable: true }); }
  catch (e) { /* ignore (e.g. browser read-only) */ }
  return prev;
}
function restoreLS(prev) {
  try {
    if (prev) Object.defineProperty(globalThis, 'localStorage', prev);
    else delete globalThis.localStorage;
  } catch (e) { /* ignore */ }
}
function storeFake(store) {
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
}
function withLS(store, fn) {
  const prev = installLS(storeFake(store));
  try { fn(); } finally { restoreLS(prev); }
}
function withBrokenLS(fn) {
  const prev = installLS({ getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem() {} });
  try { fn(); } finally { restoreLS(prev); }
}

const VALID_PRIZES = [{ id: 'a', name: 'X', weight: 2, color: '#112233' }, { id: 'b', name: 'Y', weight: 3, color: '#445566' }];

it('load returns defaults when key absent', () => {
  withLS({}, () => {
    const s = storage.load();
    expect(s.version).toBe(1);
    expect(s.prizes).toEqual(storage.DEFAULT_PRIZES);
    expect(s.history).toEqual([]);
  });
});

it('load falls back to defaults on corrupt JSON', () => {
  withLS({ 'devflow-wheel:v1': '{not json' }, () => {
    const s = storage.load();
    expect(s.prizes).toEqual(storage.DEFAULT_PRIZES);
    expect(s.history).toEqual([]);
  });
});

it('load falls back to defaults on version mismatch', () => {
  withLS({ 'devflow-wheel:v1': JSON.stringify({ version: 2, prizes: VALID_PRIZES, history: [] }) }, () => {
    const s = storage.load();
    expect(s.prizes).toEqual(storage.DEFAULT_PRIZES);
  });
});

it('load resets history only when prizes valid but history corrupt', () => {
  withLS({ 'devflow-wheel:v1': JSON.stringify({ version: 1, prizes: VALID_PRIZES, history: 'oops' }) }, () => {
    const s = storage.load();
    expect(s.version).toBe(1);
    expect(s.prizes).toEqual(VALID_PRIZES);
    expect(s.history).toEqual([]);
  });
});

it('load round-trips a fully valid stored state', () => {
  const stored = { version: 1, prizes: VALID_PRIZES, history: [{ ts: 123, prizeId: 'a', prizeName: 'X' }] };
  withLS({ 'devflow-wheel:v1': JSON.stringify(stored) }, () => {
    const s = storage.load();
    expect(s).toEqual(stored);
  });
});

it('load is isolated from DEFAULT_PRIZES mutation', () => {
  withLS({}, () => {
    const s = storage.load();
    s.prizes[0].name = 'mutated';
    expect(storage.DEFAULT_PRIZES[0].name).toBe('一等奖');
  });
});

// ---- 2.3 save() ----

it('save then load round-trips equal (incl version)', () => {
  const state = { version: 1, prizes: VALID_PRIZES, history: [{ ts: 9, prizeId: 'a', prizeName: 'X' }] };
  withLS({}, () => {
    storage.save(state);
    expect(storage.load()).toEqual(state);
  });
});

it('save writes a single atomic snapshot key', () => {
  let captured = null;
  const fake = {
    _d: {},
    getItem(k) { return this._d[k] ?? null; },
    setItem(k, v) { this._d[k] = String(v); captured = { k, v: this._d[k] }; },
    removeItem(k) { delete this._d[k]; },
  };
  const prev = installLS(fake);
  try {
    storage.save({ version: 1, prizes: VALID_PRIZES, history: [] });
  } finally { restoreLS(prev); }
  expect(captured.k).toBe('devflow-wheel:v1');
  const parsed = JSON.parse(captured.v);
  expect(parsed.version).toBe(1);
  expect(parsed.prizes).toEqual(VALID_PRIZES);
  expect(parsed.history).toEqual([]);
});

it('save swallows write failures without throwing', () => {
  const state = { version: 1, prizes: VALID_PRIZES, history: [] };
  let threw = false;
  withBrokenLS(() => {
    try { storage.save(state); } catch (e) { threw = true; }
  });
  expect(threw).toBe(false);
});

// ---- 2.4 appendHistory / clearHistory ----

it('appendHistory normalizes entry shape (prizeId defaults to null)', () => {
  const h = storage.appendHistory([], { ts: 1, prizeName: 'A' });
  expect(h.length).toBe(1);
  expect(h[0].ts).toBe(1);
  expect(h[0].prizeId).toBe(null);
  expect(h[0].prizeName).toBe('A');
});

it('appendHistory grows below the cap', () => {
  let h = [];
  h = storage.appendHistory(h, { ts: 1, prizeId: 'a', prizeName: 'A' });
  h = storage.appendHistory(h, { ts: 2, prizeId: 'a', prizeName: 'B' });
  expect(h.length).toBe(2);
  expect(h[1].prizeName).toBe('B');
});

it('appendHistory caps at 50 by evicting oldest', () => {
  let h = [];
  for (let i = 0; i < 60; i++) h = storage.appendHistory(h, { ts: i, prizeId: 'a', prizeName: 'p' + i });
  expect(h.length).toBe(50);
  expect(h[0].prizeName).toBe('p10');
  expect(h[49].prizeName).toBe('p59');
});

it('appendHistory does not mutate the input array', () => {
  const h = [{ ts: 1, prizeId: 'a', prizeName: 'A' }];
  const h2 = storage.appendHistory(h, { ts: 2, prizeId: 'a', prizeName: 'B' });
  expect(h.length).toBe(1);
  expect(h2.length).toBe(2);
  expect(h2 === h).toBe(false);
});

it('appendHistory snapshots the entry (no reference leak)', () => {
  const entry = { ts: 1, prizeId: 'a', prizeName: 'Old' };
  const h = storage.appendHistory([], entry);
  entry.prizeName = 'Changed';
  expect(h[0].prizeName).toBe('Old');
});

it('clearHistory returns an empty array', () => {
  expect(storage.clearHistory()).toEqual([]);
});

it('load resets history when an entry is corrupt (per-entry validation)', () => {
  const stored = { version: 1, prizes: VALID_PRIZES, history: [{ ts: 1, prizeId: 'a', prizeName: 'X' }, { ts: 'bad', prizeId: 'a', prizeName: 'Y' }] };
  withLS({ 'devflow-wheel:v1': JSON.stringify(stored) }, () => {
    const s = storage.load();
    expect(s.prizes).toEqual(VALID_PRIZES);
    expect(s.history).toEqual([]);
  });
});

it('load keeps valid history entries (incl. null prizeId)', () => {
  const hist = [{ ts: 1, prizeId: 'a', prizeName: 'X' }, { ts: 2, prizeId: null, prizeName: 'Y' }];
  withLS({ 'devflow-wheel:v1': JSON.stringify({ version: 1, prizes: VALID_PRIZES, history: hist }) }, () => {
    expect(storage.load().history).toEqual(hist);
  });
});
