import * as wheel from '../js/wheel.js';
import { it, expect } from './runner.js';

// ---- 4.2 easeOutQuart (pure) ----

it('easeOutQuart endpoints are 0 and 1', () => {
  expect(wheel.easeOutQuart(0)).toBe(0);
  expect(wheel.easeOutQuart(1)).toBe(1);
});

it('easeOutQuart(0.5) = 1 - 0.5^4 = 0.9375', () => {
  expect(wheel.easeOutQuart(0.5)).toBeCloseTo(0.9375, 9);
});

it('easeOutQuart is monotonic non-decreasing on [0,1]', () => {
  let prev = wheel.easeOutQuart(0);
  for (let i = 1; i <= 20; i++) {
    const v = wheel.easeOutQuart(i / 20);
    expect(v >= prev - 1e-12).toBe(true);
    prev = v;
  }
});

it('easeOutQuart clamps t outside [0,1]', () => {
  expect(wheel.easeOutQuart(-0.5)).toBe(0);
  expect(wheel.easeOutQuart(1.5)).toBe(1);
});
