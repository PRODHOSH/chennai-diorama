import * as THREE from 'three';
import { state } from '../core/state.js';

/**
 * GPU-light fireworks: one Points cloud, CPU-integrated particles (gravity + drag),
 * additive blending and HDR colours so the bloom pass gives them a soft halo.
 * Patterns: peony, ring, willow (long golden trails), crossette, and "chakra" ground spinners.
 * Bursts are scheduled sparsely so the city — not the sky — stays the subject.
 */
const MAX = 9000;
const PALETTE = [
  [1.0, 0.72, 0.32], [1.0, 0.45, 0.25], [0.95, 0.85, 0.55], [1.0, 0.38, 0.6], [0.55, 0.85, 1.0], [0.6, 1.0, 0.7], [1.0, 0.9, 0.95],
];

export class Fireworks {
  constructor(scene, sites, onBoom) {
    this.sites = sites; // [[x,z],...] open grounds where shells are launched
    this.onBoom = onBoom;
    this.p = new Float32Array(MAX * 3); this.v = new Float32Array(MAX * 3); this.c = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX); this.max = new Float32Array(MAX); this.kind = new Uint8Array(MAX);
    this.size = new Float32Array(MAX); this.base = new Float32Array(MAX);
    this.next = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.c, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uScale: { value: 3.2 } },
      vertexShader: /* glsl */ `attribute float aSize; varying vec3 vC; uniform float uScale;
        void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * uScale * (900.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); float a = smoothstep(0.5, 0.0, r); a *= a; gl_FragColor = vec4(vC * a * 2.6, a); }`,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    scene.add(this.points);
    this.shells = [];
    this.active = false;
    this.timer = 0;
    this.flash = new THREE.PointLight(0xffc27a, 0, 650, 2);
    scene.add(this.flash);
  }

  setActive(on) { this.active = on; this.points.visible = true; if (!on) this.timer = 0; }

  emit(x, y, z, vx, vy, vz, col, life, size, kind = 0) {
    const i = this.next; this.next = (this.next + 1) % MAX;
    this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z;
    this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    this.c[i * 3] = col[0]; this.c[i * 3 + 1] = col[1]; this.c[i * 3 + 2] = col[2];
    this.life[i] = life; this.max[i] = life; this.size[i] = size; this.base[i] = size; this.kind[i] = kind;
  }

  launch(site, pattern) {
    const [x, z] = site || this.sites[Math.floor(Math.random() * this.sites.length)];
    const col = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const col2 = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const patterns = ['peony', 'peony', 'ring', 'willow', 'crossette'];
    this.shells.push({ x: x + (Math.random() - 0.5) * 40, y: 2, z: z + (Math.random() - 0.5) * 40, vy: 88 + Math.random() * 22, vx: (Math.random() - 0.5) * 6, vz: (Math.random() - 0.5) * 6, col, col2, pattern: pattern || patterns[Math.floor(Math.random() * patterns.length)], fuse: 1.6 + Math.random() * 0.6 });
  }

  burst(s) {
    const n = { peony: 260, ring: 160, willow: 200, crossette: 70 }[s.pattern] * (state.fireworksLevel >= 3 ? 1.3 : 1);
    const speed = s.pattern === "willow" ? 34 : 52;
    const axis = new THREE.Vector3(Math.random() - 0.5, 1, Math.random() - 0.5).normalize();
    for (let k = 0; k < n; k++) {
      let dir;
      if (s.pattern === 'ring') {
        const a = (k / n) * Math.PI * 2; const t = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        dir = t.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis));
      } else {
        const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
        dir = new THREE.Vector3(r * Math.cos(a), u, r * Math.sin(a));
      }
      const sp = speed * (0.85 + Math.random() * 0.3);
      const col = s.pattern === 'willow' ? [1.0, 0.68, 0.28] : k % 3 === 0 ? s.col2 : s.col;
      this.emit(s.x, s.y, s.z, dir.x * sp, dir.y * sp, dir.z * sp, col, s.pattern === 'willow' ? 3.6 : 2.2 + Math.random() * 0.6, s.pattern === 'willow' ? 2.2 : 2.8, s.pattern === 'crossette' ? 2 : s.pattern === 'willow' ? 1 : 0);
    }
    this.flash.position.set(s.x, s.y, s.z);
    this.flash.color.setRGB(...s.col);
    this.flash.intensity = 9e3;
    this.onBoom?.(s);
  }

  /**
   * Street-level crackers, the way Deepavali actually looks from a Chennai lane:
   * pusvanam (flower pots) fountaining gold, chakkaram (ground spinners) whirling,
   * and kambi mathappu (sparklers). Spawned at real doorsteps near where you're looking.
   */
  setGround(spots, getTarget, getDist) { this.groundSpots = spots; this.getTarget = getTarget; this.getDist = getDist; this.ground = []; }
  updateGround(dt) {
    if (!this.active || !this.groundSpots || !state.fireworks) { this.ground = []; return; }
    const d = this.getDist();
    if (d > 900) { this.ground = []; return; }
    const t = this.getTarget();
    const want = state.fireworksLevel >= 3 ? 10 : state.fireworksLevel === 2 ? 7 : 4;
    this.ground = this.ground.filter((g) => (g.life -= dt) > 0);
    while (this.ground.length < want) {
      const near = this.groundSpots.filter((s) => Math.hypot(s.p[0] - t.x, s.p[1] - t.z) < Math.max(120, d * 0.45));
      if (!near.length) break;
      const s = near[Math.floor(Math.random() * near.length)];
      const r = Math.random();
      this.ground.push({ x: s.p[0] + s.n[0] * 2.5, z: s.p[1] + s.n[1] * 2.5, kind: r < 0.5 ? 'pot' : r < 0.8 ? 'chakra' : 'sparkler', life: 4 + Math.random() * 4, a: 0 });
    }
    for (const g of this.ground) {
      g.a += dt * 22;
      if (g.kind === 'pot') {
        for (let i = 0; i < 6; i++) { const a = Math.random() * 6.283, sp = 0.6 + Math.random() * 1.4; this.emit(g.x, 0.4, g.z, Math.cos(a) * sp, 7 + Math.random() * 3, Math.sin(a) * sp, Math.random() < 0.7 ? [1, 0.78, 0.38] : [1, 0.95, 0.8], 0.9 + Math.random() * 0.5, 0.14, 1); }
      } else if (g.kind === 'chakra') {
        for (let i = 0; i < 4; i++) { const a = g.a + i * 1.57; this.emit(g.x + Math.cos(a) * 0.3, 0.25, g.z + Math.sin(a) * 0.3, -Math.sin(a) * 6, 0.5 + Math.random(), Math.cos(a) * 6, [1, 0.55 + Math.random() * 0.3, 0.25], 0.35, 0.12, 1); }
      } else {
        for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283, sp = 1 + Math.random() * 2; this.emit(g.x, 1.0, g.z, Math.cos(a) * sp, Math.random() * 1.5, Math.sin(a) * sp, [1, 0.95, 0.85], 0.25, 0.1, 0); }
      }
    }
  }

  update(dt) {
    this.updateGround(dt);
    if (this.ground?.length) this.points.visible = true;
    if (!this.points.visible) return;
    const lvl = state.fireworksLevel;
    if (this.active && state.fireworks && lvl > 0) {
      this.timer -= dt;
      if (this.timer <= 0) { this.launch(); this.timer = [0, 4.2, 2.2, 1.1][lvl] * (0.6 + Math.random() * 0.8); }
    }
    // shells
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.fuse -= dt; s.vy -= 30 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      this.emit(s.x, s.y, s.z, (Math.random() - 0.5) * 2, -4, (Math.random() - 0.5) * 2, [1, 0.75, 0.45], 0.55, 1.6, 1);
      if (s.fuse <= 0) { this.burst(s); this.shells.splice(i, 1); }
    }
    let alive = 0;
    const p = this.p, v = this.v;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) { if (this.size[i] !== 0) { this.size[i] = 0; } continue; }
      alive++;
      this.life[i] -= dt;
      const drag = this.kind[i] === 1 ? 2.2 : 1.4;
      v[i * 3] *= 1 - drag * dt; v[i * 3 + 1] = v[i * 3 + 1] * (1 - drag * dt) - 9.8 * dt * (this.kind[i] === 1 ? 0.6 : 0.9); v[i * 3 + 2] *= 1 - drag * dt;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
      const k = this.life[i] / this.max[i];
      // crossette: split into four sparks mid-flight
      if (this.kind[i] === 2 && k < 0.55) {
        this.kind[i] = 0;
        for (let q = 0; q < 4; q++) { const a = (q / 4) * Math.PI * 2 + Math.random(); this.emit(p[i * 3], p[i * 3 + 1], p[i * 3 + 2], Math.cos(a) * 14, 4, Math.sin(a) * 14, [this.c[i * 3], this.c[i * 3 + 1], this.c[i * 3 + 2]], 1.0, 2.2, 0); }
      }
      // twinkle & fade
      const tw = this.kind[i] === 1 ? 1 : 0.75 + 0.25 * Math.sin(this.life[i] * 40 + i);
      this.size[i] = this.base[i] * Math.min(1, k * 1.6) * tw;
    }
    this.flash.intensity *= Math.pow(0.02, dt);
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.aSize.needsUpdate = true; g.attributes.color.needsUpdate = true;
    if (!this.active && alive === 0 && this.shells.length === 0) this.points.visible = false;
  }
}
