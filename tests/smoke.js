// tests/smoke.js — standalone headless integration smoke (NOT part of the unit suite).
// Mocks DOM/canvas/rAF so app.js init() + one spin run without a browser.
// Run: node tests/smoke.js
// Visual correctness still requires a real browser (task 7.1).

function noop() {}

function makeCtx() {
  return {
    save: noop, restore: noop, translate: noop, rotate: noop,
    beginPath: noop, moveTo: noop, arc: noop, closePath: noop,
    fill: noop, stroke: noop, fillText: noop, strokeText: noop,
    setTransform: noop, clearRect: noop,
    measureText: () => ({ width: 10 }),
    font: '', fillStyle: '', strokeStyle: '', lineWidth: 0, textAlign: '', textBaseline: '',
  };
}

function makeEl(tag) {
  const el = {
    tagName: tag || 'div',
    style: {},
    classList: { add: noop, remove: noop, contains: () => false },
    children: [],
    value: '', textContent: '', disabled: false, onclick: null,
    width: 400, height: 400,
    _listeners: {},
    getContext: () => makeCtx(),
    getBoundingClientRect: () => ({ width: 400, height: 400, left: 0, top: 0, right: 400, bottom: 400 }),
    setAttribute: noop, getAttribute: () => null,
    appendChild: (c) => { el.children.push(c); },
    append: (...cs) => { el.children.push(...cs); },
    querySelectorAll: () => [],
    addEventListener: (ev, fn) => { el._listeners[ev] = fn; },
    removeEventListener: noop,
    focus: noop,
  };
  return el;
}

const els = {};
globalThis.document = {
  getElementById: (id) => { if (!els[id]) els[id] = makeEl(id === 'wheel' ? 'canvas' : 'div'); return els[id]; },
  createElement: (tag) => makeEl(tag),
  createTextNode: (t) => ({ textContent: t, nodeType: 3 }),
  querySelectorAll: () => [],
  title: '',
};
globalThis.window = {
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false }),
  addEventListener: noop,
};
globalThis.matchMedia = globalThis.window.matchMedia;
let _now = 0;
globalThis.performance = { now: () => { _now += 5000; return _now; } };
globalThis.requestAnimationFrame = (cb) => { cb(globalThis.performance.now()); return 1; };
globalThis.confirm = () => true;
globalThis.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] ?? null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
};

let failed = false;
try {
  await import('../js/app.js');
  const spin = globalThis.document.getElementById('spin');
  if (spin._listeners.click) {
    await spin._listeners.click();
  }
  const resultText = globalThis.document.getElementById('result-text').textContent;
  if (!resultText) throw new Error('result modal text empty after spin');
  const modalHidden = globalThis.document.getElementById('result').classList.contains('hidden');
  console.log(`SMOKE OK: init + spin ran; result=${JSON.stringify(resultText)}; modal hidden=${modalHidden}`);
} catch (e) {
  failed = true;
  console.error('SMOKE FAIL:', e && e.stack ? e.stack : e);
}
if (failed) process.exitCode = 1;
