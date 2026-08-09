// wheel.js — Canvas wheel + rAF animation (scaffold). Implemented in tasks 4.1–4.3.

export function easeOutQuart(t) {
  throw new Error('not implemented: wheel.easeOutQuart');
}

export class Wheel {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rotation = 0;
    this.prizes = [];
  }

  setPrizes(prizes) {
    throw new Error('not implemented: Wheel.setPrizes');
  }

  getRotation() {
    throw new Error('not implemented: Wheel.getRotation');
  }

  draw() {
    throw new Error('not implemented: Wheel.draw');
  }

  spin(target, durationMs, easing) {
    throw new Error('not implemented: Wheel.spin');
  }

  resize() {
    throw new Error('not implemented: Wheel.resize');
  }
}
