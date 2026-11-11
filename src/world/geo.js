import * as THREE from 'three';

export async function loadCity(onProgress) {
  const res = await fetch('/data/city.json');
  if (!res.ok) throw new Error('City data missing — run `node scripts/build-geo.mjs`');
  const total = +res.headers.get('content-length') || 0;
  if (!res.body || !total) return res.json();
  const reader = res.body.getReader();
  const chunks = []; let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); got += value.length;
    onProgress?.(got / total);
  }
  const buf = new Uint8Array(got); let o = 0;
  for (const c of chunks) { buf.set(c, o); o += c.length; }
  return JSON.parse(new TextDecoder().decode(buf));
}

// projection identical to scripts/build-geo.mjs
export const ORIGIN = { lat: 13.0825, lon: 80.2755 };
const KX = Math.cos((ORIGIN.lat * Math.PI) / 180) * 111320, KZ = 110574;
export const project = (lat, lon) => [(lon - ORIGIN.lon) * KX, -(lat - ORIGIN.lat) * KZ];
export const unproject = (x, z) => ({ lat: ORIGIN.lat - z / KZ, lon: ORIGIN.lon + x / KX });

export function centroid(r) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
    a += f; cx += (r[j][0] + r[i][0]) * f; cz += (r[j][1] + r[i][1]) * f;
  }
  if (Math.abs(a) < 1e-6) { let x = 0, z = 0; for (const p of r) { x += p[0]; z += p[1]; } return [x / r.length, z / r.length]; }
  return [cx / (3 * a), cz / (3 * a)];
}
export function area(r) { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return a / 2; }
export function inPoly([x, z], r) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], zi = r[i][1], xj = r[j][0], zj = r[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
export function bboxOf(r) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of r) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  return { x0, x1, z0, z1 };
}
/** nearest point on a polyline; returns {d, p:[x,z], seg, t, dir:[dx,dz]} */
export function nearestOnLine(pt, line) {
  let best = { d: Infinity };
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i], b = line[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const L2 = dx * dx + dz * dz || 1e-9;
    let t = ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dz) / L2; t = Math.max(0, Math.min(1, t));
    const px = a[0] + dx * t, pz = a[1] + dz * t;
    const d = Math.hypot(pt[0] - px, pt[1] - pz);
    if (d < best.d) { const L = Math.sqrt(L2); best = { d, p: [px, pz], seg: i, t, dir: [dx / L, dz / L] }; }
  }
  return best;
}
export function lineLength(line) { let L = 0; for (let i = 1; i < line.length; i++) L += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]); return L; }

/** sample points every `step` metres along a polyline → [{p:[x,z], dir:[dx,dz]}] */
export function sampleLine(line, step, offset = 0) {
  const out = [];
  let carry = offset;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i], b = line[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const L = Math.hypot(dx, dz); if (L < 1e-6) continue;
    const ux = dx / L, uz = dz / L;
    let s = carry;
    while (s <= L) { out.push({ p: [a[0] + ux * s, a[1] + uz * s], dir: [ux, uz] }); s += step; }
    carry = s - L;
  }
  return out;
}

/** flat polygon (with holes) → BufferGeometry on the XZ plane at height y */
export function polygonGeometry(outer, holes = [], y = 0) {
  const contour = outer.map(([x, z]) => new THREE.Vector2(x, z));
  const hs = holes.map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
  if (THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
  hs.forEach((h) => { if (!THREE.ShapeUtils.isClockWise(h)) h.reverse(); });
  const tris = THREE.ShapeUtils.triangulateShape(contour, hs);
  const all = contour.concat(...hs);
  const pos = new Float32Array(all.length * 3);
  all.forEach((v, i) => { pos[i * 3] = v.x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = v.y; });
  const idx = [];
  for (const t of tris) {
    const a = all[t[0]], b = all[t[1]], c = all[t[2]];
    const up = (b.y - a.y) * (c.x - a.x) - (b.x - a.x) * (c.y - a.y);
    if (up >= 0) idx.push(t[0], t[1], t[2]); else idx.push(t[0], t[2], t[1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** ribbon along a polyline (for roads, rails, rivers). Returns raw arrays to merge. */
export function ribbon(line, width, y = 0, yFn = null) {
  const n = line.length; if (n < 2) return null;
  const pos = [], uv = [], idx = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const p = line[i];
    const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1];
    const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    // miter: average normals, limit length
    let nx = -dz, nz = dx, scale = 1;
    if (i > 0 && i < n - 1) {
      const d1x = p[0] - a[0], d1z = p[1] - a[1], l1 = Math.hypot(d1x, d1z) || 1;
      const n1x = -d1z / l1, n1z = d1x / l1;
      const dot = n1x * nx + n1z * nz;
      scale = Math.min(1 / Math.max(dot, 0.35), 2.5);
    }
    if (i > 0) acc += Math.hypot(p[0] - line[i - 1][0], p[1] - line[i - 1][1]);
    const hw = (width / 2) * scale;
    const yy = yFn ? yFn(acc, i) : y;
    pos.push(p[0] + nx * hw, yy, p[1] + nz * hw, p[0] - nx * hw, yy, p[1] - nz * hw);
    uv.push(acc, 0, acc, 1);
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  return { pos, uv, idx, length: acc };
}

export function mergeRaw(list, extra = null) {
  let vcount = 0; const pos = [], uv = [], idx = [], ex = [];
  for (const r of list) {
    if (!r) continue;
    for (const v of r.pos) pos.push(v);
    for (const v of r.uv) uv.push(v);
    for (const i of r.idx) idx.push(i + vcount);
    if (extra) { const e = extra(r); for (let k = 0; k < r.pos.length / 3; k++) ex.push(...e); }
    vcount += r.pos.length / 3;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (extra && ex.length) g.setAttribute('aExtra', new THREE.Float32BufferAttribute(ex, ex.length / vcount));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
