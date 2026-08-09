// app.js — bootstrap + event wiring.

import * as storage from './storage.js';
import * as engine from './prize-engine.js';
import { Wheel } from './wheel.js';
import { renderPrizes, renderHistory, showResult, setSpinning, nextColor } from './ui.js';

const REDUCED = (typeof matchMedia !== 'undefined') && matchMedia('(prefers-reduced-motion: reduce)').matches;
const DURATION = REDUCED ? 600 : 4500;

const state = { version: storage.VERSION, prizes: [], history: [] };
let wheel;

function persist() {
  state.version = storage.VERSION;
  storage.save(state);
}

function refreshEdit() {
  renderPrizes(document.getElementById('prize-list'), state.prizes, {
    onEdit: (i, patch) => {
      Object.assign(state.prizes[i], patch);
      wheel.setPrizes(state.prizes);
      persist();
    },
    onDelete: (i) => {
      state.prizes.splice(i, 1);
      wheel.setPrizes(state.prizes);
      persist();
      refreshEdit();
    },
  });
}

function refreshHistory() {
  renderHistory(document.getElementById('history-list'), document.getElementById('history-empty'), state.history);
}

function addPrize() {
  const prev = state.prizes[state.prizes.length - 1] && state.prizes[state.prizes.length - 1].color;
  state.prizes.push({
    id: 'p' + Date.now() + Math.floor(Math.random() * 1000),
    name: '新奖品',
    weight: 1,
    color: nextColor(prev, state.prizes.length),
  });
  wheel.setPrizes(state.prizes);
  persist();
  refreshEdit();
}

function resetDefault() {
  if (!confirm('恢复为默认奖品配置?当前配置将被覆盖。')) return;
  state.prizes = storage.DEFAULT_PRIZES.map((p) => ({ id: p.id, name: p.name, weight: p.weight, color: p.color }));
  wheel.setPrizes(state.prizes);
  persist();
  refreshEdit();
}

function clearHistory() {
  if (!confirm('清空全部抽奖历史?')) return;
  state.history = storage.clearHistory();
  persist();
  refreshHistory();
}

async function doSpin() {
  const spin = document.getElementById('spin');
  if (spin.disabled) return;
  setSpinning(true);
  const winner = engine.pickWinner(state.prizes);
  const target = engine.targetRotation(state.prizes, winner, wheel.getRotation());
  await wheel.spin(target, DURATION);
  const prize = state.prizes[winner];
  state.history = storage.appendHistory(state.history, { ts: Date.now(), prizeId: prize.id, prizeName: prize.name });
  persist();
  refreshHistory();
  showResult(prize.name, {
    onAgain: () => { setSpinning(false); doSpin(); },
    onClose: () => { setSpinning(false); },
  });
}

function init() {
  const loaded = storage.load();
  state.version = loaded.version;
  state.prizes = loaded.prizes;
  state.history = loaded.history;

  wheel = new Wheel(document.getElementById('wheel'));
  wheel.setPrizes(state.prizes);
  wheel.resize();

  refreshEdit();
  refreshHistory();

  document.getElementById('spin').addEventListener('click', doSpin);
  document.getElementById('add-prize').addEventListener('click', addPrize);
  document.getElementById('reset-default').addEventListener('click', resetDefault);
  document.getElementById('clear-history').addEventListener('click', clearHistory);

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => wheel.resize(), 120);
  });
}

init();
