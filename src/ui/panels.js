import { CATS, ATLAS, VERSES, GLOSSARY, TOURS, COMPARE, PLACES, INTERIORS } from '../content/places.js';
import { MEDIA, creditLine } from '../content/media.js';
import { img, cfg, upload, testConnection, TAG } from '../media/cloudinary.js';
import { compareWidget } from './story.js';
import { escapeHtml } from '../kolam/studio.js';
import { renderKolam } from '../kolam/engine.js';
import { presetKolam } from '../kolam/presets.js';
import { toast } from '../core/state.js';

const $ = (s) => document.querySelector(s);

export class Modal {
  constructor() {
    this.el = $('#modal'); this.card = $('#modal-card');
    this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
    this.el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.close(); } });
  }
  open(html, { wide = false, onClose } = {}) {
    this.prev = document.activeElement;
    this.card.className = 'modal-card' + (wide ? ' wide' : '');
    this.card.innerHTML = `<button class="icon close" aria-label="Close">×</button>` + html;
    this.card.querySelector('.close').onclick = () => this.close();
    this.el.hidden = false;
    this.onClose = onClose;
    setTimeout(() => (this.card.querySelector('[autofocus]') || this.card.querySelector('.close')).focus(), 30);
    return this.card;
  }
  close() { if (this.el.hidden) return; this.el.hidden = true; this.onClose?.(); this.prev?.focus?.(); }
  isOpen() { return !this.el.hidden; }
}

export function placesIndex(modal, places, onPick) {
  const groups = {};
  for (const p of places) (groups[p.cat] ||= []).push(p);
  const card = modal.open(`<h2 id="modal-title">Places &amp; stories</h2><p class="sub">Every location on the map. Dashed pins mark illustrative examples; everything else is a real place.</p>
    ${Object.entries(groups).map(([cat, list]) => `<h3 style="font-family:var(--f-display);font-weight:500;margin:20px 0 10px">${CATS[cat]?.label || cat} <span class="ta" style="color:var(--maroon);font-size:14px">${CATS[cat]?.ta || ''}</span></h3>
      <div class="list-grid">${list.map((p) => `<button class="place-card" data-id="${p.id}" style="--c:${CATS[p.cat]?.color}"><span class="eyebrow">${p.kind === 'illustrative' ? 'Illustrative' : p.kind === 'community' ? 'Community' : 'Real place'}</span><b>${escapeHtml(p.name)}</b>${p.ta ? `<span class="ta">${p.ta}</span>` : ''}<small>${escapeHtml(p.sub || '')}</small></button>`).join('')}</div>`).join('')}`, { wide: true });
  card.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => { modal.close(); onPick(places.find((p) => p.id === b.dataset.id)); });
}

export function toursModal(modal, onStart) {
  const card = modal.open(`<h2 id="modal-title">Guided journeys</h2><p class="sub">Sit back: the camera travels between stops and each story opens in turn. Pause or skip at any time from the bar at the bottom.</p>
    <div style="display:grid;gap:10px">${TOURS.map((t) => `<button class="tour-card" data-id="${t.id}"><span><b>${escapeHtml(t.name)}</b><span class="ta" style="color:var(--maroon)">${t.ta}</span><br><small>${escapeHtml(t.about)} · ${t.stops.length} stops</small></span><span class="btn">Begin</span></button>`).join('')}</div>`);
  card.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => { modal.close(); onStart(TOURS.find((t) => t.id === b.dataset.id)); });
}

export function atlasModal(modal) {
  // equirectangular plot, to scale, of places beyond the diorama relative to Chennai Central
  const W = 520, H = 520, lat0 = 9.8, lat1 = 13.4, lon0 = 78.4, lon1 = 80.6;
  const X = (lon) => ((lon - lon0) / (lon1 - lon0)) * W, Y = (lat) => ((lat1 - lat) / (lat1 - lat0)) * H;
  const grid = [];
  for (let la = 10; la <= 13; la++) grid.push(`<line x1="0" x2="${W}" y1="${Y(la)}" y2="${Y(la)}" /><text x="4" y="${Y(la) - 4}">${la}°N</text>`);
  for (let lo = 79; lo <= 80; lo++) grid.push(`<line y1="0" y2="${H}" x1="${X(lo)}" x2="${X(lo)}" /><text x="${X(lo) + 4}" y="${H - 6}">${lo}°E</text>`);
  const pts = ATLAS.map((a) => `<g class="ap" data-id="${a.id}" tabindex="0" role="button" aria-label="${a.name}"><circle cx="${X(a.lon)}" cy="${Y(a.lat)}" r="7" fill="${CATS[a.cat].hex}"/><text x="${X(a.lon) + 11}" y="${Y(a.lat) + 4}">${a.name}</text></g>`).join('');
  const card = modal.open(`<h2 id="modal-title">Beyond the map</h2><p class="sub">Places too far away to place truthfully on this two-kilometre diorama. Positions are plotted to scale by latitude and longitude; the coastline is not drawn.</p>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:20px;align-items:start" class="atlas-grid">
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;background:var(--ivory-2);border-radius:14px;font-size:12px;fill:var(--ink-2)">
        <g stroke="rgba(0,0,0,0.08)">${grid.join('')}</g>
        <g><rect x="${X(80.275) - 7}" y="${Y(13.0827) - 7}" width="14" height="14" fill="var(--indigo)"/><text x="${X(80.275) - 118}" y="${Y(13.0827) + 4}" style="font-weight:600">This map ▸</text></g>
        ${pts}
      </svg>
      <div id="atlas-detail"></div>
    </div>`, { wide: true });
  const show = (id) => {
    const a = ATLAS.find((x) => x.id === id);
    const km = Math.round(haversine(13.0827, 80.275, a.lat, a.lon));
    card.querySelector('#atlas-detail').innerHTML = `<span class="eyebrow" style="--c:${CATS[a.cat].color}">${CATS[a.cat].label}</span><h3 style="font-family:var(--f-display);font-weight:500;font-size:26px;margin:8px 0 2px">${a.name}</h3><p class="ta" style="color:var(--maroon);margin:0 0 8px">${a.ta}</p><p style="color:var(--ink-3);font-size:13px;margin:0 0 10px">${km} km from Chennai Central</p><p style="line-height:1.6">${escapeHtml(a.text)}</p>
      <div class="gallery">${a.media.map((k) => `<img loading="lazy" alt="${escapeHtml(MEDIA[k].caption)}" src="${img(MEDIA[k].src, 'thumb')}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px">`).join('')}</div>
      ${a.media.length ? `<p class="credit">${a.media.map((k) => creditLine(MEDIA[k])).join('<br>')}</p>` : ''}`;
    card.querySelectorAll('.ap').forEach((g) => g.style.opacity = g.dataset.id === id ? 1 : 0.55);
  };
  card.querySelectorAll('.ap').forEach((g) => { g.style.cursor = 'pointer'; g.onclick = () => show(g.dataset.id); g.onkeydown = (e) => e.key === 'Enter' && show(g.dataset.id); });
  show('mylapore');
}

function haversine(la1, lo1, la2, lo2) {
  const R = 6371, r = Math.PI / 180;
  const a = Math.sin(((la2 - la1) * r) / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(((lo2 - lo1) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function timeTravelModal(modal, which = 'central') {
  const card = modal.open(`<h2 id="modal-title">Then &amp; Now</h2><p class="sub">Only genuine historical photographs are used — none are generated or retouched. Drag across each image.</p>
    <div class="tt-tabs" role="tablist">${Object.entries(COMPARE).map(([k, c]) => `<button role="tab" data-k="${k}" aria-selected="${k === which}">${escapeHtml(c.title)}</button>`).join('')}</div><div id="tt-body"></div>`, { wide: true });
  const show = (k) => {
    const c = COMPARE[k];
    const body = card.querySelector('#tt-body'); body.innerHTML = '';
    body.appendChild(compareWidget(c));
    body.insertAdjacentHTML('beforeend', `<p style="margin:12px 0 6px;line-height:1.6">${escapeHtml(c.text)}</p><p class="credit">Then: ${creditLine(MEDIA[c.then])}<br>Now: ${creditLine(MEDIA[c.now])}</p>`);
    card.querySelectorAll('[data-k]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.k === k)));
  };
  card.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => show(b.dataset.k));
  show(which);
}

export function wordsModal(modal) {
  modal.open(`<h2 id="modal-title">Tamil words &amp; verses</h2><p class="sub">Tamil is one of the world’s oldest living literary languages. A few lines that echo through this city.</p>
    ${VERSES.map((v) => `<blockquote style="margin:18px 0;padding-left:16px;border-left:3px solid var(--terracotta)"><p class="ta" style="font-size:21px;margin:0 0 6px;white-space:pre-line;color:var(--maroon)">${v.ta}</p><p style="font-family:var(--f-display);font-style:italic;font-size:17px;margin:0 0 4px">${escapeHtml(v.en)}</p><small style="color:var(--ink-3)">${escapeHtml(v.src)}${v.note ? ' — ' + escapeHtml(v.note) : ''}</small></blockquote>`).join('')}
    <h3 style="font-family:var(--f-display);font-weight:500;margin-top:24px">Words you’ll meet on the map</h3>
    <dl class="facts" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${GLOSSARY.map(([ta, tr, en]) => `<div><dt>${tr}</dt><dd><span class="ta" style="color:var(--maroon)">${ta}</span><br><span style="font-weight:400;font-size:13.5px">${escapeHtml(en)}</span></dd></div>`).join('')}</dl>
    <p class="credit">English renderings are this project’s own plain-language paraphrases.</p>`);
}

export function cloudModal(modal, onSaved) {
  const card = modal.open(`<h2 id="modal-title">Cloudinary settings</h2>
    <p class="sub">Namma Chennai delivers every photograph through Cloudinary (fetch + responsive transformations) and stores community contributions there.</p>
    <form class="form" id="cld-form">
      <div class="two"><label>Cloud name<input type="text" name="cloud" value="${escapeHtml(cfg.cloud)}" placeholder="e.g. demo-cloud" autofocus></label>
      <label>Unsigned upload preset<input type="text" name="preset" value="${escapeHtml(cfg.preset)}" placeholder="e.g. namma_unsigned"></label></div>
      <label>Folder<input type="text" name="folder" value="${escapeHtml(cfg.folder)}"></label>
      <div class="note">
        <b>One-time setup in your Cloudinary console</b><br>
        1. Settings → Upload → add an <b>unsigned</b> upload preset (optionally enable auto-tagging / moderation there).<br>
        2. Settings → Security → allow <b>Resource list</b> so community memories can be listed by the tag <code>${TAG}</code>.<br>
        3. Settings → Security → keep <b>Fetched URL</b> delivery allowed (optionally restrict it to <code>commons.wikimedia.org</code>).<br>
        Values are stored only in this browser. You can also set <code>VITE_CLOUDINARY_CLOUD_NAME</code> and <code>VITE_CLOUDINARY_UPLOAD_PRESET</code> at build time.
      </div>
      <p id="cld-status" class="note"></p>
      <div class="story-actions"><button class="btn terracotta" type="submit">Save &amp; test</button><button class="btn light" type="button" id="cld-clear">Clear</button></div>
    </form>`);
  const status = card.querySelector('#cld-status');
  testConnection().then((s) => (status.textContent = s));
  card.querySelector('#cld-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    cfg.set(f.get('cloud'), f.get('preset'), f.get('folder'));
    status.textContent = 'Testing…';
    status.textContent = await testConnection();
    onSaved?.();
  };
  card.querySelector('#cld-clear').onclick = async () => { cfg.set('', '', ''); status.textContent = await testConnection(); onSaved?.(); };
}

/** Community contribution flow — real uploads to Cloudinary with tags + context metadata */
export function contributeModal(modal, { places, onUploaded, openSettings, presetPlace }) {
  const publicPlaces = places.filter((p) => p.kind !== 'community');
  const card = modal.open(`<h2 id="modal-title">Share a memory</h2>
    <p class="sub">Preserve a tradition, a festival, a recipe or a neighbourhood memory. It becomes part of the city for everyone who visits.</p>
    ${cfg.canUpload ? '' : `<p class="note warn">Uploads need a Cloudinary cloud name and an unsigned upload preset. <button class="btn light" type="button" id="go-settings" style="margin-left:6px;padding:5px 12px">Open Cloudinary settings</button></p>`}
    <form class="form" id="contrib">
      <div class="drop" id="drop" tabindex="0" role="button" aria-label="Choose photos, videos or audio"><b>Drop photos, a video or an audio recording</b><br>or click to choose · JPG, PNG, HEIC, MP4, MOV, MP3, M4A<input type="file" id="file" accept="image/*,video/*,audio/*" multiple hidden><div class="drop-previews" id="previews"></div></div>
      <label>Title<input type="text" name="title" required maxlength="90" placeholder="e.g. Our Pongal on the terrace"></label>
      <label>Your story<textarea name="story" maxlength="2000" placeholder="What happens, who taught you, what it means to your family…"></textarea></label>
      <div class="two">
        <label>Category<select name="cat">${Object.entries(CATS).filter(([k]) => k !== 'community').map(([k, c]) => `<option value="${k}">${c.label}</option>`).join('')}</select></label>
        <label>Festival<select name="festival"><option value="">—</option><option value="deepavali">Deepavali</option><option value="pongal">Pongal</option><option value="margazhi">Margazhi</option><option value="karthigai">Karthigai Deepam</option><option value="other">Other</option></select></label>
      </div>
      <div class="two">
        <label>Attach to a public place<select name="place">${publicPlaces.map((p) => `<option value="${p.id}" ${p.id === presetPlace ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></label>
        <label>Name to show (optional)<input type="text" name="by" maxlength="40" placeholder="e.g. Meena, Triplicane"></label>
      </div>
      <p class="note">Privacy: memories are pinned to public places only — never to a home address. Please don’t include house numbers, phone numbers or faces of people who haven’t agreed.</p>
      <label class="toggle" style="padding:0"><input type="checkbox" name="consent" required> <span>I took these, or have permission to share them, and agree they can be shown publicly in Namma Chennai.</span></label>
      <div class="progress" hidden id="prog"><span></span></div>
      <p id="contrib-status" class="note" hidden></p>
      <div class="story-actions"><button class="btn terracotta" type="submit" ${cfg.canUpload ? '' : 'disabled'}>Upload &amp; add to the map</button></div>
    </form>`);
  card.querySelector('#go-settings')?.addEventListener('click', openSettings);
  const fileIn = card.querySelector('#file'), drop = card.querySelector('#drop'), prev = card.querySelector('#previews');
  let files = [];
  const setFiles = (list) => {
    files = [...list].slice(0, 6);
    prev.innerHTML = '';
    for (const f of files) {
      const url = URL.createObjectURL(f);
      prev.insertAdjacentHTML('beforeend', f.type.startsWith('video') ? `<video src="${url}" muted></video>` : f.type.startsWith('image') ? `<img src="${url}" alt="">` : `<span class="chip">${escapeHtml(f.name)}</span>`);
    }
  };
  drop.onclick = () => fileIn.click();
  drop.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && fileIn.click();
  fileIn.onchange = () => setFiles(fileIn.files);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); setFiles(e.dataTransfer.files); };
  card.querySelector('#contrib').onsubmit = async (e) => {
    e.preventDefault();
    const st = card.querySelector('#contrib-status');
    if (!files.length) { st.hidden = false; st.textContent = 'Please add at least one photo, video or audio file.'; return; }
    const f = new FormData(e.target);
    const prog = card.querySelector('#prog'); prog.hidden = false;
    const bar = prog.querySelector('span');
    const results = [];
    st.hidden = false;
    try {
      for (let i = 0; i < files.length; i++) {
        st.textContent = `Uploading ${i + 1} of ${files.length}…`;
        const res = await upload(files[i], {
          tags: [f.get('cat'), f.get('festival'), 'place-' + f.get('place')].filter(Boolean),
          context: { caption: f.get('title'), alt: f.get('title'), story: f.get('story'), place: f.get('place'), by: f.get('by'), festival: f.get('festival'), category: f.get('cat') },
        }, (p) => (bar.style.width = ((i + p) / files.length) * 100 + '%'));
        results.push(res);
      }
      bar.style.width = '100%';
      const first = results[0];
      st.innerHTML = `Added to the map. Cloudinary generated responsive versions automatically${first.tags?.length ? ` · tags: ${first.tags.map(escapeHtml).join(', ')}` : ''}.`;
      onUploaded(results, { title: f.get('title'), story: f.get('story'), place: f.get('place'), by: f.get('by'), cat: f.get('cat'), festival: f.get('festival') });
      toast('Thank you — your memory is now part of Namma Chennai.');
      setTimeout(() => modal.close(), 1400);
    } catch (err) {
      st.textContent = err.message;
    }
  };
}

export function aboutModal(modal, stats) {
  const used = Object.values(MEDIA);
  modal.open(`<h2 id="modal-title">About Namma Chennai</h2>
    <p class="sub">நம்ம சென்னை — more than a city, a thousand stories.</p>
    <h3 style="font-family:var(--f-display);font-weight:500">What’s real, what’s reconstructed</h3>
    <ul style="line-height:1.7;color:var(--ink-2)">
      <li><b>Geography is real.</b> Every street, railway line, platform, river bank, temple tank and ${stats.buildings.toLocaleString()} building footprints come from OpenStreetMap (extract of ${stats.extracted}, bounding box 13.0745–13.0900° N, 80.2660–80.2850° E), projected to metres around Chennai Central.</li>
      <li><b>Heights are partly estimated.</b> Where OSM records <code>building:levels</code> we use it; elsewhere heights follow a documented heuristic by plot size. Shop shutters, windows and water tanks are procedural.</li>
      <li><b>Landmarks are stylised reconstructions</b> built in code from OSM footprints and Commons photographs: Chennai Central, Ripon Building, Victoria Public Hall, Southern Railway HQ and the gopurams. They are not measured architectural models.</li>
      <li><b>Estimated infill.</b> Where OpenStreetMap hasn’t mapped buildings yet (much of Chintadripet and George Town), generic low-rise houses fill plots that front real lanes, so the streets don’t read as empty. Hover one to see it labelled “estimated”.</li>
      <li><b>Chennai Metro</b> tunnels, stations and entrances come from OSM, but depths are illustrative. The Phase 2 lines (Purple, Orange, Red) are under construction elsewhere and aren’t shown.</li>
      <li><b>Illustrative homes</b> (dashed pins) are composite stories written for this demo and labelled as such. The houses are stand-ins on real lanes; no real family or address is represented.</li>
      <li><b>Places beyond this area</b> (Mylapore, Marina, Kanchipuram…) are not squeezed onto the map — they live in “Beyond the map”.</li>
      <li><b>Sound</b> is synthesised in the browser; no recordings are used.</li>
      <li><b>Kolam patterns</b> marked “Traditional form” use traditional dot grids and drawing rules with a computer-generated route (mirror curves); “Original design” patterns were drawn for this project.</li>
    </ul>
    <h3 style="font-family:var(--f-display);font-weight:500">Data &amp; media licences</h3>
    <p style="color:var(--ink-2);line-height:1.6">Map data © OpenStreetMap contributors, available under the Open Database License (ODbL). Photographs and video from Wikimedia Commons under the licences listed below. Fonts: Fraunces, Hind Madurai and Noto Serif Tamil (SIL Open Font License).</p>
    <div class="credit" style="max-height:260px;overflow:auto">${used.map((m) => `“${escapeHtml(m.caption || m.file)}” — ${creditLine(m)}`).join('<br>')}</div>`, { wide: true });
}

export function onboardingModal(modal, { onDone }) {
  const steps = [
    { art: 'kolam', ta: 'யாதும் ஊரே யாவரும் கேளிர்', title: 'Welcome to Namma Chennai', text: '“Every town is our town; everyone is our kin.” This is a two-kilometre slice of real Chennai — Central station, Park Town, George Town and Chintadripet — built from OpenStreetMap, where streets lead to stories.' },
    { art: 'controls', title: 'Finding your way', text: '' },
    { art: 'modes', title: 'Change the season', text: 'Switch the city between an everyday morning, a Margazhi dawn, Pongal and Deepavali night, and change the weather. Press “Step inside” (bottom left) to walk into the temple and the homes, and draw your own kolam in the Studio.' },
  ];
  let i = 0;
  const render = () => {
    const s = steps[i];
    const card = modal.open(`<div class="onboard">
      <div class="ob-art">${s.art === 'kolam' ? '<canvas width="360" height="360" style="width:180px;height:180px"></canvas>' : s.art === 'controls' ? '' : '<div class="modes" style="position:static;transform:none;background:var(--indigo);display:inline-flex"><button aria-pressed="true" tabindex="-1"><span class="ta">அன்றாடம்</span>Everyday</button><button tabindex="-1"><span class="ta">மார்கழி</span>Margazhi</button><button tabindex="-1"><span class="ta">பொங்கல்</span>Pongal</button><button tabindex="-1"><span class="ta">தீபாவளி</span>Deepavali</button></div>'}</div>
      ${s.ta ? `<p class="ta" style="color:var(--maroon);font-size:18px;margin:0">${s.ta}</p>` : ''}
      <h2 id="modal-title">${s.title}</h2>
      ${s.art === 'controls' ? `<div class="controls-grid"><div><b>Drag</b>to move around the city</div><div><b>Right-drag / two fingers</b>to rotate and tilt</div><div><b>Scroll / pinch</b>to zoom in on any street</div><div><b>Click a pin</b>to open its story</div><div><b>Hover a building</b>to see its real name from OSM</div><div><b>Keys</b>/ search · R reset · arrows pan · +/− zoom</div></div>` : `<p style="color:var(--ink-2);line-height:1.6;max-width:520px;margin:8px auto">${s.text}</p>`}
      <div class="ob-dots">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="story-actions" style="justify-content:center"><button class="btn light" id="ob-skip">Skip</button><button class="btn terracotta" id="ob-next" autofocus>${i < steps.length - 1 ? 'Next' : 'Start exploring'}</button></div></div>`, { onClose: () => onDone?.() });
    const cv = card.querySelector('canvas');
    if (cv) { const k = presetKolam('sikku-5-diamond', { bg: '#faf5ec', line: '#6e1f2a' }); let p = 0; const loop = () => { if (!cv.isConnected) return; p = Math.min(1, p + 0.006); renderKolam(cv.getContext('2d'), k, { size: 360, progress: p }); if (p < 1) requestAnimationFrame(loop); }; loop(); }
    card.querySelector('#ob-next').onclick = () => { if (i < steps.length - 1) { i++; modal.onClose = null; render(); } else modal.close(); };
    card.querySelector('#ob-skip').onclick = () => modal.close();
  };
  render();
}

export { PLACES };

export function insideModal(modal, onPick) {
  const card = modal.open(`<h2 id="modal-title">Step inside</h2><p class="sub">Four places you can walk into. Drag to look around; tap the numbered markers to learn what everything is.</p>
    <div class="inside-grid">${INTERIORS.map((it) => `<button class="inside-card" data-id="${it.id}"><canvas width="240" height="240" data-k="${it.kolam}" data-h="${it.hue}"></canvas><span><b>${escapeHtml(it.title)}</b><span class="ta">${it.ta}</span><small>${escapeHtml(it.text)}</small></span></button>`).join('')}</div>`, { wide: true });
  card.querySelectorAll('canvas[data-k]').forEach((cv) => renderKolam(cv.getContext('2d'), presetKolam(cv.dataset.k, { bg: '#2a2440', line: cv.dataset.h }), { size: 240 }));
  card.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => { modal.close(); onPick(b.dataset.id); });
}
