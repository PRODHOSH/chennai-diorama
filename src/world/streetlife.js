import * as THREE from 'three';
import { centroid, nearestOnLine } from './geo.js';
import { hash } from '../core/state.js';

/**
 * Street character: bilingual shop boards and awnings along the commercial frontages.
 * Boards use generic trade names only (no invented businesses), weighted by neighbourhood —
 * vessel and jewellery shops in George Town, lodges and tiffin near Central, flowers at
 * Pookadai (Flower Bazaar) — the way these streets actually read.
 */
const SIGNS = [
  { ta: 'மளிகை', en: 'PROVISION STORES', bg: '#f2c230', fg: '#b3202a' },
  { ta: 'டீ கடை', en: 'TEA STALL', bg: '#1f7a4d', fg: '#fff6d8' },
  { ta: 'ஜவுளி', en: 'TEXTILES', bg: '#6e1f2a', fg: '#f3cf6b' },
  { ta: 'நகை மாளிகை', en: 'JEWELLERY', bg: '#4a0f1a', fg: '#e8c25a' },
  { ta: 'மருந்தகம்', en: 'PHARMACY', bg: '#f4f6f2', fg: '#1d7a3a' },
  { ta: 'உணவகம்', en: 'HOTEL · MEALS READY', bg: '#e2652a', fg: '#ffffff' },
  { ta: 'பூக்கடை', en: 'FLOWERS', bg: '#e04e8a', fg: '#fff3a8' },
  { ta: 'எலக்ட்ரிகல்ஸ்', en: 'ELECTRICALS', bg: '#1d4f9a', fg: '#ffffff' },
  { ta: 'ஹார்ட்வேர்', en: 'HARDWARE', bg: '#3d4a5a', fg: '#f2c230' },
  { ta: 'செல்போன்', en: 'MOBILES · RECHARGE', bg: '#c8232c', fg: '#ffffff' },
  { ta: 'புத்தகக் கடை', en: 'BOOKS', bg: '#1f6f78', fg: '#fdf3d8' },
  { ta: 'இனிப்பகம்', en: 'SWEETS & SNACKS', bg: '#f08a24', fg: '#5a1a10' },
  { ta: 'பாத்திரக் கடை', en: 'STEEL VESSELS', bg: '#5a7da0', fg: '#ffffff' },
  { ta: 'ஸ்டேஷனரி', en: 'STATIONERY', bg: '#ffd84d', fg: '#1d3f8a' },
  { ta: 'சலூன்', en: 'SALOON', bg: '#6b3fa0', fg: '#ffffff' },
  { ta: 'பேக்கரி', en: 'BAKERY', bg: '#7a4a2a', fg: '#ffe7b0' },
  { ta: 'லாட்ஜ்', en: 'LODGE · A/C ROOMS', bg: '#203a6b', fg: '#ffd84d' },
  { ta: 'டிபன் சென்டர்', en: 'TIFFIN CENTRE', bg: '#b5402a', fg: '#fff1c8' },
];
const COLS = 4, ROWS = Math.ceil(SIGNS.length / COLS), CW = 512, CH = 128;

function atlas() {
  const cv = document.createElement('canvas'); cv.width = CW * COLS; cv.height = CH * ROWS;
  const draw = () => {
    const ctx = cv.getContext('2d');
    SIGNS.forEach((s, i) => {
      const x = (i % COLS) * CW, y = Math.floor(i / COLS) * CH;
      ctx.fillStyle = s.bg; ctx.fillRect(x, y, CW, CH);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x, y + CH - 8, CW, 8);
      ctx.strokeStyle = s.fg; ctx.globalAlpha = 0.5; ctx.lineWidth = 3; ctx.strokeRect(x + 8, y + 8, CW - 16, CH - 16); ctx.globalAlpha = 1;
      ctx.fillStyle = s.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 ${s.ta.length > 9 ? 44 : 54}px "Noto Serif Tamil", "Hind Madurai", serif`;
      ctx.fillText(s.ta, x + CW / 2, y + CH * 0.4);
      ctx.font = '600 24px "Hind Madurai", sans-serif';
      ctx.fillText(s.en, x + CW / 2, y + CH * 0.8);
    });
  };
  draw();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  document.fonts?.ready.then(() => { draw(); tex.needsUpdate = true; });
  return tex;
}

function pickSign(c, id) {
  const r = hash(id * 7);
  const near = (x, z, R) => Math.hypot(c[0] - x, c[1] - z) < R;
  if (near(700, -640, 140)) return r < 0.6 ? 6 : r < 0.8 ? 1 : 0;                       // Pookadai
  if (near(330, -620, 240)) return [3, 2, 12, 2, 3, 12, 0, 5][Math.floor(r * 8)];          // George Town bazaars
  if (near(70, -220, 220)) return [16, 17, 5, 1, 16, 9, 17, 0][Math.floor(r * 8)];         // around Central: lodges, tiffin
  return Math.floor(r * SIGNS.length);
}

export function buildStreetLife(city, { excludeIds = new Set(), engine } = {}) {
  const group = new THREE.Group();
  const arterials = city.roads.filter((r) => /primary|secondary|tertiary/.test(r.c) && !r.br);
  const items = [];
  for (const b of city.buildings) {
    if (excludeIds.has(b.id) || b.n && /Temple|Church|Masjid|Koil|Hospital|Station|College|Bastion|Battlement|Ravelin|Gate/.test(b.n)) continue;
    if (b.k !== 'yes' && b.k !== 'commercial') continue;
    if (b.a < 40 || b.a > 1200 || b.h < 6) continue;
    const c = centroid(b.o);
    let best = null;
    for (const r of arterials) { const n = nearestOnLine(c, r.p); if (!best || n.d < best.d) best = n; }
    if (!best || best.d > 22) continue;
    // the footprint edge facing the road
    let edge = null;
    for (let i = 0; i < b.o.length; i++) {
      const a = b.o[i], e = b.o[(i + 1) % b.o.length];
      const m = [(a[0] + e[0]) / 2, (a[1] + e[1]) / 2];
      const L = Math.hypot(e[0] - a[0], e[1] - a[1]);
      if (L < 3) continue;
      const d = Math.hypot(m[0] - best.p[0], m[1] - best.p[1]);
      if (!edge || d < edge.d) edge = { a, e, m, L, d };
    }
    if (!edge) continue;
    const dx = edge.e[0] - edge.a[0], dz = edge.e[1] - edge.a[1];
    const nx = -dz / edge.L, nz = dx / edge.L; // outward
    items.push({ m: edge.m, n: [nx, nz], ang: Math.atan2(nx, nz), w: Math.min(edge.L * 0.86, 8), sign: pickSign(c, b.id), id: b.id });
  }
  const tex = atlas();
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0 });
  const signs = new THREE.InstancedMesh(geo, mat, items.length);
  const uvOff = new Float32Array(items.length * 2);
  // per-instance atlas cell
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aCell;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vec2 cellUv = (uv + aCell) / vec2(${COLS}.0, ${ROWS}.0);
        #ifdef USE_MAP
          vMapUv = vec2(cellUv.x, cellUv.y);
        #endif
        #ifdef USE_EMISSIVEMAP
          vEmissiveMapUv = vec2(cellUv.x, cellUv.y);
        #endif`);
  };
  mat.customProgramCacheKey = () => 'nc-signs';
  const awnGeo = new THREE.BoxGeometry(1, 0.06, 1.1); awnGeo.translate(0, 0, 0.55);
  const awnings = new THREE.InstancedMesh(awnGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  const awnCols = ['#2f6d9e', '#b8336a', '#3f8c5d', '#d2603a', '#7b4fa0', '#c9a24a', '#3d4a5a'];
  items.forEach((it, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.ang);
    m.compose(new THREE.Vector3(it.m[0] + it.n[0] * 0.08, 3.9, it.m[1] + it.n[1] * 0.08), q, new THREE.Vector3(it.w, it.w / 4.2, 1));
    signs.setMatrixAt(i, m);
    const cell = it.sign; uvOff[i * 2] = cell % COLS; uvOff[i * 2 + 1] = ROWS - 1 - Math.floor(cell / COLS);
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.32);
    m.compose(new THREE.Vector3(it.m[0] + it.n[0] * 0.1, 3.05, it.m[1] + it.n[1] * 0.1), q.clone().multiply(tilt), new THREE.Vector3(it.w * 0.95, 1, 1));
    awnings.setMatrixAt(i, m);
    awnings.setColorAt(i, c.set(awnCols[Math.floor(hash(it.id * 3) * awnCols.length)]));
  });
  geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(uvOff, 2));
  awnings.castShadow = true; awnings.receiveShadow = true;
  group.add(signs, awnings);
  return { group, count: items.length, setNight: (k) => { mat.emissiveIntensity = k * 0.55; } };
}

// ============================================================ real names from OpenStreetMap
/** a texture atlas of text boards; returns {tex, cols, rows} */
function textAtlas(items, { cw = 512, ch = 96, cols = 2, draw }) {
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const cv = document.createElement('canvas'); cv.width = cw * cols; cv.height = ch * rows;
  const paint = () => { const ctx = cv.getContext('2d'); items.forEach((it, i) => draw(ctx, it, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch)); };
  paint();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  document.fonts?.ready.then(() => { paint(); tex.needsUpdate = true; });
  return { tex, cols, rows };
}
function atlasMaterial(tex, cols, rows, emissive = 0) {
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: emissive, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aCell;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vec2 cellUv = (uv + aCell) / vec2(${cols}.0, ${rows}.0);
        #ifdef USE_MAP
          vMapUv = cellUv;
        #endif
        #ifdef USE_EMISSIVEMAP
          vEmissiveMapUv = cellUv;
        #endif`);
  };
  mat.customProgramCacheKey = () => `atlas-${cols}-${rows}-${tex.uuid}`;
  return mat;
}
const fit = (ctx, text, max, size, font) => { let s = size; ctx.font = `${font} ${s}px ${FONT_STACK}`; while (ctx.measureText(text).width > max && s > 12) { s -= 2; ctx.font = `${font} ${s}px ${FONT_STACK}`; } return s; };
const FONT_STACK = '"Hind Madurai", "Noto Serif Tamil", sans-serif';

/**
 * Nameboards over real businesses and buildings named in OpenStreetMap, and
 * Chennai-Corporation-style blue street-name boards along named roads.
 */
export function buildNames(city, { excludeIds = new Set() } = {}) {
  const group = new THREE.Group();
  const facade = (pt, ring) => {
    let best = null;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], e = ring[(i + 1) % ring.length];
      const L = Math.hypot(e[0] - a[0], e[1] - a[1]); if (L < 2.5) continue;
      const n = nearestOnLine(pt, [a, e]);
      if (!best || n.d < best.d) best = { ...n, L, nx: -(e[1] - a[1]) / L, nz: (e[0] - a[0]) / L };
    }
    return best;
  };
  const roadsAll = city.roads.filter((r) => !/footway|path|steps/.test(r.c));
  const nearestRoadPt = (c) => { let b = null; for (const r of roadsAll) { const n = nearestOnLine(c, r.p); if (!b || n.d < b.d) b = n; } return b; };

  // ---- business & building names
  const BUSINESS = /Hotel|Lodge|Inn|Guest House|Complex|Plaza|Bank|Chambers|Arcade|Towers?|Mansion|Market|Centre|Center|Building|Nivas|House|Mall|Palace|Bhavan|Stays|Company|Enclave|Pride|Post Office|Hall/;
  const named = [];
  for (const b of city.buildings) {
    if (!b.n || b.est || excludeIds.has(b.id) || !BUSINESS.test(b.n) || b.a < 40) continue;
    if (/Railway|Southern Railways|Ripon|Victoria Public Hall|Bastion|Battlement|Ravelin|Gate|Hospital|College/.test(b.n)) continue;
    const c = centroid(b.o); const rp = nearestRoadPt(c); if (!rp || rp.d > 40) continue;
    const f = facade(rp.p, b.o); if (!f) continue;
    named.push({ en: b.n, ta: b.nt, p: f.p, n: [f.nx, f.nz], w: Math.min(f.L * 0.9, Math.max(5, b.n.length * 0.42)), h: Math.min(b.h - 0.5, 6.2) });
  }
  // restaurants, tea stalls and cafés mapped as points → the nearest facade
  for (const p of city.pois) {
    if (!p.n || !/restaurant|cafe/.test(p.k)) continue;
    let best = null;
    for (const b of city.buildings) { if (b.est || excludeIds.has(b.id)) continue; const bb = b._bb; if (bb && (p.p[0] < bb.x0 - 20 || p.p[0] > bb.x1 + 20 || p.p[1] < bb.z0 - 20 || p.p[1] > bb.z1 + 20)) continue; const f = facade(p.p, b.o); if (f && (!best || f.d < best.f.d)) best = { b, f }; }
    if (!best || best.f.d > 18) continue;
    const rp = nearestRoadPt(best.f.p);
    // face the board toward the street
    let nx = best.f.nx, nz = best.f.nz; if (rp && (rp.p[0] - best.f.p[0]) * nx + (rp.p[1] - best.f.p[1]) * nz < 0) { nx = -nx; nz = -nz; }
    named.push({ en: p.n, ta: p.nt, p: best.f.p, n: [nx, nz], w: Math.min(best.f.L * 0.9, Math.max(4.5, p.n.length * 0.4)), h: 3.6, food: true });
  }
  const boardCols = ['#f2c230', '#1f6f78', '#6e1f2a', '#203a6b', '#f4f6f2', '#b5402a', '#1f7a4d', '#e2652a'];
  const fg = (bg) => (bg === '#f2c230' || bg === '#f4f6f2' ? '#3a1a10' : '#fff6e0');
  if (named.length) {
    const atlas = textAtlas(named, { cols: 2, draw: (ctx, it, x, y, w, h) => {
      const bg = it.food ? ['#b5402a', '#1f7a4d', '#f2c230', '#e2652a'][it.en.length % 4] : boardCols[it.en.length % boardCols.length];
      ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = fg(bg); ctx.globalAlpha = 0.45; ctx.lineWidth = 3; ctx.strokeRect(x + 6, y + 6, w - 12, h - 12); ctx.globalAlpha = 1;
      ctx.fillStyle = fg(bg); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (it.ta) { fit(ctx, it.ta, w - 30, 34, '700'); ctx.fillText(it.ta, x + w / 2, y + h * 0.36); fit(ctx, it.en.toUpperCase(), w - 30, 24, '600'); ctx.fillText(it.en.toUpperCase(), x + w / 2, y + h * 0.74); }
      else { fit(ctx, it.en.toUpperCase(), w - 30, 40, '700'); ctx.fillText(it.en.toUpperCase(), x + w / 2, y + h / 2 + 2); }
    } });
    const geo = new THREE.PlaneGeometry(1, 1);
    const cells = new Float32Array(named.length * 2);
    named.forEach((_, i) => { cells[i * 2] = i % atlas.cols; cells[i * 2 + 1] = atlas.rows - 1 - Math.floor(i / atlas.cols); });
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2));
    const mat = atlasMaterial(atlas.tex, atlas.cols, atlas.rows, 0);
    const im = new THREE.InstancedMesh(geo, mat, named.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    named.forEach((it, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(it.n[0], it.n[1])); m.compose(new THREE.Vector3(it.p[0] + it.n[0] * 0.12, it.h, it.p[1] + it.n[1] * 0.12), q, new THREE.Vector3(it.w, it.w / 5.33, 1)); im.setMatrixAt(i, m); });
    group.add(im);
    group.userData.namedMat = mat;
  }

  // ---- street-name boards (blue, white text; Tamil above English where OSM has it)
  const byName = new Map();
  for (const r of city.roads) {
    if (!r.n || /footway|path|steps|service|_link/.test(r.c) || r.br) continue;
    if (!byName.has(r.n)) byName.set(r.n, []);
    byName.get(r.n).push(r);
  }
  const boards = [];
  for (const [name, list] of byName) {
    list.sort((a, b) => b.p.length - a.p.length);
    for (const r of list.slice(0, /primary|secondary|trunk/.test(list[0].c) ? 3 : 1)) {
      // near the start of the road piece (≈ an intersection), on the left kerb
      const pts = r.p; if (pts.length < 2) continue;
      const a = pts[0], b = pts[1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
      const t = Math.min(8, L * 0.5);
      const off = r.w / 2 + 1.6;
      boards.push({ name, ta: r.nt, x: a[0] + dx * t + dz * off, z: a[1] + dz * t - dx * off, ang: Math.atan2(dx, dz) + Math.PI / 2 });
    }
  }
  if (boards.length) {
    const atlas = textAtlas(boards, { cw: 512, ch: 128, cols: 4, draw: (ctx, it, x, y, w, h) => {
      ctx.fillStyle = '#1f4fa0'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.strokeRect(x + 7, y + 7, w - 14, h - 14);
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (it.ta) { fit(ctx, it.ta, w - 40, 40, '700'); ctx.fillText(it.ta, x + w / 2, y + h * 0.36); fit(ctx, it.name, w - 40, 30, '600'); ctx.fillText(it.name, x + w / 2, y + h * 0.72); }
      else { fit(ctx, it.name, w - 40, 40, '700'); ctx.fillText(it.name, x + w / 2, y + h / 2 + 2); }
    } });
    const geo = new THREE.PlaneGeometry(1, 1);
    const cells = new Float32Array(boards.length * 2);
    boards.forEach((_, i) => { cells[i * 2] = i % atlas.cols; cells[i * 2 + 1] = atlas.rows - 1 - Math.floor(i / atlas.cols); });
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2));
    const boardMesh = new THREE.InstancedMesh(geo, atlasMaterial(atlas.tex, atlas.cols, atlas.rows, 0.05), boards.length);
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6); poleGeo.translate(0, 1.3, 0);
    const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshStandardMaterial({ color: '#2d3a4a', metalness: 0.5, roughness: 0.5 }), boards.length * 2);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    boards.forEach((bd, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), bd.ang);
      m.compose(new THREE.Vector3(bd.x, 2.9, bd.z), q, new THREE.Vector3(2.6, 0.65, 1)); boardMesh.setMatrixAt(i, m);
      const sx = Math.cos(bd.ang), sz = -Math.sin(bd.ang);
      for (const s of [-1, 1]) { m.makeTranslation(bd.x + sx * s * 1.15, 0, bd.z + sz * s * 1.15); poles.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), m); }
    });
    poles.castShadow = true;
    group.add(boardMesh, poles);
  }
  group.userData.named = named; group.userData.boards = boards;
  return { group, counts: { named: named.length, streets: boards.length }, setNight: (k) => { if (group.userData.namedMat) group.userData.namedMat.emissiveIntensity = k * 0.5; } };
}
