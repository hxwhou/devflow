// storage.js — localStorage layer.

export const VERSION = 1;
const KEY = 'devflow-wheel:v1';
const HEX = /^#[0-9a-fA-F]{6}$/;

export const DEFAULT_PRIZES = [
  { id: 'p1', name: '一等奖', weight: 1, color: '#e74c3c' },
  { id: 'p2', name: '二等奖', weight: 2, color: '#f39c12' },
  { id: 'p3', name: '三等奖', weight: 3, color: '#f1c40f' },
  { id: 'p4', name: '幸运奖', weight: 5, color: '#2ecc71' },
  { id: 'p5', name: '鼓励奖', weight: 6, color: '#1abc9c' },
  { id: 'p6', name: '小奖', weight: 8, color: '#3498db' },
  { id: 'p7', name: '谢谢参与', weight: 12, color: '#9b59b6' },
  { id: 'p8', name: '再接再厉', weight: 15, color: '#34495e' },
];

function isValidPrize(p) {
  if (!p || typeof p !== 'object') return false;
  if (typeof p.id !== 'string' || p.id.length === 0) return false;
  if (typeof p.name !== 'string' || p.name.length === 0) return false;
  if (typeof p.weight !== 'number' || !(p.weight > 0) || Number.isNaN(p.weight)) return false;
  if (typeof p.color !== 'string' || !HEX.test(p.color)) return false;
  return true;
}

function isValidEntry(e) {
  if (!e || typeof e !== 'object') return false;
  if (typeof e.ts !== 'number') return false;
  if (e.prizeId !== null && typeof e.prizeId !== 'string') return false;
  if (typeof e.prizeName !== 'string') return false;
  return true;
}

function clonePrize(p) {
  return { id: p.id, name: p.name, weight: p.weight, color: p.color };
}

function cloneEntry(e) {
  return { ts: e.ts, prizeId: e.prizeId ?? null, prizeName: e.prizeName };
}

function defaultState() {
  return { version: VERSION, prizes: DEFAULT_PRIZES.map(clonePrize), history: [] };
}

function readRaw() {
  try {
    const ls = globalThis.localStorage;
    return ls ? ls.getItem(KEY) : null;
  } catch (e) {
    return null;
  }
}

export function validate(state) {
  if (!state || typeof state !== 'object') return false;
  if (state.version !== VERSION) return false;
  const prizes = state.prizes;
  if (!Array.isArray(prizes) || prizes.length === 0) return false;
  if (!prizes.every(isValidPrize)) return false;
  if (!Array.isArray(state.history)) return false;
  return true;
}

export function load() {
  const raw = readRaw();
  if (raw == null) return defaultState();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.warn('[storage] corrupt JSON, falling back to defaults');
    return defaultState();
  }
  if (!parsed || typeof parsed !== 'object') {
    console.warn('[storage] invalid state, falling back to defaults');
    return defaultState();
  }
  const versionOk = parsed.version === VERSION;
  const prizesOk = Array.isArray(parsed.prizes) && parsed.prizes.length > 0 && parsed.prizes.every(isValidPrize);
  if (versionOk && prizesOk) {
    let history = [];
    if (Array.isArray(parsed.history)) {
      if (parsed.history.every(isValidEntry)) {
        history = parsed.history.map(cloneEntry);
      } else {
        console.warn('[storage] history entry corrupt, resetting history');
      }
    } else {
      console.warn('[storage] history corrupt, resetting history only');
    }
    return { version: VERSION, prizes: parsed.prizes.map(clonePrize), history };
  }
  console.warn('[storage] invalid state, falling back to defaults');
  return defaultState();
}

export function save(state) {
  let ls;
  try {
    ls = globalThis.localStorage;
  } catch (e) {
    ls = null;
  }
  if (!ls) return;
  try {
    ls.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[storage] save failed:', e?.message ?? e);
  }
}

export function appendHistory(history, entry) {
  const normalized = { ts: entry.ts, prizeId: entry.prizeId ?? null, prizeName: entry.prizeName };
  return history.slice(-49).concat([normalized]);
}

export function clearHistory() {
  return [];
}
