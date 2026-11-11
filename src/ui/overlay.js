import * as THREE from 'three';
import { CATS, ICONS } from '../content/places.js';
import { escapeHtml } from '../kolam/studio.js';

const $ = (s) => document.querySelector(s);

/** Accessible HTML pins projected from 3D anchors every frame. */
export class Pins {
  constructor(engine, onSelect) {
    this.e = engine; this.onSelect = onSelect;
    this.root = $('#pins');
    this.items = [];
    this.v = new THREE.Vector3();
    engine.onUpdate(() => this.update());
  }
  add(place, pos) {
    const cat = CATS[place.cat] || CATS.community;
    const b = document.createElement('button');
    b.className = 'pin' + (place.major ? ' major' : '') + (place.kind === 'illustrative' ? ' illustrative' : '') + (place.kind === 'community' ? ' community' : '');
    b.style.setProperty('--c', cat.color);
    b.setAttribute('aria-label', `${place.name}${place.kind === 'illustrative' ? ' (illustrative example)' : ''} — ${cat.label}${place.inside ? ' — you can step inside' : ''}`);
    b.innerHTML = `<span class="label">${escapeHtml(place.name)}${place.ta ? `<span class="ta">${place.ta}</span>` : ''}</span><span class="bubble">${ICONS[place.icon || cat.icon] || ''}</span><span class="stem"></span>${place.count ? `<span class="count">${place.count}</span>` : ''}${place.inside ? '<span class="door"><svg viewBox="0 0 24 24"><path d="M6 21V4h12v17M3 21h18" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>Inside</span>' : ''}`;
    b.onclick = (e) => { e.stopPropagation(); this.onSelect(place); };
    this.root.appendChild(b);
    const item = { place, el: b, pos: new THREE.Vector3(...pos) };
    this.items.push(item);
    return item;
  }
  remove(place) {
    const i = this.items.findIndex((x) => x.place === place || x.place.id === place.id);
    if (i >= 0) { this.items[i].el.remove(); this.items.splice(i, 1); }
  }
  setActive(place) { for (const it of this.items) it.el.classList.toggle('active', it.place === place); }
  setFilter(fn) { this.filter = fn; }
  update() {
    const cam = this.e.camera, w = window.innerWidth, h = window.innerHeight;
    const dist = cam.position.distanceTo(this.e.controls.target);
    for (const it of this.items) {
      this.v.copy(it.pos).project(cam);
      const behind = this.v.z > 1;
      const x = (this.v.x * 0.5 + 0.5) * w, y = (-this.v.y * 0.5 + 0.5) * h;
      const camD = cam.position.distanceTo(it.pos);
      // far away: only major places; close: everything
      const far = !!this.filter && !this.filter(it.place) || x < -40 || x > w + 40 || y < 30 || y > h + 40 || (!it.place.major && camD > 2300) || (it.place.kind === 'community' && camD > 900) || behind;
      it.el.classList.toggle('far', far);
      if (far) continue;
      const s = Math.max(0.62, Math.min(1.05, 900 / camD));
      it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%) scale(${s.toFixed(3)})`;
      it.el.style.zIndex = String(10000 - Math.round(camD));
    }
    document.body.classList.toggle('pins-labels', dist < 700);
  }
}

/** Search across stories, OSM-named buildings, streets, POIs and the atlas */
export class Search {
  constructor({ city, places, atlas, buildingsMeta, onPick }) {
    this.input = $('#search-input'); this.list = $('#search-results'); this.onPick = onPick;
    const idx = [];
    for (const p of places) idx.push({ t: p.name, ta: p.ta, sub: (CATS[p.cat]?.label || '') + (p.kind === 'illustrative' ? ' · illustrative' : ''), c: CATS[p.cat]?.color, type: 'place', ref: p, rank: 0 });
    for (const a of atlas) idx.push({ t: a.name, ta: a.ta, sub: 'Beyond the map', c: CATS[a.cat]?.color, type: 'atlas', ref: a, rank: 1 });
    const seen = new Set();
    buildingsMeta.forEach((m) => { if (m.name && !seen.has(m.name)) { seen.add(m.name); idx.push({ t: m.name, ta: m.nameTa, sub: `Building · ${m.levels} floor${m.levels > 1 ? 's' : ''} · OpenStreetMap`, type: 'xz', ref: { x: m.c[0], z: m.c[1], h: m.h }, rank: 2 }); } });
    const streets = new Map();
    for (const r of city.roads) if (r.n) { const s = streets.get(r.n) || { pts: [], ta: r.nt }; s.pts.push(r.p[Math.floor(r.p.length / 2)]); streets.set(r.n, s); }
    for (const [n, s] of streets) { const m = s.pts[Math.floor(s.pts.length / 2)]; idx.push({ t: n, ta: s.ta, sub: 'Street', type: 'xz', ref: { x: m[0], z: m[1], h: 0 }, rank: 3 }); }
    for (const p of city.pois) if (p.n && !seen.has(p.n)) { seen.add(p.n); idx.push({ t: p.n, ta: p.nt, sub: poiLabel(p), type: 'xz', ref: { x: p.p[0], z: p.p[1], h: 0 }, rank: 2 }); }
    this.idx = idx;
    this.sel = -1;
    this.input.addEventListener('input', () => this.run());
    this.input.addEventListener('focus', () => this.run());
    this.input.addEventListener('keydown', (e) => this.keys(e));
    document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.search')) this.hide(); });
  }
  run() {
    const q = this.input.value.trim().toLowerCase();
    if (!q) { this.results = this.idx.filter((x) => x.type === 'place').slice(0, 8); }
    else {
      const score = (x) => { const t = x.t.toLowerCase(); const ta = x.ta || ''; if (t.startsWith(q) || ta.startsWith(q)) return 0; if (t.includes(' ' + q)) return 1; if (t.includes(q) || ta.includes(q)) return 2; return 9; };
      this.results = this.idx.map((x) => [score(x) * 10 + x.rank, x]).filter(([s]) => s < 90).sort((a, b) => a[0] - b[0]).slice(0, 12).map((x) => x[1]);
    }
    this.sel = -1;
    this.render(q);
  }
  render(q) {
    this.list.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
    if (!this.results.length) { this.list.innerHTML = `<li class="empty">No places named “${escapeHtml(q)}” on this map yet.</li>`; return; }
    this.list.innerHTML = this.results.map((r, i) => `<li role="option" id="sr-${i}" aria-selected="${i === this.sel}" data-i="${i}"><span class="dot" style="--c:${r.c || 'var(--ink-3)'}"></span><span class="t"><b>${escapeHtml(r.t)}${r.ta ? ` <span class="ta" style="color:var(--maroon);font-weight:400">${r.ta}</span>` : ''}</b><small>${escapeHtml(r.sub)}</small></span></li>`).join('');
    this.list.querySelectorAll('li[data-i]').forEach((li) => li.onclick = () => this.pick(+li.dataset.i));
  }
  keys(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); this.sel = Math.min(this.results.length - 1, this.sel + 1); this.render(this.input.value); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.sel = Math.max(0, this.sel - 1); this.render(this.input.value); }
    else if (e.key === 'Enter') { this.pick(Math.max(0, this.sel)); }
    else if (e.key === 'Escape') { this.hide(); this.input.blur(); }
    if (this.sel >= 0) this.input.setAttribute('aria-activedescendant', 'sr-' + this.sel);
  }
  pick(i) { const r = this.results?.[i]; if (!r) return; this.hide(); this.input.value = ''; this.input.blur(); this.onPick(r); }
  hide() { this.list.hidden = true; this.input.setAttribute('aria-expanded', 'false'); }
}

function poiLabel(p) {
  return { place_of_worship: p.rel === 'muslim' ? 'Mosque' : p.rel === 'christian' ? 'Church' : 'Place of worship', restaurant: 'Restaurant', cafe: 'Café / tea stall', station: 'Station', memorial: 'Memorial', monument: 'Monument', wayside_shrine: 'Wayside shrine' }[p.k] || 'Place';
}
