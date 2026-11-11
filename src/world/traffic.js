import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng, state } from '../core/state.js';
import { lineLength } from './geo.js';

/** Path helper: cumulative-length sampling of a polyline */
class Path {
  constructor(pts) {
    this.pts = pts; this.cum = [0];
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.L = this.cum.at(-1);
  }
  at(s, out) {
    s = Math.max(0, Math.min(this.L, s));
    let lo = 0, hi = this.cum.length - 1;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; if (this.cum[m] <= s) lo = m; else hi = m; }
    const a = this.pts[lo], b = this.pts[hi];
    const seg = this.cum[hi] - this.cum[lo] || 1e-6, t = (s - this.cum[lo]) / seg;
    out.x = a[0] + (b[0] - a[0]) * t; out.z = a[1] + (b[1] - a[1]) * t;
    out.dx = (b[0] - a[0]) / seg; out.dz = (b[1] - a[1]) / seg;
    return out;
  }
}

function boxAt(w, h, d, x = 0, y = 0, z = 0) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; }

/** small, readable vehicle silhouettes (length along +z) with baked vertex colours */
function vehicleGeo(kind) {
  const parts = [];
  const paint = (g, hex) => { const c = new THREE.Color(hex); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  switch (kind) {
    case 'auto': // Chennai auto-rickshaw: yellow body, black canvas hood
      parts.push(paint(boxAt(1.4, 0.9, 2.6, 0, 0.75, 0), '#e8c21c'));
      parts.push(paint(boxAt(1.45, 0.7, 1.9, 0, 1.55, -0.2), '#1d1d1d'));
      parts.push(paint(boxAt(1.2, 0.5, 0.2, 0, 1.4, 1.1), '#9cb4c0'));
      break;
    case 'bus':
      parts.push(paint(boxAt(2.5, 2.5, 11, 0, 1.75, 0), '#efe6d2'));
      parts.push(paint(boxAt(2.52, 0.8, 11.02, 0, 1.0, 0), '#8a2b2b'));
      parts.push(paint(boxAt(2.54, 0.7, 10.2, 0, 2.3, 0), '#3b4650'));
      break;
    case 'bike': // two-wheeler with rider
      parts.push(paint(boxAt(0.4, 0.6, 1.8, 0, 0.55, 0), '#333'));
      parts.push(paint(boxAt(0.5, 0.9, 0.45, 0, 1.35, -0.1), '#d4d0c8'));
      parts.push(paint(boxAt(0.32, 0.3, 0.32, 0, 1.95, -0.1), '#1d1d1d'));
      break;
    case 'van':
      parts.push(paint(boxAt(1.8, 1.9, 4.6, 0, 1.25, 0), '#f1efe9'));
      parts.push(paint(boxAt(1.82, 0.6, 1.2, 0, 1.7, 1.6), '#4a5560'));
      break;
    default: // car — colour comes from the instance
      parts.push(paint(boxAt(1.7, 0.75, 4.1, 0, 0.62, 0), '#ffffff'));
      parts.push(paint(boxAt(1.5, 0.6, 2.2, 0, 1.28, -0.25), '#d0d6da'));
  }
  return mergeGeometries(parts);
}

export function buildTraffic(city, engine) {
  const group = new THREE.Group();
  const R = rng(2025);
  const q = engine.quality;
  const N = q === 'high' ? 280 : q === 'medium' ? 170 : 70;

  // ---- road graph (drivable classes) ---------------------------------------
  const drivable = city.roads.filter((r) => /trunk|primary|secondary|tertiary|residential|unclassified|living_street|_link/.test(r.c) && r.p.length > 1);
  const paths = drivable.map((r) => new Path(r.p));
  const key = (p) => Math.round(p[0] / 3) + ',' + Math.round(p[1] / 3);
  const ends = new Map();
  drivable.forEach((r, i) => {
    for (const [end, p] of [[0, r.p[0]], [1, r.p.at(-1)]]) { const k = key(p); if (!ends.has(k)) ends.set(k, []); ends.get(k).push({ i, end }); }
  });
  const weight = (r) => (/trunk|primary/.test(r.c) ? 6 : /secondary/.test(r.c) ? 4 : /tertiary/.test(r.c) ? 2.5 : 0.6);
  const totalW = drivable.reduce((s, r, i) => s + weight(r) * paths[i].L, 0);
  const pickRoad = () => { let x = R() * totalW; for (let i = 0; i < drivable.length; i++) { x -= weight(drivable[i]) * paths[i].L; if (x <= 0) return i; } return 0; };

  const kinds = ['car', 'auto', 'bike', 'bus', 'van'];
  const mix = [0.38, 0.27, 0.22, 0.07, 0.06];
  const meshes = {};
  const carColors = ['#f2f2f0', '#c9ccd0', '#8b9096', '#2d2f33', '#7a1f24', '#2f4f7a', '#e4e0d4', '#b9b2a2'];
  const vehicles = [];
  for (let n = 0; n < N; n++) {
    let x = R(), k = 0; while (x > mix[k]) { x -= mix[k]; k++; }
    const kind = kinds[Math.min(k, kinds.length - 1)];
    const i = pickRoad();
    vehicles.push({ kind, road: i, s: R() * paths[i].L, dir: R() < 0.5 ? 1 : -1, speed: (kind === 'bus' ? 7 : kind === 'bike' ? 10 : 9) * (0.7 + R() * 0.6), lane: kind === 'bike' ? 2.4 : 1.9, idx: 0 });
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.15 });
  const tmpC = new THREE.Color();
  for (const kind of kinds) {
    const list = vehicles.filter((v) => v.kind === kind);
    const im = new THREE.InstancedMesh(vehicleGeo(kind), mat, list.length);
    im.castShadow = true;
    im.frustumCulled = false;
    list.forEach((v, j) => { v.idx = j; if (kind === 'car') im.setColorAt(j, tmpC.set(carColors[j % carColors.length])); else im.setColorAt(j, tmpC.set('#ffffff')); });
    meshes[kind] = im;
    group.add(im);
  }

  // ---- trains into Central --------------------------------------------------
  // Trains by line: MRTS viaduct → suburban EMU sets; lines into Central → long-distance rakes
  // (ICF blue, LHB red/grey) and suburban EMUs. Liveries are stylised, not exact.
  const railPaths = city.rails.map((r) => { const p = new Path(r.p); p.rail = r; return p; })
    .filter((p) => p.L > (p.rail.n === 'MRTS' ? 120 : 260)).sort((a, b) => b.L - a.L);
  const chosen = [...railPaths.filter((p) => p.rail.n === 'MRTS').slice(0, 2), ...railPaths.filter((p) => p.rail.n !== 'MRTS').slice(0, q === 'low' ? 3 : 7)];
  const coachGeo = mergeGeometries([
    (() => { const g = boxAt(3.1, 3.4, 21, 0, 2.3, 0); return g; })(),
  ]);
  const LIVERY = { icf: ['#2c5e9e', '#efe4c4'], lhb: ['#9e2f2a', '#c9c7c2'], emu: ['#f0ece1', '#5b3f8f'], mrts: ['#ece8df', '#2c5e9e'] };
  const rakeKinds = ['icf', 'lhb', 'emu'];
  const trains = chosen.map((p, i) => {
    const kind = p.rail.n === 'MRTS' ? 'mrts' : rakeKinds[i % rakeKinds.length];
    const L = p.L, ramp = Math.min(70, L / 2.2);
    const yFn = p.rail.br ? (s) => 0.45 + 6 * Math.min(1, s / ramp, (L - s) / ramp) : () => 0.45;
    return { p, s: R() * p.L, dir: 1, n: kind === 'mrts' || kind === 'emu' ? (kind === 'mrts' ? 4 : 9) : 12 + Math.floor(R() * 6), speed: kind === 'emu' || kind === 'mrts' ? 14 : 10 + R() * 4, wait: 0, livery: LIVERY[kind], kind, yFn };
  }).filter((t) => t.p.L > t.n * 22 + 20 || t.kind === 'mrts');
  for (const t of trains) if (t.p.L < t.n * 22 + 20) t.n = Math.max(2, Math.floor((t.p.L - 20) / 22));
  const coachCount = trains.reduce((s, t) => s + t.n, 0);
  const coachMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 });
  const coaches = new THREE.InstancedMesh(coachGeo, coachMat, coachCount);
  coaches.castShadow = true;
  coaches.frustumCulled = false;
  const bandGeo = boxAt(3.14, 0.42, 20.6, 0, 3.1, 0);
  const bands = new THREE.InstancedMesh(bandGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), coachCount);
  bands.frustumCulled = false;
  let ci = 0;
  for (const t of trains) {
    t.base = ci;
    for (let k = 0; k < t.n; k++) {
      const loco = (t.kind === 'icf' || t.kind === 'lhb') && k === 0;
      coaches.setColorAt(ci, tmpC.set(loco ? '#3b3f46' : t.livery[0]));
      bands.setColorAt(ci, tmpC.set(loco ? '#d9a521' : t.livery[1]));
      ci++;
    }
  }
  group.add(coaches, bands);

  // ---- pedestrians around the station forecourt, markets & bazaars ----------
  const walkable = city.roads.filter((r) => /footway|pedestrian|living_street|residential/.test(r.c) && lineLength(r.p) > 25);
  const hubs = [[5, 40], [300, -560], [650, -700], [-560, 560], [-310, 60], [390, -400]];
  const nearHub = (r) => hubs.some(([x, z]) => Math.hypot(r.p[0][0] - x, r.p[0][1] - z) < 260);
  const walkPaths = walkable.filter(nearHub).map((r) => new Path(r.p));
  const PN = walkPaths.length ? (q === 'high' ? 420 : q === 'medium' ? 240 : 80) : 0;
  const pedGeo = mergeGeometries([boxAt(0.42, 1.05, 0.3, 0, 0.95, 0), (() => { const g = new THREE.SphereGeometry(0.17, 6, 4); g.translate(0, 1.66, 0); return g; })(), boxAt(0.36, 0.5, 0.24, 0, 0.25, 0)]);
  const peds = new THREE.InstancedMesh(pedGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), Math.max(PN, 1));
  peds.frustumCulled = false;
  const clothes = ['#b8336a', '#2f6d9e', '#e0a526', '#f2efe7', '#6e1f2a', '#3f8c5d', '#d2603a', '#7b4fa0', '#f0e6cf', '#203040'];
  const people = [];
  for (let n = 0; n < PN; n++) {
    const p = walkPaths[Math.floor(R() * walkPaths.length)];
    people.push({ p, s: R() * p.L, dir: R() < 0.5 ? 1 : -1, speed: 0.9 + R() * 0.6, side: (R() - 0.5) * 2.4 });
    peds.setColorAt(n, tmpC.set(clothes[n % clothes.length]));
  }
  peds.castShadow = PN > 0;
  group.add(peds);

  // ---- per-frame update -----------------------------------------------------
  const m = new THREE.Matrix4(), qt = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const o = {};
  const roadY = (r) => (r.br ? 0 : 0.22);
  const step = (dt) => {
    if (!state.traffic) return;
    for (const v of vehicles) {
      const path = paths[v.road];
      v.s += v.speed * dt * v.dir;
      if (v.s > path.L || v.s < 0) {
        const atEnd = v.s > path.L ? 1 : 0;
        const pt = atEnd ? drivable[v.road].p.at(-1) : drivable[v.road].p[0];
        const opts = (ends.get(key(pt)) || []).filter((e) => e.i !== v.road);
        if (opts.length) {
          const nx = opts[Math.floor(R() * opts.length)];
          v.road = nx.i; v.dir = nx.end === 0 ? 1 : -1; v.s = nx.end === 0 ? 0 : paths[nx.i].L;
        } else { v.dir *= -1; v.s = Math.max(0, Math.min(path.L, v.s)); }
      }
      const P = paths[v.road].at(v.s, o);
      const dx = P.dx * v.dir, dz = P.dz * v.dir;
      const w = drivable[v.road].w;
      const lane = Math.min(v.lane, w * 0.3);
      // keep left — this is India
      pos.set(P.x + dz * lane, roadY(drivable[v.road]), P.z - dx * lane);
      if (drivable[v.road].br) pos.y = -100; // hide on viaducts (no deck profile here)
      qt.setFromAxisAngle(up, Math.atan2(dx, dz));
      m.compose(pos, qt, one);
      meshes[v.kind].setMatrixAt(v.idx, m);
    }
    for (const k of kinds) meshes[k].instanceMatrix.needsUpdate = true;

    let c = 0;
    for (const t of trains) {
      if (t.wait > 0) t.wait -= dt;
      else {
        t.s += t.speed * dt * t.dir;
        const lenTrain = t.n * 22;
        if (t.s > t.p.L) { t.s = t.p.L; t.dir = -1; t.wait = 8 + R() * 10; }
        if (t.s < lenTrain) { t.s = lenTrain; t.dir = 1; t.wait = 6 + R() * 8; }
      }
      for (let k = 0; k < t.n; k++) {
        const sk = t.s - k * 22 - 11;
        const P = t.p.at(sk, o);
        pos.set(P.x, t.yFn(Math.max(0, Math.min(t.p.L, sk))), P.z);
        qt.setFromAxisAngle(up, Math.atan2(P.dx, P.dz));
        m.compose(pos, qt, one);
        coaches.setMatrixAt(c, m); bands.setMatrixAt(c, m); c++;
      }
    }
    coaches.instanceMatrix.needsUpdate = true; bands.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < people.length; i++) {
      const h = people[i];
      h.s += h.speed * dt * h.dir;
      if (h.s > h.p.L || h.s < 0) { h.dir *= -1; h.s = Math.max(0, Math.min(h.p.L, h.s)); }
      const P = h.p.at(h.s, o);
      pos.set(P.x + P.dz * h.side, 0.2 + Math.abs(Math.sin(h.s * 3)) * 0.06, P.z - P.dx * h.side);
      qt.setFromAxisAngle(up, Math.atan2(P.dx * h.dir, P.dz * h.dir));
      m.compose(pos, qt, one);
      peds.setMatrixAt(i, m);
    }
    if (people.length) peds.instanceMatrix.needsUpdate = true;
  };
  step(0.016);
  engine.onUpdate(step);
  return { group, setVisible: (v) => { group.visible = v; } };
}
