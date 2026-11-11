import { inPoly, bboxOf, nearestOnLine } from './geo.js';
import { hash } from '../core/state.js';

/**
 * ESTIMATED INFILL
 * OpenStreetMap coverage of Chintadripet, George Town and Periamet is incomplete: whole blocks
 * of real, densely built streets have no mapped footprints. Left empty they read as vacant
 * land, which is wrong. We infill ONLY where OSM has nothing — never over mapped buildings,
 * roads, rail, water, parks or institutional grounds — with modest generic houses fronting the
 * nearest real lane. They are flagged `est: 1`, and the UI labels them "estimated".
 */
const ZONES = [
  { c: [-600, 600], r: 330 }, { c: [-760, 300], r: 200 }, { c: [350, -560], r: 400 }, { c: [650, -700], r: 220 },
  { c: [-650, -110], r: 260 }, { c: [-850, -170], r: 200 }, { c: [180, -330], r: 180 }, { c: [-420, 780], r: 160 },
];
const NO_BUILD = new Set(['water', 'pond', 'park', 'grass', 'pitch', 'cemetery', 'railyard', 'station', 'fort', 'campus', 'parking', 'market', 'platform', 'temple']);

export function generateInfill(city, quality = 'high') {
  const step = quality === 'low' ? 16 : 12.5;
  // spatial hash of road & rail segments
  const cell = 30, segGrid = new Map();
  const addSeg = (a, b, w) => {
    const x0 = Math.floor(Math.min(a[0], b[0]) / cell), x1 = Math.floor(Math.max(a[0], b[0]) / cell);
    const z0 = Math.floor(Math.min(a[1], b[1]) / cell), z1 = Math.floor(Math.max(a[1], b[1]) / cell);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const k = x + ',' + z; if (!segGrid.has(k)) segGrid.set(k, []); segGrid.get(k).push([a, b, w]); }
  };
  for (const r of city.roads) for (let i = 0; i < r.p.length - 1; i++) addSeg(r.p[i], r.p[i + 1], r.w || 5);
  for (const r of city.rails) for (let i = 0; i < r.p.length - 1; i++) addSeg(r.p[i], r.p[i + 1], 8);
  const nearSeg = (p, R) => {
    let best = null;
    const cx = Math.floor(p[0] / cell), cz = Math.floor(p[1] / cell);
    for (let x = cx - 1; x <= cx + 1; x++) for (let z = cz - 1; z <= cz + 1; z++) for (const [a, b, w] of segGrid.get(x + ',' + z) || []) {
      const n = nearestOnLine(p, [a, b]); const d = n.d - w / 2;
      if (d < R && (!best || d < best.d)) best = { d, n, w };
    }
    return best;
  };
  // building occupancy grid (bbox-padded)
  const bGrid = new Map();
  city.buildings.forEach((b) => { const bb = bboxOf(b.o); b._bb = bb; for (let x = Math.floor(bb.x0 / cell); x <= Math.floor(bb.x1 / cell); x++) for (let z = Math.floor(bb.z0 / cell); z <= Math.floor(bb.z1 / cell); z++) { const k = x + ',' + z; if (!bGrid.has(k)) bGrid.set(k, []); bGrid.get(k).push(b); } });
  const nearBuilding = (p, pad) => {
    const cx = Math.floor(p[0] / cell), cz = Math.floor(p[1] / cell);
    for (let x = cx - 1; x <= cx + 1; x++) for (let z = cz - 1; z <= cz + 1; z++) for (const b of bGrid.get(x + ',' + z) || []) {
      const bb = b._bb; if (p[0] > bb.x0 - pad && p[0] < bb.x1 + pad && p[1] > bb.z0 - pad && p[1] < bb.z1 + pad) return true;
    }
    return false;
  };
  const blocked = city.areas.filter((a) => NO_BUILD.has(a.k)).map((a) => ({ p: a.p, bb: bboxOf(a.p) }));
  const inBlocked = (p) => blocked.some((a) => p[0] > a.bb.x0 && p[0] < a.bb.x1 && p[1] > a.bb.z0 && p[1] < a.bb.z1 && inPoly(p, a.p));

  const out = [];
  let id = -1;
  const { xmin, xmax, zmin, zmax } = city.meta.bounds;
  for (const zone of ZONES) {
    for (let x = zone.c[0] - zone.r; x < zone.c[0] + zone.r; x += step) for (let z = zone.c[1] - zone.r; z < zone.c[1] + zone.r; z += step) {
      const j = hash(Math.round(x * 13 + z * 7));
      const p = [x + (j - 0.5) * 3, z + (hash(Math.round(x * 3 - z * 11)) - 0.5) * 3];
      if (Math.hypot(p[0] - zone.c[0], p[1] - zone.c[1]) > zone.r) continue;
      if (p[0] < xmin + 20 || p[0] > xmax - 20 || p[1] < zmin + 20 || p[1] > zmax - 20) continue;
      if (nearBuilding(p, 4.5)) continue;
      const seg = nearSeg(p, 40);
      if (!seg || seg.d < 3.5) continue;          // keep off the road and its footpath
      if (seg.d > 28) continue;                    // only plots that front a lane
      if (inBlocked(p)) continue;
      if (out.some((o) => Math.abs(o.cx - p[0]) < step * 0.8 && Math.abs(o.cz - p[1]) < step * 0.8)) continue;
      // footprint aligned to the lane, front set back a little
      const [dx, dz] = seg.n.dir;
      const w = 6.5 + hash(id * 3) * 3.5, d = 8 + hash(id * 5) * 4;
      const ux = dx, uz = dz, vx = -dz, vz = dx;
      const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => [+(p[0] + ux * a + vx * b).toFixed(1), +(p[1] + uz * a + vz * b).toFixed(1)]);
      if (corners.some((c) => nearBuilding(c, 0.8) || (nearSeg(c, 3)?.d ?? 99) < 1.5)) continue;
      // normalise winding to match build-geo (positive "script area")
      let A = 0; for (let i = 0, k = corners.length - 1; i < corners.length; k = i++) A += (corners[k][0] + corners[i][0]) * (corners[k][1] - corners[i][1]);
      const o = A < 0 ? corners.reverse() : corners;
      const lv = 1 + Math.floor(hash(id * 7) * (hash(id * 9) < 0.15 ? 4 : 3));
      out.push({ id: id--, o, h: +(lv * 3.3 + 0.6).toFixed(1), lv, k: 'yes', a: Math.round(w * d), est: 1, cx: p[0], cz: p[1] });
    }
  }
  return out;
}
