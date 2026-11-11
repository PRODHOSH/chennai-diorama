import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import gsap from 'gsap';
import { MAT, canvasTexture, kuthuvilakku, agal, Flames, garland, foldedSilk, foldedVeshti, thambalam, sweetsPlate, cow, haystack, sugarcane, bananaLeafMeal, thoranam } from './props.js';
import { renderKolam } from '../kolam/engine.js';
import { templeComplex } from '../world/temple.js';
import { presetKolam } from '../kolam/presets.js';
import { state } from '../core/state.js';
import { escapeHtml } from '../kolam/studio.js';

/**
 * STEP INSIDE — full 3D interiors for the illustrative homes.
 *  · deepavali : a puja room before dawn — kuthuvilakku, agal vilakku, sweets, new silks, the oil bath
 *  · pongal    : a courtyard (mutram) on Thai Pongal — pot boiling over, sugarcane, a cattle shed with
 *                Kangayam cattle decorated for Mattu Pongal
 *  · kolam     : the front verandah with thinnai at sunrise — a kolam draws itself on the threshold
 * Every object carries a hotspot that explains what it is and why it's there.
 */

const $ = (s) => document.querySelector(s);

function wallTex(base = '#efe3c8') {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { ctx.fillStyle = `rgba(${90 + Math.random() * 40},${70 + Math.random() * 30},40,${Math.random() * 0.035})`; ctx.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 10, 3 + Math.random() * 10); }
    // red-oxide dado with an ochre line — the classic lower wall band
    ctx.fillStyle = '#8f3a28'; ctx.fillRect(0, h * 0.86, w, h * 0.14);
    ctx.fillStyle = '#d29a3a'; ctx.fillRect(0, h * 0.845, w, h * 0.012);
  }, [2, 1]);
}
function floorTex() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#86362a'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 18, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(40,10,6,0.25)'; ctx.lineWidth = 2; for (let x = 0; x <= w; x += 128) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, x); ctx.lineTo(w, x); ctx.stroke(); }
  }, [3, 3]);
}
function kolamTexture(id, opts = {}) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024;
  const k = presetKolam(id, opts);
  renderKolam(cv.getContext('2d'), k, { size: 1024, transparent: true });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.userData = { cv, k, paths: k.paths() };
  return t;
}
function decal(tex, size, y = 0.003) {
  const g = new THREE.PlaneGeometry(size, size); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.y = y; m.receiveShadow = true;
  return m;
}
const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };

/** Simple particle fountain for flower-pot crackers, boiling foam, smoke */
class Particles {
  constructor(parent, { count = 400, color = [1, 0.75, 0.35], size = 0.03, additive = true, texture = null } = {}) {
    this.n = count; this.p = new Float32Array(count * 3); this.v = new Float32Array(count * 3); this.life = new Float32Array(count); this.max = new Float32Array(count); this.next = 0;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.p, 3));
    this.mat = new THREE.PointsMaterial({ color: new THREE.Color(...color), size, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, map: texture, sizeAttenuation: true, opacity: 0.9 });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; parent.add(this.points);
    for (let i = 0; i < count; i++) this.p[i * 3 + 1] = -999;
  }
  emit(p, v, life) { const i = this.next; this.next = (i + 1) % this.n; this.p.set(p, i * 3); this.v.set(v, i * 3); this.life[i] = life; this.max[i] = life; }
  update(dt, g = -9.8, drag = 0.4) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.p[i * 3 + 1] = -999; continue; }
      this.life[i] -= dt;
      this.v[i * 3] *= 1 - drag * dt; this.v[i * 3 + 1] = this.v[i * 3 + 1] * (1 - drag * dt) + g * dt; this.v[i * 3 + 2] *= 1 - drag * dt;
      this.p[i * 3] += this.v[i * 3] * dt; this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
const softDot = () => canvasTexture(64, 64, (ctx, w) => { const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, w); });

// ======================================================================= scenes
function deepavaliScene(scene, ctx) {
  const W = 5, D = 5.2, H = 3.3;
  scene.background = new THREE.Color('#0d0f20');
  scene.fog = new THREE.Fog('#0d0f20', 9, 18);
  const wall = new THREE.MeshStandardMaterial({ map: wallTex('#ecdcbc'), roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.25, metalness: 0.08 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // walls with a door (right) and a window (left)
  scene.add(box(W, H, 0.2, wall, 0, H / 2, -D / 2));                       // back (puja wall)
  scene.add(box(0.2, H, 1.6, wall, -W / 2, H / 2, -1.8), box(0.2, H, 1.6, wall, -W / 2, H / 2, 1.8), box(0.2, 1.0, 2.0, wall, -W / 2, 0.5, 0), box(0.2, 0.9, 2.0, wall, -W / 2, H - 0.45, 0)); // left w/ window
  scene.add(box(0.2, H, 2.6, wall, W / 2, H / 2, -1.3), box(0.2, 0.8, 1.2, wall, W / 2, H - 0.4, 0.6), box(0.2, H, 1.4, wall, W / 2, H / 2, 1.9)); // right w/ door
  // ceiling with teak beams
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), MAT.lime('#e2d5bb')); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; scene.add(ceil);
  for (let i = -2; i <= 2; i++) scene.add(box(0.14, 0.18, D, MAT.teak(), i * 1.0, H - 0.09, 0));
  // window: wooden frame + vertical iron bars (jannal), night outside
  const win = new THREE.Group(); win.position.set(-W / 2, 1.0, 0);
  win.add(box(0.24, 0.1, 2.0, MAT.teak(), 0, 0.05, 0), box(0.24, 0.1, 2.0, MAT.teak(), 0, 1.35, 0), box(0.24, 1.4, 0.1, MAT.teak(), 0, 0.7, -1), box(0.24, 1.4, 0.1, MAT.teak(), 0, 0.7, 1));
  for (let z = -0.85; z <= 0.86; z += 0.14) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3), new THREE.MeshStandardMaterial({ color: '#2a2d33', metalness: 0.6, roughness: 0.5 })); bar.position.set(0, 0.7, z); win.add(bar); }
  const night = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.3), new THREE.MeshBasicMaterial({ color: '#141a3a' })); night.rotation.y = Math.PI / 2; night.position.set(-0.6, 0.7, 0); win.add(night);
  scene.add(win);
  // door: two teak leaves swung open, studded with brass; the street beyond
  for (const s of [-1, 1]) {
    const leaf = box(0.06, 2.2, 0.58, MAT.teakDark(), 0, 1.1, 0);
    for (let k = 0; k < 12; k++) { const stud = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), MAT.brass()); stud.position.set(-0.035, 0.3 + Math.floor(k / 3) * 0.5, -0.2 + (k % 3) * 0.2); leaf.add(stud); }
    const pivot = new THREE.Group(); pivot.position.set(W / 2, 0, s < 0 ? 0 : 1.2); pivot.add(leaf); leaf.position.z = s < 0 ? 0.29 : -0.29; pivot.rotation.y = s * 1.2; scene.add(pivot);
  }
  scene.add(box(0.3, 0.12, 1.3, MAT.granite(), W / 2, 0.06, 0.6)); // granite threshold (vaasal padi)
  const street = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 1 })); street.rotation.x = -Math.PI / 2; street.position.set(W / 2 + 3, -0.02, 0.6); scene.add(street);
  const opposite = box(0.4, 4, 6, new THREE.MeshStandardMaterial({ color: '#2b2a38' }), W / 2 + 4.5, 2, 0.6); scene.add(opposite);
  for (let i = 0; i < 6; i++) { const lit = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.1, 0.6) })); lit.rotation.y = -Math.PI / 2; lit.position.set(W / 2 + 4.28, 1.4 + (i % 2) * 1.5, -1.6 + Math.floor(i / 2) * 1.6); scene.add(lit); }

  // ---- the puja niche (maadam) with its shelf
  const niche = new THREE.Group(); niche.position.set(0, 0, -D / 2 + 0.11);
  niche.add(box(1.5, 1.7, 0.02, MAT.lime('#f3e9d2'), 0, 1.55, 0.0));
  niche.add(box(1.7, 0.08, 0.45, MAT.teak(), 0, 0.72, 0.2), box(1.7, 0.08, 0.45, MAT.teak(), 0, 2.4, 0.2), box(0.08, 1.7, 0.45, MAT.teak(), -0.81, 1.56, 0.2), box(0.08, 1.7, 0.45, MAT.teak(), 0.81, 1.56, 0.2));
  // carved arch over the niche
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 32, Math.PI), MAT.teak()); arch.position.set(0, 2.05, 0.4); niche.add(arch);
  // framed picture: Pillaiyar suli (உ) above ஓம், on a deep red ground with a gold border.
  const pic = canvasTexture(512, 640, (c, w, h) => {
    c.fillStyle = '#c9a24a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#6e1f2a'; c.fillRect(28, 28, w - 56, h - 56);
    c.strokeStyle = '#e2c47e'; c.lineWidth = 6; c.strokeRect(48, 48, w - 96, h - 96);
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; c.fillStyle = '#e2c47e'; c.beginPath(); c.ellipse(w / 2 + Math.cos(a) * 160, h * 0.56 + Math.sin(a) * 160, 14, 6, a, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#f6e3b0'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 110px "Noto Serif Tamil", serif'; c.fillText('உ', w / 2, h * 0.22);
    c.font = '700 150px "Noto Serif Tamil", serif'; c.fillText('ஓம்', w / 2, h * 0.58);
  });
  const frame = box(0.62, 0.78, 0.04, new THREE.MeshStandardMaterial({ map: pic, roughness: 0.5 }), 0, 1.62, 0.1); niche.add(frame);
  niche.add(garland(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.32, 2.02, 0.14), new THREE.Vector3(-0.2, 1.5, 0.16), new THREE.Vector3(0, 1.32, 0.17), new THREE.Vector3(0.2, 1.5, 0.16), new THREE.Vector3(0.32, 2.02, 0.14)]), 90));
  // small brass lamps & bell on the shelf
  const shelfFlames = [];
  for (const x of [-0.5, 0.5]) { const l = kuthuvilakku(0.32); l.position.set(x, 0.76, 0.25); niche.add(l); l.userData.flames.forEach((f) => shelfFlames.push(f.clone().add(l.position).add(niche.position))); }
  const bell = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.12], [0.02, 0.11], [0.045, 0.04], [0.05, 0]].map(([a, b]) => new THREE.Vector2(a, b)), 20), MAT.brass()); bell.position.set(0.3, 0.76, 0.32); niche.add(bell);
  scene.add(niche);

  // ---- the tall kuthuvilakku in front of the niche
  const big = kuthuvilakku(1.15); big.position.set(-0.75, 0, -1.7); scene.add(big);
  const bigFlames = big.userData.flames.map((f) => f.clone().add(big.position));
  // hanging lamp (thooku vilakku) on brass chains
  const hang = new THREE.Group(); hang.position.set(0.6, 2.3, -1.6);
  hang.add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.12, 0.02], [0.14, 0.05], [0.1, 0.06], [0, 0.04]].map(([a, b]) => new THREE.Vector2(a, b)), 32), MAT.brass()));
  for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.0), MAT.brass()); ch.position.set(Math.cos(a) * 0.06, 0.5, Math.sin(a) * 0.06); ch.rotation.set(Math.sin(a) * 0.06, 0, -Math.cos(a) * 0.06); hang.add(ch); }
  scene.add(hang);
  const hangFlames = [0, 1, 2, 3, 4].map((k) => { const a = (k / 5) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * 0.13, 0.07, Math.sin(a) * 0.13).add(hang.position); });

  // ---- floor: kolam, rows of agal vilakku, the mat with sweets, clothes and the oil bath
  const kt = kolamTexture('deepa', { line: '#fbf3df', dots: true, width: 6 });
  const k = decal(kt, 1.6); k.position.set(0.1, 0.004, -0.8); scene.add(k);
  const agalPts = [];
  const addAgal = (x, z, rot = 0) => { const a = agal(); a.position.set(x, 0, z); a.rotation.y = rot; scene.add(a); agalPts.push(a.userData.flame.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(a.position)); };
  for (let i = 0; i < 9; i++) addAgal(W / 2 - 0.05, 0.05 + i * 0.13, Math.PI);               // along the threshold
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; addAgal(0.1 + Math.cos(a) * 0.95, -0.8 + Math.sin(a) * 0.95, -a); } // ring around the kolam
  for (let i = 0; i < 9; i++) { const a = agal(); a.position.set(-W / 2 + 0.12, 1.06, -0.8 + i * 0.2); scene.add(a); agalPts.push(a.userData.flame.clone().add(a.position)); } // window sill
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ map: canvasTexture(256, 160, (c, w, h) => { c.fillStyle = '#c9a86a'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { c.fillStyle = `rgba(90,60,20,${0.15 + Math.random() * 0.1})`; c.fillRect(0, y, w, 1); } c.fillStyle = '#8a2b2b'; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10); c.fillStyle = '#2f6d5b'; c.fillRect(0, 12, w, 4); c.fillRect(0, h - 16, w, 4); }), roughness: 0.95 }));
  mat.rotation.x = -Math.PI / 2; mat.position.set(0.9, 0.006, 1.1); mat.receiveShadow = true; scene.add(mat);
  const sw = sweetsPlate(); sw.position.set(0.55, 0.01, 1.0); scene.add(sw);
  const silk = foldedSilk(); silk.position.set(1.15, 0.04, 1.0); scene.add(silk);
  const silk2 = foldedSilk('#1f5a5a', '#d4a640'); silk2.position.set(1.15, 0.1, 1.0); silk2.rotation.y = 0.08; scene.add(silk2);
  const vesh = foldedVeshti(); vesh.position.set(1.18, 0.15, 1.02); scene.add(vesh);
  const oil = new THREE.Group(); oil.position.set(0.4, 0.01, 1.4);
  oil.add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.09, 0.05], [0.095, 0.06], [0.085, 0.055], [0, 0.03]].map(([a, b]) => new THREE.Vector2(a, b)), 28), MAT.brass()));
  const oilTop = new THREE.Mesh(new THREE.CircleGeometry(0.083, 28), new THREE.MeshStandardMaterial({ color: '#c9971f', metalness: 0.4, roughness: 0.05 })); oilTop.rotation.x = -Math.PI / 2; oilTop.position.y = 0.05; oil.add(oilTop);
  scene.add(oil);
  const leg = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), new THREE.MeshStandardMaterial({ color: '#2a170c', roughness: 0.6 })); leg.position.set(0.62, 0.035, 1.42); scene.add(leg);
  const legCup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.03, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#d0d4d8', metalness: 1, roughness: 0.3, side: THREE.DoubleSide })); legCup.position.set(0.62, 0.02, 1.42); scene.add(legCup);
  const th = thambalam(); th.position.set(0.55, 0, -1.55); scene.add(th);
  // a box of crackers by the door
  const crackerTex = canvasTexture(256, 160, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#e2382a'); g.addColorStop(1, '#f2b230'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#1b1b3a'; c.fillRect(0, h * 0.62, w, h * 0.38); for (let i = 0; i < 9; i++) { c.fillStyle = ['#ffe680', '#7fd3ff', '#ff79c6'][i % 3]; c.beginPath(); const x = 20 + i * 26; c.moveTo(x, 30); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, r = k % 2 ? 6 : 14; c.lineTo(x + Math.cos(a) * r, 40 + Math.sin(a) * r); } c.fill(); } c.fillStyle = '#fff'; c.font = '700 34px "Noto Serif Tamil", serif'; c.textAlign = 'center'; c.fillText('பட்டாசு', w / 2, h * 0.86); });
  const cr = box(0.36, 0.12, 0.24, [MAT.clay(), MAT.clay(), new THREE.MeshStandardMaterial({ map: crackerTex }), MAT.clay(), MAT.clay(), MAT.clay()], 1.7, 0.06, 0.15); scene.add(cr);

  // ---- light
  scene.add(new THREE.HemisphereLight('#4a4f8a', '#3a2214', 0.55));
  const lampLight = new THREE.PointLight('#ffb35c', 2.0, 7, 1.7); lampLight.position.copy(bigFlames[0]).setY(1.05); lampLight.castShadow = true; lampLight.shadow.mapSize.set(1024, 1024); lampLight.shadow.bias = -0.002; scene.add(lampLight);
  const shelfLight = new THREE.PointLight('#ffb35c', 0.55, 3, 1.8); shelfLight.position.set(0, 1.0, -1.7); scene.add(shelfLight);
  const floorLight = new THREE.PointLight('#ff9a40', 0.9, 3.5, 1.8); floorLight.position.set(0.1, 0.25, -0.8); scene.add(floorLight);
  const doorLight = new THREE.PointLight('#ff9a40', 0.7, 3, 1.8); doorLight.position.set(W / 2 - 0.3, 0.3, 0.6); scene.add(doorLight);
  const hangLight = new THREE.PointLight('#ffc070', 0.8, 5, 1.7); hangLight.position.copy(hang.position).setY(2.2); scene.add(hangLight);
  const outside = new THREE.PointLight('#ffffff', 0, 9, 1.4); outside.position.set(W / 2 + 2, 2, 0.6); scene.add(outside);
  const flames = new Flames(scene, [...bigFlames, ...shelfFlames, ...hangFlames, ...agalPts], { size: 0.055, glow: 0.22 });

  // flower-pot (pusvanam) cracker fountain just outside the door
  const sparks = new Particles(scene, { count: 1600, color: [1.8, 1.25, 0.6], size: 0.035 });
  const smoke = new Particles(scene, { count: 160, color: [0.55, 0.52, 0.6], size: 0.5, additive: false, texture: softDot() });
  smoke.mat.opacity = 0.18;
  let fountain = 0, burst = 3;
  const pot = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 16), new THREE.MeshStandardMaterial({ color: '#c0703a', roughness: 0.9 })); pot.position.set(W / 2 + 1.6, 0.07, 0.4); scene.add(pot);
  // agarbathi (incense) smoke at the niche
  const incense = new Particles(scene, { count: 120, color: [0.9, 0.88, 0.92], size: 0.12, additive: false, texture: softDot() }); incense.mat.opacity = 0.25;

  ctx.update = (dt, t) => {
    flames.update(t);
    lampLight.intensity = 1.9 + Math.sin(t * 11) * 0.15 + Math.sin(t * 23) * 0.1;
    floorLight.intensity = 0.85 + Math.sin(t * 13 + 1) * 0.1;
    fountain += dt;
    const on = (fountain % 9) < 5.5;
    if (on) for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 0.9; sparks.emit([pot.position.x, 0.15, pot.position.z], [Math.cos(a) * sp, 4.2 + Math.random() * 2.2, Math.sin(a) * sp], 0.9 + Math.random() * 0.5); }
    if (on && Math.random() < 0.3) smoke.emit([pot.position.x, 0.4, pot.position.z], [(Math.random() - 0.5) * 0.3, 0.6, (Math.random() - 0.5) * 0.3], 4);
    sparks.update(dt, -6, 0.5); smoke.update(dt, 0.15, 0.3);
    outside.intensity = on ? 1.4 + Math.random() * 0.8 : outside.intensity * 0.9;
    if (Math.random() < 0.15) incense.emit([0.25, 0.95, -2.2], [(Math.random() - 0.5) * 0.04, 0.18, (Math.random() - 0.5) * 0.04], 5);
    incense.update(dt, 0.02, 0.1);
    burst -= dt;
    if (burst < 0) { burst = 4 + Math.random() * 6; night.material.color.set(['#5a3a8a', '#8a5a2a', '#3a6a8a'][Math.floor(Math.random() * 3)]); gsap.to(night.material.color, { r: 0.08, g: 0.1, b: 0.23, duration: 1.4 }); ctx.boom?.(); }
  };

  ctx.camera.position.set(2.0, 1.5, 2.2);
  ctx.target.set(-0.1, 0.9, -1.0);
  ctx.bounds = { r: [0.6, 4.2], y: [0.4, 2.8] };
  ctx.hotspots = [
    { p: [-0.75, 1.25, -1.7], t: 'Kuthuvilakku', ta: 'குத்துவிளக்கு', x: 'The tall brass standing lamp with five wicks — said to stand for the five elements — is lit at dusk and dawn and at every auspicious moment. Its swan (annam) finial and stacked lathe-turned forms are classic South Indian brasswork.' },
    { p: [0, 1.62, -2.48], t: 'The puja shelf', ta: 'பூஜை மாடம்', x: 'A niche in the wall holds the family’s pictures and small lamps. The frame shows உ — the “Pillaiyar suli”, a mark many Tamils write at the top of anything new — above ஓம். Fresh jasmine and marigold are strung over it every festival morning.' },
    { p: [0.1, 0.05, -0.8], t: 'A kolam with lamps', ta: 'கோலமும் விளக்கும்', x: 'On Deepavali morning the threshold and puja space get a kolam ringed with clay agal vilakku.' },
    { p: [2.4, 0.08, 0.6], t: 'Agal vilakku at the vaasal', ta: 'அகல் விளக்கு', x: 'Clay oil lamps line the granite threshold. In Tamil Nadu the great lamp festival is Karthigai Deepam, but lamps are lit at the door on Deepavali too.' },
    { p: [0.4, 0.08, 1.4], t: 'Ganga snanam', ta: 'கங்கா ஸ்நானம்', x: 'Before dawn the eldest woman of the house dabs warm sesame oil on everyone’s head; the oil bath that follows is called Ganga snanam — and “Ganga snanam aachaa?” is the greeting for the rest of the day.' },
    { p: [0.62, 0.08, 1.42], t: 'Deepavali legiyam', ta: 'தீபாவளி லேகியம்', x: 'A dark, ginger-and-spice herbal paste taken in the morning — the household’s answer to everything that comes next.' },
    { p: [0.55, 0.1, 1.0], t: 'Sweets & savouries', ta: 'பலகாரம்', x: 'Murukku spirals, laddus, mysore pak and athirasam — made days ahead and shared with neighbours, the tradition of exchanging plates of bakshanam.' },
    { p: [1.15, 0.2, 1.0], t: 'New clothes', ta: 'புத்தாடை', x: 'Silk saris and a gold-bordered veshti are laid out with turmeric and kumkum and blessed before they are worn for the first time.' },
    { p: [1.7, 0.15, 0.15], t: 'Crackers', ta: 'பட்டாசு', x: 'Most Deepavali crackers in India come from Sivakasi, in southern Tamil Nadu. Outside the door, a flower pot (pusvanam) fountains gold sparks.' },
    { p: [0.6, 2.35, -1.6], t: 'Thooku vilakku', ta: 'தூக்கு விளக்கு', x: 'A hanging brass lamp on chains — another everyday form of the oil lamp.' },
  ];
}

function pongalScene(scene, ctx) {
  scene.background = new THREE.Color('#9fc6e6');
  scene.fog = new THREE.Fog('#f2dcb0', 18, 60);
  // sky dome with a low morning sun
  const sky = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { sun: { value: new THREE.Vector3(0.7, 0.3, -0.6).normalize() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 sun; varying vec3 vD; void main(){ float y = max(vD.y,0.0); vec3 c = mix(vec3(0.98,0.84,0.6), vec3(0.45,0.66,0.88), pow(y,0.6)); float s = max(dot(vD, sun),0.0); c += vec3(1.0,0.85,0.55) * (pow(s,600.0)*3.0 + pow(s,12.0)*0.35); gl_FragColor = vec4(c,1.0);\n#include <colorspace_fragment>\n}' }));
  scene.add(sky);
  // courtyard floor (cow-dung washed earth — a dark, smooth greenish-brown) and surrounding verandah
  const earth = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: canvasTexture(256, 256, (c, w, h) => { c.fillStyle = '#6b5a3a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2000; i++) { c.fillStyle = `rgba(${40 + Math.random() * 40},${40 + Math.random() * 30},20,0.08)`; c.fillRect(Math.random() * w, Math.random() * h, 4, 4); } }, [10, 10]), roughness: 0.95 }));
  earth.rotation.x = -Math.PI / 2; earth.receiveShadow = true; scene.add(earth);
  const S = 7; // courtyard half-size
  const plinth = MAT.granite(); const teak = MAT.teak(); const tile = MAT.tile(); const wall = new THREE.MeshStandardMaterial({ map: wallTex('#efe6cf'), roughness: 0.95 });
  // three sides of a house around the mutram; the fourth side opens to the cattle shed
  for (const [x, z, w, d, rot] of [[0, -S, 2 * S + 3, 3, 0], [-S, 0, 3, 2 * S, 0], [S, -2, 3, 2 * S - 4, 0]]) {
    scene.add(box(w, 0.45, d, plinth, x, 0.22, z));
    const back = box(rot ? 0.2 : (w === 3 ? 0.2 : w), 3.2, w === 3 ? d : 0.2, wall, x + (w === 3 ? Math.sign(x) * 1.4 : 0), 2.05, z + (w === 3 ? 0 : -1.4)); scene.add(back);
  }
  // verandah pillars & sloping tiled roofs facing into the courtyard
  const pillar = (x, z) => { scene.add(box(0.3, 0.2, 0.3, plinth, x, 0.55, z)); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 12), teak); p.position.set(x, 1.95, z); p.castShadow = true; scene.add(p); };
  for (let i = -3; i <= 3; i++) pillar(i * 2.2, -S + 1.3);
  for (let i = -2; i <= 2; i++) pillar(-S + 1.3, i * 2.4);
  for (let i = -2; i <= 1; i++) pillar(S - 1.3, i * 2.4 - 1);
  const roofN = box(2 * S + 3.6, 0.12, 3.6, tile, 0, 3.55, -S); roofN.rotation.x = 0.32; scene.add(roofN);
  const roofW = box(3.6, 0.12, 2 * S, tile, -S, 3.55, 0); roofW.rotation.z = -0.32; scene.add(roofW);
  const roofE = box(3.6, 0.12, 2 * S - 3, tile, S, 3.55, -2); roofE.rotation.z = 0.32; scene.add(roofE);
  // doorway with a mango-leaf thoranam on the north wall
  scene.add(box(1.4, 2.4, 0.15, MAT.teakDark(), 0, 1.65, -S - 1.32));
  const tho = thoranam(1.7); tho.position.set(0, 2.95, -S - 1.2); scene.add(tho);

  // ---- the Pongal hearth at the centre
  const center = new THREE.Vector3(0, 0, -1);
  const kt = kolamTexture('pongal-pot', {});
  const kd = decal(kt, 3.4); kd.position.set(center.x, 0.004, center.z + 0.2); scene.add(kd);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + 0.5; const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), MAT.granite()); st.position.set(center.x + Math.cos(a) * 0.28, 0.12, center.z + Math.sin(a) * 0.28); st.castShadow = true; scene.add(st); }
  for (let k = 0; k < 6; k++) { const wood = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.8, 8), new THREE.MeshStandardMaterial({ color: '#5a3f2a', roughness: 1 })); wood.rotation.z = Math.PI / 2; wood.rotation.y = (k / 6) * Math.PI * 2; wood.position.set(center.x + Math.cos((k / 6) * 6.28) * 0.35, 0.05, center.z + Math.sin((k / 6) * 6.28) * 0.35); scene.add(wood); }
  // the new clay pot, decorated with kolam lines, tied with a turmeric plant
  const potTex = canvasTexture(512, 256, (c, w, h) => { c.fillStyle = '#b05a32'; c.fillRect(0, 0, w, h); c.strokeStyle = '#f6efe0'; c.lineWidth = 6; for (let x = 0; x < w; x += 64) { c.beginPath(); c.arc(x + 32, h * 0.55, 22, 0, Math.PI * 2); c.stroke(); c.fillStyle = '#f6efe0'; c.beginPath(); c.arc(x + 32, h * 0.55, 5, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#e7b52a'; c.fillRect(0, h * 0.2, w, 10); c.fillStyle = '#c8102e'; for (let x = 16; x < w; x += 32) { c.beginPath(); c.arc(x, h * 0.32, 7, 0, Math.PI * 2); c.fill(); } });
  const potProf = [[0, 0], [0.12, 0.01], [0.24, 0.08], [0.3, 0.2], [0.29, 0.34], [0.22, 0.45], [0.16, 0.5], [0.17, 0.53], [0.2, 0.55]];
  const pot = new THREE.Mesh(new THREE.LatheGeometry(potProf.map(([a, b]) => new THREE.Vector2(a, b)), 40), new THREE.MeshStandardMaterial({ map: potTex, roughness: 0.75, side: THREE.DoubleSide }));
  pot.position.set(center.x, 0.22, center.z); pot.castShadow = true; scene.add(pot);
  const milk = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), new THREE.MeshStandardMaterial({ color: '#fbf7ec', roughness: 0.35 })); milk.rotation.x = -Math.PI / 2; milk.position.set(center.x, 0.74, center.z); scene.add(milk);
  const foamMat = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.5, transparent: true, opacity: 0.95 });
  const foam = new THREE.Mesh(new THREE.SphereGeometry(0.19, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), foamMat); foam.scale.y = 0.2; foam.position.set(center.x, 0.74, center.z); scene.add(foam);
  // turmeric plant tied at the neck
  for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.42), MAT.leaf()); l.position.set(center.x + 0.2, 0.9, center.z + (i - 2) * 0.05); l.rotation.set(0.2 * (i - 2), 0.4, -0.35); scene.add(l); }
  const tumeric = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 24), new THREE.MeshStandardMaterial({ color: '#d9a21b' })); tumeric.rotation.x = Math.PI / 2; tumeric.position.set(center.x, 0.71, center.z); scene.add(tumeric);
  // sugarcane leaning at the doorway & by the pot
  for (const [x, z, rz] of [[-1.0, -S - 1.1, 0.12], [1.0, -S - 1.1, -0.12], [-0.75, -1.0, -0.3], [0.75, -1.0, 0.3]]) { const sc = sugarcane(2.4); sc.position.set(x, 0, z); sc.rotation.z = rz; scene.add(sc); }
  const meal = bananaLeafMeal(); meal.position.set(-1.6, 0.47, -S + 1.9); scene.add(meal);
  const meal2 = bananaLeafMeal(); meal2.position.set(-0.6, 0.47, -S + 1.9); meal2.rotation.y = 0.1; scene.add(meal2);

  // ---- the cattle shed (maattu kottagai) to the south, open side
  const shed = new THREE.Group(); shed.position.set(1.5, 0, 6.2);
  for (const [x, z] of [[-3, -1.6], [3, -1.6], [-3, 1.6], [3, 1.6], [0, -1.6], [0, 1.6]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 8), MAT.teak()); p.position.set(x, 1.3, z); p.castShadow = true; shed.add(p); }
  const thatch = new THREE.Mesh(new THREE.BoxGeometry(7, 0.18, 4.2), new THREE.MeshStandardMaterial({ map: canvasTexture(128, 128, (c, w, h) => { c.fillStyle = '#a88a4a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { c.strokeStyle = `rgba(80,60,20,${0.2 + Math.random() * 0.3})`; c.beginPath(); const x = Math.random() * w; c.moveTo(x, Math.random() * h); c.lineTo(x + 2, Math.random() * h); c.stroke(); } }, [4, 2]), roughness: 1 }));
  thatch.position.y = 2.75; thatch.rotation.x = 0.12; thatch.castShadow = true; shed.add(thatch);
  shed.add(box(6.2, 0.35, 0.5, MAT.granite(), 0, 0.18, 1.3)); // stone water/fodder trough
  const water = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.3), new THREE.MeshStandardMaterial({ color: '#5d7a7a', roughness: 0.1 })); water.rotation.x = -Math.PI / 2; water.position.set(0, 0.34, 1.3); shed.add(water);
  const c1 = cow({ hornColor: '#c3332f' }); c1.position.set(-1.6, 0, 0); c1.rotation.y = -Math.PI / 2; shed.add(c1);
  const c2 = cow({ hornColor: '#2a5bb5', body: '#cfc9bd' }); c2.position.set(1.2, 0, -0.1); c2.rotation.y = -Math.PI / 2 + 0.2; shed.add(c2);
  const calf = cow({ calf: true, body: '#e6e1d6' }); calf.position.set(-0.1, 0, -0.6); calf.rotation.y = -Math.PI / 2 - 0.4; shed.add(calf);
  for (const [x, z] of [[-3.0, 0.2]]) { const sc = sugarcane(2.2); sc.position.set(x, 0, z); sc.rotation.z = 0.2; shed.add(sc); }
  scene.add(shed);
  const hay = haystack(); hay.position.set(7.5, 0, 7.5); scene.add(hay);
  const hay2 = haystack(); hay2.scale.setScalar(0.7); hay2.position.set(9.2, 0, 5.4); scene.add(hay2);
  // coconut palms beyond the walls
  for (const [x, z, s] of [[-11, -9, 1], [10, -10, 0.9], [-12, 8, 1.1], [12, 2, 0.95]]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 9 * s, 8), new THREE.MeshStandardMaterial({ color: '#7a6450' })); trunk.position.set(x, 4.5 * s, z); trunk.rotation.z = 0.06; scene.add(trunk);
    for (let k = 0; k < 9; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4, 4, 1, true), MAT.leaf()); f.geometry.translate(0, 2, 0); f.position.set(x, 9 * s, z); f.rotation.set(1.1, (k / 9) * Math.PI * 2, 0); f.scale.set(1, 1, 0.25); scene.add(f); }
  }

  // ---- light: low golden sun from the east
  scene.add(new THREE.HemisphereLight('#cfe2ff', '#7a5a3a', 0.9));
  const sun = new THREE.DirectionalLight('#ffd9a0', 3.2); sun.position.set(14, 8, -12); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 }); sun.shadow.bias = -0.0008;
  scene.add(sun);
  const fireLight = new THREE.PointLight('#ff8a30', 3, 4, 1.8); fireLight.position.set(center.x, 0.2, center.z); scene.add(fireLight);
  const fire = new Particles(scene, { count: 300, color: [2.0, 0.9, 0.3], size: 0.07 });
  const steam = new Particles(scene, { count: 200, color: [1, 1, 1], size: 0.35, additive: false, texture: softDot() }); steam.mat.opacity = 0.22;
  const spill = new Particles(scene, { count: 400, color: [1, 0.98, 0.92], size: 0.045, additive: false, texture: softDot() });
  let boil = 0;
  ctx.update = (dt, t) => {
    for (let i = 0; i < 6; i++) fire.emit([center.x + (Math.random() - 0.5) * 0.3, 0.08, center.z + (Math.random() - 0.5) * 0.3], [(Math.random() - 0.5) * 0.1, 0.8 + Math.random() * 0.6, (Math.random() - 0.5) * 0.1], 0.35 + Math.random() * 0.2);
    fire.update(dt, 0.5, 1.2);
    fireLight.intensity = 2.6 + Math.sin(t * 17) * 0.5 + Math.random() * 0.3;
    // the boil: foam swells, spills over the rim, falls back — on loop
    boil = (boil + dt) % 10;
    const k = Math.min(1, boil / 5);
    foam.scale.y = 0.15 + k * 0.9; foam.scale.x = foam.scale.z = 1 + k * 0.12;
    if (boil > 5 && boil < 8.5) for (let i = 0; i < 5; i++) { const a = Math.random() * Math.PI * 2; spill.emit([center.x + Math.cos(a) * 0.2, 0.86, center.z + Math.sin(a) * 0.2], [Math.cos(a) * 0.25, 0.2, Math.sin(a) * 0.25], 1.2); }
    spill.update(dt, -2.5, 1.5);
    if (Math.random() < 0.4) steam.emit([center.x + (Math.random() - 0.5) * 0.2, 0.9, center.z + (Math.random() - 0.5) * 0.2], [(Math.random() - 0.5) * 0.08, 0.35, (Math.random() - 0.5) * 0.08], 3.5);
    steam.update(dt, 0.05, 0.2);
    if (boil > 5 && boil - dt <= 5) ctx.onBoil?.();
    for (const c of [c1, c2, calf]) c.userData.animate(t);
  };
  ctx.camera.position.set(4.2, 2.6, 4.6);
  ctx.target.set(0, 0.7, -0.6);
  ctx.bounds = { r: [1.5, 14], y: [0.6, 9] };
  ctx.days = [
    { id: 'bhogi', ta: 'போகி', en: 'Bhogi', cam: [[-4, 3, -3], [-1, 1.4, -6]], text: 'Last day of Margazhi. The house is cleaned and old things set aside; at dawn many families once lit a bonfire. Today Chennai asks for a smoke-free Bhogi.' },
    { id: 'thai', ta: 'தைப் பொங்கல்', en: 'Thai Pongal', cam: [[2.4, 1.8, 1.8], [0, 0.7, -1]], text: 'New rice, milk and jaggery boil in a new pot tied with turmeric. When it spills over, everyone shouts “Pongalo Pongal!”, and the first portion is offered to the Sun.' },
    { id: 'mattu', ta: 'மாட்டுப் பொங்கல்', en: 'Mattu Pongal', cam: [[5.5, 2.2, 1.5], [1.2, 1, 6]], text: 'The cattle that work the fields are bathed, their horns painted and capped, garlanded with bells and marigolds, and fed pongal. These are Kangayam cattle, a grey-white breed from western Tamil Nadu.' },
    { id: 'kaanum', ta: 'காணும் பொங்கல்', en: 'Kaanum Pongal', cam: [[-5, 2.4, 5], [-1.6, 0.6, -5]], text: 'A day of visiting relatives and going out — in Chennai, families crowd the Marina. The banana-leaf meal waits on the verandah.' },
  ];
  ctx.hotspots = [
    { p: [center.x, 1.0, center.z], t: 'The Pongal pot', ta: 'பொங்கல் பானை', x: 'A new clay pot, painted with kolam lines and kumkum dots, its neck tied with a fresh turmeric plant. The overflow is the point: abundance spilling over for the year ahead.' },
    { p: [center.x + 0.3, 0.2, center.z + 0.25], t: 'Three-stone hearth', ta: 'அடுப்பு', x: 'The pot sits on three stones over a wood fire, in the open courtyard so the Sun can “see” it — Pongal is a thanksgiving to Surya.' },
    { p: [center.x - 0.9, 0.05, center.z + 1.4], t: 'Pongal kolam', ta: 'பொங்கல் கோலம்', x: 'Pongal kolams are drawn in colour — pots, sugarcane and the rising sun.' },
    { p: [-1.0, 2.0, -S - 1.1], t: 'Sugarcane & thoranam', ta: 'கரும்பு · தோரணம்', x: 'Sugarcane stalks frame the doorway, and a string of mango leaves and marigolds (thoranam) hangs above it.' },
    { p: [-1.6, 0.7, -S + 1.9], t: 'Banana-leaf feast', ta: 'வாழை இலை', x: 'Sakkarai pongal (sweet, with jaggery, ghee and cashews), ven pongal and vadai served on a banana leaf.' },
    { p: [0.0, 2.0, 6.2], t: 'Mattu Pongal', ta: 'மாட்டுப் பொங்கல்', x: 'In the shed, the family’s cattle wear painted horns with brass caps, bells on red cords and marigold garlands — the next day of the festival is theirs.' },
    { p: [7.5, 2.6, 7.5], t: 'Haystack', ta: 'வைக்கோல் போர்', x: 'Straw from the harvest — the reason for the season — stacked for the cattle.' },
  ];
}

function kolamScene(scene, ctx) {
  scene.background = new THREE.Color('#c9d6e6');
  scene.fog = new THREE.Fog('#e9d9c2', 10, 40);
  scene.add(new THREE.HemisphereLight('#dfe9ff', '#7a5a3a', 0.9));
  const sun = new THREE.DirectionalLight('#ffd2a0', 2.8); sun.position.set(8, 4, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); scene.add(sun);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: canvasTexture(256, 256, (c, w, h) => { c.fillStyle = '#7b6f62'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2000; i++) { c.fillStyle = `rgba(30,25,20,${Math.random() * 0.1})`; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); } }, [8, 8]), roughness: 1 }));
  street.rotation.x = -Math.PI / 2; street.receiveShadow = true; scene.add(street);
  // the threshold, washed dark with water (and traditionally cow-dung) before the kolam
  const wash = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), new THREE.MeshStandardMaterial({ color: '#4a3f33', roughness: 0.55 })); wash.rotation.x = -Math.PI / 2; wash.position.set(0, 0.002, 2.5); wash.scale.set(1.3, 1, 1); wash.receiveShadow = true; scene.add(wash);
  const wall = new THREE.MeshStandardMaterial({ map: wallTex('#f1dfb8'), roughness: 0.95 });
  scene.add(box(9, 0.75, 4, MAT.granite(), 0, 0.37, -1.2));                     // plinth
  scene.add(box(9, 4.2, 0.3, wall, 0, 2.85, -3.0));                              // house front wall
  for (const s of [-1, 1]) scene.add(box(2.6, 0.55, 1.8, MAT.lime('#d8ccb2'), s * 2.9, 1.02, -0.9)); // thinnai platforms
  for (const x of [-4.2, -1.6, 1.6, 4.2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 3.0, 12), MAT.teak()); p.position.set(x, 2.25, 0.6); p.castShadow = true; scene.add(p); }
  const roof = box(9.6, 0.14, 4.2, MAT.tile(), 0, 3.95, -0.9); roof.rotation.x = 0.28; scene.add(roof);
  // studded teak door
  const door = box(1.5, 2.6, 0.12, MAT.teakDark(), 0, 2.05, -2.82); scene.add(door);
  for (let k = 0; k < 24; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), MAT.brass()); s.position.set(-0.6 + (k % 4) * 0.4, 1.0 + Math.floor(k / 4) * 0.4, -2.74); scene.add(s); }
  const tho = thoranam(1.8); tho.position.set(0, 3.45, -2.78); scene.add(tho);
  for (const s of [-1, 1]) { const steps = box(2.2, 0.25, 0.5, MAT.granite(), 0, 0.12 + 0, 1.05 + 0); if (s > 0) scene.add(steps); }
  // things of the morning: brass water pot (kodam), the rice-flour tin, a broom
  const kodam = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.12, 0.01], [0.2, 0.12], [0.21, 0.24], [0.14, 0.36], [0.08, 0.42], [0.1, 0.46]].map(([a, b]) => new THREE.Vector2(a, b)), 36), MAT.brass()); kodam.position.set(1.6, 0, 2.0); kodam.castShadow = true; scene.add(kodam);
  const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 24), new THREE.MeshStandardMaterial({ color: '#d0d4d8', metalness: 1, roughness: 0.25 })); tin.position.set(-1.5, 0.06, 2.2); scene.add(tin);
  const flour = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), new THREE.MeshStandardMaterial({ color: '#fbf8f0' })); flour.rotation.x = -Math.PI / 2; flour.position.set(-1.5, 0.121, 2.2); scene.add(flour);
  const broom = new THREE.Group(); const bundle = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.1, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#c2a165', side: THREE.DoubleSide })); bundle.position.y = 0.55; broom.add(bundle); broom.position.set(-3.6, 0.75, -1.9); broom.rotation.z = 0.2; scene.add(broom);
  // the kolam itself, drawing live on the washed threshold
  const kt = kolamTexture('sikku-5-diamond', { line: '#fbf8f0', width: 7 });
  const kd = decal(kt, 3.2, 0.006); kd.position.set(0, 0.006, 2.5); scene.add(kd);
  let prog = 0;
  ctx.update = (dt) => {
    prog = Math.min(1.25, prog + dt * (state.reduceMotion ? 1 : 0.06));
    const c2 = kt.userData.cv.getContext('2d');
    renderKolam(c2, kt.userData.k, { size: 1024, progress: Math.min(1, prog), paths: kt.userData.paths, transparent: true });
    kt.needsUpdate = true;
    if (prog >= 1.25) prog = 0;
  };
  ctx.camera.position.set(3.4, 2.6, 6.2);
  ctx.target.set(0, 0.6, 1.2);
  ctx.bounds = { r: [1.5, 11], y: [0.5, 6] };
  ctx.hotspots = [
    { p: [0, 0.1, 2.5], t: 'The morning kolam', ta: 'காலைக் கோலம்', x: 'Dots first — 1, 3, 5, 3, 1 — then one unbroken line looping around every dot. Watch it being drawn on the wet threshold.' },
    { p: [-1.5, 0.25, 2.2], t: 'Rice flour', ta: 'அரிசி மாவு', x: 'Kolam powder is often rice flour, so the drawing doubles as food for ants and birds — a daily act of charity.' },
    { p: [1.6, 0.6, 2.0], t: 'Water for the threshold', ta: 'குடம்', x: 'The vaasal is swept and sprinkled with water (traditionally mixed with cow dung, an antiseptic) to settle the dust before drawing.' },
    { p: [-2.9, 1.4, -0.9], t: 'Thinnai', ta: 'திண்ணை', x: 'Raised platforms either side of the door where neighbours sit, travellers rest and grandparents watch the street — the front porch of the Tamil house.' },
    { p: [0, 3.4, -2.7], t: 'Thoranam', ta: 'தோரணம்', x: 'Mango leaves and marigolds over the door welcome guests and good fortune.' },
  ];
}

function templeScene(scene, ctx) {
  const W = 42, D = 44;
  scene.background = new THREE.Color('#e9b58a');
  scene.fog = new THREE.Fog('#d9a27e', 40, 140);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(160, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vD; void main(){ float y = max(vD.y,0.0); vec3 c = mix(vec3(0.98,0.66,0.42), vec3(0.28,0.33,0.58), pow(y,0.55)); gl_FragColor = vec4(c,1.0);\n#include <colorspace_fragment>\n}' }));
  scene.add(sky);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: '#8a7f70', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const t = templeComplex({ W, D });
  scene.add(t);
  // the street outside and the houses across it, for context
  const road = new THREE.Mesh(new THREE.PlaneGeometry(220, 9), new THREE.MeshStandardMaterial({ color: '#4d4a46', roughness: 0.9 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, D / 2 + 12); scene.add(road);
  for (let i = -6; i <= 6; i++) { const h = 7 + ((i * 7919) % 5) * 1.6; const b = box(9.5, h, 10, MAT.lime(['#efe6cf', '#e8c9b8', '#cfd6cf', '#f1e3c0'][(i + 12) % 4]), i * 10.5, h / 2, D / 2 + 23); scene.add(b); }
  // a kolam at the gate and lamps lit on the deepasthambam
  const kd = decal(kolamTexture('margazhi-9', { line: '#fbf8f0', width: 6 }), 6); kd.position.set(0, 0.07, D / 2 + 5.5); scene.add(kd);
  const flames = new Flames(scene, t.userData.lights, { size: 0.1, glow: 0.42 });
  scene.add(new THREE.HemisphereLight('#ffd9b0', '#4a3a2a', 0.8));
  const sun = new THREE.DirectionalLight('#ffb070', 2.2); sun.position.set(-40, 18, 30); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 }); sun.shadow.bias = -0.0006; scene.add(sun);
  const lampLight = new THREE.PointLight('#ffb050', 4, 14, 1.6); lampLight.position.set(0, 4, D / 2 - 9); scene.add(lampLight);
  const sanctumGlow = new THREE.PointLight('#ff9a40', 3, 8, 1.6); sanctumGlow.position.set(0, 2, -D / 2 + 14.5); scene.add(sanctumGlow);
  let bell = 2;
  ctx.update = (dt, tt) => { flames.update(tt); lampLight.intensity = 3.6 + Math.sin(tt * 9) * 0.3; bell -= dt; if (bell < 0) { bell = 7 + Math.random() * 8; ctx.bell?.(); } };
  ctx.camera.position.set(7.5, 3.2, D / 2 - 7.5);
  ctx.target.set(-1, 5.5, -6);
  ctx.bounds = { r: [3, 70], y: [1.2, 60] };
  ctx.hotspots = [
    { p: [0, 30, D / 2], t: 'Rajagopuram', ta: 'இராஜகோபுரம்', x: 'The gateway tower. A granite base holds the entrance; above it, brick-and-stucco tiers (talas), each ending in a cornice and a parapet of miniature shrines — square domed kutas at the corners, barrel-vaulted salas at the centres. The crown is a barrel vault topped with gilded kalasams. In the old Tamil saying, seeing the gopuram is itself a blessing: “கோபுர தரிசனம் கோடி புண்ணியம்”.' },
    { p: [W / 2 - 0.5, 4, 6], t: 'Prakaram & kaavi stripes', ta: 'பிரகாரம்', x: 'The enclosure wall is painted in vertical stripes of red ochre (kaavi) and white — the colours that mark a temple from far down a street. Devotees walk clockwise around the prakaram.' },
    { p: [0, 5, D / 2 - 9], t: 'Deepasthambam', ta: 'தீபஸ்தம்பம்', x: 'A stone lamp pillar, its rings of oil lamps lit at dusk and on festival nights such as Karthigai Deepam.' },
    { p: [0, 1.6, D / 2 - 13], t: 'Balipitham', ta: 'பலிபீடம்', x: 'The lotus-shaped offering stone on the axis. Tradition says you leave your ego here before going further in.' },
    { p: [0, 9, D / 2 - 16.5], t: 'Dhwajastambham', ta: 'கொடிமரம்', x: 'The gilded flagstaff (kodimaram). At the start of a temple festival a flag bearing the deity’s emblem is hoisted on it — for Murugan, the rooster (seval) flag.' },
    { p: [0, 2.6, D / 2 - 20], t: 'Mayil — the peacock', ta: 'மயில்', x: 'Every deity has a vahana (mount) that faces the sanctum. Murugan’s is the peacock; Shiva’s would be the bull Nandi.' },
    { p: [0, 3, -D / 2 + 20], t: 'Mandapam', ta: 'மண்டபம்', x: 'A pillared hall before the sanctum, where devotees gather, music is played and festival rituals take place. Its pillars carry corbel brackets (potikai) under a stone roof.' },
    { p: [0, 12, -D / 2 + 9.5], t: 'Vimanam & sanctum', ta: 'விமானம் · கருவறை', x: 'The tower over the sanctum (karuvarai), often gold-plated. Inside, lit only by oil lamps, is the deity; we have deliberately not depicted it.' },
    { p: [-W / 2 + 10, 2.4, D / 2 + 4], t: 'Archana stalls', ta: 'அர்ச்சனைக் கடைகள்', x: 'At every temple gate: flowers, garlands, coconuts, bananas and camphor for the archana offering — and a stand where you leave your footwear.' },
  ];
}

const SCENES = {
  temple: { build: templeScene, title: 'Kandha Kottam at dusk', ta: 'அந்தியில் கந்த கோட்டம்', sub: 'A Dravidian temple complex, Park Town · stylised reconstruction', bloom: 0.45, exposure: 1.0, badge: 'Stylised reconstruction · not a survey' },
  deepavali: { build: deepavaliScene, title: 'Deepavali before dawn', ta: 'தீபாவளி அதிகாலை', sub: 'Inside an illustrative George Town home · 4:30 am', bloom: 0.5, exposure: 1.0 },
  pongal: { build: pongalScene, title: 'The courtyard on Thai Pongal', ta: 'முற்றத்தில் பொங்கல்', sub: 'Inside an illustrative Chintadripet home · sunrise', bloom: 0.35, exposure: 1.0 },
  kolam: { build: kolamScene, title: 'A morning at the vaasal', ta: 'வாசல் கோலம்', sub: 'The front verandah of an illustrative Chintadripet home · sunrise', bloom: 0.2, exposure: 1.0 },
};

export class InteriorViewer {
  constructor({ sound } = {}) {
    this.sound = sound;
    this.el = $('#interior');
  }

  open(kind) {
    const def = SCENES[kind]; if (!def) return;
    this.close(true);
    this.el.hidden = false;
    document.body.classList.add('in-interior');
    const host = $('#interior-stage');
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true }));
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.setSize(host.clientWidth, host.clientHeight);
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = def.exposure;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(r.domElement);
    const scene = (this.scene = new THREE.Scene());
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = kind === 'deepavali' ? 0.12 : kind === 'temple' ? 0.35 : 0.5;
    const camera = (this.camera = new THREE.PerspectiveCamera(48, host.clientWidth / host.clientHeight, 0.05, 200));
    const ctx = { camera, target: new THREE.Vector3(), boom: () => this.sound?.boom(400, 0.35), bell: () => this.sound?.on && this.sound.bell(0.25, 600 + Math.random() * 60), onBoil: () => this.toast('Pongalo Pongal! — the pot has boiled over.') };
    def.build(scene, ctx);
    this.ctx = ctx;
    const controls = (this.controls = new OrbitControls(camera, r.domElement));
    controls.target.copy(ctx.target); controls.enableDamping = true; controls.dampingFactor = 0.07;
    controls.minDistance = ctx.bounds.r[0]; controls.maxDistance = ctx.bounds.r[1];
    controls.maxPolarAngle = 1.52; controls.rotateSpeed = 0.6; controls.panSpeed = 0.6;
    controls.autoRotate = !state.reduceMotion; controls.autoRotateSpeed = 0.35;
    controls.addEventListener('start', () => (controls.autoRotate = false));
    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), def.bloom, 0.5, 0.9));
    this.composer.addPass(new OutputPass());

    // header & hotspots
    $('#interior-title').innerHTML = `<span class="ta">${def.ta}</span><h2>${escapeHtml(def.title)}</h2><small>${escapeHtml(def.sub)}</small><span class="badge illustrative">${escapeHtml(def.badge || 'Illustrative home · not a real family')}</span>`;
    const hs = $('#interior-hotspots'); hs.innerHTML = '';
    this.spots = (ctx.hotspots || []).map((h, i) => {
      const b = document.createElement('button'); b.className = 'ihs'; b.innerHTML = `<span>${i + 1}</span>`; b.setAttribute('aria-label', h.t);
      b.onclick = () => this.showInfo(h, i);
      hs.appendChild(b);
      return { h, b, v: new THREE.Vector3(...h.p) };
    });
    const days = $('#interior-days');
    days.innerHTML = (ctx.days || []).map((d, i) => `<button data-i="${i}" aria-pressed="${d.id === 'thai'}"><span class="ta">${d.ta}</span>${d.en}</button>`).join('');
    days.hidden = !ctx.days;
    days.querySelectorAll('button').forEach((b) => b.onclick = () => {
      const d = ctx.days[+b.dataset.i];
      days.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      controls.autoRotate = false;
      gsap.to(camera.position, { x: d.cam[0][0], y: d.cam[0][1], z: d.cam[0][2], duration: state.reduceMotion ? 0 : 1.8, ease: 'power3.inOut' });
      gsap.to(controls.target, { x: d.cam[1][0], y: d.cam[1][1], z: d.cam[1][2], duration: state.reduceMotion ? 0 : 1.8, ease: 'power3.inOut' });
      this.showInfo({ t: d.en, ta: d.ta, x: d.text });
    });
    this.showInfo({ t: 'Look around', ta: 'சுற்றிப் பாருங்கள்', x: 'Drag to look around, scroll to move closer. Tap the numbered markers to learn what each thing is and why it’s there.' });

    const clock = new THREE.Clock();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
      controls.update();
      ctx.update?.(dt, t);
      this.composer.render();
      const w = host.clientWidth, h = host.clientHeight;
      for (const s of this.spots) {
        const v = s.v.clone().project(camera);
        const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        s.b.style.display = vis ? '' : 'none';
        if (vis) s.b.style.transform = `translate(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%, -50%)`;
      }
    };
    loop();
    this.onResize = () => { const w = host.clientWidth, h = host.clientHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); r.setSize(w, h); this.composer.setSize(w, h); };
    window.addEventListener('resize', this.onResize);
    $('#interior-close').onclick = () => this.close();
    this.keyH = (e) => { if (e.key === 'Escape') this.close(); };
    window.addEventListener('keydown', this.keyH);
    $('#interior-close').focus();
  }

  showInfo(h, i) {
    const el = $('#interior-info');
    el.innerHTML = `<span class="ta">${h.ta || ''}</span><b>${escapeHtml(h.t)}</b><p>${escapeHtml(h.x)}</p>`;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    this.spots?.forEach((s, k) => s.b.classList.toggle('on', k === i));
  }
  toast(msg) { const el = $('#interior-toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(this._t); this._t = setTimeout(() => el.classList.remove('show'), 2600); }

  close(silent) {
    if (!this.renderer) { this.el.hidden = true; return; }
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.keyH);
    this.controls.dispose();
    this.scene.traverse((o) => { o.geometry?.dispose?.(); const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { m?.map?.dispose?.(); m?.dispose?.(); }); });
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
    this.renderer = null;
    if (!silent) { this.el.hidden = true; document.body.classList.remove('in-interior'); }
  }
}
