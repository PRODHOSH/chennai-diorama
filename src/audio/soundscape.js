import { state } from '../core/state.js';

/**
 * CULTURAL SOUNDSCAPE — synthesised entirely in the browser with Web Audio.
 * No recordings are used, so there are no licensing questions; the UI says so.
 *  - city bed: filtered noise "traffic wash" + occasional two-stroke auto putter + horn beeps
 *  - railway: two-tone train horn and wheel rhythm, louder near Central
 *  - temple bells: inharmonic FM bell near temples (Margazhi / everyday mornings)
 *  - tanpura drone (Sa–Pa–Sa–Sa) for Margazhi and the music hall story
 *  - Deepavali: distant crackers; fireworks booms are triggered by the visual bursts
 * Nothing plays until the visitor turns sound on.
 */
export class Soundscape {
  constructor() { this.on = false; this.vol = 0.6; this.ctx = null; this.listener = { x: 0, z: 0, dist: 1000 }; }

  init() {
    if (this.ctx) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain(); this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    // reverb send (simple generated impulse)
    this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(2.4);
    this.verbGain = ctx.createGain(); this.verbGain.gain.value = 0.35;
    this.verb.connect(this.verbGain).connect(this.master);

    // city bed: brown noise through a low-pass
    const noise = ctx.createBufferSource(); noise.buffer = this.noiseBuffer(4, 'brown'); noise.loop = true;
    this.bedFilter = ctx.createBiquadFilter(); this.bedFilter.type = 'lowpass'; this.bedFilter.frequency.value = 520;
    this.bed = ctx.createGain(); this.bed.gain.value = 0.0;
    noise.connect(this.bedFilter).connect(this.bed).connect(this.master);
    noise.start();
    // tanpura drone
    this.drone = ctx.createGain(); this.drone.gain.value = 0;
    this.drone.connect(this.master); this.drone.connect(this.verb);
    this.startTanpura();
    this.loop();
  }

  noiseBuffer(sec, color = 'white') {
    const ctx = this.ctx, n = ctx.sampleRate * sec, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (color === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }
  impulse(sec) {
    const ctx = this.ctx, n = ctx.sampleRate * sec, b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    return b;
  }

  setOn(on) {
    this.on = on;
    if (on) { this.init(); this.ctx.resume(); if (this.weatherKind) this.setWeather(this.weatherKind); }
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? this.vol : 0, t, 0.4);
  }
  setVolume(v) { this.vol = v; if (this.on && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1); }

  /** monsoon: a bed of filtered white noise; storm adds weight */
  setWeather(w) {
    this.weatherKind = w;
    if (!this.ctx) return;
    if (!this.rainGain) {
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuffer(3); src.loop = true;
      const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
      this.rainGain = this.ctx.createGain(); this.rainGain.gain.value = 0;
      src.connect(hp).connect(lp).connect(this.rainGain).connect(this.master); src.start();
    }
    const g = w === 'storm' ? 0.38 : w === 'rain' ? 0.24 : 0;
    this.rainGain.gain.setTargetAtTime(g, this.ctx.currentTime, 1.2);
  }

  thunder(delayMs = 800) {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delayMs / 1000;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer(4, 'brown');
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(420, t); lp.frequency.exponentialRampToValueAtTime(60, t + 3.5);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9 * Math.max(0.3, 1 - delayMs / 2500), t + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + 3.8);
    src.connect(lp).connect(g); g.connect(this.master); g.connect(this.verb);
    src.start(t); src.stop(t + 4);
  }

  /** called each frame by the app with camera target + distance */
  setListener(x, z, dist) { this.listener = { x, z, dist }; }

  startTanpura() {
    const ctx = this.ctx;
    const sa = 138.6; // C# — a common male-voice pitch
    const notes = [sa * 1.5 / 2, sa, sa, sa / 2]; // Pa (lower), Sa, Sa, Sa (lower)
    let i = 0;
    const pluck = () => {
      if (!this.ctx) return;
      const t = ctx.currentTime;
      if (this.drone.gain.value > 0.001) {
        const f = notes[i++ % 4];
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f * 1.003;
        const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.setValueAtTime(f * 6, t); filt.frequency.exponentialRampToValueAtTime(f * 2.2, t + 3.2); filt.Q.value = 1.6;
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 4.2);
        o.connect(filt); o2.connect(filt); filt.connect(g).connect(this.drone);
        o.start(t); o2.start(t); o.stop(t + 4.3); o2.stop(t + 4.3);
      }
      setTimeout(pluck, 1150);
    };
    pluck();
  }

  bell(gain = 0.3, f = 620) {
    const ctx = this.ctx, t = ctx.currentTime;
    for (const [ratio, amp, dec] of [[1, 1, 3.5], [2.76, 0.5, 2.2], [5.4, 0.25, 1.2], [8.93, 0.12, 0.8]]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * ratio;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * amp, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g); g.connect(this.master); g.connect(this.verb);
      o.start(t); o.stop(t + dec + 0.1);
    }
  }

  horn(gain = 0.25) {
    // two-tone locomotive horn
    const ctx = this.ctx, t = ctx.currentTime;
    for (const [f, start, len] of [[311, 0, 0.9], [370, 0, 0.9], [311, 1.1, 1.6], [370, 1.1, 1.6]]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t + start); g.gain.linearRampToValueAtTime(gain * 0.5, t + start + 0.08); g.gain.setValueAtTime(gain * 0.5, t + start + len - 0.15); g.gain.linearRampToValueAtTime(0, t + start + len);
      o.connect(lp).connect(g); g.connect(this.master); g.connect(this.verb);
      o.start(t + start); o.stop(t + start + len + 0.05);
    }
  }

  beep(gain = 0.08) {
    const ctx = this.ctx, t = ctx.currentTime, f = 420 + Math.random() * 260;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.setValueAtTime(gain, t + 0.12); g.gain.linearRampToValueAtTime(0, t + 0.16);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    o.connect(lp).connect(g).connect(this.master); o.start(t); o.stop(t + 0.2);
  }

  boom(distance = 600, gain = 0.5) {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + Math.min(1.5, distance / 343);
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer(1.2, 'white');
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(80, t + 1.0);
    const g = ctx.createGain(); const a = gain * Math.min(1, 300 / Math.max(distance, 100));
    g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    src.connect(lp).connect(g); g.connect(this.master); g.connect(this.verb);
    src.start(t); src.stop(t + 1.2);
  }

  cracker() {
    const ctx = this.ctx, t = ctx.currentTime;
    const n = 1 + Math.floor(Math.random() * 6);
    for (let k = 0; k < n; k++) {
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer(0.12);
      const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 1200 + Math.random() * 1500;
      const g = ctx.createGain(); const tt = t + k * (0.06 + Math.random() * 0.1);
      g.gain.setValueAtTime(0.14, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.1);
      src.connect(hp).connect(g); g.connect(this.master); g.connect(this.verb); src.start(tt);
    }
  }

  /** ambience scheduler — density reacts to mode and where the camera is */
  loop() {
    const tick = () => {
      if (!this.ctx) return;
      const { x, z, dist } = this.listener;
      const near = Math.max(0, 1 - dist / 1600);
      const t = this.ctx.currentTime;
      const mode = state.mode;
      // city wash: louder when zoomed in, softer at night & dawn
      const bed = (mode === 'deepavali' ? 0.12 : mode === 'margazhi' ? 0.05 : 0.2) * (0.35 + near * 0.9);
      this.bed.gain.setTargetAtTime(this.on ? bed : 0, t, 0.6);
      this.bedFilter.frequency.setTargetAtTime(300 + near * 700, t, 0.6);
      const droneTarget = this.forceDrone ? 0.6 : mode === 'margazhi' ? 0.45 : 0;
      this.drone.gain.setTargetAtTime(this.on || this.forceDrone ? droneTarget : 0, t, 1.2);
      if (this.on) {
        const dCentral = Math.hypot(x - 10, z + 60);
        if (Math.random() < 0.05 * Math.max(0.15, 1 - dCentral / 900)) this.horn(0.18 * Math.max(0.2, 1 - dCentral / 1200));
        if (mode !== 'margazhi' && Math.random() < 0.18 * near) this.beep(0.05 * near);
        const nearTemple = Math.min(Math.hypot(x - 291, z + 632), Math.hypot(x - 394, z + 386));
        if ((mode === 'margazhi' || mode === 'everyday') && Math.random() < 0.06 * Math.max(0.1, 1 - nearTemple / 600)) this.bell(0.12 * Math.max(0.25, 1 - nearTemple / 700), 560 + Math.random() * 120);
        if (mode === 'deepavali' && Math.random() < 0.35) this.cracker();
      }
      setTimeout(tick, 900);
    };
    tick();
  }

  /** play a short themed sample for story audio cards */
  preview(kind) {
    this.init(); this.ctx.resume();
    if (!this.on) { this.master.gain.setTargetAtTime(this.vol, this.ctx.currentTime, 0.05); setTimeout(() => !this.on && this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5), 7000); }
    if (kind === 'station') { this.horn(0.3); setTimeout(() => this.beep(0.06), 2600); }
    if (kind === 'tanpura') { this.forceDrone = true; setTimeout(() => (this.forceDrone = false), 9000); }
    if (kind === 'bell') this.bell(0.3);
  }
}
