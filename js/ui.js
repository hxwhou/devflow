// ui.js — DOM panels (edit / history / result modal).

import { normalizeWeight } from './prize-engine.js';
import { DEFAULT_PALETTE } from './prize-engine.js';

export function renderPrizes(listEl, prizes, handlers) {
  listEl.innerHTML = '';
  prizes.forEach((p, i) => {
    const li = document.createElement('li');
    li.className = 'prize-item';

    const color = document.createElement('input');
    color.type = 'color';
    color.value = p.color;
    color.className = 'prize-color';
    color.title = '颜色';
    color.addEventListener('change', () => handlers.onEdit(i, { color: color.value }));

    const name = document.createElement('input');
    name.type = 'text';
    name.value = p.name;
    name.title = '名称';
    name.addEventListener('input', () => {
      name.classList.remove('invalid');
      const m = document.getElementById('edit-msg');
      if (m) m.textContent = '';
    });
    name.addEventListener('change', () => {
      const v = name.value.trim();
      const m = document.getElementById('edit-msg');
      if (!v) {
        name.value = p.name;
        name.classList.add('invalid');
        if (m) m.textContent = '名称不能为空';
        return;
      }
      name.classList.remove('invalid');
      if (m) m.textContent = '';
      handlers.onEdit(i, { name: v });
    });

    const weight = document.createElement('input');
    weight.type = 'number';
    weight.value = p.weight;
    weight.min = 1;
    weight.step = 1;
    weight.title = '权重(越大越易中)';
    weight.style.width = '70px';
    weight.addEventListener('change', () => {
      const w = normalizeWeight(weight.value);
      weight.value = w;
      handlers.onEdit(i, { weight: w });
    });

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del-prize';
    del.textContent = '删除';
    del.disabled = prizes.length <= 1;
    del.title = prizes.length <= 1 ? '至少保留一个奖品' : '删除';
    del.addEventListener('click', () => handlers.onDelete(i));

    li.append(color, name, weight, del);
    listEl.appendChild(li);
  });
}

export function renderHistory(listEl, emptyEl, history) {
  listEl.innerHTML = '';
  if (emptyEl) emptyEl.style.display = history.length ? 'none' : '';
  history.forEach((e) => {
    const li = document.createElement('li');
    const time = document.createElement('span');
    time.className = 'h-time';
    time.textContent = fmtTime(e.ts);
    li.append(time, document.createTextNode(e.prizeName));
    listEl.appendChild(li);
  });
}

function fmtTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function showResult(name, { onAgain, onClose } = {}) {
  const modal = document.getElementById('result');
  document.getElementById('result-text').textContent = name;
  modal.classList.remove('hidden');
  const again = document.getElementById('result-again');
  const close = document.getElementById('result-close');
  again.onclick = () => { hideResult(); if (onAgain) onAgain(); };
  close.onclick = () => { hideResult(); if (onClose) onClose(); };
}

export function hideResult() {
  const modal = document.getElementById('result');
  if (modal) modal.classList.add('hidden');
}

export function setSpinning(disabled) {
  const spin = document.getElementById('spin');
  if (spin) spin.disabled = disabled;
  document.querySelectorAll('#add-prize, #reset-default, #clear-history, .del-prize, .prize-item input').forEach((el) => {
    el.disabled = disabled;
  });
}

export function nextColor(prevColor, index) {
  const len = DEFAULT_PALETTE.length;
  for (let off = 0; off < len; off++) {
    const c = DEFAULT_PALETTE[(index + off) % len];
    if (c !== prevColor) return c;
  }
  return DEFAULT_PALETTE[index % len];
}
