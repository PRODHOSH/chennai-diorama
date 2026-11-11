import { Kolam, renderKolam, kolamToSVG, symmetricEdges, symmetricStrokes, simplify, generateSikku } from './engine.js';
import { PRESETS, CATEGORIES, PALETTES, presetKolam } from './presets.js';
import { toast, state } from '../core/state.js';

const $ = (s) => document.querySelector(s);

export class KolamStudio {
  constructor({ onPlace, getSlots, onShare }) {
    this.onPlace = onPlace; this.getSlots = getSlots; this.onShare = onShare;
    this.el = $('#studio');
    this.canvas = $('#k-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.tool = 'sikku';
    this.sym = 'none';
    this.snap = true;
    this.undoStack = []; this.redoStack = [];
    this.progress = 1; this.playing = false; this.speed = 1;
    this.filter = 'all';
    this.kolam = presetKolam('sikku-5-diamond');
    this.activePreset = 'sikku-5-diamond';
    this.built = false;
  }

  open(presetId) {
    if (!this.built) this.build();
    if (presetId) this.loadPreset(presetId, true);
    this.el.hidden = false;
    document.body.style.overflow = 'hidden';
    this.resize();
    this.render();
    this.prevFocus = document.activeElement;
    setTimeout(() => this.el.querySelector('[data-tool="sikku"]').focus(), 50);
    if (presetId) this.play(true);
  }
  close() {
    this.el.hidden = true; this.pause();
    this.prevFocus?.focus?.();
  }
  isOpen() { return !this.el.hidden; }

  build() {
    this.built = true;
    // tools
    this.el.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => this.setTool(b.dataset.tool)));
    $('#k-undo').onclick = () => this.undo();
    $('#k-redo').onclick = () => this.redo();
    $('#k-clear').onclick = () => { this.snapshot(); this.kolam.mirrors.clear(); this.kolam.strokes = []; this.kolam.sikkuOn = true; this.progress = 1; this.render(); this.updateAbout(null); };
    $('#studio-close').onclick = () => this.close();
    // grid
    const gs = $('#grid-sizes');
    for (const n of [3, 5, 7, 9, 11]) {
      const b = document.createElement('button'); b.textContent = `${n}×${n}`; b.dataset.n = n; b.setAttribute('aria-pressed', 'false');
      b.onclick = () => this.setGrid(n, $('#g-shape').value);
      gs.appendChild(b);
    }
    $('#g-shape').onchange = (e) => this.setGrid(this.kolam.size, e.target.value);
    $('#g-custom').onchange = (e) => { const n = Math.max(2, Math.min(17, +e.target.value || 5)); this.setGrid(n, $('#g-shape').value); };
    $('#g-show').onchange = (e) => { this.kolam.style.dots = e.target.checked; this.render(); };
    $('#g-snap').onchange = (e) => { this.snap = e.target.checked; };
    $('#g-generate').onclick = () => {
      this.snapshot();
      const { mirrors } = generateSikku(this.kolam.grid, { sym: 'r4', seed: (Math.random() * 1e6) | 0, density: 0.3 + Math.random() * 0.2 });
      this.kolam.mirrors = mirrors; this.kolam.strokes = []; this.kolam.sikkuOn = true;
      this.activePreset = null; this.updateAbout({ name: 'Your woven kambi', ta: 'கம்பிக் கோலம்', cat: 'sikku', auth: 'Generated', about: `A fresh single-line pattern on your ${this.kolam.size} × ${this.kolam.size} ${this.kolam.shape} grid, found by the mirror-curve search. Click between dots to bend it your own way.` });
      this.renderPresets(); this.play(true);
    };
    // symmetry
    this.el.querySelectorAll('[data-sym]').forEach((b) => b.addEventListener('click', () => {
      this.sym = b.dataset.sym;
      this.el.querySelectorAll('[data-sym]').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      this.hint();
    }));
    // palettes
    const pal = $('#palettes');
    for (const p of PALETTES) {
      const b = document.createElement('button');
      b.innerHTML = `<i style="background:${p.bg};--fg:${p.multicolor ? p.colors[0] : p.line}"></i>${p.name}`;
      b.dataset.pal = p.id; b.title = p.name; b.setAttribute('aria-pressed', 'false');
      b.onclick = () => this.applyPalette(p);
      pal.appendChild(b);
    }
    $('#c-line').oninput = (e) => { this.kolam.style.line = e.target.value; this.kolam.style.multicolor = false; this.render(); };
    $('#c-bg').oninput = (e) => { this.kolam.style.bg = e.target.value; this.render(); };
    $('#c-width').oninput = (e) => { this.kolam.style.width = +e.target.value; this.render(); };
    $('#d-flowers').onchange = (e) => { this.kolam.style.flowers = e.target.checked; this.render(); };
    $('#d-diyas').onchange = (e) => { this.kolam.style.diyas = e.target.checked; this.render(); };
    // playback
    $('#pb-play').onclick = () => (this.playing ? this.pause() : this.play());
    $('#pb-restart').onclick = () => { this.progress = 0; this.play(); };
    $('#pb-step').onclick = () => this.stepStroke();
    $('#pb-progress').oninput = (e) => { this.pause(); this.progress = e.target.value / 1000; this.render(); };
    $('#pb-speed').onchange = (e) => { this.speed = +e.target.value; };
    // save / export / place
    $('#k-save').onclick = () => this.save();
    const exBtn = $('#k-export'), exMenu = $('#k-export-menu');
    exBtn.onclick = () => { const open = exMenu.hidden; exMenu.hidden = !open; exBtn.setAttribute('aria-expanded', String(open)); };
    exMenu.querySelectorAll('[data-export]').forEach((b) => b.onclick = () => { exMenu.hidden = true; this.export(b.dataset.export); });
    $('#k-place').onclick = () => this.placeFlow();
    // presets
    const pf = $('#preset-filter');
    for (const c of CATEGORIES) {
      const b = document.createElement('button'); b.textContent = c.label; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', c.id === 'all' ? 'true' : 'false');
      if (c.ta) b.title = c.ta;
      b.onclick = () => { this.filter = c.id; pf.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', x === b ? 'true' : 'false')); this.renderPresets(); };
      pf.appendChild(b);
    }
    this.renderPresets();
    this.renderSaved();
    // canvas input
    this.bindCanvas();
    window.addEventListener('resize', () => this.isOpen() && (this.resize(), this.render()));
    this.el.addEventListener('keydown', (e) => this.keys(e));
    this.syncControls();
  }

  keys(e) {
    if (e.target.matches('input, select, textarea')) return;
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
    if (k === 'escape') { this.close(); return; }
    if (k === 's' && !e.metaKey && !e.ctrlKey) this.setTool('sikku');
    if (k === 'f') this.setTool('free');
    if (k === 'l') this.setTool('line');
    if (k === 'e') this.setTool('erase');
    if (k === ' ') { e.preventDefault(); this.playing ? this.pause() : this.play(); }
  }

  setTool(t) {
    this.tool = t;
    this.el.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.tool === t ? 'true' : 'false'));
    this.canvas.style.cursor = t === 'erase' ? 'not-allowed' : 'crosshair';
    this.hint(); this.render();
  }
  hint() {
    const msg = {
      sikku: 'Click between two dots to place or remove a mirror — the line bends there instead of crossing.',
      free: 'Draw freely. Strokes are smoothed' + (this.snap ? ' and their ends snap to dots.' : '.'),
      line: 'Drag from dot to dot to join them with straight lines.',
      erase: 'Click a line to erase it.',
    }[this.tool];
    const symTxt = this.sym !== 'none' ? ` · Symmetry: ${this.el.querySelector(`[data-sym="${this.sym}"]`).textContent}` : '';
    $('#k-hint').textContent = msg + symTxt;
  }

  resize() {
    const frame = $('#k-frame').getBoundingClientRect();
    const S = Math.max(240, Math.floor(Math.min(frame.width, frame.height) - 8));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.S = S;
    this.canvas.style.width = S + 'px'; this.canvas.style.height = S + 'px';
    this.canvas.width = S * dpr; this.canvas.height = S * dpr;
    this.dpr = dpr;
  }

  render(extra = {}) {
    if (!this.S) return;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.paths = this.kolam.paths();
    this.geom = renderKolam(this.ctx, this.kolam, { size: this.S, progress: this.progress, showMirrors: this.tool === 'sikku' && this.progress >= 1, paths: this.paths, ...extra });
    // live stroke preview
    if (this.live && this.live.length > 1) {
      const { unit, ox, oy } = this.geom;
      for (const pts of symmetricStrokes(this.live, this.kolam.grid, this.sym)) {
        this.ctx.strokeStyle = this.kolam.style.line; this.ctx.globalAlpha = 0.85; this.ctx.lineWidth = (this.kolam.style.width / 5) * unit * 0.085; this.ctx.lineCap = 'round';
        this.ctx.beginPath(); pts.forEach(([x, y], i) => (i ? this.ctx.lineTo(ox + x * unit, oy + y * unit) : this.ctx.moveTo(ox + x * unit, oy + y * unit))); this.ctx.stroke();
      }
      this.ctx.globalAlpha = 1;
    }
    $('#pb-progress').value = Math.round(this.progress * 1000);
    const n = this.paths.length;
    const loops = this.paths.filter((p) => p.kind === 'sikku').length;
    $('#pb-info').textContent = `${n} stroke${n === 1 ? '' : 's'}${loops ? ` · ${loops === 1 ? 'one line' : loops + ' loops'}` : ''}`;
    const badge = $('#k-badge');
    const single = loops === 1 && this.kolam.strokes.length === 0 && this.progress >= 1;
    if (single && badge.hidden) { badge.innerHTML = '<span class="ta">கம்பிக் கோலம்</span> One unbroken line ✓'; badge.hidden = false; }
    else if (!single) badge.hidden = true;
    $('#pb-play').textContent = this.playing ? '❚❚' : '▶';
    $('#pb-play').setAttribute('aria-label', this.playing ? 'Pause drawing' : 'Play drawing');
  }

  toGrid(e) {
    const r = this.canvas.getBoundingClientRect();
    const { unit, ox, oy } = this.geom;
    return [((e.clientX - r.left) - ox) / unit, ((e.clientY - r.top) - oy) / unit];
  }
  nearestEdge([gx, gy]) {
    // candidate inner edge midpoints in doubled coords
    const x2 = gx * 2, y2 = gy * 2;
    let best = null;
    for (const [xi, yi] of [[Math.round(x2 / 2) * 2, Math.floor(y2 / 2) * 2 + 1], [Math.floor(x2 / 2) * 2 + 1, Math.round(y2 / 2) * 2]]) {
      const d = Math.hypot(x2 - xi, y2 - yi);
      if (!best || d < best.d) best = { x: xi, y: yi, d };
    }
    if (!best || best.d > 0.9) return null;
    // must be between two dots
    const g = this.kolam.grid;
    const [a, b] = best.x % 2 === 0 ? [[best.x / 2 - 1, (best.y - 1) / 2], [best.x / 2, (best.y - 1) / 2]] : [[(best.x - 1) / 2, best.y / 2 - 1], [(best.x - 1) / 2, best.y / 2]];
    if (!g.has(...a) || !g.has(...b)) return null;
    return [best.x, best.y];
  }
  nearestDot([gx, gy], maxD = 0.38) {
    let best = null;
    for (const [i, j] of this.kolam.grid.dots) { const d = Math.hypot(gx - i - 0.5, gy - j - 0.5); if (d < maxD && (!best || d < best.d)) best = { p: [i + 0.5, j + 0.5], d }; }
    return best?.p || null;
  }

  bindCanvas() {
    const c = this.canvas;
    let drawing = false, lineStart = null;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.pause(); this.progress = 1;
      const g = this.toGrid(e);
      if (this.tool === 'sikku') {
        const edge = this.nearestEdge(g);
        if (!edge) return;
        this.snapshot();
        this.kolam.sikkuOn = true;
        const has = this.kolam.mirrors.has(edge.join(','));
        const sym = this.sym === 'r8' ? 'r4' : this.sym;
        for (const s of symmetricEdges(edge, this.kolam.grid, sym)) { const k = s.join(','); if (has) this.kolam.mirrors.delete(k); else this.kolam.mirrors.add(k); }
        this.render();
      } else if (this.tool === 'free') {
        drawing = true; this.live = [this.snap ? this.nearestDot(g) || g : g];
      } else if (this.tool === 'line') {
        lineStart = this.nearestDot(g, 0.5);
        if (lineStart) { drawing = true; this.live = [lineStart, lineStart]; }
      } else if (this.tool === 'erase') {
        this.eraseAt(g);
      }
    });
    c.addEventListener('pointermove', (e) => {
      const g = this.toGrid(e);
      if (!drawing) {
        if (this.tool === 'sikku') { const edge = this.nearestEdge(g); this.render({ highlightEdge: edge }); }
        return;
      }
      if (this.tool === 'free') { const last = this.live.at(-1); if (Math.hypot(g[0] - last[0], g[1] - last[1]) > 0.04) this.live.push(g); }
      else if (this.tool === 'line') { const d = this.nearestDot(g, 0.42); this.live[1] = d || g; }
      this.render();
    });
    const end = () => {
      if (!drawing) return; drawing = false;
      let pts = this.live; this.live = null;
      if (this.tool === 'line') {
        if (!pts || !this.nearestDot(pts[1], 0.01) || (pts[0][0] === pts[1][0] && pts[0][1] === pts[1][1])) { this.render(); return; }
      } else {
        if (!pts || pts.length < 2) { this.render(); return; }
        pts = simplify(pts, 0.03);
        if (this.snap) { const s = this.nearestDot(pts[0]); const t = this.nearestDot(pts.at(-1)); if (s) pts[0] = s; if (t) pts[pts.length - 1] = t; }
      }
      this.snapshot();
      const group = Date.now() + Math.random();
      for (const sp of symmetricStrokes(pts, this.kolam.grid, this.sym)) this.kolam.strokes.push({ type: this.tool === 'line' ? 'line' : 'free', pts: sp.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]), group });
      this.render();
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => { if (!drawing && this.tool === 'sikku') this.render(); });
  }

  eraseAt(g) {
    let best = null;
    this.kolam.strokes.forEach((s, i) => {
      for (const p of s.pts) { const d = Math.hypot(p[0] - g[0], p[1] - g[1]); if (d < 0.3 && (!best || d < best.d)) best = { i, d, group: s.group }; }
    });
    if (!best) {
      // erasing on a sikku line removes the nearest mirror (straightening the line there)
      const edge = this.nearestEdge(g);
      if (edge && this.kolam.mirrors.has(edge.join(','))) { this.snapshot(); this.kolam.mirrors.delete(edge.join(',')); this.render(); }
      return;
    }
    this.snapshot();
    const grp = best.group;
    this.kolam.strokes = this.kolam.strokes.filter((s, i) => (grp ? s.group !== grp : i !== best.i));
    this.render();
  }

  snapshot() { this.undoStack.push(JSON.stringify(this.kolam.toJSON())); if (this.undoStack.length > 120) this.undoStack.shift(); this.redoStack = []; }
  undo() { if (!this.undoStack.length) return; this.redoStack.push(JSON.stringify(this.kolam.toJSON())); this.kolam = Kolam.fromJSON(JSON.parse(this.undoStack.pop())); this.syncControls(); this.render(); }
  redo() { if (!this.redoStack.length) return; this.undoStack.push(JSON.stringify(this.kolam.toJSON())); this.kolam = Kolam.fromJSON(JSON.parse(this.redoStack.pop())); this.syncControls(); this.render(); }

  setGrid(n, shape) {
    this.snapshot();
    const style = this.kolam.style;
    this.kolam = new Kolam({ size: n, shape, style });
    this.kolam.sikkuOn = true;
    this.activePreset = null;
    this.syncControls(); this.updateAbout(null); this.progress = 1; this.render(); this.renderPresets();
  }

  applyPalette(p) {
    Object.assign(this.kolam.style, { line: p.line, bg: p.bg, multicolor: !!p.multicolor, colors: p.colors || null });
    this.syncControls(); this.render();
  }

  syncControls() {
    const k = this.kolam;
    this.el.querySelectorAll('#grid-sizes button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.n === k.size)));
    $('#g-shape').value = k.shape;
    $('#g-custom').value = k.size;
    $('#g-show').checked = k.style.dots !== false;
    $('#c-line').value = toHex(k.style.line); $('#c-bg').value = toHex(k.style.bg);
    $('#c-width').value = k.style.width;
    $('#d-flowers').checked = !!k.style.flowers; $('#d-diyas').checked = !!k.style.diyas;
    this.el.querySelectorAll('#palettes button').forEach((b) => { const p = PALETTES.find((x) => x.id === b.dataset.pal); b.setAttribute('aria-pressed', String(p.bg === k.style.bg && p.line === k.style.line)); });
  }

  loadPreset(id, silent) {
    this.snapshot();
    this.kolam = presetKolam(id);
    this.activePreset = id;
    this.progress = silent ? 0 : 1;
    this.syncControls(); this.renderPresets(); this.updateAbout(PRESETS.find((p) => p.id === id));
    this.render();
  }

  updateAbout(p) {
    const el = $('#about-pattern');
    if (!p) { el.innerHTML = '<b>Your own kolam</b>Start with mirrors between dots (Sikku tool) or draw freely. Turn on symmetry to let the design grow in every direction at once.'; return; }
    const cat = CATEGORIES.find((c) => c.id === p.cat) || CATEGORIES[0];
    el.innerHTML = `<b>${p.name}</b><span class="ta" style="color:var(--gold-l)">${p.ta}</span><br><span class="tag">${cat.label} · ${p.auth}</span><p style="margin:6px 0 0">${p.about}</p>`;
  }

  renderPresets() {
    const list = $('#preset-list');
    list.innerHTML = '';
    for (const p of PRESETS.filter((x) => this.filter === 'all' || x.cat === this.filter)) {
      const b = document.createElement('button');
      b.className = 'preset' + (p.id === this.activePreset ? ' active' : '');
      const cv = document.createElement('canvas'); cv.width = cv.height = 128;
      b.appendChild(cv);
      const meta = document.createElement('div');
      meta.innerHTML = `<b>${p.name}</b><small class="ta">${p.ta}</small><small>${CATEGORIES.find((c) => c.id === p.cat).label} · ${p.auth}</small><span class="lvl" aria-label="Difficulty ${p.level} of 3">${[1, 2, 3].map((i) => `<i class="${i <= p.level ? 'on' : ''}"></i>`).join('')}</span>`;
      b.appendChild(meta);
      b.onclick = () => { this.loadPreset(p.id, true); this.play(true); };
      list.appendChild(b);
      // defer thumbnail drawing so the panel opens instantly
      const draw = () => renderKolam(cv.getContext('2d'), presetKolam(p.id), { size: 128 });
      if (window.requestIdleCallback) window.requestIdleCallback(draw); else setTimeout(draw, 0);
    }
  }

  // ---------- playback
  play(fromStart) {
    if (fromStart || this.progress >= 1) this.progress = 0;
    this.playing = true; this.stopAt = null;
    const total = () => this.paths?.reduce((s, p) => s + p.length, 0) || 1;
    let last = performance.now();
    const tick = (now) => {
      if (!this.playing) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const rate = (state.reduceMotion ? 40 : 3.2) * this.speed / total(); // grid units per second
      this.progress = Math.min(1, this.progress + rate * dt);
      if (this.stopAt != null && this.progress >= this.stopAt) { this.progress = this.stopAt; this.playing = false; }
      if (this.progress >= 1) this.playing = false;
      this.render();
      if (this.playing) this.raf = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(tick);
    this.render();
  }
  pause() { this.playing = false; cancelAnimationFrame(this.raf); if (this.S) this.render(); }
  stepStroke() {
    const paths = this.paths || this.kolam.paths();
    const total = paths.reduce((s, p) => s + p.length, 0) || 1;
    if (this.progress >= 0.999) this.progress = 0;
    let acc = 0;
    for (const p of paths) { acc += p.length; if (acc / total > this.progress + 1e-4) { this.stopAt = acc / total; break; } }
    const stop = this.stopAt;
    this.play(); this.stopAt = stop;
  }

  // ---------- save / export
  thumb(size = 256) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    renderKolam(cv.getContext('2d'), this.kolam, { size });
    return cv;
  }
  savedList() { try { return JSON.parse(localStorage.getItem('nc.kolams') || '[]'); } catch { return []; } }
  save() {
    const list = this.savedList();
    const item = { id: 'k' + Date.now().toString(36), created: new Date().toISOString(), name: this.kolam.meta?.name ? `${this.kolam.meta.name} (edited)` : `My kolam ${list.length + 1}`, json: this.kolam.toJSON(), thumb: this.thumb(160).toDataURL('image/png') };
    list.unshift(item);
    try { localStorage.setItem('nc.kolams', JSON.stringify(list.slice(0, 30))); } catch { toast('Storage is full — export instead.'); return null; }
    this.renderSaved();
    toast('Saved to “Your kolams” on this device.');
    return item;
  }
  renderSaved() {
    const el = $('#saved-list');
    const list = this.savedList();
    if (!list.length) { el.innerHTML = '<p class="empty">Designs you save appear here.</p>'; return; }
    el.innerHTML = '';
    for (const it of list) {
      const b = document.createElement('button'); b.className = 'preset';
      b.innerHTML = `<img src="${it.thumb}" alt="" width="64" height="64" style="border-radius:8px"><div><b>${escapeHtml(it.name)}</b><small>${new Date(it.created).toLocaleDateString()}</small></div>`;
      b.onclick = () => { this.snapshot(); this.kolam = Kolam.fromJSON(it.json); this.activePreset = null; this.syncControls(); this.updateAbout(null); this.progress = 0; this.play(true); };
      el.appendChild(b);
    }
  }
  export(kind) {
    const name = 'namma-chennai-kolam';
    if (kind === 'png') {
      const cv = this.thumb(2048);
      cv.toBlob((blob) => download(blob, name + '.png'), 'image/png');
    } else if (kind === 'svg') {
      download(new Blob([kolamToSVG(this.kolam, 1024)], { type: 'image/svg+xml' }), name + '.svg');
    } else {
      download(new Blob([JSON.stringify(this.kolam.toJSON(), null, 1)], { type: 'application/json' }), name + '.json');
    }
  }

  placeFlow() {
    const slots = this.getSlots();
    const modal = document.getElementById('modal');
    const card = document.getElementById('modal-card');
    card.className = 'modal-card';
    card.innerHTML = `<button class="icon close" aria-label="Close">×</button>
      <h2 id="modal-title">Place your kolam in Namma Chennai</h2>
      <p class="sub">Choose a doorstep. Your kolam is drawn on the threshold in the 3D city, where you can find it while exploring. These are illustrative doorsteps on real lanes — no real home is identified.</p>
      <div class="slot-grid">${slots.map((s) => `<button class="slot ${s.kolam ? 'taken' : ''}" data-slot="${s.id}"><b>${s.label}</b><small>${s.street}${s.kolam ? ' · replace your kolam' : ''}</small></button>`).join('')}</div>
      ${this.onShare ? `<label class="toggle" style="margin-top:14px;padding-left:0"><input type="checkbox" id="share-cloud"> <span>Also share it with other visitors (uploads a PNG to Cloudinary)</span></label>` : ''}`;
    modal.hidden = false;
    const close = () => { modal.hidden = true; };
    card.querySelector('.close').onclick = close;
    card.querySelectorAll('[data-slot]').forEach((b) => b.onclick = async () => {
      const json = this.kolam.toJSON();
      const share = card.querySelector('#share-cloud')?.checked;
      close();
      this.close();
      this.onPlace(json, b.dataset.slot);
      if (share) {
        const blob = await new Promise((r) => this.thumb(1024).toBlob(r, 'image/png'));
        this.onShare(blob, json, b.dataset.slot);
      }
    });
  }
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function toHex(c) { if (/^#[0-9a-f]{6}$/i.test(c)) return c; const cv = document.createElement('canvas').getContext('2d'); cv.fillStyle = c; return cv.fillStyle; }
export function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
