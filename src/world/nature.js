import * as THREE from 'three';
import { inPoly, bboxOf, sampleLine, centroid } from './geo.js';
import { hash, rng } from '../core/state.js';
import { offsetLine } from './ground.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** spatial index of building footprints for "is this spot free?" queries */
export function makeBuildingIndex(city) {
  const cell = 25, grid = new Map();
  city.buildings.forEach((b, i) => {
    const bb = bboxOf(b.o);
    b._bb = bb;
    for (let x = Math.floor(bb.x0 / cell); x <= Math.floor(bb.x1 / cell); x++)
      for (let z = Math.floor(bb.z0 / cell); z <= Math.floor(bb.z1 / cell); z++) {
        const k = x + ',' + z; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i);
      }
  });
  return {
    hit([x, z], pad = 0) {
      const list = grid.get(Math.floor(x / cell) + ',' + Math.floor(z / cell));
      if (!list) return false;
      for (const i of list) {
        const b = city.buildings[i], bb = b._bb;
        if (x < bb.x0 - pad || x > bb.x1 + pad || z < bb.z0 - pad || z > bb.z1 + pad) continue;
        if (pad > 0 || inPoly([x, z], b.o)) return true;
      }
      return false;
    },
  };
}

/**
 * A clustered canopy: one main crown plus lobes, gently noise-displaced, smooth-shaded,
 * with a baked vertex-colour gradient (sunlit top, shaded underside) so trees read as
 * soft foliage masses rather than faceted rocks.
 */
function canopyGeometry(seed, lod = 0) {
  const r = rng(seed);
  const parts = [];
  const lobes = lod === 0
    ? [[0, 0, 0, 1], [0.55, -0.12, 0.2, 0.68], [-0.5, -0.1, -0.25, 0.7], [0.1, 0.18, -0.55, 0.62]]
    : [[0, 0, 0, 1.08]];
  for (const [x, y, z, s] of lobes) {
    let g = new THREE.IcosahedronGeometry(s, lod === 0 ? (s === 1 ? 2 : 1) : 1);
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = mergeVertices(g); // weld so normals are smooth, not faceted
    const p = g.attributes.position;
    const ph = r() * 10;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      const n = 1 + 0.08 * Math.sin(v.x * 7 + ph) * Math.sin(v.y * 6 + ph * 0.7) * Math.sin(v.z * 8 - ph);
      p.setXYZ(i, v.x * n + x, v.y * n * 0.78 + y, v.z * n + z);
    }
    parts.push(g);
  }
  parts.forEach((x) => x.computeVertexNormals());
  const g = mergeGeometries(parts);
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = THREE.MathUtils.clamp((p.getY(i) + 0.8) / 1.6, 0, 1); const v = 0.62 + 0.45 * k; col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v * 0.95; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export function buildNature(city, bidx, engine) {
  const group = new THREE.Group();
  const trees = []; // {x,z,s,type}
  const R = rng(1873);

  const free = (p, pad = 1.5) => !bidx.hit(p, pad);

  // 1) parks, gardens, campuses, the Fort glacis — sampled on a jittered grid
  for (const a of city.areas) {
    const dens = { park: 13, cemetery: 16, campus: 22, fort: 26, grass: 18, pitch: 0 }[a.k];
    if (!dens) continue;
    const bb = bboxOf(a.p);
    for (let x = bb.x0; x < bb.x1; x += dens) for (let z = bb.z0; z < bb.z1; z += dens) {
      const p = [x + (R() - 0.5) * dens * 0.8, z + (R() - 0.5) * dens * 0.8];
      if (!inPoly(p, a.p) || !free(p, 2)) continue;
      if (a.k === 'campus' && R() < 0.45) continue;
      trees.push({ x: p[0], z: p[1], s: 0.8 + R() * 0.7, type: R() < 0.12 ? 'palm' : R() < 0.5 ? 'rain' : 'neem' });
    }
  }
  // 2) avenue trees along the arterials (Poonamallee High Rd, Wall Tax Rd, EVR Salai…)
  for (const r of city.roads) {
    if (!/primary|secondary|tertiary/.test(r.c) || r.br) continue;
    for (const side of [-1, 1]) {
      const line = offsetLine(r.p, side * (r.w / 2 + 2.6));
      for (const s of sampleLine(line, 19, hash(r.p.length * 7 + side) * 19)) {
        if (R() < 0.35 || !free(s.p, 1.5)) continue;
        trees.push({ x: s.p[0], z: s.p[1], s: 0.65 + R() * 0.45, type: R() < 0.5 ? 'neem' : 'rain' });
      }
    }
  }
  // 3) individually mapped trees
  for (const p of city.pois) if (p.k === 'tree' && free(p.p, 0)) trees.push({ x: p.p[0], z: p.p[1], s: 0.9, type: 'rain' });
  // 4) coconut palms ringing temple tanks
  for (const a of city.areas) if (a.k === 'pond') {
    const c = centroid(a.p);
    for (let i = 0; i < 8; i++) { const v = a.p[Math.floor((i / 8) * a.p.length)]; const dx = v[0] - c[0], dz = v[1] - c[1], L = Math.hypot(dx, dz) || 1; const p = [v[0] + (dx / L) * 5, v[1] + (dz / L) * 5]; if (free(p, 1)) trees.push({ x: p[0], z: p[1], s: 0.9 + R() * 0.3, type: 'palm' }); }
  }

  const leafy = trees.filter((t) => t.type !== 'palm');
  const palms = trees.filter((t) => t.type === 'palm');
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();

  // broadleaf canopies (rain tree = wide & flat, neem = rounder, darker)
  // two-level LOD: clustered crowns near the camera focus, a single light crown elsewhere
  const canopyMat = new THREE.MeshStandardMaterial({ roughness: 0.9, vertexColors: true });
  const canopiesHi = new THREE.InstancedMesh(canopyGeometry(7, 0), canopyMat, leafy.length);
  const canopiesLo = new THREE.InstancedMesh(canopyGeometry(7, 1), canopyMat, leafy.length);
  const canopyMatrices = [], canopyColors = [];
  const canopies = { setMatrixAt: (i, mm) => { canopyMatrices[i] = mm.clone(); }, setColorAt: (i, cc) => { canopyColors[i] = cc.clone(); } };
  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.45, 1, 6); trunkGeo.translate(0, 0.5, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: '#5d4a3a', roughness: 1 }), leafy.length + palms.length);
  const greens = ['#4f6b3a', '#5b7a41', '#3f5c34', '#6a8447', '#55703c'];
  leafy.forEach((t, i) => {
    const rain = t.type === 'rain';
    const H = (rain ? 6.5 : 7.5) * t.s, Rr = (rain ? 6.2 : 4.2) * t.s;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(i * 3) * 6.28);
    m.compose(new THREE.Vector3(t.x, H, t.z), q, new THREE.Vector3(Rr, (rain ? 2.6 : 3.4) * t.s, Rr));
    canopies.setMatrixAt(i, m);
    canopies.setColorAt(i, c.set(greens[Math.floor(hash(i * 11) * greens.length)]).multiplyScalar(rain ? 1.0 : 0.85));
    m.compose(new THREE.Vector3(t.x, 0, t.z), new THREE.Quaternion(), new THREE.Vector3(t.s, H * 0.92, t.s));
    trunks.setMatrixAt(i, m);
  });
  for (const im of [canopiesHi, canopiesLo]) { im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; group.add(im); }
  const pos = leafy.map((t) => [t.x, t.z]);
  let lastKey = '';
  const relod = () => {
    const tg = engine.controls.target, cam = engine.camera.position;
    const dist = cam.distanceTo(tg);
    const R = Math.max(260, Math.min(700, dist * 0.55));
    const key = `${Math.round(tg.x / 30)},${Math.round(tg.z / 30)},${Math.round(R / 40)}`;
    if (key === lastKey) return; lastKey = key;
    let hi = 0, lo = 0;
    for (let i = 0; i < pos.length; i++) {
      const near = Math.hypot(pos[i][0] - tg.x, pos[i][1] - tg.z) < R;
      const im = near ? canopiesHi : canopiesLo;
      const k = near ? hi++ : lo++;
      im.setMatrixAt(k, canopyMatrices[i]); im.setColorAt(k, canopyColors[i]);
    }
    canopiesHi.count = hi; canopiesLo.count = lo;
    for (const im of [canopiesHi, canopiesLo]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  };
  let acc = 1;
  engine.onUpdate((dt) => { acc += dt; if (acc > 0.35) { acc = 0; relod(); } });

  // coconut palms: slender trunk + crown of drooping fronds
  const frondGeo = new THREE.ConeGeometry(0.9, 5.2, 4, 1, true);
  frondGeo.translate(0, 2.6, 0); frondGeo.rotateX(Math.PI / 2 + 0.55); frondGeo.scale(1, 0.25, 1);
  const frondCount = 7;
  const fronds = new THREE.InstancedMesh(frondGeo, new THREE.MeshStandardMaterial({ color: '#6a8a3c', roughness: 0.9, side: THREE.DoubleSide }), palms.length * frondCount);
  palms.forEach((t, i) => {
    const H = 11 * t.s;
    m.compose(new THREE.Vector3(t.x, 0, t.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (hash(i) - 0.5) * 0.12), new THREE.Vector3(0.45, H, 0.45));
    trunks.setMatrixAt(leafy.length + i, m);
    for (let f = 0; f < frondCount; f++) {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (f / frondCount) * Math.PI * 2 + hash(i * 5));
      m.compose(new THREE.Vector3(t.x, H, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
      fronds.setMatrixAt(i * frondCount + f, m);
    }
  });
  trunks.castShadow = true; fronds.castShadow = true;
  group.add(trunks, fronds);

  // ---- streetlights ---------------------------------------------------------
  const lamps = [];
  for (const r of city.roads) {
    if (!/primary|secondary|tertiary/.test(r.c) || r.br) continue;
    let side = 1;
    for (const s of sampleLine(r.p, 34, 8)) {
      const off = (r.w / 2 + 1.0) * side;
      const p = [s.p[0] - s.dir[1] * off, s.p[1] + s.dir[0] * off];
      if (free(p, 0.5)) lamps.push({ p, dir: [s.dir[1] * side, -s.dir[0] * side] });
      side = -side;
    }
  }
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.13, 8, 5); poleGeo.translate(0, 4, 0);
  const armGeo = new THREE.BoxGeometry(0.08, 0.08, 1.8); armGeo.translate(0, 8, 0.9);
  const headGeo = new THREE.BoxGeometry(0.35, 0.16, 0.7); headGeo.translate(0, 7.92, 1.7);
  const metal = new THREE.MeshStandardMaterial({ color: '#5d6166', metalness: 0.6, roughness: 0.5 });
  const headMat = new THREE.MeshStandardMaterial({ color: '#d9d4c5', emissive: '#ffc987', emissiveIntensity: 0 });
  const poles = new THREE.InstancedMesh(poleGeo, metal, lamps.length);
  const arms = new THREE.InstancedMesh(armGeo, metal, lamps.length);
  const heads = new THREE.InstancedMesh(headGeo, headMat, lamps.length);
  // light pools on the road
  const poolTex = radialTex();
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, color: '#ffbf78', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const poolGeo = new THREE.PlaneGeometry(14, 14); poolGeo.rotateX(-Math.PI / 2);
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, lamps.length);
  lamps.forEach((l, i) => {
    const ang = Math.atan2(l.dir[0], l.dir[1]);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang);
    m.compose(new THREE.Vector3(l.p[0], 0, l.p[1]), q, new THREE.Vector3(1, 1, 1));
    poles.setMatrixAt(i, m); arms.setMatrixAt(i, m); heads.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(l.p[0] + l.dir[0] * 1.7, 0.3, l.p[1] + l.dir[1] * 1.7), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    pools.setMatrixAt(i, m);
  });
  poles.castShadow = true;
  pools.renderOrder = 2;
  group.add(poles, arms, heads, pools);

  return {
    group,
    count: trees.length,
    setNight(k) { headMat.emissiveIntensity = k * 3.2; poolMat.opacity = k * 0.55; },
    canopyMat,
  };
}

export function radialTex(inner = 'rgba(255,255,255,1)', size = 128) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
