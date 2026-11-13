import * as THREE from 'three';
import gsap from 'gsap';
import { Engine } from './core/engine.js';
import { state, on, toast, hash } from './core/state.js';
import { loadCity, centroid, nearestOnLine } from './world/geo.js';
import { buildGround } from './world/ground.js';
import { buildBuildings } from './world/buildings.js';
import { buildLandmarks, traditionalHouse, pickHouse, CENTRAL_ZONE, LANDMARK_IDS, nearestRoad } from './world/landmarks.js';
import { buildNature, makeBuildingIndex } from './world/nature.js';
import { buildTraffic } from './world/traffic.js';
import { Environment, computeDoorsteps, MODES } from './world/environment.js';
import { Fireworks } from './world/fireworks.js';
import { buildMetro } from './world/metro.js';
import { Weather } from './world/weather.js';
import { InteriorViewer } from './interior/interior.js';
import { Film } from './ui/film.js';
import { buildStreetLife, buildNames } from './world/streetlife.js';
import { templeComplex, tankPavilion } from './world/temple.js';
import { generateInfill } from './world/infill.js';
import { TIMES, WEATHERS } from './world/environment.js';
import { PLACES, ATLAS, CATS } from './content/places.js';
import { StoryPanel, Lightbox } from './ui/story.js';
import { Pins, Search } from './ui/overlay.js';
import { Modal, insideModal, placesIndex, toursModal, atlasModal, timeTravelModal, wordsModal, cloudModal, contributeModal, aboutModal, onboardingModal } from './ui/panels.js';
import { KolamStudio, escapeHtml } from './kolam/studio.js';
import { Kolam, renderKolam } from './kolam/engine.js';
import { presetKolam } from './kolam/presets.js';
import { Soundscape } from './audio/soundscape.js';
import { cfg, listTagged, upload, testConnection, probeFetch, aiTagsOf, festivalFromTags } from './media/cloudinary.js';

const $ = (s) => document.querySelector(s);
document.body.classList.toggle('reduce-motion', state.reduceMotion);

// ---------------------------------------------------------------- loader kolam
const loaderK = presetKolam('sikku-5-diamond', { bg: '#1b2040', line: '#e2c47e' });
const loaderPaths = loaderK.paths();
let loaderP = 0, loaderRaf;
(function drawLoader() {
  const cv = $('#loader-kolam');
  const ctx = cv.getContext('2d');
  loaderP = (loaderP + 0.004) % 1.25;
  renderKolam(ctx, loaderK, { size: 220, progress: Math.min(1, loaderP), paths: loaderPaths, transparent: true });
  loaderRaf = requestAnimationFrame(drawLoader);
})();
const setLoad = (t, p) => { $('#loader-text').textContent = t; $('#loader-progress').style.width = Math.round(p * 100) + '%'; };
const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

boot().catch((err) => {
  console.error(err);
  setLoad('Something went wrong while building the city: ' + err.message, 1);
});

async function boot() {
  const fetchProbe = probeFetch(); // runs while the city loads
  setLoad('Fetching OpenStreetMap streets of Park Town…', 0.05);
  const city = await loadCity((p) => setLoad('Fetching OpenStreetMap streets of Park Town…', 0.05 + p * 0.25));
  await frame();

  const engine = new Engine($('#stage'));
  engine.bounds = city.meta.bounds;
  const scene = engine.scene;

  // ---- story houses: real small buildings on real lanes, re-rendered as Tamil homes
  setLoad('Choosing doorsteps in Chintadripet and George Town…', 0.34);
  await frame();
  const used = new Set();
  const houses = [];
  for (const p of PLACES.filter((x) => x.house)) {
    const h = pickHouse(city, p.house.target, used, 160);
    if (!h) continue;
    used.add(h.b.id);
    h.place = p; h.apartment = !!p.house.apartment;
    houses.push(h);
  }

  // ---- buildings
  setLoad('Raising 2,400 buildings from their footprints…', 0.42);
  await frame();
  // ---- Kandha Kottam: place the temple complex facing its street, beside its real tank
  const TW = 42, TD = 44;
  const kkPoi = city.pois.find((p) => p.n === 'Kandhakottam Temple');
  let temple = null;
  if (kkPoi) {
    const road = nearestRoad(city, kkPoi.p);
    const dx = road.p[0] - kkPoi.p[0], dz = road.p[1] - kkPoi.p[1], L = Math.hypot(dx, dz) || 1;
    const dir = [dx / L, dz / L];
    const ang = Math.atan2(dir[0], dir[1]);
    const frame = (center) => ({
      toLocal: ([x, z]) => { const ex = x - center[0], ez = z - center[1]; return [ex * Math.cos(ang) - ez * Math.sin(ang), ex * Math.sin(ang) + ez * Math.cos(ang)]; },
      toWorld: ([lx, lz]) => [center[0] + lx * Math.cos(ang) + lz * Math.sin(ang), center[1] - lx * Math.sin(ang) + lz * Math.cos(ang)],
    });
    // find the nearest placement (facing the street) whose compound no road passes through
    const drivable = city.roads.filter((r) => !/footway|path|steps|pedestrian/.test(r.c));
    const segHitsBox = (a, b, hx, z0, z1) => {
      let t0 = 0, t1 = 1; const ddx = b[0] - a[0], ddz = b[1] - a[1];
      for (const [p, q] of [[-ddx, a[0] + hx], [ddx, hx - a[0]], [-ddz, a[1] - z0], [ddz, z1 - a[1]]]) { if (p === 0) { if (q < 0) return false; continue; } const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } }
      return true;
    };
    const clear = (center) => {
      const f = frame(center);
      for (const r of drivable) for (let i = 0; i < r.p.length - 1; i++) { const a = f.toLocal(r.p[i]), b = f.toLocal(r.p[i + 1]); if (segHitsBox(a, b, TW / 2 + 1 + r.w / 2, -TD / 2 - 1 - r.w / 2, TD / 2 + 7 + r.w / 2)) return false; }
      return true;
    };
    let best = null;
    for (let back = TD / 2 + 9; back < TD / 2 + 60 && !best; back += 3) for (let side = 0; side <= 40 && !best; side += 4) for (const sgn of side ? [-1, 1] : [1]) {
      const c = [road.p[0] - dir[0] * back + dir[1] * side * sgn, road.p[1] - dir[1] * back - dir[0] * side * sgn];
      if (clear(c)) best = c;
    }
    const center = best || [road.p[0] - dir[0] * (TD / 2 + 10), road.p[1] - dir[1] * (TD / 2 + 10)];
    temple = { center, ang, ...frame(center), street: road.road?.n || 'Rasappa Chetty Street' };
    city.areas.push({ k: 'temple', p: [[-TW / 2 - 2, -TD / 2 - 3], [TW / 2 + 2, -TD / 2 - 3], [TW / 2 + 2, TD / 2 + 9], [-TW / 2 - 2, TD / 2 + 9]].map(temple.toWorld), n: 'Kandha Kottam grounds', noRender: true });
  }
  const inTemple = (b, c) => { if (!temple) return false; const [lx, lz] = temple.toLocal(c); return Math.abs(lx) < TW / 2 + 2 && lz > -TD / 2 - 3 && lz < TD / 2 + 9; };
  const infill = generateInfill(city, engine.quality);
  city.buildings.push(...infill);
  const replaceIds = new Set(houses.filter((h) => !h.apartment).map((h) => h.b.id));
  const buildings = buildBuildings(city, {
    exclude: [CENTRAL_ZONE, (b) => LANDMARK_IDS.has(b.id), (b) => replaceIds.has(b.id), inTemple],
    overrides: {
      1115820281: { h: 30, lv: 9, wall: '#e8ddc9', cls: 1 },          // Moore Market Complex (suburban terminal)
      165856075: { wall: '#efe9dc', cls: 2, noTank: true },           // Periamet Masjid body
      217845704: { wall: '#e6d7b4', cls: 2, noTank: true, h: 6 },     // Ekambareswarar temple mandapam
      ...Object.fromEntries(city.buildings.filter((b) => /Battlements|Bastion|Ravelin|Gate$/.test(b.n || '')).map((b) => [b.id, { wall: '#b6a684', roof: '#8d9a6a', cls: 2, noTank: true, h: Math.min(b.h, 8) }])),
    },
  });
  scene.add(buildings.group);

  setLoad('Laying roads, rails and the Cooum…', 0.55);
  await frame();
  const ground = buildGround(city, engine);
  scene.add(ground.group);

  setLoad('Building Central, Ripon and Victoria Hall…', 0.64);
  await frame();
  const lm = buildLandmarks(city);
  scene.add(lm.group);
  if (temple) {
    const tg = templeComplex({ W: TW, D: TD });
    tg.position.set(temple.center[0], 0, temple.center[1]); tg.rotation.y = temple.ang;
    lm.group.add(tg);
    const gate = temple.toWorld([0, TD / 2]);
    lm.anchors.kandhakottam = { pos: [gate[0], tg.userData.gopuramHeight + 4, gate[1]], focus: temple.center };
    temple.group = tg;
    // the neerazhi mandapam in the middle of the temple tank
    const tank = city.areas.find((a) => a.k === 'pond' && /Kandaswami/.test(a.n || ''));
    if (tank) { const tc = centroid(tank.p); const pav = tankPavilion(4); pav.position.set(tc[0], 0, tc[1]); pav.rotation.y = temple.ang; lm.group.add(pav); }
  }
  for (const h of houses) {
    if (h.apartment) continue;
    const house = traditionalHouse({ x: h.c[0], z: h.c[1], ang: h.ang, w: h.w, d: h.d, seed: h.seed, name: h.place.name });
    scene.add(house);
  }

  setLoad('Planting neem and rain trees…', 0.72);
  await frame();
  const street = buildStreetLife(city, { excludeIds: replaceIds, engine });
  scene.add(street.group);
  const names = buildNames(city, { excludeIds: replaceIds });
  scene.add(names.group);
  const bidx = makeBuildingIndex(city);
  const nature = buildNature(city, bidx, engine);
  scene.add(nature.group);
  const traffic = buildTraffic(city, engine);
  scene.add(traffic.group);
  traffic.setVisible(state.traffic);

  setLoad('Sweeping thresholds for kolams…', 0.8);
  await frame();
  const doorsteps = computeDoorsteps(city, [
    { c: [-600, 600], r: 260, tag: 'chintadripet' },
    { c: [330, -560], r: 260, tag: 'georgetown' },
    { c: [-650, -110], r: 200, tag: 'periamet' },
    { c: [150, -300], r: 150, tag: 'parktown' },
  ], engine.quality === 'low' ? 45 : 95);
  const env = new Environment(engine, city, { buildings, nature, ground, doorsteps, houses });
  env.streetLife = { setNight: (k) => { street.setNight(k); names.setNight(k); } }; street.setNight(0);
  const sound = new Soundscape();
  const fireworks = new Fireworks(scene, [[199, 527], [-374, -719], [-413, -333], [-30, 520]], (s) => {
    const t = engine.controls.target; sound.boom(Math.hypot(s.x - t.x, s.z - t.z) + engine.camera.position.distanceTo(t) * 0.5);
  });
  engine.onUpdate((dt) => fireworks.update(dt));
  fireworks.setGround(doorsteps, () => engine.controls.target, () => engine.camera.position.distanceTo(engine.controls.target));

  // ---- Chennai Metro (Blue & Green lines underground) + weather
  const metro = buildMetro(city, engine, ground.group);
  scene.add(metro.group);
  // lightning prefers tall things: the gopuram, Central's clock tower, Ripon's tower, the tallest blocks
  const strikeTargets = [new THREE.Vector3(52, 46, -4)];
  if (lm.anchors.ripon) strikeTargets.push(new THREE.Vector3(...lm.anchors.ripon.pos));
  if (lm.anchors.kandhakottam) strikeTargets.push(new THREE.Vector3(...lm.anchors.kandhakottam.pos).setY(lm.anchors.kandhakottam.pos[1] - 4));
  buildings.meta.filter((m) => !m.est).sort((a, b) => b.h - a.h).slice(0, 8).forEach((m) => strikeTargets.push(new THREE.Vector3(m.c[0], m.h, m.c[1])));
  const weather = new Weather(engine, { strikeTargets });
  env.rain = weather;
  let stormT = 3;
  engine.onUpdate((dt) => {
    if (env.weather !== 'storm') return;
    stormT -= dt;
    if (stormT <= 0) { stormT = 4 + Math.random() * 8; const d = weather.strike(); env.lightning(); sound.thunder(Math.min(4000, (d / 343) * 1000)); }
  });

  // ---- resolve place anchors
  const anchors = { ...lm.anchors };
  for (const h of houses) anchors['house-' + h.place.id.replace('home-', '')] = { pos: [h.c[0], 12, h.c[1]], focus: h.c, house: h };
  const placeAt = (p) => {
    if (Array.isArray(p.at)) return { focus: p.at, pos: [p.at[0], p.labelY ?? 14, p.at[1]] };
    const a = anchors[p.at.replace('anchor:', '')];
    if (!a) return null;
    const f = Array.isArray(a.focus) && a.focus.length === 3 ? [a.focus[0], a.focus[2]] : a.focus;
    return { focus: f, pos: [a.pos[0], p.labelY ? Math.max(a.pos[1], p.labelY) : a.pos[1], a.pos[2] ?? a.pos[1]] };
  };
  const places = [];
  for (const p of PLACES) {
    const r = placeAt(p);
    if (!r) continue;
    p._focus = r.focus;
    p._pin = r.pos.length === 3 ? r.pos : [r.focus[0], p.labelY ?? 14, r.focus[1]];
    places.push(p);
  }
  // house anchors put the pin above the roof
  // house anchors: pin above the roof, camera looking at the front door from the lane
  for (const h of houses) {
    const p = h.place; if (!p._focus) continue;
    p._pin = [h.c[0], h.apartment ? h.b.h + 6 : 12, h.c[1]];
    p._focus = [h.c[0] + Math.sin(h.ang) * 3, h.c[1] + Math.cos(h.ang) * 3];
    p.cam = { ...p.cam, az: h.ang, dist: h.apartment ? 95 : 58, polar: 0.98 };
  }

  // ---------------------------------------------------------------- UI
  const modal = new Modal();
  const lightbox = new Lightbox();
  const interior = new InteriorViewer({ sound });
  const contributions = loadLocalContributions();
  const communityFor = (placeId) => contributions.filter((c) => c.place === placeId).map(toMedia);
  let returnView = null;

  const story = new StoryPanel({
    sound, lightbox, community: communityFor,
    onClose: () => { pins.setActive(null); buildings.material.userData.uniforms.uSelect.value = -1; if (returnView && !tour.active) engine.restoreCamera(returnView, 1.6); returnView = null; },
    onAction: (a) => doAction(a),
  });
  const pins = new Pins(engine, (p) => openPlace(p));
  for (const p of places) pins.add(p, p._pin);

  function focusPlace(p, { open = true } = {}) {
    if (!story.isOpen() && !returnView) returnView = engine.cameraState();
    const cam = p.cam || { dist: 200, polar: 0.95 };
    // when the story panel covers the right side, aim slightly right of centre so the place stays visible
    const narrow = window.innerWidth < 860;
    const off = narrow ? 0 : cam.dist * 0.16;
    const az = cam.az ?? 0;
    const tx = p._focus[0] + Math.cos(az) * off, tz = p._focus[1] - Math.sin(az) * off;
    pins.setActive(p);
    const sel = buildings.meta.findIndex((m) => Math.hypot(m.c[0] - p._focus[0], m.c[1] - p._focus[1]) < 4);
    buildings.material.userData.uniforms.uSelect.value = sel;
    const fly = engine.flyTo({ target: [tx, 0, narrow ? tz + cam.dist * 0.18 : tz], dist: cam.dist, polar: cam.polar, azimuth: az, duration: 2.0 });
    if (open) setTimeout(() => story.open(p), state.reduceMotion ? 0 : 650);
    return fly;
  }
  function openPlace(p, idx = 0) {
    if (tour.active && !tour.driving) tour.stop();
    focusPlace(p, { open: false });
    setTimeout(() => story.open(p, idx), state.reduceMotion ? 0 : 650);
  }

  function doAction(a) {
    if (a.startsWith('mode:')) { setMode(a.slice(5)); story.close(); }
    else if (a.startsWith('studio')) { const preset = a.split(':')[1]; studio.open(preset); }
    else if (a === 'contribute') contributeModal(modal, { places, onUploaded, openSettings: () => cloudModal(modal, refreshCloud), presetPlace: story.place?.id });
    else if (a === 'atlas') atlasModal(modal);
    else if (a.startsWith('inside:')) { interior.open(a.split(':')[1]); }
    else if (a === 'metro') { story.close(true); toggleMetro(true); }
  }

  // ---- modes
  const modeBtns = document.querySelectorAll('.modes button');
  function setMode(m) {
    env.setMode(m);
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    $('#btn-fireworks').hidden = m !== 'deepavali';
    fireworks.setActive(m === 'deepavali' && state.fireworks);
    const cap = MODES[m].caption;
    const el = $('#mode-caption');
    if (cap) { el.innerHTML = `<span class="ta">${cap.ta}</span><small>${cap.en}</small>`; el.classList.add('show'); clearTimeout(setMode._t); setMode._t = setTimeout(() => el.classList.remove('show'), 5200); }
    else el.classList.remove('show');
    if (m === 'deepavali' && !state.reduceMotion && state.fireworks) setTimeout(() => { fireworks.launch(null, 'peony'); setTimeout(() => fireworks.launch(null, 'ring'), 700); }, 1800);
  }
  modeBtns.forEach((b) => b.onclick = () => setMode(b.dataset.mode));

  // ---- time & weather panel
  const skyBtn = $('#btn-sky'), skyPanel = $('#sky-panel');
  const swatch = { dawn: 'linear-gradient(#2b3a66,#e7b7a8)', morning: 'linear-gradient(#9fc0dc,#e9dccb)', noon: 'linear-gradient(#86b4dc,#fffaf0)', golden: 'linear-gradient(#7fb2da,#f6d39a)', evening: 'linear-gradient(#4a5d92,#f2a66a)', night: 'linear-gradient(#0b0f2a,#3a2b56)', clear: 'radial-gradient(#ffd56b 40%,#9fc0dc 42%)', haze: 'linear-gradient(#f0dcb4,#e9d2a8)', rain: 'repeating-linear-gradient(110deg,#6f7884 0 3px,#9aa3ad 3px 6px)', storm: 'linear-gradient(135deg,#3c434e 45%,#ffe680 47%,#3c434e 52%)' };
  const renderSky = () => {
    $('#sky-times').innerHTML = Object.entries(TIMES).map(([k, t]) => `<button data-time="${k}" aria-pressed="${env.time === k}"><i style="background:${swatch[k]}"></i>${t.label}<span class="ta">${t.ta}</span></button>`).join('');
    $('#sky-weather').innerHTML = Object.entries(WEATHERS).map(([k, w]) => `<button data-weather="${k}" aria-pressed="${env.weather === k}"><i style="background:${swatch[k]}"></i>${w.label}<span class="ta">${w.ta}</span></button>`).join('');
    skyPanel.querySelectorAll('[data-time]').forEach((b) => b.onclick = () => { env.setTime(b.dataset.time); renderSky(); });
    skyPanel.querySelectorAll('[data-weather]').forEach((b) => b.onclick = () => { env.setWeather(b.dataset.weather); sound.setWeather(b.dataset.weather); renderSky(); if (b.dataset.weather === 'storm') toast('Thunderstorm — turn on sound to hear it roll over the city.'); });
  };
  skyBtn.onclick = () => { const open = skyPanel.hidden; skyPanel.hidden = !open; skyBtn.setAttribute('aria-expanded', String(open)); if (open) renderSky(); };
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.sky-wrap')) { skyPanel.hidden = true; skyBtn.setAttribute('aria-expanded', 'false'); } });
  on('sky', () => { if (!skyPanel.hidden) renderSky(); });

  // ---- metro x-ray
  const metroBtn = $('#btn-metro');
  const toggleMetro = (v = !metro.on) => {
    metro.setXray(v); metroBtn.setAttribute('aria-pressed', String(v)); $('#metro-legend').hidden = !v;
    if (v) { story.close(true); engine.flyTo({ target: [-60, 0, 40], dist: 620, polar: 1.12, azimuth: -0.55, duration: 2.2 }); }
  };
  metroBtn.onclick = () => toggleMetro();
  $('#btn-fireworks').onclick = () => { for (let i = 0; i < 4; i++) setTimeout(() => fireworks.launch(), i * 450); };

  // ---- kolam studio + doorstep placement
  const slots = doorsteps.filter((d) => d.tag === 'chintadripet').slice(0, 10).map((d, i) => {
    const road = nearestRoad(city, d.p, (r) => !!r.n);
    return { id: 'slot' + i, p: d.p, n: d.n, label: `Doorstep ${i + 1}`, street: road?.road?.n || 'Chintadripet lane' };
  });
  const placed = new Map();
  const placedStore = () => { try { return JSON.parse(localStorage.getItem('nc.placed') || '{}'); } catch { return {}; } };
  function placeKolam(json, slotId, { community = false, by = null, silent = false } = {}) {
    const slot = slots.find((s) => s.id === slotId); if (!slot) return;
    if (placed.has(slotId)) { const old = placed.get(slotId); scene.remove(old.mesh); old.mesh.material.map.dispose(); pins.remove(old.place); }
    const k = Kolam.fromJSON(json);
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    renderKolam(cv.getContext('2d'), k, { size: 512, transparent: true });
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const geo = new THREE.PlaneGeometry(3.6, 3.6); geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6 }));
    mesh.position.set(slot.p[0] + slot.n[0] * 1.6, 0.3, slot.p[1] + slot.n[1] * 1.6);
    mesh.rotation.y = Math.atan2(slot.n[0], slot.n[1]);
    mesh.renderOrder = 4;
    scene.add(mesh);
    const place = { id: 'kolam-' + slotId, cat: 'community', kind: 'community', icon: 'kolam', name: community ? `A visitor’s kolam${by ? ' · ' + by : ''}` : 'Your kolam', ta: 'கோலம்', sub: `${slot.label} · ${slot.street}`,
      _focus: [mesh.position.x, mesh.position.z], cam: { dist: 40, polar: 0.75, az: 0.3 }, kolamJSON: json,
      stories: [{ id: 'k', title: 'A kolam on the threshold', body: [{ p: community ? 'Drawn by a visitor in the Kolam Studio and shared through Cloudinary.' : 'You drew this in the Kolam Studio. It is saved in this browser and drawn on this doorstep whenever you visit.' }, { kolamJSON: true }, { action: 'studio:', label: 'Open the Kolam Studio' }] }] };
    pins.add(place, [mesh.position.x, 5, mesh.position.z]);
    placed.set(slotId, { mesh, place });
    if (!community) {
      const st = placedStore(); st[slotId] = json; try { localStorage.setItem('nc.placed', JSON.stringify(st)); } catch {}
      if (!silent) { setTimeout(() => focusPlace(place, { open: false }), 300); toast('Your kolam is on the doorstep. Other visitors on this device will find it here.'); }
    }
  }
  for (const [slotId, json] of Object.entries(placedStore())) placeKolam(json, slotId, { silent: true });

  const studio = new KolamStudio({
    onPlace: (json, slotId) => placeKolam(json, slotId),
    getSlots: () => slots.map((s) => ({ ...s, kolam: placed.has(s.id) })),
    onShare: async (blob, json, slotId) => {
      if (!cfg.canUpload) { toast('Sharing needs Cloudinary — open Menu → Cloudinary settings.'); return; }
      try {
        await upload(blob, { tags: ['kolam', 'slot-' + slotId], context: { caption: 'Kolam from the Studio', place: 'home-kolam', category: 'community', kolam: JSON.stringify(json).slice(0, 7000) } });
        toast('Shared! Your kolam is on Cloudinary for other visitors.');
      } catch (e) { toast(e.message, 4000); }
    },
  });
  $('#btn-studio').onclick = () => studio.open();

  // the story panel needs to render placed-kolam bodies too
  const origBlock = story.block.bind(story);
  story.block = (b) => {
    if (b.kolamJSON && story.place?.kolamJSON) {
      const el = document.createElement('figure'); el.style.cssText = 'margin:16px 0;text-align:center';
      const cv = document.createElement('canvas'); cv.width = cv.height = 760; cv.style.cssText = 'width:100%;max-width:380px;border-radius:14px';
      el.appendChild(cv);
      const k = Kolam.fromJSON(story.place.kolamJSON); const paths = k.paths(); let p = 0;
      const loop = () => { if (!cv.isConnected) return; p = Math.min(1, p + 0.004); renderKolam(cv.getContext('2d'), k, { size: 760, progress: p, paths }); if (p < 1) requestAnimationFrame(loop); };
      setTimeout(loop, 50);
      return el;
    }
    if (b.action === 'studio:' && story.place?.kolamJSON) {
      const el = document.createElement('div'); el.className = 'story-actions';
      const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = 'Edit in the Kolam Studio';
      btn.onclick = () => { studio.open(); studio.snapshot(); studio.kolam = Kolam.fromJSON(story.place.kolamJSON); studio.syncControls(); studio.progress = 0; studio.play(true); };
      el.appendChild(btn); return el;
    }
    return origBlock(b);
  };

  // ---- community contributions (Cloudinary) -------------------------------
  function loadLocalContributions() { try { return JSON.parse(localStorage.getItem('nc.contrib') || '[]'); } catch { return []; } }
  function toMedia(c) { return { src: c.publicId ? { publicId: c.publicId } : c.url, kind: c.type === 'video' ? 'video' : 'image', caption: c.title + (c.story ? ' — ' + c.story.slice(0, 140) : ''), author: c.by || 'A visitor', poster: c.type === 'video' && cfg.cloud ? `https://res.cloudinary.com/${cfg.cloud}/video/upload/so_1,c_fill,g_auto,w_360,h_360/${c.publicId}.jpg` : null }; }
  const communityPins = new Map();
  function addCommunityPin(c) {
    const host = places.find((p) => p.id === c.place) || places[0];
    if (!host || communityPins.has(c.publicId)) return;
    const n = communityPins.size;
    const a = hash(n + 7) * Math.PI * 2, r = 10 + (n % 4) * 5;
    const pos = [host._focus[0] + Math.cos(a) * r, 8, host._focus[1] + Math.sin(a) * r];
    const place = { id: 'c-' + c.publicId, cat: 'community', kind: 'community', name: c.title || 'A shared memory', sub: `Shared${c.by ? ' by ' + c.by : ''} · near ${host.name}`, _focus: [pos[0], pos[2]], cam: { dist: 120, polar: 0.9 },
      heroSrc: c.type === 'image' ? { publicId: c.publicId } : null,
      stories: [{ id: 'c', title: c.title || 'A memory', body: [c.story ? { lede: c.story } : { p: 'A memory shared by a visitor.' }, { gallery: [toMedia(c)] }, c.aiTags?.length ? { chips: c.aiTags, label: 'Tagged by Cloudinary AI' } : { p: '' }, c.festival ? { note: `Festival: ${c.festival}` } : { p: '' }, { action: 'contribute', label: 'Share your own memory' }] }] };
    communityPins.set(c.publicId, place);
    pins.add(place, pos);
  }
  function onUploaded(results, meta) {
    for (const r of results) {
      const c = { publicId: r.public_id, type: r.resource_type, url: r.secure_url, ...meta };
      contributions.unshift(c);
      addCommunityPin(c);
    }
    try { localStorage.setItem('nc.contrib', JSON.stringify(contributions.slice(0, 50))); } catch {}
  }
  contributions.forEach(addCommunityPin);
  async function refreshCloud() {
    $('#cloud-status').textContent = cfg.enabled ? `Connected cloud: ${cfg.cloud}${cfg.canUpload ? ' · uploads on' : ''}` : 'Not configured — tap to connect';
    if (!cfg.enabled) return;
    const { items, status } = await listTagged();
    for (const it of items) {
      const ctx = it.context || {};
      if ((it.tags || []).includes('kolam') && ctx.kolam) {
        try {
          const json = JSON.parse(ctx.kolam);
          const free = slots.find((s) => !placed.has(s.id));
          if (free) placeKolam(json, free.id, { community: true, by: ctx.by });
        } catch {}
        continue;
      }
      if (ctx.place) {
        const aiTags = aiTagsOf(it);
        const c = { publicId: it.public_id, type: it.resource_type, title: ctx.caption, story: ctx.story, by: ctx.by, place: ctx.place, festival: ctx.festival || festivalFromTags(aiTags), aiTags };
        if (!contributions.some((x) => x.publicId === c.publicId)) { contributions.push(c); addCommunityPin(c); }
      }
    }
    if (status === 'list-restricted') console.info('Cloudinary resource list is restricted — enable it in Settings → Security to show everyone’s memories.');
  }
  refreshCloud();

  // ---- search
  new Search({
    city, places, atlas: ATLAS, buildingsMeta: buildings.meta,
    onPick: (r) => {
      if (r.type === 'place') openPlace(r.ref);
      else if (r.type === 'atlas') atlasModal(modal);
      else { story.close(true); engine.flyTo({ target: [r.ref.x, 0, r.ref.z], dist: 140 + r.ref.h * 2, polar: 0.9, duration: 2 }); highlightAt(r.ref.x, r.ref.z); toast(r.t); }
    },
  });
  function highlightAt(x, z) {
    const i = buildings.meta.findIndex((m) => Math.hypot(m.c[0] - x, m.c[1] - z) < 1);
    buildings.material.userData.uniforms.uSelect.value = i;
    setTimeout(() => { if (buildings.material.userData.uniforms.uSelect.value === i) buildings.material.userData.uniforms.uSelect.value = -1; }, 6000);
  }

  // ---- hover + click on the city itself -----------------------------------
  const tip = $('#hover-tip');
  const pickables = [buildings.mesh];
  let hoverIdx = -1, downAt = null;
  const canvas = engine.renderer.domElement;
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || e.buttons) { tip.hidden = true; return; }
    const hit = engine.pick(e.clientX, e.clientY, pickables);
    const idx = hit ? buildings.findIndex(hit.faceIndex) : -1;
    if (idx !== hoverIdx) { hoverIdx = idx; buildings.material.userData.uniforms.uHover.value = idx; }
    if (idx >= 0) {
      const m = buildings.meta[idx];
      const place = placeNear(m.c, 30);
      tip.innerHTML = m.name ? `<b>${escapeHtml(m.name)}</b>${m.nameTa ? `<span class="ta">${m.nameTa}</span><br>` : ''}<small>${m.levels} floor${m.levels > 1 ? 's' : ''} · OpenStreetMap${place ? ' · click for its story' : ''}</small>` : `<b>${kindLabel(m)}</b><small>${m.levels} floor${m.levels > 1 ? 's' : ''}${m.est ? " · estimated infill — this block isn’t mapped in OpenStreetMap yet" : " · footprint from OpenStreetMap"}${place ? ' · click: ' + escapeHtml(place.name) : ''}</small>`;
      tip.hidden = false; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px';
      canvas.style.cursor = place ? 'pointer' : 'default';
    } else { tip.hidden = true; canvas.style.cursor = 'grab'; }
  });
  canvas.addEventListener('pointerleave', () => { tip.hidden = true; buildings.material.userData.uniforms.uHover.value = -1; hoverIdx = -1; });
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
    // landmark meshes & houses: pick the nearest place to the clicked ground point
    const g = engine.groundPoint(e.clientX, e.clientY);
    const hit = engine.pick(e.clientX, e.clientY, [buildings.mesh, lm.group]);
    let p = null;
    if (hit) {
      const pt = hit.point;
      p = placeNear([pt.x, pt.z], hit.object === buildings.mesh ? 30 : 70);
      if (!p && hit.object === buildings.mesh) {
        const m = buildings.meta[buildings.findIndex(hit.faceIndex)];
        buildings.material.userData.uniforms.uSelect.value = buildings.findIndex(hit.faceIndex);
        toast(m.est ? 'Estimated building — this block isn’t mapped in OpenStreetMap yet, so we infill it' : `${m.name || kindLabel(m)} · ${m.levels} floor${m.levels > 1 ? 's' : ''} · OSM way ${m.id}`);
      }
    } else if (g) p = placeNear([g.x, g.z], 25);
    if (p) openPlace(p);
  });
  function placeNear(pt, maxD) {
    let best = null;
    for (const p of [...places, ...communityPins.values()]) { const d = Math.hypot(p._focus[0] - pt[0], p._focus[1] - pt[1]); if (d < maxD && (!best || d < best.d)) best = { p, d }; }
    for (const h of houses) { const d = Math.hypot(h.c[0] - pt[0], h.c[1] - pt[1]); if (d < 9 && (!best || d < best.d)) best = { p: h.place, d }; }
    return best?.p || null;
  }
  function kindLabel(m) { return { train_station: 'Railway building', office: 'Office', hospital: 'Hospital building', worship: 'Place of worship', roof: 'Canopy', dormitory: 'Hostel', apartments: 'Apartments', yes: m.levels >= 4 ? 'Apartment / commercial block' : m.area < 120 ? 'House or shop' : 'Building' }[m.kind] || 'Building'; }

  // ---- tours ---------------------------------------------------------------
  const tour = {
    active: false, driving: false, i: 0, t: null, playing: true,
    start(tdef) {
      this.def = tdef; this.i = 0; this.active = true; this.playing = true;
      $('#tour-bar').hidden = false; $('#tour-title').textContent = tdef.name;
      returnView = engine.cameraState();
      this.go();
    },
    go() {
      clearTimeout(this.t);
      const p = places.find((x) => x.id === this.def.stops[this.i]);
      $('#tour-step').textContent = `Stop ${this.i + 1} of ${this.def.stops.length} · ${p?.name || ''}`;
      $('#tour-play').textContent = this.playing ? '❚❚' : '▶';
      if (!p) return this.next();
      this.driving = true;
      story.close(true);
      focusPlace(p, { open: false }).then(() => { this.driving = false; });
      setTimeout(() => story.open(p), state.reduceMotion ? 0 : 1500);
      if (this.playing) this.t = setTimeout(() => this.next(), 16000);
    },
    next() { if (this.i < this.def.stops.length - 1) { this.i++; this.go(); } else this.finish(); },
    prev() { if (this.i > 0) { this.i--; this.go(); } },
    toggle() { this.playing = !this.playing; $('#tour-play').textContent = this.playing ? '❚❚' : '▶'; $('#tour-play').setAttribute('aria-label', this.playing ? 'Pause journey' : 'Resume journey'); clearTimeout(this.t); if (this.playing) this.t = setTimeout(() => this.next(), 9000); },
    finish() { const end = this.def.end; this.stop(); if (end === 'studio') studio.open('sikku-5-diamond'); else toast('Journey complete. Keep exploring — or try another from the menu.'); },
    stop() { clearTimeout(this.t); this.active = false; $('#tour-bar').hidden = true; },
  };
  $('#tour-next').onclick = () => tour.next(); $('#tour-prev').onclick = () => tour.prev();
  $('#tour-play').onclick = () => tour.toggle(); $('#tour-stop').onclick = () => { tour.stop(); story.close(); };

  // ---- discover a tradition (weighted to unseen stories)
  function discover() {
    const pool = places.filter((p) => !state.seen.has(p.id) && p.kind !== 'community');
    const list = pool.length ? pool : places.filter((p) => p.kind !== 'community');
    const p = list[Math.floor(Math.random() * list.length)];
    menu(false);
    toast(pool.length ? `Discovering: ${p.name}` : 'You’ve seen every story — here’s one again.');
    openPlace(p);
  }

  // ---- menu & settings -------------------------------------------------------
  const menuEl = $('#menu'), menuBtn = $('#btn-menu');
  function menu(open) { menuEl.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); if (open) menuEl.querySelector('.menu-item').focus(); }
  menuBtn.onclick = () => menu(menuEl.hidden);
  menuEl.querySelector('[data-close="menu"]').onclick = () => menu(false);
  $('#m-discover').onclick = discover;
  const openInsidePicker = () => { menu(false); insideModal(modal, (id) => interior.open(id)); };
  $('#m-inside').onclick = openInsidePicker;
  $('#btn-inside').onclick = openInsidePicker;
  const film = new Film({ engine, env, weather, metro, interior, studio, places, setMode, fireworks, story, sound, houses });
  const playFilm = () => { menu(false); modal.close(); if (tour.active) tour.stop(); film.play(); };
  $('#btn-film').onclick = playFilm;
  $('#m-film').onclick = playFilm;
  window.__playFilm = playFilm;
  $('#m-tours').onclick = () => { menu(false); toursModal(modal, (t) => tour.start(t)); };
  $('#m-places').onclick = () => { menu(false); placesIndex(modal, places, (p) => openPlace(p)); };
  $('#m-atlas').onclick = () => { menu(false); atlasModal(modal); };
  $('#m-timetravel').onclick = () => { menu(false); timeTravelModal(modal); };
  $('#m-words').onclick = () => { menu(false); wordsModal(modal); };
  $('#m-contribute').onclick = () => { menu(false); doAction('contribute'); };
  $('#m-cloud').onclick = () => { menu(false); cloudModal(modal, refreshCloud); };
  $('#m-about').onclick = () => { menu(false); aboutModal(modal, { buildings: buildings.meta.length, extracted: city.meta.extracted }); };
  $('#m-help').onclick = () => { menu(false); onboardingModal(modal, {}); };
  const setMotion = $('#set-motion'); setMotion.checked = state.reduceMotion;
  setMotion.onchange = () => { state.reduceMotion = setMotion.checked; document.body.classList.toggle('reduce-motion', state.reduceMotion); localStorage.setItem('nc.reduceMotion', state.reduceMotion ? '1' : '0'); };
  const setTilt = $('#set-tilt'); setTilt.checked = localStorage.getItem('nc.tilt') !== '0' && engine.usePost; setTilt.disabled = !engine.usePost;
  engine.setTiltShift(setTilt.checked);
  setTilt.onchange = () => { engine.setTiltShift(setTilt.checked); localStorage.setItem('nc.tilt', setTilt.checked ? '1' : '0'); };
  const setTraffic = $('#set-traffic'); setTraffic.checked = state.traffic;
  setTraffic.onchange = () => { state.traffic = setTraffic.checked; traffic.setVisible(state.traffic); localStorage.setItem('nc.traffic', state.traffic ? '1' : '0'); };
  const setFw = $('#set-fireworks'); setFw.checked = state.fireworks;
  setFw.onchange = () => { state.fireworks = setFw.checked; localStorage.setItem('nc.fireworks', state.fireworks ? '1' : '0'); fireworks.setActive(state.mode === 'deepavali' && state.fireworks); };
  const setLvl = $('#set-fw-level'); setLvl.value = state.fireworksLevel;
  setLvl.oninput = () => { state.fireworksLevel = +setLvl.value; localStorage.setItem('nc.fwLevel', setLvl.value); };
  const setQ = $('#set-quality'); setQ.value = localStorage.getItem('nc.quality') || 'auto';
  setQ.onchange = () => { localStorage.setItem('nc.quality', setQ.value); toast('Quality changes apply after reload.'); };

  // ---- camera controls -------------------------------------------------------
  const home = { target: [-40, 0, 40], dist: 1500, polar: 0.86, azimuth: -0.42 };
  const resetView = () => { story.close(true); returnView = null; engine.flyTo({ ...home, duration: 2.2 }); };
  const zoom = (f) => { const c = engine.controls; const off = engine.camera.position.clone().sub(c.target); const d = THREE.MathUtils.clamp(off.length() * f, c.minDistance, c.maxDistance); const sph = new THREE.Spherical().setFromVector3(off); engine.flyTo({ target: c.target.toArray(), dist: d, polar: sph.phi, azimuth: sph.theta, duration: 0.6 }); };
  const rotate = (a) => { const c = engine.controls; const sph = new THREE.Spherical().setFromVector3(engine.camera.position.clone().sub(c.target)); engine.flyTo({ target: c.target.toArray(), dist: sph.radius, polar: sph.phi, azimuth: sph.theta + a, duration: 0.8 }); };
  $('#cam-in').onclick = () => zoom(0.6); $('#cam-out').onclick = () => zoom(1.6);
  $('#cam-rot').onclick = () => rotate(Math.PI / 4); $('#cam-reset').onclick = resetView; $('#brand-btn').onclick = resetView;
  const panBy = (dx, dz) => { const c = engine.controls; const d = engine.camera.position.distanceTo(c.target) * 0.12; const az = c.getAzimuthalAngle(); const fx = -Math.sin(az), fz = -Math.cos(az); const rx = Math.cos(az), rz = -Math.sin(az); const mx = (rx * dx + fx * dz) * d, mz = (rz * dx + fz * dz) * d; c.target.x += mx; c.target.z += mz; engine.camera.position.x += mx; engine.camera.position.z += mz; engine.clampTarget(); };

  // ---- sound
  const sndBtn = $('#btn-sound'), vol = $('#vol');
  sndBtn.onclick = () => { const on = sndBtn.getAttribute('aria-pressed') !== 'true'; sound.setOn(on); sndBtn.setAttribute('aria-pressed', String(on)); sndBtn.setAttribute('aria-label', on ? 'Turn off soundscape' : 'Turn on soundscape'); vol.hidden = !on; if (on) toast('Soundscape on — synthesised in your browser. Zoom in near Central or a temple.'); };
  vol.oninput = () => sound.setVolume(+vol.value);
  engine.onUpdate(() => { const t = engine.controls.target; sound.setListener(t.x, t.z, engine.camera.position.distanceTo(t)); });

  // ---- compass
  const compass = $('#compass');
  engine.onUpdate(() => { const az = engine.controls.getAzimuthalAngle(); compass.style.setProperty('--rot', `${(-az * 180) / Math.PI}deg`); compass.firstElementChild.style.transform = `rotate(${(-az * 180) / Math.PI}deg) translateY(-1px)`; });

  // ---- keyboard
  window.addEventListener('keydown', (e) => {
    if (studio.isOpen() || document.body.classList.contains('in-interior') || document.body.classList.contains('filming') || e.target.matches('input, textarea, select') || modal.isOpen() || !$('#lightbox').hidden) return;
    const k = e.key;
    if (k === '/') { e.preventDefault(); $('#search-input').focus(); }
    else if (k === 'Escape') { if (!menuEl.hidden) menu(false); else if (story.isOpen()) story.close(); else if (tour.active) tour.stop(); }
    else if (k === 'r' || k === 'R') resetView();
    else if (k === '+' || k === '=') zoom(0.7);
    else if (k === '-' || k === '_') zoom(1.4);
    else if (k === 'ArrowLeft') panBy(-1, 0); else if (k === 'ArrowRight') panBy(1, 0);
    else if (k === 'ArrowUp') panBy(0, 1); else if (k === 'ArrowDown') panBy(0, -1);
    else if (k === 'q' || k === 'Q') rotate(-Math.PI / 8); else if (k === 'e' || k === 'E') rotate(Math.PI / 8);
    else if (k === 'k' || k === 'K') studio.open();
    else if (k === 'm' || k === 'M') toggleMetro();
    else if (['1', '2', '3', '4'].includes(k)) setMode(['everyday', 'margazhi', 'pongal', 'deepavali'][+k - 1]);
  });

  // dim pins of other categories while a story is open on mobile
  on('mode', () => {});

  // ---------------------------------------------------------------- go!
  await fetchProbe;
  setLoad('Opening the doors…', 1);
  window.__nc = { engine, city, buildings, env, places, houses, doorsteps, studio, fireworks, openPlace, setMode, story, interior, metro, weather, names, film };
  engine.start();
  // cinematic establishing shot
  engine.flyTo({ target: [-10, 0, -30], dist: 2400, polar: 0.62, azimuth: -0.9, duration: 0.001 });
  await frame();
  cancelAnimationFrame(loaderRaf);
  $('#loader').classList.add('done');
  await engine.flyTo({ ...home, duration: state.reduceMotion ? 0.001 : 4.2 });
  if (!localStorage.getItem('nc.onboarded')) {
    onboardingModal(modal, { onDone: () => localStorage.setItem('nc.onboarded', '1') });
  }
  // deep link: #place=central or #studio
  const hashPlace = new URLSearchParams(location.hash.slice(1)).get('place');
  if (hashPlace) { const p = places.find((x) => x.id === hashPlace); if (p) openPlace(p); }
  if (location.hash === '#studio') studio.open();
  void testConnection; void CATS; void gsap; void centroid; void nearestOnLine;
}
