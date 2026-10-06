/*
 * Turntable AudioWorklet (P-13/P-16 real scratching).
 *
 * Holds one decoded track and a playhead measured in source samples. Every
 * output sample the playhead advances by `rate` (1 = normal speed, 0 = held
 * still, negative = backwards). `rate` eases toward a target:
 *   - the motor (1 playing / 0 stopped): ~120ms spin-up, ~60ms brake, or
 *   - the hand (the record's speed while it's being touched) with ~10ms;
 *     letting go of a record whose motor is off stops it at the same speed.
 * A DC blocker keeps a stopped record silent (no held sample, no click).
 * Samples are read with 4-point Hermite interpolation so slow and reversed
 * drags stay clean.
 *
 * Messages in:  {type:"buffer", channels:Float32Array[], sampleRate}
 *               {type:"motor", on:boolean} {type:"seek", seconds}
 *               {type:"scratch", rate:number|null}
 * Messages out: {type:"pos", seconds, rate} (~30Hz) and {type:"ended"}
 */
const MOTOR_TAU = 0.12;
const BRAKE_TAU = 0.06;
const HAND_TAU = 0.01;

function hermite(d, i, frac) {
  const n = d.length;
  const x0 = d[i > 0 ? i - 1 : 0];
  const x1 = d[i];
  const x2 = d[i + 1 < n ? i + 1 : n - 1];
  const x3 = d[i + 2 < n ? i + 2 : n - 1];
  const c1 = 0.5 * (x2 - x0);
  const c2 = x0 - 2.5 * x1 + 2 * x2 - 0.5 * x3;
  const c3 = 0.5 * (x3 - x0) + 1.5 * (x1 - x2);
  return ((c3 * frac + c2) * frac + c1) * frac + x1;
}

class Turntable extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ch = null;
    this.len = 0;
    this.srcRate = sampleRate;
    this.pos = 0;
    this.rate = 0;
    this.motor = 0;
    this.hand = null;
    this.ended = false;
    this.snap = false; // released with the motor off: stop at hand speed
    this.dc = [0, 0, 0, 0]; // DC blocker state per channel: x1, y1
    this.sinceReport = 0;
    this.port.onmessage = ({ data: m }) => {
      if (m.type === "buffer") {
        this.ch = m.channels;
        this.len = m.channels[0].length;
        this.srcRate = m.sampleRate;
        this.pos = 0;
        this.rate = 0;
        this.ended = false;
      } else if (m.type === "motor") {
        this.motor = m.on ? 1 : 0;
        if (m.on) {
          this.ended = false;
          this.snap = false;
        }
      } else if (m.type === "seek") {
        this.pos = Math.max(0, Math.min(this.len - 1, m.seconds * this.srcRate));
        this.ended = false;
      } else if (m.type === "scratch") {
        if (m.rate === null && this.hand !== null && !this.motor) this.snap = true;
        this.hand = m.rate;
      }
    };
  }

  process(_inputs, outputs) {
    const out = outputs[0];
    const frames = out[0].length;
    if (!this.ch) {
      for (const c of out) c.fill(0);
      return true;
    }
    const ratio = this.srcRate / sampleRate;
    const target = this.hand !== null ? this.hand : this.motor;
    const tau = this.hand !== null || this.snap ? HAND_TAU : this.motor ? MOTOR_TAU : BRAKE_TAU;
    const k = 1 - Math.exp(-1 / (tau * sampleRate));
    const dc = this.dc;
    const last = this.len - 1;
    const L = this.ch[0];
    const R = this.ch[1] || this.ch[0];
    for (let f = 0; f < frames; f++) {
      this.rate += (target - this.rate) * k;
      if (target === 0 && Math.abs(this.rate) < 0.02) this.rate = 0; // a platter comes to rest
      let p = this.pos + this.rate * ratio;
      if (p < 0) p = 0;
      if (p >= last) {
        p = last;
        if (this.hand === null && this.motor && !this.ended) {
          this.ended = true;
          this.motor = 0;
          this.port.postMessage({ type: "ended" });
        }
      }
      this.pos = p;
      const i = p | 0;
      const frac = p - i;
      const l = hermite(L, i, frac);
      const r = R === L ? l : hermite(R, i, frac);
      // one-pole DC blocker (~7Hz): y = x − x1 + 0.999·y1
      const yl = l - dc[0] + 0.999 * dc[1];
      dc[0] = l;
      dc[1] = yl;
      const yr = r - dc[2] + 0.999 * dc[3];
      dc[2] = r;
      dc[3] = yr;
      out[0][f] = yl;
      if (out[1]) out[1][f] = yr;
    }
    if (this.snap && Math.abs(this.rate) < 1e-4) this.snap = false;
    this.sinceReport += frames;
    if (this.sinceReport >= sampleRate / 30) {
      this.sinceReport = 0;
      this.port.postMessage({ type: "pos", seconds: this.pos / this.srcRate, rate: this.rate });
    }
    return true;
  }
}

registerProcessor("turntable", Turntable);
