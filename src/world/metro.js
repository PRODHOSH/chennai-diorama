import * as THREE from 'three';
import gsap from 'gsap';
import { nearestOnLine, lineLength } from './geo.js';
import { state } from '../core/state.js';

/**
 * CHENNAI METRO — what is actually under this map.
 *  Line 1 (Blue Line: Airport ⇄ Wimco Nagar) and Line 2 (Green Line: Central ⇄ St Thomas Mount)
 *  run in tunnels and meet at the underground Central Metro interchange. High Court station
 *  (Blue Line) sits at the George Town edge. Tunnel alignments, stations and entrances (S3, S4, B5,
 *  A2, A3) come from OpenStreetMap. The "x-ray" view fades the ground to reveal them.
 *  Phase 2 lines (incl. the Red Line) are under construction elsewhere and are not shown.
 */
export const LINE_COLORS = { 1: '#2a6fdb', 2: '#2e9e4f' };
const DEPTH = { 1: -11, 2: -17 };

export function buildMetro(city, engine, groundGroup) {
  const group = new THREE.Group();
  const under = new THREE.Group(); under.visible = false; group.add(under);
  const lines = city.metro || [];

  // ---- tunnels
  const paths = [];
  for (const m of lines) {
    if (m.p.length < 2 || lineLength(m.p) < 30) continue;
    const y = DEPTH[m.line];
    const pts = m.p.map(([x, z]) => new THREE.Vector3(x, y, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.2);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, m.p.length * 6), 3.1, 12, false),
      new THREE.MeshStandardMaterial({ color: LINE_COLORS[m.line], transparent: true, opacity: 0.32, emissive: LINE_COLORS[m.line], emissiveIntensity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    under.add(tube);
    const core = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, m.p.length * 6), 0.35, 6, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(LINE_COLORS[m.line]).multiplyScalar(2.2) }));
    under.add(core);
    paths.push({ line: m.line, curve, L: curve.getLength() });
  }

  // ---- underground stations aligned to their tunnels
  const stationMat = new THREE.MeshStandardMaterial({ color: '#e9eef2', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, emissive: '#9fb7d0', emissiveIntensity: 0.25 });
  const edgeMat = new THREE.LineBasicMaterial({ color: '#cfe0f5', transparent: true, opacity: 0.7 });
  const stations = city.pois.filter((p) => p.k === 'station' && p.st === 'subway');
  for (const s of stations) {
    let best = null;
    for (const m of lines) { const n = nearestOnLine(s.p, m.p); if (!best || n.d < best.d) best = { ...n, line: m.line }; }
    if (!best) continue;
    const isCentral = /Central/.test(s.n);
    const len = isCentral ? 240 : 180, w = isCentral ? 34 : 24, h = isCentral ? 16 : 11;
    const box = new THREE.BoxGeometry(w, h, len);
    const mesh = new THREE.Mesh(box, stationMat);
    const ang = Math.atan2(best.dir[0], best.dir[1]);
    mesh.position.set(best.p[0], (isCentral ? -13 : DEPTH[best.line]) , best.p[1]);
    mesh.rotation.y = ang;
    under.add(mesh);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), edgeMat);
    edges.position.copy(mesh.position); edges.rotation.copy(mesh.rotation);
    under.add(edges);
    // platform slabs
    for (const off of [-w * 0.28, w * 0.28]) {
      const pl = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, len * 0.9), new THREE.MeshStandardMaterial({ color: '#d8d2c4', transparent: true, opacity: 0.7 }));
      pl.position.set(best.p[0] + Math.cos(ang) * off, mesh.position.y - h / 2 + 1.5, best.p[1] - Math.sin(ang) * off);
      pl.rotation.y = ang;
      under.add(pl);
    }
    under.add(label3D(isCentral ? 'சென்ட்ரல் மெட்ரோ · Central Metro' : 'உயர் நீதிமன்றம் · High Court', [best.p[0], mesh.position.y + h / 2 + 3, best.p[1]]));
  }

  // ---- entrances at street level (always visible)
  const entrances = city.pois.filter((p) => p.k === 'subway_entrance');
  for (const e of entrances) group.add(entrance(e, city));

  // ---- metro trains: 4-car Chennai Metro sets
  const carGeo = new THREE.BoxGeometry(2.9, 3.6, 21.5); carGeo.translate(0, 1.8, 0);
  const bandGeo = new THREE.BoxGeometry(2.94, 0.55, 21.6); bandGeo.translate(0, 2.2, 0);
  const trains = [];
  for (const p of paths.filter((p) => p.L > 220)) {
    trains.push({ p, s: Math.random() * p.L, dir: Math.random() < 0.5 ? 1 : -1, wait: 0, speed: 16 });
  }
  const cars = new THREE.InstancedMesh(carGeo, new THREE.MeshStandardMaterial({ color: '#c9ced3', metalness: 0.75, roughness: 0.32, emissive: '#3a4450', emissiveIntensity: 0.25 }), Math.max(1, trains.length * 4));
  const bands = new THREE.InstancedMesh(bandGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), Math.max(1, trains.length * 4));
  trains.forEach((t, i) => { for (let k = 0; k < 4; k++) bands.setColorAt(i * 4 + k, new THREE.Color(LINE_COLORS[t.p.line]).multiplyScalar(1.6)); });
  cars.frustumCulled = bands.frustumCulled = false;
  under.add(cars, bands);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  const pt = new THREE.Vector3(), tan = new THREE.Vector3();
  engine.onUpdate((dt) => {
    if (!under.visible) return;
    trains.forEach((t, i) => {
      if (t.wait > 0) t.wait -= dt; else {
        t.s += t.speed * dt * t.dir;
        if (t.s > t.p.L - 2) { t.s = t.p.L - 2; t.dir = -1; t.wait = 6; }
        if (t.s < 90) { t.s = 90; t.dir = 1; t.wait = 6; }
      }
      for (let k = 0; k < 4; k++) {
        const s = Math.max(0, Math.min(t.p.L, t.s - k * 22 * t.dir));
        t.p.curve.getPointAt(s / t.p.L, pt); t.p.curve.getTangentAt(s / t.p.L, tan);
        q.setFromAxisAngle(up, Math.atan2(tan.x, tan.z));
        m4.compose(pt.clone().setY(pt.y - 1.8), q, one);
        cars.setMatrixAt(i * 4 + k, m4); bands.setMatrixAt(i * 4 + k, m4);
      }
    });
    cars.instanceMatrix.needsUpdate = bands.instanceMatrix.needsUpdate = true;
  });

  // ---- x-ray: fade the ground to reveal what runs beneath
  const fadeTargets = [];
  groundGroup.traverse((o) => { if (o.isMesh || o.isInstancedMesh) fadeTargets.push(o); });
  let on = false;
  const setXray = (v) => {
    on = v; under.visible = true;
    const k = { t: v ? 0 : 1 };
    for (const o of fadeTargets) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { m.userData.wasTransparent ??= m.transparent; m.userData.baseOpacity ??= m.opacity; m.transparent = true; m.needsUpdate = true; }); }
    gsap.to(k, { t: v ? 1 : 0, duration: state.reduceMotion ? 0.01 : 1.2, ease: 'sine.inOut',
      onUpdate: () => { for (const o of fadeTargets) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { m.opacity = m.userData.baseOpacity * (1 - k.t * 0.78); m.depthWrite = k.t < 0.5; }); } },
      onComplete: () => { under.visible = v; if (!v) for (const o of fadeTargets) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { m.transparent = m.userData.wasTransparent; m.depthWrite = true; m.needsUpdate = true; }); } } });
  };
  return { group, setXray, get on() { return on; }, stations, entrances };
}

function label3D(text, [x, y, z]) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 96;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(16,22,48,0.82)'; roundRect(ctx, 0, 8, 1024, 80, 40); ctx.fill();
  ctx.fillStyle = '#eaf2ff'; ctx.font = '600 44px "Hind Madurai", "Noto Serif Tamil", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 50);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(64, 6, 1); s.position.set(x, y, z); s.renderOrder = 10;
  document.fonts?.ready.then(() => { ctx.clearRect(0, 0, 1024, 96); ctx.fillStyle = 'rgba(16,22,48,0.82)'; roundRect(ctx, 0, 8, 1024, 80, 40); ctx.fill(); ctx.fillStyle = '#eaf2ff'; ctx.font = '600 44px "Hind Madurai", "Noto Serif Tamil", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 512, 50); tex.needsUpdate = true; });
  return s;
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/** a street-level metro entrance: glass canopy, steel frame, bilingual totem sign */
function entrance(e, city) {
  const g = new THREE.Group();
  // orient toward the nearest road
  let best = null;
  for (const r of city.roads) { if (/footway|path|steps/.test(r.c)) continue; const n = nearestOnLine(e.p, r.p); if (!best || n.d < best.d) best = n; }
  const ang = best ? Math.atan2(best.p[0] - e.p[0], best.p[1] - e.p[1]) : 0;
  const steel = new THREE.MeshStandardMaterial({ color: '#8d969e', metalness: 0.7, roughness: 0.35 });
  const glass = new THREE.MeshStandardMaterial({ color: '#a9c6dc', transparent: true, opacity: 0.45, metalness: 0.2, roughness: 0.1 });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 9), glass); roof.position.y = 4; g.add(roof);
  for (const [x, z] of [[-2.9, -4.4], [2.9, -4.4], [-2.9, 4.4], [2.9, 4.4]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), steel); c.position.set(x, 2, z); g.add(c); }
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 8.6), glass); w.position.set(s * 2.95, 1.3, 0); g.add(w); }
  const stair = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 8), new THREE.MeshStandardMaterial({ color: '#4b4f55' })); stair.position.y = 0.25; g.add(stair);
  // totem sign
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512;
  const draw = () => {
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#16305e'; ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
    ctx.beginPath(); ctx.arc(128, 110, 70, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.fillStyle = '#16305e'; ctx.font = '800 96px "Fraunces", serif'; ctx.fillText('M', 128, 145);
    ctx.fillStyle = '#ffffff'; ctx.font = '600 44px "Noto Serif Tamil", serif'; ctx.fillText('மெட்ரோ', 128, 260);
    ctx.font = '600 44px "Hind Madurai", sans-serif'; ctx.fillText('METRO', 128, 320);
    if (e.ref) { ctx.fillStyle = '#2a6fdb'; ctx.fillRect(48, 360, 160, 90); ctx.fillStyle = '#fff'; ctx.font = '700 60px "Hind Madurai", sans-serif'; ctx.fillText(e.ref, 128, 428); }
  };
  draw(); document.fonts?.ready.then(() => { draw(); tex.needsUpdate = true; });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const totem = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.25), [steel, steel, steel, steel, new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.35 }), new THREE.MeshStandardMaterial({ map: tex })]);
  totem.position.set(3.8, 2.6, 4.2); g.add(totem);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5), steel); pole.position.set(3.8, 0.75, 4.2); g.add(pole);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(e.p[0], 0, e.p[1]);
  g.rotation.y = ang;
  g.userData.entrance = e;
  return g;
}
