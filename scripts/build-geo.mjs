#!/usr/bin/env node
/**
 * Converts the raw OpenStreetMap extract (data/map.osm, © OpenStreetMap contributors, ODbL)
 * into a compact, projected scene description consumed by the 3D city (public/data/city.json).
 *
 *   node scripts/build-geo.mjs
 *
 * Coordinates: local metres on an equirectangular projection centred on ORIGIN.
 * +x = east, -z = north (Three.js convention, so "north is up" when looking down -z).
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('data/map.osm');
const OUT = path.resolve('public/data/city.json');
export const ORIGIN = { lat: 13.0825, lon: 80.2755 };
const BBOX = { s: 13.0745, w: 80.2660, n: 13.0900, e: 80.2850 };

const kx = Math.cos((ORIGIN.lat * Math.PI) / 180) * 111320;
const kz = 110574;
const P = (lat, lon) => [+((lon - ORIGIN.lon) * kx).toFixed(1), +(-(lat - ORIGIN.lat) * kz).toFixed(1)];
const XMIN = P(ORIGIN.lat, BBOX.w)[0], XMAX = P(ORIGIN.lat, BBOX.e)[0];
const ZMIN = P(BBOX.n, ORIGIN.lon)[1], ZMAX = P(BBOX.s, ORIGIN.lon)[1];

const xml = fs.readFileSync(SRC, 'utf8');
const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const tagsOf = (s) => Object.fromEntries([...s.matchAll(/<tag k="([^"]+)" v="([^"]*)"\s*\/>/g)].map((m) => [m[1], unesc(m[2])]));

// ---------- parse ----------
const nodes = new Map();
for (const m of xml.matchAll(/<node id="(\d+)"[^>]*?lat="(-?[\d.]+)" lon="(-?[\d.]+)"[^>]*?(\/>|>([\s\S]*?)<\/node>)/g)) {
  nodes.set(m[1], { p: P(+m[2], +m[3]), t: m[5] ? tagsOf(m[5]) : null });
}
const ways = new Map();
for (const m of xml.matchAll(/<way id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g)) {
  const refs = [...m[2].matchAll(/<nd ref="(\d+)"/g)].map((r) => r[1]);
  const pts = refs.map((r) => nodes.get(r)?.p).filter(Boolean);
  ways.set(m[1], { id: m[1], refs, pts, t: tagsOf(m[2]) });
}
const rels = [];
for (const m of xml.matchAll(/<relation id="(\d+)"[^>]*>([\s\S]*?)<\/relation>/g)) {
  const members = [...m[2].matchAll(/<member type="(\w+)" ref="(\d+)" role="([^"]*)"/g)].map((x) => ({ type: x[1], ref: x[2], role: x[3] }));
  rels.push({ id: m[1], members, t: tagsOf(m[2]) });
}

// ---------- geometry helpers ----------
const area = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return a / 2; };
const centroid = (r) => { let x = 0, z = 0; for (const p of r) { x += p[0]; z += p[1]; } return [x / r.length, z / r.length]; };
const inBox = ([x, z], pad = 0) => x >= XMIN - pad && x <= XMAX + pad && z >= ZMIN - pad && z <= ZMAX + pad;
const closeRing = (r) => {
  const out = r.slice();
  if (out.length > 1 && out[0][0] === out.at(-1)[0] && out[0][1] === out.at(-1)[1]) out.pop();
  return out;
};
// Ramer–Douglas–Peucker for polylines
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts.at(-1)];
  let dmax = 0, idx = 0;
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1e-9;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dz * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L;
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax > eps) return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
  return [a, b];
}
// clip a polyline to the bbox (Liang–Barsky per segment, splits into pieces)
function clipLine(pts) {
  const pieces = []; let cur = [];
  const clipSeg = (p0, p1) => {
    let t0 = 0, t1 = 1; const dx = p1[0] - p0[0], dz = p1[1] - p0[1];
    const tests = [[-dx, p0[0] - XMIN], [dx, XMAX - p0[0]], [-dz, p0[1] - ZMIN], [dz, ZMAX - p0[1]]];
    for (const [p, q] of tests) {
      if (p === 0) { if (q < 0) return null; continue; }
      const r = q / p; if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
    const f = (t) => [+(p0[0] + t * dx).toFixed(1), +(p0[1] + t * dz).toFixed(1)];
    return [f(t0), f(t1), t0 > 0, t1 < 1];
  };
  for (let i = 0; i < pts.length - 1; i++) {
    const c = clipSeg(pts[i], pts[i + 1]);
    if (!c) { if (cur.length > 1) pieces.push(cur); cur = []; continue; }
    if (!cur.length || c[2]) { if (cur.length > 1) pieces.push(cur); cur = [c[0]]; }
    cur.push(c[1]);
    if (c[3]) { pieces.push(cur); cur = []; }
  }
  if (cur.length > 1) pieces.push(cur);
  return pieces;
}
// assemble rings from multipolygon member ways
function assemble(wayIds) {
  const segs = wayIds.map((id) => ways.get(id)).filter((w) => w && w.pts.length > 1).map((w) => w.refs.map((r) => ({ r, p: nodes.get(r)?.p })).filter((n) => n.p));
  const rings = [];
  while (segs.length) {
    let ring = segs.shift();
    let guard = 0;
    while (ring[0].r !== ring.at(-1).r && guard++ < 500) {
      const end = ring.at(-1).r;
      const i = segs.findIndex((s) => s[0].r === end || s.at(-1).r === end);
      if (i < 0) break;
      let s = segs.splice(i, 1)[0];
      if (s[0].r !== end) s = s.reverse();
      ring = ring.concat(s.slice(1));
    }
    // Only keep rings that genuinely close. Relations that extend beyond the extract
    // (e.g. the full Cooum riverbank) arrive with members missing; closing them with a
    // straight chord would flood whole neighbourhoods.
    if (ring.length > 3 && ring[0].r === ring.at(-1).r) rings.push(closeRing(ring.map((n) => n.p)));
  }
  return rings;
}
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };

// ---------- buildings ----------
const buildings = [];
const usedOuter = new Set();
function addBuilding(id, outer, holes, t) {
  if (!outer || outer.length < 3) return;
  const a = Math.abs(area(outer));
  if (a < 6) return;
  const c = centroid(outer);
  if (!inBox(c)) return;
  if (t.building === 'roof' || t.building === 'construction') { /* canopies handled separately */ }
  let levels = parseFloat(t['building:levels']);
  let h = parseFloat(t.height);
  const r = hash(id);
  if (!Number.isFinite(levels)) {
    // Heuristic for untagged buildings in a dense commercial core (George Town / Park Town):
    // small plots are 1–3 storeys, mid plots 2–4, large plots 3–5. Deterministic per OSM id.
    if (a < 60) levels = 1 + Math.floor(r * 2);
    else if (a < 250) levels = 2 + Math.floor(r * 3);
    else if (a < 1200) levels = 2 + Math.floor(r * 4);
    else levels = 3 + Math.floor(r * 3);
    if (t.building === 'roof') levels = 1;
  }
  if (!Number.isFinite(h)) h = levels * 3.3 + (t.building === 'roof' ? 0 : 0.6);
  // ensure CCW (positive area in x/z with -z north => use sign consistently)
  const o = area(outer) < 0 ? outer.slice().reverse() : outer;
  const hs = (holes || []).map((hh) => (area(hh) > 0 ? hh.slice().reverse() : hh));
  buildings.push({
    id: +id,
    o: o,
    ...(hs.length ? { hl: hs } : {}),
    h: +h.toFixed(1),
    lv: levels,
    k: t.building === 'roof' ? 'roof' : t.amenity === 'place_of_worship' || t.building === 'church' || t.building === 'chapel' ? 'worship' : t.building,
    ...(t.name ? { n: t.name } : {}),
    ...(t['name:ta'] ? { nt: t['name:ta'] } : {}),
    ...(t['building:colour'] ? { col: t['building:colour'] } : {}),
    ...(t.religion ? { rel: t.religion } : {}),
    a: Math.round(a),
  });
}
for (const r of rels) {
  if (r.t.type !== 'multipolygon' || !r.t.building) continue;
  const outerIds = r.members.filter((m) => m.type === 'way' && m.role === 'outer').map((m) => m.ref);
  const innerIds = r.members.filter((m) => m.type === 'way' && m.role === 'inner').map((m) => m.ref);
  outerIds.forEach((i) => usedOuter.add(i));
  const outers = assemble(outerIds);
  const inners = assemble(innerIds);
  outers.forEach((o, i) => addBuilding(`${r.id}${i ? '_' + i : ''}`, o, i === 0 ? inners : [], { ...ways.get(outerIds[0])?.t, ...r.t }));
}
for (const w of ways.values()) {
  if (!w.t.building || usedOuter.has(w.id)) continue;
  if (w.refs[0] !== w.refs.at(-1)) continue;
  if (w.t.building === 'construction') continue;
  addBuilding(w.id, closeRing(w.pts), [], w.t);
}

// ---------- roads / rail / areas ----------
const ROAD_W = { trunk: 16, primary: 14, secondary: 11, tertiary: 9, residential: 6.5, unclassified: 6, living_street: 5, service: 4.5, pedestrian: 6, primary_link: 7, secondary_link: 6, tertiary_link: 6, footway: 2.4, path: 2, steps: 2.4 };
const roads = [];
const rails = [];
const metro = [];
const areas = []; // {k, pts}
for (const w of ways.values()) {
  const t = w.t;
  if (t.highway && ROAD_W[t.highway]) {
    if (t.highway === 'construction') continue;
    const lanes = parseInt(t.lanes) || 0;
    let width = ROAD_W[t.highway];
    if (lanes && /primary|secondary|trunk/.test(t.highway)) width = Math.max(width, lanes * 3.4);
    for (const piece of clipLine(rdp(w.pts, 0.6))) {
      roads.push({
        c: t.highway, w: +width.toFixed(1), p: piece,
        ...(t.name ? { n: t.name } : {}), ...(t['name:ta'] ? { nt: t['name:ta'] } : {}),
        ...(t.bridge ? { br: 1, L: parseInt(t.layer) || 1 } : {}),
        ...(t.oneway === 'yes' ? { ow: 1 } : {}),
        ...(t.tunnel ? { tu: 1 } : {}),
      });
    }
  } else if (t.railway === 'subway') {
    // Chennai Metro runs underground here: kept separately for the x-ray view
    const line = /Line 2/.test(t.name || '') ? 2 : 1;
    for (const piece of clipLine(rdp(w.pts, 0.6))) metro.push({ line, p: piece, layer: parseInt(t.layer) || -1 });
  } else if (t.railway === 'rail') {
    if (t.tunnel === 'yes') continue;
    for (const piece of clipLine(rdp(w.pts, 0.4))) rails.push({ p: piece, ...(t.bridge ? { br: 1 } : {}), ...(t.name ? { n: t.name } : {}), ...(t.service ? { svc: t.service } : {}), ...(t.usage ? { u: t.usage } : {}) });
  } else if (t.railway === 'platform' && w.refs[0] === w.refs.at(-1)) {
    const r = closeRing(w.pts); if (inBox(centroid(r))) areas.push({ k: 'platform', p: r });
  } else if (w.refs[0] === w.refs.at(-1) && w.pts.length > 3) {
    const r = closeRing(w.pts);
    if (!inBox(centroid(r), 200)) continue;
    let k = null;
    if (t.natural === 'water' || t.waterway === 'riverbank') k = t.water === 'pond' ? 'pond' : 'water';
    else if (/^(park|garden|common|recreation_ground|village_green)$/.test(t.leisure || t.landuse || '')) k = 'park';
    else if (t.landuse === 'grass' || t.landuse === 'village_green' || t.natural === 'scrub' || t.natural === 'wetland') k = 'grass';
    else if (t.leisure === 'pitch' || t.leisure === 'stadium' || t.leisure === 'track' || t.leisure === 'sports_centre') k = 'pitch';
    else if (t.landuse === 'cemetery') k = 'cemetery';
    else if (t.landuse === 'railway') k = 'railyard';
    else if (t.landuse === 'military' || t.historic === 'castle') k = 'fort';
    else if (t.amenity === 'hospital' || t.amenity === 'college' || t.amenity === 'school') k = 'campus';
    else if (t.amenity === 'parking') k = 'parking';
    else if (t.amenity === 'marketplace') k = 'market';
    else if (t.railway === 'station' && t.name === 'Chennai Central') k = 'station';
    if (k) areas.push({ k, p: r, ...(t.name ? { n: t.name } : {}) });
  }
}
// water multipolygons (e.g. Cooum / Buckingham canal banks)
for (const r of rels) {
  if (r.t.type === 'multipolygon' && (r.t.natural === 'water' || r.t.waterway === 'riverbank')) {
    for (const ring of assemble(r.members.filter((m) => m.role === 'outer').map((m) => m.ref))) areas.push({ k: 'water', p: ring, ...(r.t.name ? { n: r.t.name } : {}) });
  }
}
// waterway centrelines as fallback ribbons
const waterways = [];
for (const w of ways.values()) {
  if (w.t.waterway === 'river' || w.t.waterway === 'canal') for (const piece of clipLine(rdp(w.pts, 1))) waterways.push({ p: piece, w: w.t.waterway === 'river' ? 52 : 20, ...(w.t.name ? { n: w.t.name } : {}) });
}

// ---------- points of interest ----------
const pois = [];
for (const [id, n] of nodes) {
  const t = n.t; if (!t || !inBox(n.p)) continue;
  if (t.amenity === 'place_of_worship' || t.historic || t.tourism === 'attraction' || t.amenity === 'restaurant' || t.amenity === 'cafe' || t.railway === "subway_entrance" || t.railway === 'station' || t.highway === 'traffic_signals' || t.highway === 'bus_stop' || t.natural === 'tree') {
    pois.push({ id: +id, p: n.p, k: t.railway === "subway_entrance" ? "subway_entrance" : t.highway || t.natural || t.amenity || t.historic || t.tourism || t.railway, ...(t.name ? { n: t.name } : {}), ...(t['name:ta'] ? { nt: t['name:ta'] } : {}), ...(t.religion ? { rel: t.religion } : {}), ...(t.cuisine ? { cu: t.cuisine } : {}), ...(t.ref ? { ref: t.ref } : {}), ...(t.station ? { st: t.station } : {}) });
  }
}

const out = {
  meta: {
    source: 'OpenStreetMap', license: 'ODbL 1.0', attribution: '© OpenStreetMap contributors',
    extracted: new Date().toISOString().slice(0, 10), origin: ORIGIN, bbox: BBOX,
    bounds: { xmin: XMIN, xmax: XMAX, zmin: ZMIN, zmax: ZMAX },
  },
  buildings, roads, rails, metro, areas, waterways, pois,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`buildings ${buildings.length}, roads ${roads.length}, rails ${rails.length}, areas ${areas.length}, waterways ${waterways.length}, pois ${pois.length}`);
console.log('bounds', out.meta.bounds, 'size', (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB');
