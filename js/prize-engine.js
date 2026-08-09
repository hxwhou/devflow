// prize-engine.js — pure logic (scaffold). Implemented in tasks 3.1–3.4.

export function computeSegments(prizes) {
  let total = 0;
  for (const p of prizes) total += p.weight;
  let acc = 0;
  const segs = [];
  for (const p of prizes) {
    const arc = (p.weight / total) * 360;
    const start = acc;
    const end = acc + arc;
    segs.push({ start, end, center: start + arc / 2, arc });
    acc = end;
  }
  return segs;
}

export function pickWinner(prizes) {
  if (!Array.isArray(prizes) || prizes.length === 0) throw new Error('pickWinner: empty prizes');
  let total = 0;
  for (const p of prizes) total += p.weight;
  let r = Math.random() * total;
  for (let i = 0; i < prizes.length; i++) {
    r -= prizes[i].weight;
    if (r < 0) return i;
  }
  return prizes.length - 1;
}

export function targetRotation(prizes, winnerIndex, currentRotation) {
  const EPS = 3;
  const POINTER = 270;
  const seg = computeSegments(prizes)[winnerIndex];
  const arc = seg.arc;
  const delta = arc > 2 * EPS ? (Math.random() * 2 - 1) * (arc / 2 - EPS) : 0;
  const base = (((POINTER - (seg.center + delta)) % 360) + 360) % 360;
  const k = 5 + Math.ceil((currentRotation - base) / 360);
  return base + 360 * k;
}

export const DEFAULT_PALETTE = [
  '#e74c3c', '#f39c12', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#34495e',
];

export function normalizeWeight(x) {
  return Math.max(1, Math.round(Number(x) || 0));
}
