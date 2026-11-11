import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { centroid, inPoly, nearestOnLine, bboxOf } from './geo.js';
import { hash } from '../core/state.js';

/**
 * Hand-authored procedural landmarks. Each is a STYLISED RECONSTRUCTION built from
 * OpenStreetMap footprints (where mapped) and Wikimedia Commons reference photographs.
 * Nothing here is a survey-accurate architectural model — the UI labels them as such.
 */

// ---------------------------------------------------------------- textures
const texCache = new Map();
function canvasTex(key, w, h, draw, repeat = true) {
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache.set(key, t);
  return t;
}

function archWindow(ctx, x, y, w, h, frame, glass, round = true) {
  ctx.fillStyle = frame;
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + h + 2); ctx.lineTo(x - 3, y + r);
  if (round) ctx.arc(x + r, y + r, r + 3, Math.PI, 0); else { ctx.lineTo(x + r, y - 6); ctx.lineTo(x + w + 3, y + r); }
  ctx.lineTo(x + w + 3, y + h + 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(x, y + h); ctx.lineTo(x, y + r);
  if (round) ctx.arc(x + r, y + r, r, Math.PI, 0); else { ctx.lineTo(x + r, y - 2); ctx.lineTo(x + w, y + r); }
  ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  // mullion
  ctx.fillStyle = frame; ctx.fillRect(x + r - 1.5, y + r * 0.6, 3, h - r * 0.6);
}

/** Chennai Central / SR HQ: red brick, white string courses, arched openings. One bay × one storey */
function brickBayTex(variant = 'central') {
  return canvasTex('brick-' + variant, 256, 384, (ctx, w, h) => {
    const brick = variant === 'victoria' ? '#a24a36' : '#a8402e';
    ctx.fillStyle = brick; ctx.fillRect(0, 0, w, h);
    // brick coursing
    ctx.globalAlpha = 0.09; ctx.fillStyle = '#000';
    for (let y = 0; y < h; y += 8) ctx.fillRect(0, y, w, 1);
    ctx.globalAlpha = 1;
    const white = '#eee4d2';
    // string course + cornice at top of storey
    ctx.fillStyle = white; ctx.fillRect(0, 0, w, 16); ctx.fillRect(0, 26, w, 5);
    for (let x = 4; x < w; x += 14) ctx.fillRect(x, 16, 7, 7); // dentils
    // sill band
    ctx.fillRect(0, h - 70, w, 6);
    // arched window with white voussoirs
    archWindow(ctx, 70, 96, 116, 210, white, '#3b3a3c');
    // polychrome voussoir stripes over the arch
    ctx.strokeStyle = brick; ctx.lineWidth = 3;
    for (let a = 0; a <= 12; a++) {
      const t = Math.PI + (a / 12) * Math.PI;
      ctx.beginPath(); ctx.moveTo(128 + Math.cos(t) * 58, 154 + Math.sin(t) * 58); ctx.lineTo(128 + Math.cos(t) * 64, 154 + Math.sin(t) * 64); ctx.stroke();
    }
    // pilasters
    ctx.fillStyle = '#9a3a2a'; ctx.fillRect(0, 30, 12, h - 30); ctx.fillRect(w - 12, 30, 12, h - 30);
  });
}

/** Ripon Building: white neo-classical — paired columns between arched windows */
function riponBayTex() {
  return canvasTex('ripon', 256, 384, (ctx, w, h) => {
    ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e2ddd2'; ctx.fillRect(0, 0, w, 22); ctx.fillRect(0, h - 40, w, 40);
    for (let x = 6; x < w; x += 16) { ctx.fillStyle = '#d6d0c4'; ctx.fillRect(x, 22, 8, 6); }
    // deep shadowed verandah behind columns
    ctx.fillStyle = '#9fa3a6'; ctx.fillRect(34, 60, w - 68, h - 110);
    archWindow(ctx, 70, 92, 116, 200, '#f4f1ea', '#41484d');
    // paired columns with capitals
    for (const cx of [18, 38, w - 38, w - 18]) {
      ctx.fillStyle = '#fbfaf6'; ctx.fillRect(cx - 7, 44, 14, h - 90);
      ctx.fillStyle = '#d9d4ca'; ctx.fillRect(cx + 3, 44, 4, h - 90);
      ctx.fillStyle = '#efebe3'; ctx.fillRect(cx - 10, 38, 20, 10); ctx.fillRect(cx - 10, h - 50, 20, 8);
    }
    ctx.fillStyle = '#e9e4da'; ctx.fillRect(0, 50, w, 6);
  });
}

function stoneTex() {
  return canvasTex('granite', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#b8ab8f'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${60 + Math.random() * 80},${50 + Math.random() * 60},${40 + Math.random() * 40},0.15)`; ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    ctx.strokeStyle = 'rgba(60,50,40,0.25)';
    for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x < w; x += 64) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke(); } }
  });
}

/** gopuram tier: rows of painted sculpture niches (stylised, not specific deities) */
function gopuramTex() {
  return canvasTex('gopuram', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e9d9b2'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c99b55'; ctx.fillRect(0, h - 18, w, 18); ctx.fillRect(0, 0, w, 8);
    const cols = ['#b5462f', '#2f6f8f', '#3f8b4f', '#d0a02f', '#8b3f8b', '#d26a3a'];
    for (let i = 0; i < 8; i++) {
      const x = 8 + i * 31;
      ctx.fillStyle = '#7a5a3a'; ctx.fillRect(x, 18, 24, h - 44);
      ctx.fillStyle = cols[(i * 5) % cols.length];
      ctx.beginPath(); ctx.ellipse(x + 12, 46, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x + 6, 54, 12, 30);
      ctx.fillStyle = '#f0c987'; ctx.beginPath(); ctx.arc(x + 12, 34, 5, 0, Math.PI * 2); ctx.fill();
      // kudu arch over niche
      ctx.strokeStyle = '#f3e7c7'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 12, 26, 12, Math.PI, 0); ctx.stroke();
    }
  });
}

function houseWallTex(seed) {
  const limes = ['#efe6cf', '#f1dfb8', '#e7efe0', '#f0d8cf', '#e3e9ee'];
  const lime = limes[Math.floor(seed * limes.length)];
  return canvasTex('house-' + lime, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = lime; ctx.fillRect(0, 0, w, h);
    // red-oxide & ochre dado stripes (kaavi) at the base of traditional walls
    ctx.fillStyle = '#9b3b26'; ctx.fillRect(0, h - 22, w, 22);
    ctx.fillStyle = '#efe6cf'; ctx.fillRect(0, h - 26, w, 4);
    ctx.fillStyle = '#c78f2c'; ctx.fillRect(0, h - 30, w, 4);
    for (let i = 0; i < 200; i++) { ctx.fillStyle = 'rgba(0,0,0,0.03)'; ctx.fillRect(Math.random() * w, Math.random() * (h - 30), 3, 3); }
  });
}

function clockTex() {
  return canvasTex('clock', 256, 256, (ctx, w) => {
    ctx.fillStyle = '#efe7d6'; ctx.fillRect(0, 0, w, w);
    ctx.fillStyle = '#fbf8f0'; ctx.beginPath(); ctx.arc(128, 128, 104, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 6; ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.lineWidth = i % 3 ? 3 : 7; ctx.beginPath(); ctx.moveTo(128 + Math.cos(a) * 82, 128 + Math.sin(a) * 82); ctx.lineTo(128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96); ctx.stroke(); }
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128, 62); ctx.stroke();
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(176, 150); ctx.stroke();
  }, false);
}

// ---------------------------------------------------------------- geometry helpers
/** box whose UVs are measured in "bays" (u) and "storeys" (v) so facade textures tile correctly */
function bayBox(w, h, d, bayW, storeyH) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, nrm = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
    const faceW = ny > 0.5 ? w : nx > 0.5 ? d : w;
    const faceH = ny > 0.5 ? d : h;
    uv.setXY(i, (uv.getX(i) * faceW) / bayW, (uv.getY(i) * faceH) / storeyH);
  }
  return g;
}

/** walls for an arbitrary OSM footprint (with courtyards), UVs in bays/storeys */
function footprintWalls(rings, y0, y1, bayW, storeyH) {
  const pos = [], nor = [], uv = [];
  for (const ring of rings) {
    let u = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
      if (L < 0.05) continue;
      const nx = -dz / L, nz = dx / L;
      const q = [[a[0], y0, a[1], u, 0], [b[0], y0, b[1], u + L, 0], [b[0], y1, b[1], u + L, y1 - y0], [a[0], y1, a[1], u, y1 - y0]];
      for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(q[k][0], q[k][1], q[k][2]); nor.push(nx, 0, nz); uv.push(q[k][3] / bayW, q[k][4] / storeyH); }
      u += L;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

function footprintRoof(outer, holes, y) {
  const contour = outer.map(([x, z]) => new THREE.Vector2(x, z));
  const hs = (holes || []).map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
  const tris = THREE.ShapeUtils.triangulateShape(contour, hs);
  const all = contour.concat(...hs);
  const pos = [];
  for (const t of tris) {
    const a = all[t[0]], b = all[t[1]], c = all[t[2]];
    const up = (b.y - a.y) * (c.x - a.x) - (b.x - a.x) * (c.y - a.y);
    for (const k of up >= 0 ? [t[0], t[1], t[2]] : [t[0], t[2], t[1]]) pos.push(all[k].x, y, all[k].y);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  return g;
}

/** 4-sided pyramid spire with optional flare */
function spire(w, h, flare = 1.15) {
  const g = new THREE.CylinderGeometry(0, (w / 2) * Math.SQRT2 * flare, h, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(0, h / 2, 0);
  return g;
}
/** bell-shaped (ogee) turret roof, like Central's corner pavilions */
function bellRoof(r, h, sides = 4) {
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const rad = r * (1 - t) * (1 + 0.35 * Math.sin(t * Math.PI));
    pts.push(new THREE.Vector2(Math.max(rad, 0.001), t * h));
  }
  const g = new THREE.LatheGeometry(pts, sides);
  if (sides === 4) g.rotateY(Math.PI / 4);
  return g;
}
function dome(r, sides = 20) {
  const pts = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; const a = t * Math.PI * 0.5; pts.push(new THREE.Vector2(Math.max(Math.cos(a) * r * (1 + 0.08 * Math.sin(t * Math.PI)), 0.001), Math.sin(a) * r * 1.15)); }
  return new THREE.LatheGeometry(pts, sides);
}
function railing(w, d, y, post = 0.25, h = 1.0) {
  const geos = [];
  for (const [x, z, sx, sz] of [[0, d / 2, w, post], [0, -d / 2, w, post], [w / 2, 0, post, d], [-w / 2, 0, post, d]]) {
    const g = new THREE.BoxGeometry(sx, post, sz); g.translate(x, y + h, z); geos.push(g);
  }
  const n = Math.max(2, Math.round(w / 1.2));
  for (let i = 0; i <= n; i++) for (const s of [-1, 1]) {
    const g1 = new THREE.BoxGeometry(post, h, post); g1.translate(-w / 2 + (i / n) * w, y + h / 2, (s * d) / 2); geos.push(g1);
    const g2 = new THREE.BoxGeometry(post, h, post); g2.translate((s * w) / 2, y + h / 2, -d / 2 + (i / n) * d); geos.push(g2);
  }
  return mergeGeometries(geos);
}

/** oriented bounding box of a footprint (min-area over edge directions) */
export function obb(ring) {
  let best = null;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const c = Math.cos(-ang), s = Math.sin(-ang);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of ring) { const u = p[0] * c - p[1] * s, v = p[0] * s + p[1] * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const area = (u1 - u0) * (v1 - v0);
    if (!best || area < best.area) {
      const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
      const ci = Math.cos(ang), si = Math.sin(ang);
      best = { area, ang, w: u1 - u0, d: v1 - v0, cx: cu * ci - cv * si, cz: cu * si + cv * ci };
    }
  }
  return best;
}

const M = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, ...o });

// ---------------------------------------------------------------- Chennai Central
function chennaiCentral() {
  const g = new THREE.Group();
  g.name = 'Chennai Central';
  const brick = M({ map: brickBayTex('central') });
  const brickPlain = M({ color: '#a8402e' });
  const white = M({ color: '#efe6d6' });
  const slate = M({ color: '#7f8890', roughness: 0.5, metalness: 0.25 });
  const roof = M({ color: '#8f8578' });
  const clock = M({ map: clockTex(), emissive: '#000000' });

  const add = (geo, mat, x, y, z, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; g.add(m); return m; };
  const block = (cx, cz, w, d, h) => {
    add(bayBox(w, h, d, 4.4, h / 2), brick, cx, h / 2, cz);
    add(new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6), white, cx, h + 0.3, cz);       // cornice
    add(new THREE.BoxGeometry(w - 0.4, 0.2, d - 0.4), roof, cx, h + 0.62, cz, false); // terrace
    add(new THREE.BoxGeometry(w + 0.2, 1.1, d + 0.2), white, cx, 0.55, cz);          // plinth
  };
  // main south range along Poonamallee High Road, and the east wing along Wall Tax Road
  block(-13, -5, 118, 18, 14);
  block(50, -46, 16, 64, 14);

  const tower = (cx, cz, w, shaftH, opts = {}) => {
    add(bayBox(w, shaftH, w, w / 2, shaftH / 4), brick, cx, shaftH / 2, cz);
    add(new THREE.BoxGeometry(w + 0.8, 0.7, w + 0.8), white, cx, shaftH * 0.52, cz);
    add(new THREE.BoxGeometry(w + 1.0, 0.9, w + 1.0), white, cx, shaftH + 0.45, cz);
    let top = shaftH + 0.9;
    if (opts.clock) {
      const ch = w * 0.9;
      add(new THREE.BoxGeometry(w * 0.92, ch, w * 0.92), brickPlain, cx, top + ch / 2, cz);
      for (let k = 0; k < 4; k++) {
        const face = new THREE.Mesh(new THREE.CircleGeometry(w * 0.33, 32), clock);
        const a = (k * Math.PI) / 2;
        face.position.set(cx + Math.sin(a) * (w * 0.46 + 0.05), top + ch / 2, cz + Math.cos(a) * (w * 0.46 + 0.05));
        face.rotation.y = a;
        g.add(face);
      }
      add(new THREE.BoxGeometry(w * 1.04, 0.6, w * 1.04), white, cx, top + ch + 0.3, cz);
      top += ch + 0.6;
    }
    if (opts.railing) { const r = new THREE.Mesh(railing(w + 0.6, w + 0.6, top - 0.4, 0.22, 0.9), white); r.position.set(cx, 0, cz); g.add(r); }
    if (opts.bell) add(bellRoof(w * 0.62, opts.roofH), slate, cx, top, cz);
    else add(spire(w * 0.96, opts.roofH), slate, cx, top, cz);
    // finial
    add(new THREE.CylinderGeometry(0.08, 0.25, 2.4, 6), white, cx, top + opts.roofH + 1.1, cz, false);
    // corner pinnacles
    if (opts.pinnacles) for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.ConeGeometry(0.55, 3.2, 4), slate, cx + sx * w * 0.5, top + 1.6, cz + sz * w * 0.5);
    return top;
  };
  // The iconic clock tower stands at the south-east corner (Wall Tax Road junction).
  tower(52, -4, 12, 28, { clock: true, roofH: 12, pinnacles: true, railing: true });
  tower(-31, -3, 10, 23, { roofH: 11, pinnacles: true, railing: true });
  tower(16, -3, 11, 19, { bell: true, roofH: 8.5, railing: true });
  tower(-73, -5, 12, 18, { bell: true, roofH: 8, railing: true });
  tower(50, -78, 11, 18, { bell: true, roofH: 7.5, railing: true });
  // small turrets punctuating the long facade
  for (const x of [-56, -44, -6, 4, 30, 40]) {
    add(new THREE.BoxGeometry(2.4, 17, 2.4), brickPlain, x, 8.5, 4.4);
    add(new THREE.ConeGeometry(1.5, 3.5, 4), slate, x, 18.6, 4.4);
  }
  // name board on the porch
  const sign = canvasTex('central-sign', 1024, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f3ead6'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1f2547'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 46px "Noto Serif Tamil", serif'; ctx.fillText('சென்னை சென்ட்ரல்', w * 0.3, h / 2 + 4);
    ctx.font = '600 44px "Fraunces", serif'; ctx.fillText('CHENNAI CENTRAL', w * 0.74, h / 2 + 2);
  }, false);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(26, 3.2), M({ map: sign }));
  board.position.set(-13, 12.2, 4.05);
  g.add(board);
  return g;
}

// ---------------------------------------------------------------- footprint landmarks
function footprintLandmark(b, { h, mat, roofMat, bayW, storeyH, cornice = M({ color: '#efe6d6' }) }) {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(footprintWalls([b.o, ...(b.hl || [])], 0, h, bayW, storeyH), mat);
  walls.castShadow = walls.receiveShadow = true;
  g.add(walls);
  const corn = new THREE.Mesh(footprintWalls([b.o], h - 0.2, h + 0.9, 1000, 1000), cornice);
  corn.castShadow = true;
  g.add(corn);
  const r = new THREE.Mesh(footprintRoof(b.o, b.hl, h + 0.9), roofMat);
  r.receiveShadow = true;
  g.add(r);
  return g;
}

/** midpoint of the footprint edge facing a direction (default: south = +z) */
function facadeMid(ring, dir = [0, 1]) {
  let best = null;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const score = (mx * dir[0] + mz * dir[1]) + L * 0.15;
    if (!best || score > best.score) best = { score, x: mx, z: mz, L, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  return best;
}

function riponBuilding(b) {
  const h = 17;
  const g = footprintLandmark(b, { h, mat: M({ map: riponBayTex(), roughness: 0.7 }), roofMat: M({ color: '#b46a52' }), bayW: 4.2, storeyH: h / 3, cornice: M({ color: '#f6f3ec' }) });
  g.name = 'Ripon Building';
  const white = M({ color: '#f7f4ee', roughness: 0.6 });
  const f = facadeMid(b.o, [0, 1]);
  const ctr = centroid(b.o);
  // tower sits just behind the south facade centre
  const inward = [ctr[0] - f.x, ctr[1] - f.z]; const il = Math.hypot(...inward);
  const tx = f.x + (inward[0] / il) * 5, tz = f.z + (inward[1] / il) * 5;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(8, 14, 8), white, tx, h + 7, tz);
  const clock = M({ map: clockTex() });
  for (let k = 0; k < 4; k++) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(2.3, 32), clock);
    const a = (k * Math.PI) / 2;
    face.position.set(tx + Math.sin(a) * 4.05, h + 10.5, tz + Math.cos(a) * 4.05);
    face.rotation.y = a;
    g.add(face);
  }
  add(new THREE.BoxGeometry(9, 0.8, 9), white, tx, h + 14.4, tz);
  add(new THREE.BoxGeometry(6, 5, 6), white, tx, h + 17.3, tz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.CylinderGeometry(0.45, 0.45, 5, 10), white, tx + sx * 3.4, h + 17.3, tz + sz * 3.4);
  add(dome(3.4, 24), white, tx, h + 19.8, tz);
  add(new THREE.CylinderGeometry(0.1, 0.25, 2.2, 6), M({ color: '#c9a24a', metalness: 0.8, roughness: 0.3 }), tx, h + 24.8, tz);
  // projecting entrance portico with arch
  const out = [-inward[0] / il, -inward[1] / il];
  const portico = add(new THREE.BoxGeometry(12, 11, 7), white, f.x + out[0] * 3, 5.5, f.z + out[1] * 3);
  portico.rotation.y = -f.ang;
  const arch = add(new THREE.BoxGeometry(5, 7, 7.2), M({ color: '#5b5f63' }), f.x + out[0] * 3.05, 3.5, f.z + out[1] * 3.05);
  arch.rotation.y = -f.ang;
  return { group: g, top: [tx, h + 25, tz] };
}

function victoriaHall(b) {
  const h = 15;
  const g = footprintLandmark(b, { h, mat: M({ map: brickBayTex('victoria') }), roofMat: M({ color: '#9d4b35' }), bayW: 4, storeyH: h / 2 });
  g.name = 'Victoria Public Hall';
  const tile = M({ color: '#b5583b', roughness: 0.85 });
  const box = obb(b.o);
  // pitched terracotta-tile roof over the oriented hall
  const roof = new THREE.Mesh(hipRoof(box.w * 0.92, box.d * 0.86, 6.5), tile);
  roof.position.set(box.cx, h + 0.9, box.cz);
  roof.rotation.y = -box.ang;
  roof.castShadow = true;
  g.add(roof);
  // the tall square tower at the east end
  const ca = Math.cos(box.ang), sa = Math.sin(box.ang);
  const ends = [[box.cx + ca * box.w * 0.42, box.cz + sa * box.w * 0.42], [box.cx - ca * box.w * 0.42, box.cz - sa * box.w * 0.42]];
  const east = ends[0][0] > ends[1][0] ? ends[0] : ends[1];
  const brick = M({ map: brickBayTex('victoria') });
  const t = new THREE.Mesh(bayBox(7.5, 30, 7.5, 3.75, 6), brick);
  t.position.set(east[0], 15, east[1]); t.rotation.y = -box.ang; t.castShadow = true; g.add(t);
  const cap = new THREE.Mesh(spire(8.2, 7, 1.1), tile);
  cap.position.set(east[0], 30, east[1]); cap.rotation.y = -box.ang; cap.castShadow = true; g.add(cap);
  return { group: g, top: [east[0], 37, east[1]] };
}

function hipRoof(w, d, h) {
  const r = Math.min(w, d) / 2;
  const hw = w / 2, hd = d / 2;
  const ridge = Math.max(0, hw - r);
  const v = [
    [-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd],
    [-ridge, h, 0], [ridge, h, 0],
  ];
  const f = [[0, 4, 5], [0, 5, 1], [1, 5, 2], [2, 5, 4], [2, 4, 3], [3, 4, 0]];
  const pos = [];
  for (const t of f) for (const k of t) pos.push(...v[k]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // ensure outward facing: flip triangles whose normal points down
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i += 3) if (n.getY(i) < 0) { const ax = p.getX(i + 1), ay = p.getY(i + 1), az = p.getZ(i + 1); p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, ax, ay, az); }
  g.computeVertexNormals();
  return g;
}

function southernRailwayHQ(b) {
  const h = 20;
  const g = footprintLandmark(b, { h, mat: M({ map: brickBayTex('central') }), roofMat: M({ color: '#8f8578' }), bayW: 4.2, storeyH: h / 3 });
  g.name = 'Southern Railway Headquarters';
  const white = M({ color: '#efe6d6' });
  const box = obb(b.o);
  const ca = Math.cos(box.ang), sa = Math.sin(box.ang);
  // corner chhatris
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    const x = box.cx + ca * su * box.w * 0.47 - sa * sv * box.d * 0.47;
    const z = box.cz + sa * su * box.w * 0.47 + ca * sv * box.d * 0.47;
    if (!inPoly([x, z], b.o)) continue;
    for (const ox of [-1.2, 1.2]) for (const oz of [-1.2, 1.2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3, 6), white); p.position.set(x + ox, h + 2.4, z + oz); g.add(p); }
    const d = new THREE.Mesh(dome(1.9, 16), white); d.position.set(x, h + 3.9, z); d.castShadow = true; g.add(d);
  }
  // central domed tower over the main entrance
  const f = facadeMid(b.o, [0, 1]);
  const ctr = centroid(b.o);
  const v = [ctr[0] - f.x, ctr[1] - f.z]; const vl = Math.hypot(...v);
  const tx = f.x + (v[0] / vl) * 5, tz = f.z + (v[1] / vl) * 5;
  const t = new THREE.Mesh(bayBox(9, 10, 9, 4.5, 5), M({ map: brickBayTex('central') })); t.position.set(tx, h + 5, tz); t.castShadow = true; g.add(t);
  const dd = new THREE.Mesh(dome(4.4, 24), white); dd.position.set(tx, h + 10, tz); dd.castShadow = true; g.add(dd);
  return { group: g, top: [tx, h + 16, tz] };
}

// ---------------------------------------------------------------- temples, mosque, fort
export function gopuram({ x, z, ang, w = 11, d = 7, tiers = 5 }) {
  const g = new THREE.Group();
  const base = M({ map: stoneTex() });
  const painted = M({ map: gopuramTex(), roughness: 0.9 });
  const gold = M({ color: '#d4a640', metalness: 0.7, roughness: 0.35 });
  const add = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  // granite base with the entrance passage
  add(new THREE.BoxGeometry(w, 6, d), base, 0, 3, 0);
  add(new THREE.BoxGeometry(2.6, 4.6, d + 0.1), M({ color: '#3a2e24' }), 0, 2.3, 0);
  let y = 6, cw = w * 0.96, cd = d * 0.92;
  for (let i = 0; i < tiers; i++) {
    const th = 2.5;
    const geo = new THREE.BoxGeometry(cw, th, cd);
    const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * (cw / 8));
    add(geo, painted, 0, y + th / 2, 0);
    add(new THREE.BoxGeometry(cw + 0.5, 0.35, cd + 0.5), M({ color: '#c99b55' }), 0, y + th, 0);
    y += th + 0.35; cw *= 0.84; cd *= 0.86;
  }
  // barrel-vault crown (sala) with a row of kalasams
  const vault = new THREE.CylinderGeometry(cd * 0.55, cd * 0.55, cw * 1.05, 16, 1, false, 0, Math.PI);
  vault.rotateZ(Math.PI / 2); vault.rotateX(-Math.PI / 2);
  add(vault, M({ color: '#d9b26a' }), 0, y, 0);
  const n = 5;
  for (let i = 0; i < n; i++) add(new THREE.ConeGeometry(0.32, 1.6, 8), gold, -cw * 0.42 + (i / (n - 1)) * cw * 0.84, y + cd * 0.55 + 0.7, 0);
  g.position.set(x, 0, z);
  g.rotation.y = ang;
  g.name = 'Gopuram';
  return g;
}

function mosque(b) {
  const g = new THREE.Group();
  const box = obb(b.o);
  const white = M({ color: '#f1ece0' });
  const green = M({ color: '#7fa58a', roughness: 0.6 });
  const top = b.h;
  const d = new THREE.Mesh(dome(Math.min(box.w, box.d) * 0.22, 24), green);
  d.position.set(box.cx, top, box.cz); d.castShadow = true; g.add(d);
  const ca = Math.cos(box.ang), sa = Math.sin(box.ang);
  for (const s of [-1, 1]) {
    const x = box.cx + ca * s * box.w * 0.46 + sa * box.d * 0.44, z = box.cz + sa * s * box.w * 0.46 - ca * box.d * 0.44;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, top + 10, 8), white); m.position.set(x, (top + 10) / 2, z); m.castShadow = true; g.add(m);
    const c = new THREE.Mesh(dome(1.0, 10), green); c.position.set(x, top + 10, z); g.add(c);
  }
  return g;
}

// ---------------------------------------------------------------- traditional Tamil house (thinnai house)
export function traditionalHouse({ x, z, ang, w = 9, d = 11, seed = 0.3, name = 'house' }) {
  const g = new THREE.Group();
  g.name = name;
  const wall = M({ map: houseWallTex(seed) });
  const tile = M({ color: ['#a9533a', '#b0603f', '#9b4a33'][Math.floor(seed * 3)], roughness: 0.85 });
  const wood = M({ color: '#5a3a24', roughness: 0.7 });
  const stone = M({ map: stoneTex() });
  const add = (geo, mat, px, py, pz, rot = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.y = rot; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const wallH = 4.4, plinth = 0.8;
  // raised plinth & front steps
  add(new THREE.BoxGeometry(w, plinth, d), stone, 0, plinth / 2, 0);
  for (let s = 0; s < 2; s++) add(new THREE.BoxGeometry(2.4, 0.4, 0.6), stone, 0, 0.2 + s * 0.4, d / 2 + 0.9 - s * 0.6);
  // main body set back to make room for the verandah
  const bodyD = d - 2.8;
  const bodyGeo = new THREE.BoxGeometry(w, wallH, bodyD);
  const uv = bodyGeo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 2, uv.getY(k));
  add(bodyGeo, wall, 0, plinth + wallH / 2, -1.4);
  // thinnai: raised sit-out platforms either side of the door
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(w * 0.34, 0.7, 2.2), M({ color: '#d9cdb5' }), s * w * 0.3, plinth + 0.35, d / 2 - 1.4);
  // door & windows
  add(new THREE.BoxGeometry(1.5, 2.6, 0.2), wood, 0, plinth + 1.3, bodyD / 2 - 1.3);
  add(new THREE.BoxGeometry(1.9, 0.25, 0.25), M({ color: '#c9a24a' }), 0, plinth + 2.75, bodyD / 2 - 1.28);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(1.1, 1.2, 0.18), M({ color: '#2f4a3c' }), s * w * 0.3, plinth + 2.1, bodyD / 2 - 1.3);
  // verandah pillars
  for (const s of [-1, -0.34, 0.34, 1]) add(new THREE.CylinderGeometry(0.16, 0.2, 2.9, 8), wood, s * (w / 2 - 0.4), plinth + 1.45, d / 2 - 0.3);
  // sloping verandah roof + main gable roof in Mangalore tile
  const vr = add(new THREE.BoxGeometry(w + 0.6, 0.22, 3.2), tile, 0, plinth + 3.35, d / 2 - 1.1);
  vr.rotation.x = 0.28;
  const roofGeo = hipRoof(w + 0.8, bodyD + 0.8, 2.6);
  add(roofGeo, tile, 0, plinth + wallH, -1.4);
  g.position.set(x, 0, z);
  g.rotation.y = ang;
  return g;
}

// ---------------------------------------------------------------- assemble
export function buildLandmarks(city) {
  const group = new THREE.Group();
  const byId = new Map(city.buildings.map((b) => [b.id, b]));
  const anchors = {};

  // Chennai Central — the real heritage building is not mapped as an OSM footprint,
  // so its masses are placed from the mapped concourse, porch canopy and kerb lines.
  const central = chennaiCentral();
  group.add(central);
  anchors.central = { pos: [52, 50, -4], focus: [5, 10, -20] };

  const rip = byId.get(60184); if (rip) { const r = riponBuilding(rip); group.add(r.group); anchors.ripon = { pos: r.top, focus: centroid(rip.o) }; }
  const vic = byId.get(23885061); if (vic) { const v = victoriaHall(vic); group.add(v.group); anchors.victoria = { pos: v.top, focus: centroid(vic.o) }; }
  const sr = byId.get(60175); if (sr) { const s = southernRailwayHQ(sr); group.add(s.group); anchors.srhq = { pos: s.top, focus: centroid(sr.o) }; }
  const msq = byId.get(165856075); if (msq) group.add(mosque(msq));

  // gopurams: Ekambareswarar (mapped footprint) and Kandha Kottam (mapped as a point)
  const ek = byId.get(217845704);
  if (ek) {
    const box = obb(ek.o);
    const ca = Math.cos(box.ang), sa = Math.sin(box.ang);
    const ends = [[box.cx + ca * box.w * 0.5, box.cz + sa * box.w * 0.5], [box.cx - ca * box.w * 0.5, box.cz - sa * box.w * 0.5]];
    const e = ends[0][0] > ends[1][0] ? ends[0] : ends[1]; // temples traditionally face east
    group.add(gopuram({ x: e[0], z: e[1], ang: -box.ang + Math.PI / 2, w: 10, d: 6.5, tiers: 4 }));
    anchors.ekambareswarar = { pos: [e[0], 22, e[1]], focus: [box.cx, 0, box.cz] };
  }
  return { group, anchors };
}

export function nearestRoad(city, pt, filter = (r) => !/footway|path|steps/.test(r.c)) {
  let best = null;
  for (const r of city.roads) {
    if (!filter(r)) continue;
    const n = nearestOnLine(pt, r.p);
    if (!best || n.d < best.d) best = { ...n, road: r };
  }
  return best;
}

/**
 * Pick a real OSM building near `target` that fronts a residential lane, to be re-rendered
 * as a traditional house. Returns {b, front:[x,z], ang, w, d} or null.
 */
export function pickHouse(city, target, used = new Set(), maxR = 120) {
  const cands = [];
  for (const b of city.buildings) {
    if (used.has(b.id) || b.n || b.k !== 'yes' || b.a < 45 || b.a > 260) continue;
    const c = centroid(b.o);
    const d = Math.hypot(c[0] - target[0], c[1] - target[1]);
    if (d > maxR) continue;
    cands.push({ b, c, d });
  }
  cands.sort((a, b) => a.d - b.d);
  for (const { b, c } of cands.slice(0, 60)) {
    const road = nearestRoad(city, c, (r) => /residential|living_street|unclassified|tertiary|service/.test(r.c));
    if (!road || road.d > 22) continue;
    // a story house must be visible from its lane: skip spots boxed in by tall neighbours
    const tallNear = city.buildings.some((o) => o !== b && o.h > 8 && Math.hypot(centroid(o.o)[0] - c[0], centroid(o.o)[1] - c[1]) < 18);
    if (tallNear) continue;
    const box = obb(b.o);
    const ang = Math.atan2(road.p[0] - c[0], road.p[1] - c[1]); // face the lane
    const w = Math.max(6, Math.min(11, Math.min(box.w, box.d)));
    const d = Math.max(7, Math.min(14, Math.max(box.w, box.d)));
    return { b, c, road, ang, w, d, front: [c[0] + Math.sin(ang) * (d / 2 + 2.4), c[1] + Math.cos(ang) * (d / 2 + 2.4)], seed: hash(b.id) };
  }
  return null;
}

/** exclusion zone so OSM boxes don't poke through the hand-built Central */
export const CENTRAL_ZONE = (b, c) => c[0] > -84 && c[0] < 62 && c[1] > -86 && c[1] < 8 && b.k !== 'roof' && b.k !== 'train_station';
export const LANDMARK_IDS = new Set([60184, 23885061, 60175]);

export { bboxOf };
