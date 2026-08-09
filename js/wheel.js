// wheel.js — Canvas wheel + rAF animation.

import { computeSegments } from './prize-engine.js';

export function easeOutQuart(t) {
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  return 1 - (1 - t) ** 4;
}

function truncateLabel(text, maxWidth, ctx) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + '…').width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? text.slice(0, lo) + '…' : '…';
}

export class Wheel {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rotation = 0;
    this.prizes = [];
    this.size = 400;
  }

  setPrizes(prizes) {
    this.prizes = prizes;
    this.draw();
  }

  getRotation() {
    return this.rotation;
  }

  draw() {
    const ctx = this.ctx;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const size = this.size;
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    if (!this.prizes.length) return;
    const cx = size / 2;
    const cy = size / 2;
    const R = size / 2 - 8;
    const segs = computeSegments(this.prizes);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.font = 'bold 14px sans-serif';

    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const p = this.prizes[i];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, (s.start * Math.PI) / 180, (s.end * Math.PI) / 180);
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate((s.center * Math.PI) / 180);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const label = truncateLabel(p.name, R * 0.62, ctx);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeText(label, R - 8, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, R - 8, 0);
      ctx.restore();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }

  spin(target, durationMs, easing = easeOutQuart) {
    return new Promise((resolve) => {
      const start = performance.now();
      const from = this.rotation;
      const dur = durationMs;
      const step = (now) => {
        let t = (now - start) / dur;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        const eased = easing(t);
        this.rotation = from + (target - from) * eased;
        this.draw();
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          this.rotation = target;
          this.draw();
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  resize() {
    let display = 0;
    try {
      const rect = this.canvas.getBoundingClientRect();
      if (rect && rect.width) display = rect.width;
    } catch (e) { /* ignore */ }
    if (display > 0) this.size = Math.round(display);
    this.draw();
  }
}
