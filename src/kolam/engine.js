/**
 * KOLAM ENGINE
 * -------------------------------------------------------------------------
 * Sikku (சிக்கு) kolams — one or more lines that weave around a grid of dots without
 * ever touching them — are modelled with MIRROR CURVES (P. Gerdes; see also G. Siromoney's
 * work on kolam "picture languages"). Every dot sits in a cell; the line travels
 * diagonally between the midpoints of cell edges. At each edge it either crosses
 * straight through, or reflects off a "mirror" placed on that edge. The outer border
 * always reflects. Choosing which inner edges carry mirrors determines the design —
 * and whether the kolam is drawn as a single unbroken line.
 *
 * Coordinates: "grid units" — dot (col i, row j) sits at (i + 0.5, j + 0.5).
 * Internally the tracer uses doubled integer coordinates: dot centres at (2i+1, 2j+1),
 * vertical-edge midpoints at (2i, 2j+1), horizontal-edge midpoints at (2i+1, 2j).
 */

export function makeGrid(size, shape = 'square', rows = size) {
  const cols = size;
  const dots = [];
  const has = new Set();
  const r = (size - 1) / 2;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (shape === 'diamond' && Math.abs(i - r) + Math.abs(j - (rows - 1) / 2) > r + 1e-6) continue;
    dots.push([i, j]); has.add(i + ',' + j);
  }
  return { cols, rows, shape, dots, has: (i, j) => has.has(i + ',' + j) };
}

/** edge key in doubled coords */
const ek = (x, y) => x + ',' + y;

/** every inner edge (between two dots) — the places a mirror can go */
export function innerEdges(grid) {
  const out = [];
  for (const [i, j] of grid.dots) {
    if (grid.has(i + 1, j)) out.push([2 * i + 2, 2 * j + 1]);
    if (grid.has(i, j + 1)) out.push([2 * i + 1, 2 * j + 2]);
  }
  return out;
}

function edgeCells(x, y) {
  // vertical edge (x even): cells (x/2-1, (y-1)/2) and (x/2, (y-1)/2)
  if (x % 2 === 0) return [[x / 2 - 1, (y - 1) / 2], [x / 2, (y - 1) / 2], 'v'];
  return [[(x - 1) / 2, y / 2 - 1], [(x - 1) / 2, y / 2], 'h'];
}

/** trace all closed mirror curves. mirrors: Set of edge keys. Returns array of loops of [x,y] (doubled coords) */
export function traceCurves(grid, mirrors) {
  const visited = new Set();
  const curves = [];
  const isDot = (c) => grid.has(c[0], c[1]);
  const reflects = (x, y) => {
    const [a, b] = edgeCells(x, y);
    const da = isDot(a), db = isDot(b);
    if (da !== db) return true;          // boundary
    return mirrors.has(ek(x, y));
  };
  const segKey = (x, y, dx, dy) => (2 * x + dx) + ':' + (2 * y + dy);
  for (const [i, j] of grid.dots) {
    // the four corner segments of this cell, each starting at a vertical-edge midpoint
    for (const [sx, sy, dx, dy] of [[2 * i, 2 * j + 1, 1, 1], [2 * i, 2 * j + 1, 1, -1], [2 * i + 2, 2 * j + 1, -1, 1], [2 * i + 2, 2 * j + 1, -1, -1]]) {
      if (visited.has(segKey(sx, sy, dx, dy))) continue;
      const pts = [];
      let x = sx, y = sy, vx = dx, vy = dy, guard = 0;
      do {
        visited.add(segKey(x, y, vx, vy));
        pts.push([x, y]);
        x += vx; y += vy;
        if (reflects(x, y)) { if (x % 2 === 0) vx = -vx; else vy = -vy; }
        guard++;
      } while ((x !== sx || y !== sy || vx !== dx || vy !== dy) && guard < 20000);
      // a closed curve's segments are also visited in the opposite direction by definition
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k], b = pts[(k + 1) % pts.length];
        visited.add(segKey(b[0], b[1], a[0] - b[0], a[1] - b[1]));
      }
      if (pts.length > 2) curves.push(pts);
    }
  }
  return curves;
}

/** convert a doubled-coord loop into a smooth sampled polyline in grid units */
export function smoothLoop(loop, samples = 7) {
  const n = loop.length, out = [];
  const P = (k) => loop[((k % n) + n) % n].map((v) => v / 2);
  for (let k = 0; k < n; k++) {
    const a = P(k - 1), b = P(k), c = P(k + 1);
    const m0 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m1 = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
    // straight crossings stay straight; reflections become rounded quadratic arcs
    for (let s = 0; s < samples; s++) {
      const t = s / samples, u = 1 - t;
      out.push([u * u * m0[0] + 2 * u * t * b[0] + t * t * m1[0], u * u * m0[1] + 2 * u * t * b[1] + t * t * m1[1]]);
    }
  }
  out.push(out[0].slice());
  return out;
}

/** symmetric images of an inner-edge mirror under the grid's symmetry */
export function symmetricEdges([x, y], grid, sym) {
  const W = grid.cols * 2, H = grid.rows * 2;
  const set = new Map();
  const add = (a, b) => { if (a >= 0 && b >= 0 && a <= W && b <= H) set.set(ek(a, b), [a, b]); };
  add(x, y);
  if (sym === 'h' || sym === 'hv' || sym === 'r4' || sym === 'r8') add(W - x, y);
  if (sym === 'v' || sym === 'hv' || sym === 'r4' || sym === 'r8') add(x, H - y);
  if (sym === 'hv' || sym === 'r4' || sym === 'r8') add(W - x, H - y);
  if ((sym === 'r4' || sym === 'r8') && W === H) { add(y, x); add(W - y, x); add(y, H - x); add(W - y, H - x); }
  return [...set.values()];
}

/** apply symmetry to a polyline in grid units */
export function symmetricStrokes(pts, grid, sym) {
  const cx = grid.cols / 2, cy = grid.rows / 2;
  const out = [pts];
  const map = (f) => out.push(pts.map(([x, y]) => f(x - cx, y - cy)).map(([x, y]) => [x + cx, y + cy]));
  if (sym === 'h' || sym === 'hv') map((x, y) => [-x, y]);
  if (sym === 'v' || sym === 'hv') map((x, y) => [x, -y]);
  if (sym === 'hv') map((x, y) => [-x, -y]);
  if (sym === 'r4' || sym === 'r8') {
    const n = sym === 'r4' ? 4 : 8;
    for (let k = 1; k < n; k++) { const a = (k * Math.PI * 2) / n, c = Math.cos(a), s = Math.sin(a); map((x, y) => [x * c - y * s, x * s + y * c]); }
  }
  return out;
}

/** seeded RNG */
function rnd(seed) { let s = seed >>> 0 || 7; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }

/**
 * Search for a symmetric mirror arrangement that draws the kolam as ONE unbroken line
 * (a "kambi" / single-line sikku). Toggling a mirror at a crossing either merges two
 * curves or splits one — so a greedy walk over symmetric orbits converges quickly.
 */
export function generateSikku(grid, { sym = 'r4', seed = 1, target = 1, density = 0.3 } = {}) {
  // Start with a mirror on every inner edge: each dot is wrapped by its own small loop.
  // Opening a mirror between two DIFFERENT loops merges them into one (a crossing appears);
  // opening one inside the SAME loop would split it. So we open edges only when they merge —
  // effectively growing a spanning tree of crossings — until `target` loops remain.
  // Edges are opened in symmetry orbits so the finished kolam keeps its symmetry; if the
  // symmetric search can't reach the target we relax to 2-fold, then to single edges.
  const edges = innerEdges(grid);
  const edgeSet = new Set(edges.map((e) => ek(...e)));
  const orbitsFor = (s) => {
    const seen = new Set(), orbits = [];
    for (const e of edges) {
      const k = ek(...e); if (seen.has(k)) continue;
      const orb = symmetricEdges(e, grid, s).filter(([x, y]) => edgeSet.has(ek(x, y)));
      orb.forEach((o) => seen.add(ek(...o)));
      if (orb.length) orbits.push(orb);
    }
    return orbits;
  };
  let best = null;
  for (let attempt = 0; attempt < 6 && !(best && best.count === target); attempt++) {
    const R = rnd(seed * 7919 + attempt * 104729);
    const mirrors = new Set(edgeSet);
    let count = traceCurves(grid, mirrors).length;
    const toggle = (orb) => { const on = mirrors.has(ek(...orb[0])); orb.forEach((o) => (on ? mirrors.delete(ek(...o)) : mirrors.add(ek(...o)))); };
    for (const s of [sym, 'hv', 'none']) {
      const orbits = orbitsFor(s);
      for (let pass = 0; pass < 4 && count > target; pass++) {
        for (let i = orbits.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [orbits[i], orbits[j]] = [orbits[j], orbits[i]]; }
        let improved = false;
        // prefer opening crossings first (pass 0), then allow adding mirrors at crossings
        for (const orb of orbits) {
          if (count <= target) break;
          if (pass === 0 && !mirrors.has(ek(...orb[0]))) continue;
          toggle(orb);
          const c2 = traceCurves(grid, mirrors).length;
          if (c2 < count && c2 >= target) { count = c2; improved = true; } else toggle(orb);
        }
        if (!improved && pass > 0) break;
      }
      if (count <= target) break;
    }
    // optional extra character: pairs of symmetric openings that keep the loop count
    if (density > 0.3) {
      for (const orb of orbitsFor(sym)) {
        if (R() > density - 0.3 || !mirrors.has(ek(...orb[0]))) continue;
        orb.forEach((o) => mirrors.delete(ek(...o)));
        if (traceCurves(grid, mirrors).length !== count) orb.forEach((o) => mirrors.add(ek(...o)));
      }
    }
    if (!best || Math.abs(count - target) < Math.abs(best.count - target)) best = { mirrors, count };
  }
  return best;
}

// --------------------------------------------------------------------- the design model
export class Kolam {
  constructor({ size = 5, rows, shape = 'square', mirrors = [], strokes = [], style = {} } = {}) {
    this.size = size; this.shape = shape; this.rowsN = rows || size;
    this.grid = makeGrid(size, shape, this.rowsN);
    this.mirrors = new Set(mirrors);
    this.strokes = strokes;   // [{type:'free'|'line', pts:[[x,y]...], color?, group?}]
    this.sikkuOn = mirrors.length > 0 || strokes.length === 0;
    this.style = { line: '#f6f1e6', bg: '#5a3a2c', width: 5, multicolor: false, colors: null, flowers: false, diyas: false, dots: true, ...style };
  }
  toJSON() { return { v: 1, size: this.size, rows: this.rowsN, shape: this.shape, mirrors: [...this.mirrors], strokes: this.strokes, style: this.style, sikkuOn: this.sikkuOn }; }
  static fromJSON(j) { const k = new Kolam(j); k.sikkuOn = j.sikkuOn ?? true; return k; }

  /** ordered list of drawable paths (grid units) — sikku curves first, then strokes */
  paths() {
    const out = [];
    if (this.sikkuOn) {
      const loops = traceCurves(this.grid, this.mirrors);
      // draw order: start from the loop nearest the top-left, like a hand would
      loops.sort((a, b) => Math.min(...a.map((p) => p[0] + p[1] * 1.3)) - Math.min(...b.map((p) => p[0] + p[1] * 1.3)));
      loops.forEach((l, i) => out.push({ pts: smoothLoop(l), color: this.style.multicolor && this.style.colors ? this.style.colors[i % this.style.colors.length] : null, kind: 'sikku' }));
    }
    for (const s of this.strokes) out.push({ pts: s.type === 'free' ? catmull(s.pts) : s.pts, color: s.color || null, kind: s.type, width: s.width });
    for (const p of out) { let L = 0; for (let i = 1; i < p.pts.length; i++) L += Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1]); p.length = L; }
    return out;
  }
}

/** Catmull-Rom smoothing for freehand strokes */
export function catmull(pts, seg = 6) {
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts.at(-1));
  return out;
}

/** simplify freehand input (RDP) */
export function simplify(pts, eps = 0.04) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts.at(-1)];
  let dmax = 0, idx = 0;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L; if (d > dmax) { dmax = d; idx = i; } }
  if (dmax > eps) return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
  return [a, b];
}

// --------------------------------------------------------------------- rendering
/**
 * Draw a kolam onto a 2D canvas context.
 * progress: 0..1 of total drawn length (for stroke-by-stroke playback). Returns {tip}.
 */
export function renderKolam(ctx, kolam, { size, progress = 1, showDots = kolam.style.dots, highlightEdge = null, showMirrors = false, transparent = false, paths = null } = {}) {
  const S = size;
  const g = kolam.grid;
  const span = Math.max(g.cols, g.rows);
  const margin = S * 0.08;
  const unit = (S - margin * 2) / span;
  const ox = margin + ((span - g.cols) * unit) / 2, oy = margin + ((span - g.rows) * unit) / 2;
  const X = (x) => ox + x * unit, Y = (y) => oy + y * unit;
  const st = kolam.style;

  ctx.save();
  if (!transparent) {
    ctx.fillStyle = st.bg; ctx.fillRect(0, 0, S, S);
    // ground texture: faint mottling like a wiped, wet earthen threshold
    const grd = ctx.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S * 0.75);
    grd.addColorStop(0, 'rgba(255,255,255,0.05)'); grd.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, S, S);
  } else ctx.clearRect(0, 0, S, S);

  const all = paths || kolam.paths();
  const total = all.reduce((s, p) => s + p.length, 0) || 1;
  let budget = progress * total;
  const lw = (st.width / 5) * unit * 0.085;

  // dots (pulli)
  if (showDots) {
    ctx.fillStyle = st.line;
    for (const [i, j] of g.dots) { ctx.beginPath(); ctx.arc(X(i + 0.5), Y(j + 0.5), Math.max(1.6, lw * 0.75), 0, Math.PI * 2); ctx.fill(); }
  }
  if (showMirrors) {
    ctx.strokeStyle = 'rgba(201,162,74,0.85)'; ctx.lineWidth = Math.max(1.5, unit * 0.05); ctx.lineCap = 'round';
    for (const k of kolam.mirrors) {
      const [x, y] = k.split(',').map(Number);
      const hx = x / 2, hy = y / 2;
      ctx.beginPath();
      if (x % 2 === 0) { ctx.moveTo(X(hx), Y(hy - 0.32)); ctx.lineTo(X(hx), Y(hy + 0.32)); } else { ctx.moveTo(X(hx - 0.32), Y(hy)); ctx.lineTo(X(hx + 0.32), Y(hy)); }
      ctx.stroke();
    }
  }
  if (highlightEdge) {
    const [x, y] = highlightEdge; ctx.fillStyle = 'rgba(201,162,74,0.55)';
    ctx.beginPath(); ctx.arc(X(x / 2), Y(y / 2), unit * 0.14, 0, Math.PI * 2); ctx.fill();
  }

  // lines: rice-flour look = soft under-stroke + crisp core
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let tip = null;
  for (const p of all) {
    if (budget <= 0) break;
    const color = p.color || st.line;
    const pts = p.pts;
    const draw = (w, alpha, col) => {
      ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
      let rem = budget;
      for (let i = 1; i < pts.length; i++) {
        const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (rem >= d) { ctx.lineTo(X(pts[i][0]), Y(pts[i][1])); rem -= d; }
        else { const t = rem / d; const tx = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, ty = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t; ctx.lineTo(X(tx), Y(ty)); tip = [X(tx), Y(ty)]; rem = 0; break; }
      }
      ctx.stroke();
    };
    const w = (p.width ? (p.width / 5) * unit * 0.085 : lw);
    draw(w * 2.1, 0.16, color);
    draw(w, 0.95, color);
    budget -= p.length;
  }
  ctx.globalAlpha = 1;

  // decorations appear once the drawing is complete
  if (progress >= 0.999) {
    if (st.flowers) for (const [k, [i, j]] of g.dots.entries()) {
      if ((i + j) % 2) continue;
      flower(ctx, X(i + 0.5), Y(j + 0.5), unit * 0.17, k % 3 === 0 ? '#f0a020' : '#fbf7ee');
    }
    if (st.diyas) for (const [cx, cy] of [[0.25, 0.25], [g.cols - 0.25, 0.25], [0.25, g.rows - 0.25], [g.cols - 0.25, g.rows - 0.25]]) diya(ctx, X(cx), Y(cy), unit * 0.32);
  }
  if (tip && progress < 1) {
    const rg = ctx.createRadialGradient(tip[0], tip[1], 0, tip[0], tip[1], lw * 6);
    rg.addColorStop(0, 'rgba(255,240,200,0.95)'); rg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(tip[0], tip[1], lw * 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  return { tip, unit, ox, oy, total };
}

function flower(ctx, x, y, r, col) {
  ctx.save(); ctx.translate(x, y);
  for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(r * 0.55, 0, r * 0.5, r * 0.26, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#e0a526'; ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function diya(ctx, x, y, r) {
  ctx.save(); ctx.translate(x, y);
  const glow = ctx.createRadialGradient(0, -r * 0.4, 0, 0, -r * 0.4, r * 1.6);
  glow.addColorStop(0, 'rgba(255,190,90,0.6)'); glow.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -r * 0.4, r * 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9c4a2f'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.32, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#c0603f'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 0.05); ctx.quadraticCurveTo(r * 0.75, -r * 0.6, r * 0.5, -r * 0.95); ctx.quadraticCurveTo(r * 0.3, -r * 0.5, r * 0.45, -r * 0.05); ctx.fill();
  ctx.restore();
}

/** SVG export: true vector paths */
export function kolamToSVG(kolam, size = 1024) {
  const g = kolam.grid, st = kolam.style;
  const span = Math.max(g.cols, g.rows), margin = size * 0.08, unit = (size - margin * 2) / span;
  const ox = margin + ((span - g.cols) * unit) / 2, oy = margin + ((span - g.rows) * unit) / 2;
  const X = (x) => (ox + x * unit).toFixed(2), Y = (y) => (oy + y * unit).toFixed(2);
  const lw = ((st.width / 5) * unit * 0.085).toFixed(2);
  const paths = kolam.paths().map((p) => `<path d="M${p.pts.map(([x, y]) => X(x) + ' ' + Y(y)).join(' L')}" stroke="${p.color || st.line}" stroke-width="${p.width ? ((p.width / 5) * unit * 0.085).toFixed(2) : lw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('\n  ');
  const dots = st.dots ? g.dots.map(([i, j]) => `<circle cx="${X(i + 0.5)}" cy="${Y(j + 0.5)}" r="${Math.max(1.6, lw * 0.75)}" fill="${st.line}"/>`).join('') : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <title>Kolam — made in Namma Chennai Kolam Studio</title>
  <rect width="100%" height="100%" fill="${st.bg}"/>
  ${dots}
  ${paths}
</svg>`;
}
