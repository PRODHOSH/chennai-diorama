import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Hand-built props for the house interiors — everything procedural, proportioned from
 * everyday Tamil household objects. Materials share a small palette so scenes stay coherent.
 */
export const MAT = {
  brass: () => new THREE.MeshStandardMaterial({ color: '#d6a947', metalness: 1, roughness: 0.28 }),
  copper: () => new THREE.MeshStandardMaterial({ color: '#c0764a', metalness: 1, roughness: 0.35 }),
  clay: () => new THREE.MeshStandardMaterial({ color: '#a8552f', roughness: 0.92 }),
  teak: () => new THREE.MeshStandardMaterial({ color: '#5b3a22', roughness: 0.6 }),
  teakDark: () => new THREE.MeshStandardMaterial({ color: '#3e2716', roughness: 0.55 }),
  redOxide: () => new THREE.MeshStandardMaterial({ color: '#8e3a2a', roughness: 0.32, metalness: 0.05 }),
  lime: (c = '#efe6cf') => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }),
  granite: () => new THREE.MeshStandardMaterial({ color: '#8f8576', roughness: 0.85 }),
  tile: () => new THREE.MeshStandardMaterial({ color: '#a9533a', roughness: 0.82 }),
  leaf: () => new THREE.MeshStandardMaterial({ color: '#3f7f35', roughness: 0.6, side: THREE.DoubleSide }),
};

export function canvasTexture(w, h, draw, repeat) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

/** lathe helper from [r, y] pairs */
const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0005), y)), seg);

/** kuthuvilakku — the tall brass standing lamp with five wicks (and a small swan finial) */
export function kuthuvilakku(scale = 1) {
  const g = new THREE.Group();
  const prof = [[0, 0], [0.16, 0], [0.17, 0.02], [0.12, 0.05], [0.13, 0.08], [0.05, 0.12], [0.03, 0.2], [0.045, 0.24], [0.025, 0.28], [0.022, 0.55], [0.04, 0.58], [0.024, 0.6], [0.022, 0.66],
    [0.15, 0.68], [0.16, 0.7], [0.12, 0.72], [0.03, 0.73], [0.02, 0.8], [0.04, 0.83], [0.02, 0.86], [0.03, 0.9], [0.0, 0.93]];
  const brass = MAT.brass();
  const body = new THREE.Mesh(lathe(prof, 48), brass); g.add(body);
  // five spouts on the bowl rim
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 10), brass);
    sp.position.set(Math.cos(a) * 0.15, 0.705, Math.sin(a) * 0.15); sp.rotation.z = Math.PI / 2; sp.rotation.y = -a; g.add(sp);
    flames.push(new THREE.Vector3(Math.cos(a) * 0.185, 0.74, Math.sin(a) * 0.185));
  }
  // swan finial (annam), simplified
  const swan = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), brass); swan.scale.set(1.4, 0.8, 0.8); swan.position.y = 0.95; g.add(swan);
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 16, Math.PI * 1.1), brass); neck.position.set(0.03, 0.98, 0); neck.rotation.z = 0.4; g.add(neck);
  g.scale.setScalar(scale);
  g.userData.flames = flames.map((f) => f.multiplyScalar(scale));
  return g;
}

/** agal vilakku — clay oil lamp; returns group + local flame point */
export function agal() {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(lathe([[0, 0], [0.03, 0], [0.045, 0.012], [0.05, 0.022], [0.045, 0.025], [0.035, 0.016], [0, 0.014]], 20), MAT.clay());
  bowl.scale.set(1, 1, 0.8); g.add(bowl);
  const lip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 8), MAT.clay()); lip.rotation.z = Math.PI / 2; lip.position.set(0.05, 0.022, 0); g.add(lip);
  g.userData.flame = new THREE.Vector3(0.062, 0.045, 0);
  return g;
}

/** a teardrop flame sprite shared texture */
export const flameTexture = () => canvasTexture(64, 128, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h * 0.68, 2, w / 2, h * 0.62, w * 0.5);
  g.addColorStop(0, 'rgba(255,255,235,1)'); g.addColorStop(0.25, 'rgba(255,214,120,1)'); g.addColorStop(0.6, 'rgba(255,128,40,0.7)'); g.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(w / 2, 4); ctx.bezierCurveTo(w * 0.9, h * 0.5, w * 0.85, h * 0.95, w / 2, h * 0.96); ctx.bezierCurveTo(w * 0.15, h * 0.95, w * 0.1, h * 0.5, w / 2, 4); ctx.fill();
});
export const glowTexture = () => canvasTexture(128, 128, (ctx, w) => {
  const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(255,200,120,0.9)'); g.addColorStop(0.3, 'rgba(255,160,70,0.35)'); g.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
});

/** many flames as flickering sprites (one draw per sprite is fine at these counts) */
export class Flames {
  constructor(parent, points, { size = 0.05, glow = 0.35 } = {}) {
    this.items = [];
    const ft = flameTexture(), gt = glowTexture();
    for (const p of points) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ft, color: new THREE.Color(1.5, 1.15, 0.75), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.center.set(0.5, 0.05); s.scale.set(size * 0.55, size, 1); s.position.copy(p);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: new THREE.Color(0.9, 0.62, 0.35), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
      gl.scale.set(glow, glow, 1); gl.position.copy(p).add(new THREE.Vector3(0, size * 0.4, 0));
      parent.add(s, gl);
      this.items.push({ s, gl, seed: Math.random() * 100, base: size, g: glow });
    }
  }
  update(t) {
    for (const it of this.items) {
      const f = 0.85 + 0.15 * Math.sin(t * 13 + it.seed) * Math.sin(t * 7.1 + it.seed * 2) + 0.06 * Math.sin(t * 31 + it.seed);
      it.s.scale.set(it.base * 0.55 * (0.95 + 0.08 * Math.sin(t * 9 + it.seed)), it.base * f, 1);
      it.gl.material.opacity = 0.42 + 0.14 * f;
    }
  }
}

/** marigold / jasmine garland along a curve */
export function garland(curve, n = 60, colors = ['#f2a01f', '#f7c331', '#fbf7ee']) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.85 }), n);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const p = curve.getPointAt(i / (n - 1));
    const jasmine = Math.floor(i / 4) % 3 === 2;
    const r = jasmine ? 0.012 : 0.02;
    m.makeScale(r, r, r).setPosition(p); im.setMatrixAt(i, m);
    im.setColorAt(i, c.set(jasmine ? colors[2] : i % 2 ? colors[0] : colors[1]));
  }
  im.castShadow = true;
  return im;
}

/** a folded silk saree with zari border, as a stacked box with a woven texture */
export function foldedSilk(body = '#8a1f3d', border = '#d4a640') {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = body; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(Math.random() * w, Math.random() * h, 2, 1); }
    ctx.fillStyle = border; ctx.fillRect(0, h * 0.78, w, h * 0.22); ctx.fillRect(0, 0, w, h * 0.06);
    ctx.fillStyle = body; for (let x = 0; x < w; x += 16) { ctx.beginPath(); ctx.moveTo(x, h * 0.84); ctx.lineTo(x + 8, h * 0.8); ctx.lineTo(x + 16, h * 0.84); ctx.fill(); } // temple-border (koravai) triangles
    ctx.fillStyle = border; for (let y = 30; y < h * 0.7; y += 32) for (let x = (y / 32) % 2 ? 8 : 24; x < w; x += 32) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); } // buttas
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.25 });
  const g = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.24), m);
  return g;
}
export function foldedVeshti() {
  const tex = canvasTexture(128, 128, (ctx, w, h) => { ctx.fillStyle = '#f6f2e6'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#d4a640'; ctx.fillRect(0, h * 0.82, w, h * 0.1); });
  return new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.22), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
}

/** thambalam: a brass plate with banana, betel leaves, coconut and flowers */
export function thambalam() {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(lathe([[0, 0], [0.16, 0], [0.18, 0.015], [0.19, 0.022], [0.17, 0.018], [0, 0.012]], 40), MAT.brass()); g.add(plate);
  const yellow = new THREE.MeshStandardMaterial({ color: '#e8c33a', roughness: 0.6 });
  for (let i = 0; i < 3; i++) {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.08, 0.03, 0), new THREE.Vector3(0, 0.07, 0.02), new THREE.Vector3(0.08, 0.035, 0));
    const b = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.018, 8), yellow); b.position.set(-0.03, 0, -0.06 + i * 0.035); b.rotation.y = 0.3; g.add(b);
  }
  const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 14), new THREE.MeshStandardMaterial({ color: '#6b4426', roughness: 0.95 })); coconut.scale.y = 0.85; coconut.position.set(0.07, 0.06, 0.05); g.add(coconut);
  const betel = new THREE.CircleGeometry(0.045, 16); betel.scale(1, 1.4, 1);
  for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(betel, MAT.leaf()); l.rotation.x = -Math.PI / 2 + 0.15; l.rotation.z = i * 0.6; l.position.set(-0.08 + i * 0.012, 0.02 + i * 0.003, 0.08); g.add(l); }
  const flowers = garland(new THREE.CatmullRomCurve3([new THREE.Vector3(0.12, 0.025, -0.05), new THREE.Vector3(0.1, 0.03, 0.1), new THREE.Vector3(-0.02, 0.03, 0.14)]), 18);
  g.add(flowers);
  return g;
}

/** a plate of Deepavali sweets: murukku spirals, laddus, mysore pak, athirasam */
export function sweetsPlate() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(lathe([[0, 0], [0.14, 0], [0.155, 0.018], [0.14, 0.014], [0, 0.01]], 36), new THREE.MeshStandardMaterial({ color: '#cfd4d8', metalness: 1, roughness: 0.25 })));
  const fried = new THREE.MeshStandardMaterial({ color: '#c78a3e', roughness: 0.75 });
  for (let k = 0; k < 3; k++) {
    // murukku: a flat spiral tube
    const pts = []; for (let i = 0; i < 70; i++) { const a = i * 0.32, r = 0.006 + i * 0.0006; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 140, 0.005, 6), fried);
    m.position.set(-0.07 + k * 0.012, 0.02 + k * 0.01, -0.04); m.rotation.x = 0.1 * k; g.add(m);
  }
  const ladduMat = new THREE.MeshStandardMaterial({ color: '#f0a12a', roughness: 0.9 });
  for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.022, 2), ladduMat); l.position.set(0.04 + (i % 2) * 0.045, 0.03 + Math.floor(i / 2) * 0.035, 0.03 + (i % 2) * 0.01); g.add(l); }
  const pak = new THREE.MeshStandardMaterial({ color: '#e8b54a', roughness: 0.85 });
  for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), pak); p.position.set(-0.05 + i * 0.033, 0.02, 0.07); p.rotation.y = i * 0.2; g.add(p); }
  const ath = new THREE.MeshStandardMaterial({ color: '#4a2412', roughness: 0.7 });
  for (let i = 0; i < 3; i++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 18), ath); a.position.set(0.09, 0.015 + i * 0.009, -0.06); g.add(a); }
  return g;
}

/** a Kangayam bull/cow — the white-grey Tamil breed with sweeping horns — with painted horns, bells and a garland */
export function cow({ hornColor = '#c3332f', body = '#dcd7cc', calf = false } = {}) {
  const g = new THREE.Group();
  const s = calf ? 0.6 : 1;
  const hide = new THREE.MeshStandardMaterial({ color: body, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: '#4a4744', roughness: 0.8 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.9, 8, 16), hide);
  torso.rotation.z = Math.PI / 2; torso.scale.set(1, 1, 0.82); torso.position.y = 0.95; g.add(torso);
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), hide); hump.scale.set(1, 0.9, 0.8); hump.position.set(0.42, 1.25, 0); g.add(hump);
  const dewlap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), hide); dewlap.scale.set(0.7, 1.3, 0.4); dewlap.position.set(0.66, 0.72, 0); g.add(dewlap);
  const headPivot = new THREE.Group(); headPivot.position.set(0.72, 1.12, 0); headPivot.scale.setScalar(1.32); g.add(headPivot);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.4, 14), hide); neck.rotation.z = -1.0; neck.position.set(0.1, 0.02, 0); headPivot.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.22, 3, 2, 2), hide);
  const hp = head.geometry.attributes.position; for (let i = 0; i < hp.count; i++) { const x = hp.getX(i); hp.setY(i, hp.getY(i) * (1 - (x + 0.21) * 0.6)); hp.setZ(i, hp.getZ(i) * (1 - (x + 0.21) * 0.5)); } head.geometry.computeVertexNormals();
  head.position.set(0.32, -0.1, 0); head.rotation.z = -0.55; headPivot.add(head);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), dark); muzzle.scale.set(0.8, 0.8, 1.1); muzzle.position.set(0.5, -0.24, 0); headPivot.add(muzzle);
  for (const z of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.2 })); eye.position.set(0.26, -0.02, z * 0.1); headPivot.add(eye);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), hide); ear.scale.set(0.5, 0.35, 1.2); ear.position.set(0.16, 0.02, z * 0.17); ear.rotation.x = z * 0.4; headPivot.add(ear);
    // horns: sweeping back and up, painted for Mattu Pongal with gold tips
    if (!calf) {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.12, 0.08, z * 0.08), new THREE.Vector3(0.06, 0.2, z * 0.2), new THREE.Vector3(-0.05, 0.36, z * 0.22), new THREE.Vector3(-0.08, 0.48, z * 0.16)]);
      const horn = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.03, 10), new THREE.MeshStandardMaterial({ color: hornColor, roughness: 0.4, metalness: 0.1 }));
      const hpz = horn.geometry.attributes.position; // taper toward the tip
      for (let i = 0; i < hpz.count; i++) { const seg = Math.floor(i / 11) / 16; const c = curve.getPointAt(Math.min(1, seg)); const v = new THREE.Vector3(hpz.getX(i), hpz.getY(i), hpz.getZ(i)).sub(c).multiplyScalar(1 - seg * 0.75).add(c); hpz.setXYZ(i, v.x, v.y, v.z); }
      horn.geometry.computeVertexNormals();
      headPivot.add(horn);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 8), MAT.brass()); tip.position.copy(curve.getPointAt(1)); tip.position.y += 0.02; headPivot.add(tip);
    }
  }
  // bells on a red cord around the neck + marigold garland
  const cord = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 24), new THREE.MeshStandardMaterial({ color: '#b3202a' })); cord.position.set(0.12, -0.1, 0); cord.rotation.y = Math.PI / 2; cord.rotation.x = 0.9; headPivot.add(cord);
  const bell = new THREE.Mesh(lathe([[0, 0.06], [0.02, 0.055], [0.035, 0.02], [0.04, 0], [0.0, 0.0]], 16), MAT.brass()); bell.position.set(0.22, -0.32, 0); headPivot.add(bell);
  if (!calf) {
    const gar = garland(new THREE.CatmullRomCurve3([new THREE.Vector3(0.62, 1.15, -0.25), new THREE.Vector3(0.72, 0.85, -0.12), new THREE.Vector3(0.78, 0.75, 0), new THREE.Vector3(0.72, 0.85, 0.12), new THREE.Vector3(0.62, 1.15, 0.25)]), 50);
    g.add(gar);
  }
  // legs
  const legs = [];
  for (const [x, z] of [[0.48, -0.16], [0.48, 0.16], [-0.42, -0.16], [-0.42, 0.16]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.75, 10), hide); leg.position.set(x, 0.42, z); g.add(leg); legs.push(leg);
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.07, 10), dark); hoof.position.set(x, 0.035, z); g.add(hoof);
  }
  // tail with tuft
  const tailPivot = new THREE.Group(); tailPivot.position.set(-0.72, 1.08, 0); g.add(tailPivot);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.7, 8), hide); tail.position.y = -0.35; tailPivot.add(tail);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), dark); tuft.scale.y = 1.8; tuft.position.y = -0.72; tailPivot.add(tuft);
  // turmeric & kumkum mark on the forehead
  const mark = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), new THREE.MeshBasicMaterial({ color: '#c8102e' })); mark.position.set(0.3, 0.02, 0); mark.rotation.y = Math.PI / 2; mark.rotation.x = -0.55; headPivot.add(mark);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(s);
  const seed = Math.random() * 10;
  g.userData.animate = (t) => {
    tailPivot.rotation.x = Math.sin(t * 1.7 + seed) * 0.35; tailPivot.rotation.z = -0.15 + Math.sin(t * 0.9 + seed) * 0.1;
    headPivot.rotation.z = Math.sin(t * 0.6 + seed) * 0.06 - 0.03; headPivot.rotation.y = Math.sin(t * 0.33 + seed) * 0.18;
    muzzle.position.y = -0.24 + Math.max(0, Math.sin(t * 5 + seed)) * 0.01; // chewing the cud
  };
  return g;
}

/** a conical haystack (vaikkol por) */
export function haystack() {
  const tex = canvasTexture(128, 128, (ctx, w, h) => { ctx.fillStyle = '#c9a85a'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { ctx.strokeStyle = `rgba(${120 + Math.random() * 80},${90 + Math.random() * 60},30,0.5)`; ctx.beginPath(); const x = Math.random() * w, y = Math.random() * h; ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 6, y + 10); ctx.stroke(); } }, [3, 3]);
  const m = new THREE.Mesh(lathe([[0, 0], [1.1, 0], [1.2, 0.6], [1.05, 1.4], [0.6, 2.1], [0.05, 2.45], [0, 2.5]], 28), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** sugarcane stalk with nodes and leaves */
export function sugarcane(h = 2.2) {
  const g = new THREE.Group();
  const tex = canvasTexture(32, 256, (ctx, w, hh) => { ctx.fillStyle = '#5e7a2e'; ctx.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 32) { ctx.fillStyle = '#3e4f1e'; ctx.fillRect(0, y, w, 3); ctx.fillStyle = '#8f9a4a'; ctx.fillRect(0, y + 3, w, 2); } ctx.fillStyle = 'rgba(120,40,60,0.35)'; ctx.fillRect(0, 0, w, hh); }, [1, h * 2]);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, h, 10), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
  stalk.position.y = h / 2; g.add(stalk);
  const leafGeo = new THREE.PlaneGeometry(0.06, 0.9, 1, 6); const lp = leafGeo.attributes.position; for (let i = 0; i < lp.count; i++) { const y = lp.getY(i); lp.setZ(i, (y + 0.45) ** 2 * 0.5); lp.setX(i, lp.getX(i) * (1 - (y + 0.45) / 1.0)); } leafGeo.translate(0, 0.45, 0); leafGeo.computeVertexNormals();
  for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(leafGeo, MAT.leaf()); l.position.y = h - 0.05; l.rotation.y = (i / 6) * Math.PI * 2; l.rotation.x = 0.35; g.add(l); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/** banana leaf with a serving of sakkarai pongal, ven pongal and vadai */
export function bananaLeafMeal() {
  const g = new THREE.Group();
  const tex = canvasTexture(256, 128, (ctx, w, h) => { const gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3f8a3a'); gr.addColorStop(0.5, '#5aa64a'); gr.addColorStop(1, '#3f8a3a'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; for (let x = 0; x < w; x += 6) { ctx.beginPath(); ctx.moveTo(x, h / 2); ctx.lineTo(x + 18, 0); ctx.moveTo(x, h / 2); ctx.lineTo(x + 18, h); ctx.stroke(); } ctx.fillStyle = '#8fb55a'; ctx.fillRect(0, h / 2 - 2, w, 4); });
  const leafGeo = new THREE.PlaneGeometry(0.75, 0.42, 8, 4); const lp = leafGeo.attributes.position; for (let i = 0; i < lp.count; i++) lp.setZ(i, Math.sin(lp.getX(i) * 6) * 0.006 + Math.abs(lp.getY(i)) * 0.03); leafGeo.computeVertexNormals();
  const leaf = new THREE.Mesh(leafGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, side: THREE.DoubleSide })); leaf.rotation.x = -Math.PI / 2; g.add(leaf);
  const sweet = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8a4b1f', roughness: 0.7 })); sweet.scale.y = 0.7; sweet.position.set(-0.12, 0.005, 0); g.add(sweet);
  const ven = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#efe1b0', roughness: 0.9 })); ven.scale.y = 0.6; ven.position.set(0.05, 0.005, 0.04); g.add(ven);
  for (let i = 0; i < 2; i++) { const v = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.015, 10, 20), new THREE.MeshStandardMaterial({ color: '#b5702e', roughness: 0.8 })); v.rotation.x = -Math.PI / 2; v.position.set(0.18, 0.016 + i * 0.022, -0.06); g.add(v); }
  const cashew = new THREE.MeshStandardMaterial({ color: '#e9cf9a' });
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.004, 6, 10, Math.PI), cashew); c.position.set(-0.12 + (Math.random() - 0.5) * 0.08, 0.05, (Math.random() - 0.5) * 0.08); c.rotation.set(Math.random(), Math.random(), 0); g.add(c); }
  return g;
}

/** mango-leaf thoranam across a doorway */
export function thoranam(width = 1.4) {
  const g = new THREE.Group();
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, width, 6), new THREE.MeshStandardMaterial({ color: '#d6c08a' })); cord.rotation.z = Math.PI / 2; g.add(cord);
  const leafGeo = new THREE.PlaneGeometry(0.07, 0.2); leafGeo.translate(0, -0.1, 0);
  const lp = leafGeo.attributes.position; for (let i = 0; i < lp.count; i++) { const y = lp.getY(i); lp.setX(i, lp.getX(i) * Math.sin(((-y) / 0.2) * Math.PI) * 1.4); }
  const n = Math.floor(width / 0.08);
  for (let i = 0; i < n; i++) { const l = new THREE.Mesh(leafGeo, MAT.leaf()); l.position.x = -width / 2 + (i + 0.5) * (width / n); l.rotation.y = (Math.random() - 0.5) * 0.4; l.rotation.z = (Math.random() - 0.5) * 0.1; g.add(l); }
  const mg = garland(new THREE.CatmullRomCurve3([new THREE.Vector3(-width / 2, 0, 0.02), new THREE.Vector3(0, -0.08, 0.02), new THREE.Vector3(width / 2, 0, 0.02)]), Math.floor(width * 40));
  g.add(mg);
  return g;
}

export function merge(geos) { return mergeGeometries(geos); }
