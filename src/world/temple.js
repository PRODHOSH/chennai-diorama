import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * A DRAVIDIAN TEMPLE COMPLEX — procedural, built to the grammar of Tamil temple architecture:
 *
 *  rajagopuram  — the gateway tower: a granite base (upapitha + adhishthana) with the entrance
 *                 passage, then brick-and-stucco tiers (talas). Every tier ends in a cornice
 *                 (kapota) and a parapet "necklace" (hara) of miniature shrines — kuta (square,
 *                 domed) at the corners, sala (barrel-vaulted) at the centres, panjara between.
 *                 The crown is a barrel vault (sala-shikhara) with gable faces (kirtimukha)
 *                 carrying a row of gilded kalasams.
 *  prakaram     — the enclosure wall, painted in vertical kaavi (red-ochre and white) stripes.
 *  dhwajastambham, balipitham, vahana — flagstaff, lotus offering-stone and the deity's mount
 *                 (for Murugan, the peacock, mayil) on the axis between gate and sanctum.
 *  mandapam     — pillared hall before the sanctum; vimana — the tower over the sanctum.
 *  deepasthambam — the stone lamp pillar.
 *
 * Used twice: on the city map (Kandha Kottam, Park Town) and as a walkable scene.
 * Local frame: origin = centre of the compound, +z = the entrance side.
 */

const tex = new Map();
function ctex(key, w, h, draw, rep) {
  if (tex.has(key)) return tex.get(key);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  tex.set(key, t);
  return t;
}

// ---------------------------------------------------------------- textures
function graniteTex() {
  return ctex('t-granite', 256, 256, (c, w, h) => {
    c.fillStyle = '#9a8f7c'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { const g = 80 + Math.random() * 90; c.fillStyle = `rgba(${g},${g - 8},${g - 20},${0.08 + Math.random() * 0.12})`; c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    c.strokeStyle = 'rgba(50,40,30,0.35)'; c.lineWidth = 1.5;
    for (let y = 0; y <= h; y += 42) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); for (let x = (y / 42) % 2 ? 0 : 64; x < w; x += 128) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 42); c.stroke(); } }
  }, true);
}
/** granite base wall: pilasters (kudyastambha) and niches (devakoshta) carved in relief */
function adhishthanaTex() {
  return ctex('t-adh', 512, 512, (c, w, h) => {
    const base = graniteTex().image; c.drawImage(base, 0, 0, w, h); c.drawImage(base, 0, 0, w / 2, h / 2);
    c.fillStyle = 'rgba(40,32,24,0.35)';
    // moulding bands at the foot
    for (const [y, t] of [[h - 30, 18], [h - 62, 10], [h - 86, 14]]) { c.fillRect(0, y, w, t); }
    // pilasters
    for (let x = 0; x < w; x += 128) { c.fillStyle = 'rgba(255,245,225,0.10)'; c.fillRect(x + 10, 40, 16, h - 130); c.fillStyle = 'rgba(30,24,18,0.28)'; c.fillRect(x + 26, 40, 5, h - 130); }
    // niche with a carved figure silhouette
    for (let x = 64; x < w; x += 256) {
      c.fillStyle = 'rgba(30,24,18,0.45)'; c.fillRect(x - 28, 120, 56, 220);
      c.fillStyle = 'rgba(120,108,90,0.9)'; c.beginPath(); c.ellipse(x, 170, 12, 15, 0, 0, Math.PI * 2); c.fill(); c.fillRect(x - 14, 186, 28, 110);
      c.fillStyle = 'rgba(30,24,18,0.45)'; c.beginPath(); c.moveTo(x - 36, 120); c.lineTo(x, 84); c.lineTo(x + 36, 120); c.fill(); // torana
    }
  }, true);
}
/** stucco tier wall: rows of painted figures in niches between pilasters — the polychrome look of
 *  Chennai's gopurams after a kumbhabhishekam repainting. Figures are generic, not specific deities. */
function stuccoTex(seed) {
  return ctex('t-stucco' + seed, 512, 256, (c, w, h) => {
    const rnd = (() => { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); })();
    c.fillStyle = '#efe2bf'; c.fillRect(0, 0, w, h);
    const pal = ['#2f6aa6', '#3f8f5a', '#c8452f', '#e2a92a', '#7b4fa0', '#d9783a', '#1f8a8a', '#c2386b'];
    // bays
    for (let x = 0; x < w; x += 64) {
      c.fillStyle = '#d9c38f'; c.fillRect(x, 0, 8, h);                     // pilaster
      c.fillStyle = '#b89a5a'; c.fillRect(x + 8, 0, 2, h);
      const bg = rnd() < 0.5 ? '#6a4a3a' : '#405a74';
      c.fillStyle = bg; c.fillRect(x + 14, 46, 46, 176);                    // niche
      // arch (makara-torana) over niche
      c.strokeStyle = '#f6e7b8'; c.lineWidth = 5; c.beginPath(); c.arc(x + 37, 50, 22, Math.PI, 0); c.stroke();
      c.fillStyle = '#e2a92a'; c.beginPath(); c.arc(x + 37, 26, 5, 0, Math.PI * 2); c.fill();
      // figure: crowned head, multi-armed torso, garment
      const col = pal[Math.floor(rnd() * pal.length)];
      const skin = rnd() < 0.4 ? '#3f6fb0' : rnd() < 0.5 ? '#d9a06a' : '#e8c79a';
      c.fillStyle = skin; c.beginPath(); c.ellipse(x + 37, 86, 9, 11, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e2a92a'; c.beginPath(); c.moveTo(x + 27, 80); c.lineTo(x + 37, 58); c.lineTo(x + 47, 80); c.fill();
      c.fillStyle = skin; c.fillRect(x + 28, 98, 18, 40);
      c.strokeStyle = skin; c.lineWidth = 5; c.lineCap = 'round';
      const arms = rnd() < 0.5 ? 2 : 4;
      for (let a = 0; a < arms; a++) { const s = a % 2 ? 1 : -1, up = a > 1 ? -18 : 6; c.beginPath(); c.moveTo(x + 37 + s * 9, 104); c.lineTo(x + 37 + s * 20, 104 + up); c.stroke(); }
      c.fillStyle = col; c.beginPath(); c.moveTo(x + 24, 136); c.lineTo(x + 50, 136); c.lineTo(x + 54, 196); c.lineTo(x + 20, 196); c.fill();
      c.fillStyle = '#e2a92a'; c.fillRect(x + 24, 134, 26, 4);
      c.fillStyle = '#7a5a3a'; c.fillRect(x + 18, 200, 38, 14);           // pedestal
    }
    // cornice band
    c.fillStyle = '#c9a24a'; c.fillRect(0, h - 26, w, 8); c.fillStyle = '#8a5a2a'; c.fillRect(0, h - 18, w, 18);
    c.fillStyle = '#c9a24a'; c.fillRect(0, 0, w, 10);
  }, true);
}
function kaaviTex() {
  return ctex('t-kaavi', 256, 128, (c, w, h) => {
    for (let x = 0; x < w; x += 32) { c.fillStyle = (x / 32) % 2 ? '#f3ece0' : '#b0402a'; c.fillRect(x, 0, 32, h); }
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, h - 10, w, 10);
  }, true);
}
function pavingTex() {
  return ctex('t-paving', 256, 256, (c, w, h) => {
    c.fillStyle = '#a99d88'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 64) { const g = 150 + Math.random() * 30; c.fillStyle = `rgb(${g},${g - 10},${g - 26})`; c.fillRect(x + ((y / 32) % 2) * 32 + 1, y + 1, 62, 30); }
  }, true);
}

// ---------------------------------------------------------------- materials (shared)
const M = {};
function mats() {
  if (M.ready) return M;
  M.granite = new THREE.MeshStandardMaterial({ map: graniteTex(), roughness: 0.85 });
  M.adh = new THREE.MeshStandardMaterial({ map: adhishthanaTex(), roughness: 0.85 });
  M.stucco = [0, 1, 2, 3, 4, 5].map((s) => new THREE.MeshStandardMaterial({ map: stuccoTex(s + 1), roughness: 0.8 }));
  M.cornice = new THREE.MeshStandardMaterial({ color: '#c79a4e', roughness: 0.75 });
  M.cream = new THREE.MeshStandardMaterial({ color: '#efe2bf', roughness: 0.8 });
  M.gold = new THREE.MeshStandardMaterial({ color: '#e0b04a', metalness: 1, roughness: 0.25 });
  M.dark = new THREE.MeshStandardMaterial({ color: '#2b2017', roughness: 0.9 });
  M.kaavi = new THREE.MeshStandardMaterial({ map: kaaviTex(), roughness: 0.9 });
  M.paving = new THREE.MeshStandardMaterial({ map: pavingTex(), roughness: 0.9 });
  M.shrine = [new THREE.MeshStandardMaterial({ color: '#3f6fb0', roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: '#3f8f5a', roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: '#d9783a', roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: '#efe2bf', roughness: 0.7 })];
  M.teak = new THREE.MeshStandardMaterial({ color: '#4a2f1c', roughness: 0.6 });
  M.ready = true;
  return M;
}

const B = (w, h, d, x = 0, y = 0, z = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
function mesh(geo, mat, cast = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; }
/** set box UVs in metres so tiled textures keep scale */
function metricUV(g, sx = 4, sy = 4) {
  const uv = g.attributes.uv, n = g.attributes.normal, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const u = ay > 0.5 ? p.getX(i) : ax > 0.5 ? p.getZ(i) : p.getX(i);
    const v = ay > 0.5 ? p.getZ(i) : p.getY(i);
    uv.setXY(i, u / sx, v / sy);
  }
  return g;
}
const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), seg);

/** gilded kalasam (finial pot) */
function kalasamGeo(s = 1) { return lathe([[0, 0], [0.22, 0.02], [0.3, 0.14], [0.26, 0.28], [0.12, 0.36], [0.16, 0.42], [0.1, 0.5], [0.04, 0.62], [0.08, 0.7], [0.02, 0.86], [0, 0.9]].map(([r, y]) => [r * s, y * s]), 16); }

// ---------------------------------------------------------------- rajagopuram
export function rajagopuram({ w = 15, d = 9, tiers = 7, baseH = 7.5, tierH = 2.7 } = {}) {
  const m = mats();
  const g = new THREE.Group(); g.name = 'rajagopuram';
  // upapitha + adhishthana: stepped granite plinth, then the carved base storey
  g.add(mesh(metricUV(B(w + 1.2, 0.5, d + 1.2, 0, 0.25, 0)), m.granite));
  g.add(mesh(metricUV(B(w + 0.7, 0.45, d + 0.7, 0, 0.72, 0)), m.granite));
  const baseGeo = B(w, baseH - 0.95, d, 0, 0.95 + (baseH - 0.95) / 2, 0);
  { const uv = baseGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 6), uv.getY(i)); }
  g.add(mesh(baseGeo, m.adh));
  // the gateway passage, with a heavy granite door-frame and teak doors standing open
  g.add(mesh(B(3.4, baseH * 0.78, d + 0.06, 0, (baseH * 0.78) / 2, 0), m.dark, false));
  for (const s of [-1, 1]) {
    g.add(mesh(B(0.55, baseH * 0.82, 0.6, s * 1.95, (baseH * 0.82) / 2, d / 2 + 0.05), m.granite));
    const leaf = mesh(B(0.12, baseH * 0.7, 1.6), m.teak); leaf.position.set(s * 2.4, (baseH * 0.7) / 2, d / 2 - 0.9); leaf.rotation.y = s * 0.15; g.add(leaf);
  }
  g.add(mesh(B(4.6, 0.6, 0.7, 0, baseH * 0.82 + 0.3, d / 2 + 0.05), m.granite));
  // base cornice
  g.add(mesh(B(w + 0.9, 0.45, d + 0.9, 0, baseH + 0.1, 0), m.cornice));

  // shrine miniatures, instanced per type
  const kutas = [], salas = [], panjaras = [], kalasams = [];
  let y = baseH + 0.32, cw = w, cd = d;
  for (let t = 0; t < tiers; t++) {
    const tw = t === 0 ? cw * 0.94 : cw, td = t === 0 ? cd * 0.92 : cd;
    const wall = B(tw, tierH, td, 0, y + tierH / 2, 0);
    { const uv = wall.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (tw / 4.2), uv.getY(i)); }
    g.add(mesh(wall, m.stucco[t % m.stucco.length]));
    // window openings on the long faces, one per tier on the axis (they let light & air in)
    for (const s of [-1, 1]) g.add(mesh(B(1.1, tierH * 0.55, 0.12, 0, y + tierH * 0.5, s * (td / 2 + 0.02)), m.dark, false));
    // kapota: projecting cornice — a thicker gilt-ochre band with a darker drip edge
    g.add(mesh(B(tw + 0.7, 0.32, td + 0.7, 0, y + tierH + 0.12, 0), m.cornice));
    g.add(mesh(B(tw + 0.8, 0.1, td + 0.8, 0, y + tierH - 0.05, 0), m.dark, false));
    // hara: miniature shrines on the parapet
    const py = y + tierH + 0.28, hw = tw / 2 + 0.05, hd = td / 2 + 0.05;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kutas.push([sx * hw, py, sz * hd, 0, t]);
    for (const sz of [-1, 1]) { salas.push([0, py, sz * hd, 0, t]); }
    for (const sx of [-1, 1]) { salas.push([sx * hw, py, 0, Math.PI / 2, t]); }
    const nLong = Math.max(1, Math.floor(tw / 2.1) - 1);
    for (let k = 1; k <= nLong; k++) { const f = k / (nLong + 1); for (const sz of [-1, 1]) { const x = -hw + f * 2 * hw; if (Math.abs(x) > 1.2) panjaras.push([x, py, sz * hd, 0, t]); } }
    const nShort = Math.max(0, Math.floor(td / 2.1) - 1);
    for (let k = 1; k <= nShort; k++) { const f = k / (nShort + 1); for (const sx of [-1, 1]) { const z = -hd + f * 2 * hd; if (Math.abs(z) > 1.4) panjaras.push([sx * hw, py, z, Math.PI / 2, t]); } }
    y += tierH + 0.32; cw = tw * 0.925; cd = td * 0.9;
  }
  // crown: the sala-shikhara barrel vault with gable faces
  const vw = cw * 1.0, vr = Math.min(cd * 0.46, 1.9);
  const vault = new THREE.CylinderGeometry(vr, vr, vw, 28, 1, false, 0, Math.PI); vault.rotateZ(Math.PI / 2); vault.rotateY(Math.PI / 2); vault.rotateY(Math.PI / 2);
  vault.translate(0, y + 0.5, 0);
  g.add(mesh(B(vw * 0.98, 1.0, vr * 2, 0, y, 0), m.cornice));
  const vm = mesh(vault, m.cream); g.add(vm);
  // gable faces (kirtimukha / nasi) — a horseshoe arch outline in gold on each end
  const arch = new THREE.Shape(); arch.absarc(0, 0, vr * 1.15, 0, Math.PI, false); arch.lineTo(-vr * 0.85, 0); arch.absarc(0, 0, vr * 0.85, Math.PI, 0, true); arch.lineTo(vr * 1.15, 0);
  const archGeo = new THREE.ExtrudeGeometry(arch, { depth: 0.25, bevelEnabled: false });
  for (const s of [-1, 1]) { const a = mesh(archGeo, m.gold); a.rotation.y = Math.PI / 2; a.position.set(s * (vw / 2 + 0.1), y + 0.5, 0); g.add(a); }
  const nK = vw > 7 ? 7 : 5;
  for (let k = 0; k < nK; k++) kalasams.push([-vw * 0.42 + (k / (nK - 1)) * vw * 0.84, y + 0.5 + vr, 0]);

  // instance the miniatures
  const kutaGeo = mergeGeometries([B(0.9, 0.7, 0.9, 0, 0.35, 0), (() => { const s = new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); s.scale(1, 0.9, 1); s.translate(0, 0.7, 0); return s; })(), (() => { const k = kalasamGeo(0.32); k.translate(0, 1.18, 0); return k; })()]);
  const salaGeo = mergeGeometries([B(1.8, 0.65, 0.8, 0, 0.32, 0), (() => { const v = new THREE.CylinderGeometry(0.42, 0.42, 1.8, 12, 1, false, 0, Math.PI); v.rotateZ(Math.PI / 2); v.rotateY(Math.PI / 2); v.rotateY(Math.PI / 2); v.translate(0, 0.65, 0); return v; })()]);
  const panjaraGeo = mergeGeometries([B(0.6, 0.55, 0.55, 0, 0.27, 0), (() => { const v = new THREE.CylinderGeometry(0.28, 0.28, 0.6, 10, 1, false, 0, Math.PI); v.rotateZ(Math.PI / 2); v.rotateY(Math.PI / 2); v.rotateY(Math.PI / 2); v.translate(0, 0.55, 0); return v; })()]);
  const cols = ['#efe2bf', '#3f6fb0', '#efe2bf', '#e2a92a', '#efe2bf', '#3f8f5a', '#efe2bf', '#c2386b', '#efe2bf', '#1f8a8a'];
  const place = (geo, list, colourful = true) => {
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), list.length);
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    list.forEach(([x, yy, z, r, t], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r); mm.compose(new THREE.Vector3(x, yy, z), q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.62 * (1 - t * 0.04))); im.setMatrixAt(i, mm); im.setColorAt(i, c.set(colourful ? cols[(i + t) % cols.length] : '#efe2bf')); });
    im.castShadow = true; im.receiveShadow = true; g.add(im);
  };
  place(kutaGeo, kutas); place(salaGeo, salas); place(panjaraGeo, panjaras);
  const kal = new THREE.InstancedMesh(kalasamGeo(1.15), m.gold, kalasams.length);
  kalasams.forEach(([x, yy, z], i) => kal.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, yy - 0.15, z)));
  kal.castShadow = true; g.add(kal);
  g.userData.height = y + 0.5 + vr + 1.2;
  return g;
}

// ---------------------------------------------------------------- vimana over the sanctum
function vimana({ s = 7, tiers = 3 } = {}) {
  const m = mats();
  const g = new THREE.Group();
  g.add(mesh(metricUV(B(s, 4.2, s, 0, 2.1, 0)), m.adh));
  let y = 4.2, w = s;
  for (let t = 0; t < tiers; t++) {
    w *= 0.8;
    g.add(mesh(B(w + 0.6, 0.3, w + 0.6, 0, y + 0.15, 0), m.cornice));
    const tier = B(w, 1.5, w, 0, y + 0.3 + 0.75, 0);
    g.add(mesh(tier, m.gold));
    y += 1.8;
  }
  // octagonal griva + domed shikhara, gold-plated as many main shrines are
  g.add(mesh(new THREE.CylinderGeometry(w * 0.32, w * 0.36, 0.8, 8).translate(0, y + 0.4, 0), m.gold));
  const dome = lathe([[w * 0.5, 0], [w * 0.55, 0.3], [w * 0.5, 0.8], [w * 0.32, 1.3], [0.2, 1.6], [0, 1.65]], 8);
  dome.translate(0, y + 0.8, 0); g.add(mesh(dome, m.gold));
  const k = kalasamGeo(1.0); k.translate(0, y + 2.4, 0); g.add(mesh(k, m.gold));
  g.userData.height = y + 3.4;
  return g;
}

// ---------------------------------------------------------------- pillars, mandapam, objects
function pillarGeo(h = 4.2) {
  // square base, octagonal shaft with square blocks (sadurams), corbel bracket (potika) on top
  const parts = [B(0.62, 0.5, 0.62, 0, 0.25, 0)];
  const segs = 3, seg = (h - 1.2) / segs;
  for (let i = 0; i < segs; i++) {
    const y0 = 0.5 + i * seg;
    parts.push(new THREE.CylinderGeometry(0.27, 0.27, seg * 0.6, 8).translate(0, y0 + seg * 0.3 + seg * 0.2, 0));
    parts.push(B(0.5, seg * 0.2, 0.5, 0, y0 + seg * 0.1, 0));
  }
  parts.push(B(0.5, 0.25, 0.5, 0, h - 0.6, 0));
  parts.push(B(1.4, 0.22, 0.42, 0, h - 0.36, 0));              // potika bracket arms
  parts.push(B(0.42, 0.22, 1.4, 0, h - 0.36, 0));
  return mergeGeometries(parts.map((p) => p.toNonIndexed ? (p.index ? p.toNonIndexed() : p) : p));
}

function mandapam({ cols = 4, rows = 6, sx = 3.0, sz = 3.0, h = 4.4 } = {}) {
  const m = mats();
  const g = new THREE.Group();
  const W = (cols - 1) * sx + 2.4, D = (rows - 1) * sz + 2.4;
  g.add(mesh(metricUV(B(W + 0.6, 0.9, D + 0.6, 0, 0.45, 0)), m.granite));
  const pg = pillarGeo(h);
  const im = new THREE.InstancedMesh(pg, m.granite, cols * rows);
  let i = 0;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) im.setMatrixAt(i++, new THREE.Matrix4().makeTranslation(-((cols - 1) * sx) / 2 + c * sx, 0.9, -((rows - 1) * sz) / 2 + r * sz));
  im.castShadow = true; im.receiveShadow = true; g.add(im);
  g.add(mesh(metricUV(B(W + 0.4, 0.5, D + 0.4, 0, 0.9 + h + 0.25, 0)), m.granite));
  g.add(mesh(B(W + 1.0, 0.22, D + 1.0, 0, 0.9 + h + 0.58, 0), m.granite));
  // parapet with small peacock-less hara of kutas
  const pk = new THREE.InstancedMesh(mergeGeometries([B(0.6, 0.5, 0.6, 0, 0.25, 0), new THREE.SphereGeometry(0.36, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.5, 0)]), m.cream, 2 * (cols + rows));
  let k = 0;
  for (let c = 0; c < cols; c++) for (const s of [-1, 1]) pk.setMatrixAt(k++, new THREE.Matrix4().makeTranslation(-((cols - 1) * sx) / 2 + c * sx, 0.9 + h + 0.75, s * (D / 2)));
  for (let r = 0; r < rows; r++) for (const s of [-1, 1]) pk.setMatrixAt(k++, new THREE.Matrix4().makeTranslation(s * (W / 2), 0.9 + h + 0.75, -((rows - 1) * sz) / 2 + r * sz));
  g.add(pk);
  g.userData.size = [W, D];
  return g;
}

export function peacock(scale = 1, mat) {
  const m = mats();
  const metal = mat || m.gold;
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.32, 18, 14), metal); body.scale.set(1.25, 0.9, 0.85); body.position.set(0, 0.95, 0); g.add(body);
  const neck = mesh(new THREE.CylinderGeometry(0.07, 0.13, 0.62, 12), metal); neck.position.set(0.32, 1.32, 0); neck.rotation.z = -0.35; g.add(neck);
  const head = mesh(new THREE.SphereGeometry(0.1, 12, 10), metal); head.scale.set(1.3, 1, 0.9); head.position.set(0.44, 1.64, 0); g.add(head);
  const beak = mesh(new THREE.ConeGeometry(0.03, 0.14, 8), metal); beak.rotation.z = -Math.PI / 2; beak.position.set(0.58, 1.62, 0); g.add(beak);
  for (let i = 0; i < 3; i++) { const cr = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 4), metal); cr.position.set(0.42 + i * 0.02, 1.79, (i - 1) * 0.025); cr.rotation.z = -0.2; g.add(cr); const tip = mesh(new THREE.SphereGeometry(0.018, 6, 4), metal); tip.position.set(0.44 + i * 0.02, 1.87, (i - 1) * 0.025); g.add(tip); }
  // the tail, raised and fanned — a wide arc of feathers with eye-spots
  const feathers = 29;
  for (let i = 0; i < feathers; i++) {
    const a = -1.25 + (i / (feathers - 1)) * 2.5;
    const f = mesh(new THREE.ConeGeometry(0.07, 1.25, 6), metal); f.geometry = f.geometry.clone().translate(0, 0.62, 0);
    f.position.set(-0.3, 1.0, 0); f.rotation.set(a, 0, 0.55); g.add(f);
    const eye = mesh(new THREE.SphereGeometry(0.045, 8, 6), metal); const dir = new THREE.Vector3(0, 1.2, 0).applyEuler(new THREE.Euler(a, 0, 0.55)); eye.position.set(-0.3 + dir.x, 1.0 + dir.y, dir.z); g.add(eye);
  }
  // legs on a lotus pedestal
  for (const z of [-0.08, 0.08]) { const l = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6), metal); l.position.set(0.02, 0.45, z); g.add(l); }
  g.add(mesh(lathe([[0, 0], [0.55, 0], [0.6, 0.08], [0.45, 0.16], [0.5, 0.2], [0.0, 0.2]], 24), m.granite));
  g.scale.setScalar(scale);
  return g;
}

function dhwajastambham(h = 12) {
  const m = mats();
  const g = new THREE.Group();
  g.add(mesh(metricUV(B(1.6, 0.9, 1.6, 0, 0.45, 0)), m.granite));
  g.add(mesh(lathe([[0.62, 0], [0.62, 0.3], [0.5, 0.42], [0.55, 0.55], [0.3, 0.7], [0, 0.72]], 8).translate(0, 0.9, 0), m.gold));
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.24, h, 16).translate(0, 1.5 + h / 2, 0), m.gold));
  for (let i = 1; i < 8; i++) g.add(mesh(new THREE.TorusGeometry(0.22 - i * 0.008, 0.035, 6, 20).rotateX(Math.PI / 2).translate(0, 1.5 + i * (h / 8), 0), m.gold));
  // the three-armed crown (vedika) at the top with small bells
  const top = 1.5 + h;
  for (const r of [0, Math.PI / 2]) g.add(mesh(B(1.3, 0.08, 0.08, 0, top - 0.3, 0).rotateY(r), m.gold));
  g.add(mesh(kalasamGeo(0.6).translate(0, top - 0.25, 0), m.gold));
  return g;
}

function balipitham() {
  const m = mats();
  const g = new THREE.Group();
  g.add(mesh(metricUV(B(1.8, 0.6, 1.8, 0, 0.3, 0)), m.granite));
  // inverted lotus with petals
  g.add(mesh(lathe([[0.78, 0], [0.82, 0.12], [0.6, 0.3], [0.65, 0.42], [0.35, 0.62], [0.1, 0.78], [0, 0.8]], 24).translate(0, 0.6, 0), m.granite));
  for (let i = 0; i < 16; i++) { const p = mesh(new THREE.SphereGeometry(0.15, 8, 6), m.granite); p.scale.set(1, 0.6, 0.5); const a = (i / 16) * Math.PI * 2; p.position.set(Math.cos(a) * 0.68, 0.78, Math.sin(a) * 0.68); p.rotation.y = -a; g.add(p); }
  return g;
}

function deepasthambam() {
  const m = mats();
  const g = new THREE.Group();
  g.add(mesh(metricUV(B(1.2, 0.6, 1.2, 0, 0.3, 0)), m.granite));
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.25, 5.5, 8).translate(0, 3.35, 0), m.granite));
  const lamps = [];
  for (let i = 0; i < 6; i++) { const y = 1.6 + i * 0.8, r = 0.85 - i * 0.1; g.add(mesh(new THREE.TorusGeometry(r, 0.05, 6, 28).rotateX(Math.PI / 2).translate(0, y, 0), m.granite)); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; lamps.push(new THREE.Vector3(Math.cos(a) * r, y + 0.08, Math.sin(a) * r)); } }
  g.add(mesh(kalasamGeo(0.7).translate(0, 6.1, 0), m.granite));
  g.userData.lamps = lamps;
  return g;
}

/** archana stalls by the gate: flowers, coconuts, bananas, camphor — and a footwear rack */
function archanaStalls(n = 3) {
  const g = new THREE.Group();
  const awnCols = ['#c8452f', '#2f6aa6', '#3f8f5a'];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Group(); s.position.x = (i - (n - 1) / 2) * 3.2;
    s.add(mesh(B(2.8, 0.9, 1.4, 0, 0.45, 0), new THREE.MeshStandardMaterial({ color: '#6a4a2e', roughness: 0.8 })));
    for (const x of [-1.3, 1.3]) s.add(mesh(B(0.08, 2.4, 0.08, x, 1.2, -0.6), new THREE.MeshStandardMaterial({ color: '#4a3a2a' })));
    const awn = mesh(B(3.0, 0.06, 1.8), new THREE.MeshStandardMaterial({ color: awnCols[i % 3], roughness: 0.9 })); awn.position.set(0, 2.45, 0.1); awn.rotation.x = 0.25; s.add(awn);
    // garlands hanging, coconuts and banana bunches on the counter
    for (let k = 0; k < 6; k++) { const gar = mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 14), new THREE.MeshStandardMaterial({ color: k % 2 ? '#f2a01f' : '#fbf7ee' })); gar.position.set(-1.0 + k * 0.4, 1.9, 0.6); gar.rotation.x = Math.PI / 2 - 0.3; gar.scale.y = 1.8; s.add(gar); }
    for (let k = 0; k < 5; k++) { const c = mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: '#6b4426', roughness: 0.95 })); c.position.set(-0.9 + k * 0.22, 1.0, 0.25); s.add(c); }
    const ban = mesh(new THREE.CapsuleGeometry(0.06, 0.25, 4, 8), new THREE.MeshStandardMaterial({ color: '#e8c33a' })); ban.rotation.z = 1.2; ban.position.set(0.7, 1.0, 0.2); s.add(ban);
    const plate = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 18), new THREE.MeshStandardMaterial({ color: '#d0d4d8', metalness: 1, roughness: 0.3 })); plate.position.set(0.3, 0.92, -0.1); s.add(plate);
    g.add(s);
  }
  // chappal (footwear) stand — you leave your shoes outside
  const rack = new THREE.Group(); rack.position.set(((n + 1) / 2) * 3.2, 0, 0);
  for (let r = 0; r < 3; r++) rack.add(mesh(B(1.6, 0.05, 0.5, 0, 0.3 + r * 0.42, 0), new THREE.MeshStandardMaterial({ color: '#5d6166', metalness: 0.5 })));
  for (let k = 0; k < 10; k++) { const sh = mesh(B(0.12, 0.05, 0.28), new THREE.MeshStandardMaterial({ color: ['#3a2a1a', '#8a2b2b', '#2a3a5a', '#d0b080'][k % 4] })); sh.position.set(-0.65 + (k % 5) * 0.32, 0.36 + Math.floor(k / 5) * 0.42, 0); rack.add(sh); }
  g.add(rack);
  return g;
}

/** tank pavilion (neerazhi mandapam) for a temple tank */
export function tankPavilion(size = 4) {
  const m = mats();
  const g = new THREE.Group();
  g.add(mesh(metricUV(B(size, 1.2, size, 0, 0.6, 0)), m.granite));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, 2.4, 8).translate(x * size * 0.38, 2.4, z * size * 0.38), m.granite));
  g.add(mesh(B(size * 1.05, 0.3, size * 1.05, 0, 3.75, 0), m.cornice));
  const v = vimana({ s: size * 0.7, tiers: 1 }); v.scale.setScalar(0.45); v.position.y = 3.9; g.add(v);
  return g;
}

// ---------------------------------------------------------------- the complex
/**
 * W × D compound. The rajagopuram stands in the entrance wall (+z), a smaller gopuram at the
 * back (−z); along the axis: deepasthambam, balipitham, dhwajastambham, the peacock, the
 * mandapam and the vimana. Returns {group, lights:[Vector3], axis}
 */
export function templeComplex({ W = 48, D = 46, gopuramTiers = 7, withStalls = true } = {}) {
  const m = mats();
  const g = new THREE.Group(); g.name = 'Temple';
  // courtyard paving
  const pave = new THREE.PlaneGeometry(W, D); pave.rotateX(-Math.PI / 2); { const uv = pave.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W / 6, uv.getY(i) * D / 6); }
  const pv = mesh(pave, m.paving, false); pv.position.y = 0.06; g.add(pv);
  // prakaram walls in kaavi stripes, with a granite coping
  const wallH = 5.2, t = 0.9;
  const wallPiece = (w, x, z, rot) => {
    const geo = B(w, wallH, t, 0, wallH / 2, 0); { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 4), uv.getY(i)); }
    const wm = mesh(geo, m.kaavi); wm.position.set(x, 0, z); wm.rotation.y = rot; g.add(wm);
    const cap = mesh(B(w + 0.2, 0.35, t + 0.4, 0, wallH + 0.17, 0), m.granite); cap.position.set(x, 0, z); cap.rotation.y = rot; g.add(cap);
  };
  const gw = 15; // gopuram base width in the wall
  wallPiece((W - gw) / 2, -(W + gw) / 4, D / 2, 0); wallPiece((W - gw) / 2, (W + gw) / 4, D / 2, 0);
  const bgw = 10;
  wallPiece((W - bgw) / 2, -(W + bgw) / 4, -D / 2, 0); wallPiece((W - bgw) / 2, (W + bgw) / 4, -D / 2, 0);
  wallPiece(D, -W / 2, 0, Math.PI / 2); wallPiece(D, W / 2, 0, Math.PI / 2);

  const gop = rajagopuram({ w: gw, d: 9.5, tiers: gopuramTiers }); gop.position.set(0, 0, D / 2); g.add(gop);
  const back = rajagopuram({ w: bgw, d: 7, tiers: 3, baseH: 6, tierH: 2.6 }); back.position.set(0, 0, -D / 2); back.rotation.y = Math.PI; g.add(back);

  // along the axis, from the gate inwards
  const lights = [];
  const ds = deepasthambam(); ds.position.set(0, 0, D / 2 - 9); g.add(ds); ds.userData.lamps.forEach((l) => lights.push(l.clone().add(ds.position)));
  const bp = balipitham(); bp.position.set(0, 0, D / 2 - 13); g.add(bp);
  const dh = dhwajastambham(12); dh.position.set(0, 0, D / 2 - 16.5); g.add(dh);
  const pk = peacock(1.6); pk.position.set(0, 0, D / 2 - 20); pk.rotation.y = -Math.PI / 2; g.add(pk); // facing the sanctum
  const mand = mandapam({ cols: 4, rows: 4, sx: 3.2, sz: 3.0 }); mand.position.set(0, 0, -D / 2 + 20); g.add(mand);
  const vm = vimana({ s: 7.5, tiers: 3 }); vm.position.set(0, 0, -D / 2 + 9.5); g.add(vm);
  // sanctum doorway glow (lamps within) — the deity is not depicted
  const door = mesh(B(1.6, 2.6, 0.2, 0, 1.3 + 0.9, 3.8), m.dark, false); vm.add(door);
  lights.push(new THREE.Vector3(0, 2.0, -D / 2 + 9.5 + 3.6));
  // side shrines along the inner walls
  for (const s of [-1, 1]) { const sh = vimana({ s: 4.2, tiers: 1 }); sh.scale.setScalar(0.85); sh.position.set(s * (W / 2 - 6), 0, -D / 2 + 12); g.add(sh); }
  // coconut palms & a flowering tree in the corners
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#7a6450' }), frondMat = new THREE.MeshStandardMaterial({ color: '#4f7f35', side: THREE.DoubleSide });
  for (const [x, z, h] of [[-W / 2 + 4, D / 2 - 5, 11], [W / 2 - 4, D / 2 - 6, 10], [-W / 2 + 5, -D / 2 + 4, 12], [W / 2 - 5, -D / 2 + 5, 9.5]]) {
    g.add(mesh(new THREE.CylinderGeometry(0.15, 0.24, h, 8).translate(x, h / 2, z), trunkMat));
    for (let k = 0; k < 9; k++) { const f = new THREE.ConeGeometry(0.5, 4, 4, 1, true); f.translate(0, 2, 0); f.rotateX(1.15); f.rotateY((k / 9) * Math.PI * 2); f.scale(1, 1, 1); const fm = mesh(f, frondMat); fm.position.set(x, h, z); g.add(fm); }
  }
  if (withStalls) { const st = archanaStalls(3); st.position.set(-W / 2 + 10, 0, D / 2 + 4); g.add(st); }
  g.userData = { lights, gopuramHeight: gop.userData.height, axis: { gate: [0, D / 2], sanctum: [0, -D / 2 + 9.5] }, W, D };
  return g;
}
