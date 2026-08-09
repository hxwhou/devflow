import * as engine from '../js/prize-engine.js';
import { it, expect } from './runner.js';

const PRIZES = [
  { id: 'a', name: 'A', weight: 1, color: '#000000' },
  { id: 'b', name: 'B', weight: 2, color: '#111111' },
  { id: 'c', name: 'C', weight: 1, color: '#222222' },
];

// ---- 3.1 computeSegments ----

it('computeSegments returns one segment per prize', () => {
  expect(engine.computeSegments(PRIZES).length).toBe(3);
});

it('computeSegments starts at 0', () => {
  expect(engine.computeSegments(PRIZES)[0].start).toBe(0);
});

it('computeSegments arc sum is 360', () => {
  const seg = engine.computeSegments(PRIZES);
  let sum = 0;
  for (const s of seg) sum += s.arc;
  expect(sum).toBeCloseTo(360, 6);
});

it('computeSegments arc_i is proportional to weight', () => {
  const seg = engine.computeSegments(PRIZES);
  const total = 1 + 2 + 1;
  expect(seg[0].arc).toBeCloseTo((1 / total) * 360, 9);
  expect(seg[1].arc).toBeCloseTo((2 / total) * 360, 9);
  expect(seg[2].arc).toBeCloseTo((1 / total) * 360, 9);
});

it('computeSegments segments are contiguous (start_{i+1} === end_i)', () => {
  const seg = engine.computeSegments(PRIZES);
  for (let i = 0; i < seg.length - 1; i++) {
    expect(seg[i + 1].start).toBeCloseTo(seg[i].end, 9);
  }
  expect(seg[seg.length - 1].end).toBeCloseTo(360, 9);
});

it('computeSegments center === start + arc/2', () => {
  const seg = engine.computeSegments(PRIZES);
  for (const s of seg) {
    expect(s.center).toBeCloseTo(s.start + s.arc / 2, 9);
  }
});

it('computeSegments single prize fills the circle', () => {
  const seg = engine.computeSegments([{ id: 'a', name: 'A', weight: 5, color: '#000000' }]);
  expect(seg.length).toBe(1);
  expect(seg[0].start).toBe(0);
  expect(seg[0].arc).toBeCloseTo(360, 9);
  expect(seg[0].end).toBeCloseTo(360, 9);
  expect(seg[0].center).toBeCloseTo(180, 9);
});

// ---- 3.2 pickWinner ----

it('pickWinner returns a valid index', () => {
  const idx = engine.pickWinner(PRIZES);
  expect(idx >= 0 && idx < PRIZES.length).toBe(true);
});

it('pickWinner always returns 0 for a single prize', () => {
  for (let i = 0; i < 100; i++) {
    expect(engine.pickWinner([{ id: 'a', name: 'A', weight: 5, color: '#000000' }])).toBe(0);
  }
});

it('pickWinner distribution matches weights (within 2pp)', () => {
  const weights = [1, 2, 3];
  const pp = weights.map((w) => ({ id: 'p' + w, name: 'p' + w, weight: w, color: '#000000' }));
  const total = 6;
  const counts = [0, 0, 0];
  const N = 10000;
  for (let i = 0; i < N; i++) counts[engine.pickWinner(pp)]++;
  for (let i = 0; i < 3; i++) {
    const freq = counts[i] / N;
    const expected = weights[i] / total;
    expect(Math.abs(freq - expected)).toBeLessThan(0.02);
  }
});

it('pickWinner throws on empty prizes', () => {
  expect(() => engine.pickWinner([])).toThrow();
});

// ---- 3.3 targetRotation ----

const EPS = 3; // epsilon degrees
const POINTER = 270; // top pointer, canvas degrees

function pointerLocal(r) {
  return ((POINTER - r) % 360 + 360) % 360;
}

it('targetRotation returns a value greater than current', () => {
  for (let t = 0; t < 20; t++) {
    const winner = Math.floor(Math.random() * PRIZES.length);
    const current = Math.floor(Math.random() * 5000);
    expect(engine.targetRotation(PRIZES, winner, current)).toBeGreaterThan(current);
  }
});

it('targetRotation adds at least 5 full turns forward each spin', () => {
  for (let t = 0; t < 30; t++) {
    const winner = Math.floor(Math.random() * PRIZES.length);
    const current = Math.floor(Math.random() * 5000);
    const r = engine.targetRotation(PRIZES, winner, current);
    expect(r - current).toBeGreaterThanOrEqual(5 * 360);
  }
});

it('targetRotation lands the pointer inside the winner segment (off separators)', () => {
  for (let t = 0; t < 50; t++) {
    const winner = Math.floor(Math.random() * PRIZES.length);
    const current = Math.floor(Math.random() * 3000);
    const r = engine.targetRotation(PRIZES, winner, current);
    const seg = engine.computeSegments(PRIZES)[winner];
    const local = pointerLocal(r);
    expect(local >= seg.start + EPS - 1e-9).toBe(true);
    expect(local <= seg.end - EPS + 1e-9).toBe(true);
  }
});

it('targetRotation visual=logic seam: pointer falls in the same segment computeSegments reports', () => {
  for (let t = 0; t < 50; t++) {
    const winner = Math.floor(Math.random() * PRIZES.length);
    const r = engine.targetRotation(PRIZES, winner, 0);
    const segs = engine.computeSegments(PRIZES);
    const local = pointerLocal(r);
    let found = -1;
    for (let i = 0; i < segs.length; i++) {
      if (local >= segs[i].start - 1e-9 && local < segs[i].end + 1e-9) { found = i; break; }
    }
    expect(found).toBe(winner);
  }
});

it('targetRotation jitter stays strictly inside (no reference leak to separators)', () => {
  for (let t = 0; t < 50; t++) {
    const winner = Math.floor(Math.random() * PRIZES.length);
    const r = engine.targetRotation(PRIZES, winner, 0);
    const seg = engine.computeSegments(PRIZES)[winner];
    const local = pointerLocal(r);
    expect(local > seg.start + EPS - 1e-6).toBe(true);
    expect(local < seg.end - EPS + 1e-6).toBe(true);
  }
});

it('targetRotation delta=0 when arc <= 2*eps (lands at center)', () => {
  const tinySet = [
    { id: 'tiny', name: 'T', weight: 1, color: '#000000' },      // arc ~0.36deg <= 6
    { id: 'big', name: 'B', weight: 1000, color: '#111111' },
  ];
  for (let t = 0; t < 30; t++) {
    const r = engine.targetRotation(tinySet, 0, 0);
    const seg = engine.computeSegments(tinySet)[0];
    const local = pointerLocal(r);
    const center = ((seg.center % 360) + 360) % 360;
    expect(Math.abs(local - center) < 1e-6).toBe(true);
  }
});

// ---- 3.4 normalizeWeight + DEFAULT_PALETTE ----

it('normalizeWeight keeps valid positive integers', () => {
  expect(engine.normalizeWeight(5)).toBe(5);
  expect(engine.normalizeWeight(100)).toBe(100);
});

it('normalizeWeight clamps non-positive to 1', () => {
  expect(engine.normalizeWeight(0)).toBe(1);
  expect(engine.normalizeWeight(-3)).toBe(1);
});

it('normalizeWeight clamps NaN to 1', () => {
  expect(engine.normalizeWeight(NaN)).toBe(1);
});

it('normalizeWeight rounds floats', () => {
  expect(engine.normalizeWeight(2.7)).toBe(3);
  expect(engine.normalizeWeight(2.1)).toBe(2);
});

it('DEFAULT_PALETTE has at least 6 valid hex colors', () => {
  const HEX = /^#[0-9a-fA-F]{6}$/;
  expect(Array.isArray(engine.DEFAULT_PALETTE)).toBe(true);
  expect(engine.DEFAULT_PALETTE.length >= 6).toBe(true);
  for (const c of engine.DEFAULT_PALETTE) expect(HEX.test(c)).toBe(true);
});
