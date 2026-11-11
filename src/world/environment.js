import * as THREE from 'three';
import gsap from 'gsap';
import { state, emit, hash } from '../core/state.js';
import { centroid, nearestOnLine, inPoly } from './geo.js';
import { renderKolam } from '../kolam/engine.js';
import { presetKolam } from '../kolam/presets.js';
import { radialTex } from './nature.js';
import { cow, haystack } from '../interior/props.js';

/**
 * Sky, light and the four "moods" of the city — Everyday, Margazhi dawn, Pongal morning,
 * Deepavali night — plus all festival decorations, placed deliberately at doorsteps on
 * real residential lanes (not scattered).
 */

export const MODES = {
  everyday: {
    sky: ['#9fc0dc', '#e9dccb', '#cdbda4'], sun: '#fff0d8', sunI: 2.6, sunDir: [-0.55, 0.62, 0.42], hemi: 0.95, hemiSky: '#dfe8ff', hemiGround: '#6b5a48',
    fog: '#e3d8c6', fogD: 0.00019, exposure: 1.0, night: 0, lit: 0.0, bloom: [0.12, 0.9, 0.4], stars: 0, festive: 0, water: 0,
    caption: null,
  },
  margazhi: {
    sky: ['#2b3a66', '#e7b7a8', '#5c5a73'], sun: '#ffc0a0', sunI: 1.25, sunDir: [0.7, 0.16, -0.25], hemi: 0.85, hemiSky: '#b4c0ea', hemiGround: '#4a4260',
    fog: '#a9a6bd', fogD: 0.00048, exposure: 1.05, night: 0.55, lit: 0.14, bloom: [0.35, 0.92, 0.45], stars: 0.35, festive: 0, water: 0.4,
    caption: { ta: 'மார்கழித் திங்கள்…', en: 'Margazhi, before sunrise — the month of dawn kolams and street bhajans.' },
  },
  pongal: {
    sky: ['#7fb2da', '#f6d39a', '#d8b98c'], sun: '#ffd79a', sunI: 3.0, sunDir: [0.75, 0.32, 0.1], hemi: 0.9, hemiSky: '#f3e3c4', hemiGround: '#7a5a3a',
    fog: '#f0d9b0', fogD: 0.00022, exposure: 1.04, night: 0, lit: 0, bloom: [0.18, 0.88, 0.4], stars: 0, festive: 0, water: 0,
    caption: { ta: 'பொங்கலோ பொங்கல்!', en: 'Thai Pongal morning — pots boiling over at every door, sugarcane and colour.' },
  },
  deepavali: {
    sky: ['#0b0f2a', '#3a2b56', '#140f1f'], sun: '#8fa2ff', sunI: 0.45, sunDir: [0.3, 0.7, 0.4], hemi: 0.55, hemiSky: '#4a4f8f', hemiGround: '#1d1520',
    fog: '#1c1830', fogD: 0.00032, exposure: 1.0, night: 1, lit: 0.3, bloom: [0.7, 0.9, 0.45], stars: 1, festive: 1, water: 1,
    caption: { ta: 'தீபாவளி நல்வாழ்த்துகள்', en: 'Deepavali night — lamps at the doors, lights on the terraces, crackers over the open grounds.' },
  },
};

/** time-of-day lighting presets (festivals pick a default; the visitor can override) */
export const TIMES = {
  dawn: { ...MODES.margazhi, label: 'Dawn', ta: 'விடியல்' },
  morning: { ...MODES.everyday, label: 'Morning', ta: 'காலை' },
  noon: {
    label: 'Summer noon', ta: 'நண்பகல்',
    sky: ['#86b4dc', '#f1ead8', '#d9cbb0'], sun: '#fffaf0', sunI: 3.4, sunDir: [-0.15, 0.95, 0.2], hemi: 1.05, hemiSky: '#e9f0ff', hemiGround: '#8a7458',
    fog: '#efe4cf', fogD: 0.00026, exposure: 1.02, night: 0, lit: 0, bloom: [0.1, 0.92, 0.4], stars: 0, festive: 0, water: 0,
  },
  golden: { ...MODES.pongal, label: 'Golden morning', ta: 'பொன் காலை' },
  evening: {
    label: 'Evening', ta: 'மாலை',
    sky: ['#4a5d92', '#f2a66a', '#7a5a52'], sun: '#ff9a52', sunI: 2.0, sunDir: [-0.8, 0.12, 0.35], hemi: 0.75, hemiSky: '#d9b9b0', hemiGround: '#4c3a34',
    fog: '#d9a98a', fogD: 0.00028, exposure: 1.05, night: 0.45, lit: 0.22, bloom: [0.3, 0.9, 0.45], stars: 0.1, festive: 0, water: 0.45,
  },
  night: { ...MODES.deepavali, festive: 0, lit: 0.26, label: 'Night', ta: 'இரவு' },
};
export const FESTIVAL_TIME = { everyday: 'morning', margazhi: 'dawn', pongal: 'golden', deepavali: 'night' };
export const WEATHERS = {
  clear: { label: 'Clear', ta: 'தெளிவு' },
  haze: { label: 'Summer haze', ta: 'வெயில்' },
  rain: { label: 'Monsoon rain', ta: 'மழை' },
  storm: { label: 'Thunderstorm', ta: 'இடிமழை' },
};

function makeSky() {
  const geo = new THREE.SphereGeometry(5000, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, stars: { value: 0 }, time: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: /* glsl */ `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform float stars; uniform float time; varying vec3 vD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
      void main(){
        float y = vD.y;
        vec3 c = y > 0.0 ? mix(mid, top, pow(smoothstep(0.0, 0.6, y), 0.8)) : mix(mid, bot, smoothstep(0.0, -0.25, y));
        float sd = max(dot(normalize(vD), normalize(sunDir)), 0.0);
        c += sunCol * (pow(sd, 400.0) * 1.2 + pow(sd, 8.0) * 0.25);
        if (stars > 0.0 && y > 0.05) {
          vec3 p = floor(vD * 420.0);
          float s = step(0.9975, h(p)) * (0.6 + 0.4 * sin(time * 2.0 + h(p + 1.0) * 30.0));
          c += vec3(s) * stars * smoothstep(0.05, 0.35, y);
        }
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  m.renderOrder = -1;
  return m;
}

/** doorstep points: building edge nearest a residential lane, pushed out onto the street */
export function computeDoorsteps(city, centers, perCenter = 90) {
  const lanes = city.roads.filter((r) => /residential|living_street|unclassified|service|tertiary/.test(r.c));
  const out = [];
  for (const { c, r: rad, tag } of centers) {
    const cands = [];
    for (let bi = 0; bi < city.buildings.length; bi++) {
      const b = city.buildings[bi];
      if (b.n || b.a < 35 || b.a > 700 || b.k === 'roof') continue;
      const ct = centroid(b.o);
      const d = Math.hypot(ct[0] - c[0], ct[1] - c[1]);
      if (d > rad) continue;
      cands.push({ b, bi, ct, d });
    }
    cands.sort((a, b) => hash(a.b.id) - hash(b.b.id));
    let n = 0;
    for (const { b, bi, ct } of cands) {
      if (n >= perCenter) break;
      let best = null;
      for (const r of lanes) { const nn = nearestOnLine(ct, r.p); if (!best || nn.d < best.d) best = { ...nn, w: r.w }; }
      if (!best || best.d > 18) continue;
      // nearest point on the footprint to the lane point = the door
      let door = null;
      for (let i = 0; i < b.o.length; i++) {
        const nn = nearestOnLine(best.p, [b.o[i], b.o[(i + 1) % b.o.length]]);
        if (!door || nn.d < door.d) door = nn;
      }
      const dx = best.p[0] - door.p[0], dz = best.p[1] - door.p[1], L = Math.hypot(dx, dz) || 1;
      const out1 = Math.min(1.6, L * 0.5);
      const p = [door.p[0] + (dx / L) * out1, door.p[1] + (dz / L) * out1];
      if (inPoly(p, b.o)) continue;
      out.push({ p, n: [dx / L, dz / L], along: door.dir, bi, h: b.h, tag, id: b.id });
      n++;
    }
  }
  return out;
}

export class Environment {
  constructor(engine, city, { buildings, nature, ground, doorsteps, houses }) {
    this.e = engine; this.city = city; this.buildings = buildings; this.nature = nature; this.ground = ground;
    this.mode = 'everyday'; this.time = 'morning'; this.weather = 'clear'; this.wet = 0;
    this.sky = makeSky();
    engine.scene.add(this.sky);
    engine.scene.fog = new THREE.FogExp2('#e3d8c6', 0.00019);
    this.params = { ...this.paramsFrom(MODES.everyday), wet: 0 };
    this.apply(this.params);
    this.uReveal = { value: 0 };
    this.uTime = { value: 0 };
    this.decor = { deepavali: new THREE.Group(), pongal: new THREE.Group(), margazhi: new THREE.Group() };
    for (const g of Object.values(this.decor)) { g.visible = false; engine.scene.add(g); }
    this.doorsteps = doorsteps;
    this.houses = houses;
    this.buildDeepavali();
    this.buildPongal();
    this.buildMargazhi();
    // the everyday morning kolam: small, white, at many (not all) thresholds and at every story house
    this.daily = new THREE.Group();
    this.daily.userData.reveal = { value: 1 }; this.daily.userData.center = { value: new THREE.Vector2() };
    const dailySpots = [
      ...this.houses.filter((h) => !h.apartment).map((h) => ({ p: h.front, n: [Math.sin(h.ang), Math.cos(h.ang)] })),
      ...this.doorsteps.filter((d) => hash(d.id * 11) < 0.45).map((d) => ({ p: d.p, n: d.n })),
    ];
    this.daily.add(this.kolamDecals(dailySpots, ['sikku-5-diamond', 'sikku-3', 'pulli-star', 'deepa'], 2.3, this.daily, 0.9));
    engine.scene.add(this.daily);
    engine.onUpdate((dt, t) => { this.uTime.value = t; this.sky.material.uniforms.time.value = t; if (this.decor.pongal.visible) this.animated?.forEach((c) => c.userData.animate(t)); });
  }

  paramsFrom(m) {
    const c = (h) => new THREE.Color(h);
    return {
      skyT: c(m.sky[0]), skyM: c(m.sky[1]), skyB: c(m.sky[2]), sun: c(m.sun), sunI: m.sunI, sunDir: new THREE.Vector3(...m.sunDir).normalize(),
      hemi: m.hemi, hemiSky: c(m.hemiSky), hemiGround: c(m.hemiGround), fog: c(m.fog), fogD: m.fogD, exposure: m.exposure,
      night: m.night, lit: m.lit, stars: m.stars, festive: m.festive, water: m.water,
    };
  }

  apply(p) {
    const e = this.e, u = this.sky.material.uniforms;
    u.top.value.copy(p.skyT); u.mid.value.copy(p.skyM); u.bot.value.copy(p.skyB); u.sunDir.value.copy(p.sunDir); u.sunCol.value.copy(p.sun); u.stars.value = p.stars;
    e.sun.color.copy(p.sun); e.sun.intensity = p.sunI; e.sunDir.copy(p.sunDir);
    e.hemi.intensity = p.hemi; e.hemi.color.copy(p.hemiSky); e.hemi.groundColor.copy(p.hemiGround);
    e.scene.fog.color.copy(p.fog); e.scene.fog.density = p.fogD;
    e.renderer.toneMappingExposure = p.exposure;
    e.scene.environmentIntensity = 0.22 * (1 - 0.75 * p.night) * (1 - 0.55 * (p.wet || 0));
    const bu = this.buildings.material.userData.uniforms;
    bu.uNight.value = p.night; bu.uLit.value = p.lit; bu.uFestive.value = p.festive;
    this.nature.setNight(p.night);
    this.streetLife?.setNight(p.night);
    const w = this.ground.water.uniforms; w.uNight.value = p.water; w.uSky.value.copy(p.skyM).lerp(p.skyT, 0.3);
    // wet streets: darker, glossier asphalt and ground in the rain
    const wet = p.wet || 0;
    const rm = this.ground.roadMat; rm.roughness = 0.92 - wet * 0.62; rm.metalness = wet * 0.35; rm.color.set('#56534f').multiplyScalar(1 - wet * 0.35);
    this.ground.groundMat.color.set('#cbbda3').multiplyScalar(1 - wet * 0.22); this.ground.groundMat.roughness = 0.95 - wet * 0.4;
    this.buildings.material.roughness = 0.88 - wet * 0.3;
    document.body.dataset.mode = this.mode;
  }

  /** a lightning strike: sky + hemisphere flash; returns distance for thunder delay */
  lightning() {
    const e = this.e, base = e.hemi.intensity, skyT = this.sky.material.uniforms.top.value.clone();
    const flash = { k: 1 };
    gsap.fromTo(flash, { k: 1 }, { k: 0, duration: 0.55, ease: 'expo.out', onUpdate: () => {
      e.hemi.intensity = base + flash.k * 2.2;
      this.sky.material.uniforms.top.value.copy(skyT).lerp(new THREE.Color('#dfe6ff'), flash.k * 0.8);
    }, onComplete: () => { e.hemi.intensity = this.params.hemi; this.sky.material.uniforms.top.value.copy(this.params.skyT); } });
    if (Math.random() < 0.5) setTimeout(() => gsap.fromTo(flash, { k: 0.7 }, { k: 0, duration: 0.3, onUpdate: () => { e.hemi.intensity = this.params.hemi + flash.k * 3; } }), 140);
    return 200 + Math.random() * 1600;
  }

  /** final look = time-of-day preset, with festival glow, then weather on top */
  compose() {
    const tm = TIMES[this.time] || TIMES.morning;
    const p = this.paramsFrom({ ...tm, festive: this.mode === 'deepavali' ? 1 : 0, lit: this.mode === 'deepavali' && tm.night > 0.5 ? 0.3 : tm.lit });
    const w = this.weather;
    if (w === 'haze') {
      p.fog.lerp(new THREE.Color('#e9d2a8'), 0.6); p.fogD *= 2.6; p.skyM.lerp(new THREE.Color('#f0dcb4'), 0.5); p.skyT.lerp(new THREE.Color('#c9cfc9'), 0.35);
      p.sun.lerp(new THREE.Color('#ffe2b0'), 0.4); p.exposure += 0.04;
    } else if (w === 'rain' || w === 'storm') {
      const storm = w === 'storm';
      const grey = new THREE.Color(storm ? '#3c434e' : '#6f7884');
      const k = storm ? 0.85 : 0.68;
      p.skyT.lerp(grey, k); p.skyM.lerp(grey.clone().multiplyScalar(1.15), k); p.skyB.lerp(grey, k);
      p.fog.lerp(grey.clone().multiplyScalar(storm ? 0.85 : 1.0), 0.85); p.fogD *= storm ? 2.0 : 1.7;
      p.sunI *= storm ? 0.1 : 0.2; p.hemi *= storm ? 0.42 : 0.6; p.exposure -= storm ? 0.12 : 0.06; p.hemiSky.lerp(new THREE.Color('#aab4c2'), 0.6);
      p.night = Math.max(p.night, storm ? 0.45 : 0.25); p.lit = Math.max(p.lit, storm ? 0.3 : 0.18); p.water = Math.max(p.water, 0.2); p.stars = 0;
    }
    this.wet = w === 'rain' || w === 'storm' ? (w === 'storm' ? 1 : 0.75) : 0;
    p.wet = this.wet;
    return { p, bloom: tm.bloom };
  }

  /** animate from current look to the composed target */
  transition(dur = state.reduceMotion ? 0.01 : 3.2) {
    const { p: target, bloom } = this.compose();
    const from = this.params;
    if (from.wet == null) from.wet = 0;
    const cur = { k: 0 };
    if (this._tw) this._tw.kill();
    const lerpObj = (k) => {
      const p = {};
      for (const key of Object.keys(target)) {
        const a = from[key], b = target[key];
        if (a?.isColor) p[key] = a.clone().lerp(b, k);
        else if (a?.isVector3) p[key] = a.clone().lerp(b, k).normalize();
        else p[key] = a + (b - a) * k;
      }
      return p;
    };
    this.e.setBloom(...bloom);
    this._tw = gsap.to(cur, { k: 1, duration: dur, ease: 'sine.inOut', onUpdate: () => { this.params = lerpObj(cur.k); this.apply(this.params); }, onComplete: () => { this.params = target; this.apply(target); } });
  }

  setTime(time) { if (!TIMES[time]) return; this.time = time; state.time = time; this.transition(2.4); emit('sky', { time: this.time, weather: this.weather }); }
  setWeather(w) { if (!WEATHERS[w]) return; this.weather = w; state.weather = w; this.rain?.set(w); this.transition(2.4); emit('sky', { time: this.time, weather: this.weather }); }

  setMode(mode) {
    if (!MODES[mode] || mode === this.mode) return;
    const prev = this.mode;
    this.mode = mode; state.mode = mode;
    this.time = FESTIVAL_TIME[mode];
    const dur = state.reduceMotion ? 0.01 : 3.2;
    this.transition(dur);
    emit('sky', { time: this.time, weather: this.weather });
    // decorations: retract old, reveal new as a wave spreading from the camera target
    const t = this.e.controls.target;
    for (const [k, g] of Object.entries(this.decor)) {
      if (k === prev && g.visible) {
        gsap.to(g.userData.reveal, { value: 0, duration: dur * 0.5, ease: 'power2.in', onComplete: () => { if (this.mode !== k) g.visible = false; } });
      }
    }
    const showDaily = mode === 'everyday' || mode === 'deepavali';
    if (showDaily && !this.daily.visible) { this.daily.visible = true; gsap.fromTo(this.daily.userData.reveal, { value: 0 }, { value: 1, duration: dur, delay: dur * 0.3 }); }
    else if (!showDaily) gsap.to(this.daily.userData.reveal, { value: 0, duration: dur * 0.4, onComplete: () => { this.daily.visible = this.mode === 'everyday' || this.mode === 'deepavali'; } });
    if (this.decor[mode]) {
      const g = this.decor[mode];
      g.userData.center.value.set(t.x, t.z);
      g.visible = true;
      gsap.fromTo(g.userData.reveal, { value: 0 }, { value: 1, duration: dur * 1.3, delay: dur * 0.25, ease: 'sine.inOut' });
    }
    emit('mode', { mode, prev });
  }

  /** shader hook: instances grow in as the reveal wave passes their position */
  revealMaterial(mat, g, { flicker = false, cycle = false, emissiveBoost = 1 } = {}) {
    g.userData.reveal ||= { value: 0 };
    g.userData.center ||= { value: new THREE.Vector2() };
    const reveal = g.userData.reveal, center = g.userData.center, time = this.uTime;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uReveal = reveal; sh.uniforms.uCenter = center; sh.uniforms.uTime = time;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
        uniform float uReveal; uniform vec2 uCenter; uniform float uTime; varying float vSeed; varying float vVis;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 ip = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
          float dist = length(ip.xz - uCenter);
          float th = clamp(dist / 1400.0, 0.0, 0.92);
          float s = smoothstep(th, th + 0.08, uReveal);
          vVis = s;
          vSeed = fract(sin(dot(ip.xz, vec2(12.9898,78.233))) * 43758.5453);
          ${flicker ? 'transformed.y *= 0.85 + 0.25 * sin(uTime * 13.0 + vSeed * 50.0) * sin(uTime * 7.3 + vSeed * 20.0);' : ''}
          transformed *= s;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        uniform float uTime; varying float vSeed; varying float vVis;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          ${cycle ? `float ph = uTime * 1.6 + vSeed * 6.2831; diffuseColor.rgb *= 0.35 + 0.65 * (0.5 + 0.5 * sin(ph));` : ''}
          ${flicker ? 'diffuseColor.rgb *= 0.85 + 0.15 * sin(uTime * 17.0 + vSeed * 40.0);' : ''}
          diffuseColor.rgb *= ${emissiveBoost.toFixed(2)};`);
    };
    mat.customProgramCacheKey = () => `reveal-${flicker}-${cycle}-${emissiveBoost}-${mat.uuid}`;
    return mat;
  }

  // ---------------------------------------------------------------- Deepavali
  buildDeepavali() {
    const g = this.decor.deepavali;
    g.userData.reveal = { value: 0 }; g.userData.center = { value: new THREE.Vector2() };
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    // diyas: a short row of agal vilakku along each doorstep
    const spots = [];
    for (const d of this.doorsteps) {
      const n = 3 + Math.floor(hash(d.id) * 4);
      for (let k = 0; k < n; k++) {
        const off = (k - (n - 1) / 2) * 0.55;
        spots.push([d.p[0] + d.along[0] * off, d.p[1] + d.along[1] * off]);
      }
    }
    for (const h of this.houses) for (let k = 0; k < 9; k++) { const off = (k - 4) * 0.5; spots.push([h.front[0] + Math.cos(h.ang) * off, h.front[1] - Math.sin(h.ang) * off]); }
    const bowlGeo = new THREE.CylinderGeometry(0.16, 0.08, 0.1, 8); bowlGeo.translate(0, 0.25, 0);
    const flameGeo = new THREE.ConeGeometry(0.06, 0.24, 6); flameGeo.translate(0, 0.42, 0);
    const bowls = new THREE.InstancedMesh(bowlGeo, this.revealMaterial(new THREE.MeshStandardMaterial({ color: '#9c4a2f', roughness: 0.9 }), g), spots.length);
    const flames = new THREE.InstancedMesh(flameGeo, this.revealMaterial(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.62, 0.22) }), g, { flicker: true, emissiveBoost: 2.6 }), spots.length);
    const glowMat = this.revealMaterial(new THREE.MeshBasicMaterial({ map: radialTex(), color: '#ff9a3c', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }), g, { flicker: true });
    const glowGeo = new THREE.PlaneGeometry(2.6, 2.6); glowGeo.rotateX(-Math.PI / 2); glowGeo.translate(0, 0.28, 0);
    const glows = new THREE.InstancedMesh(glowGeo, glowMat, spots.length);
    spots.forEach(([x, z], i) => { m.compose(new THREE.Vector3(x, 0, z), q.identity(), s); bowls.setMatrixAt(i, m); flames.setMatrixAt(i, m); glows.setMatrixAt(i, m); });
    g.add(bowls, flames, glows);

    // serial lights along terrace parapets of homes near the doorsteps
    const bulbs = [];
    const seen = new Set();
    const budget = this.e.quality === 'high' ? 9000 : this.e.quality === 'medium' ? 5000 : 1800;
    for (const d of this.doorsteps) {
      if (bulbs.length > budget) break;
      if (seen.has(d.bi) || hash(d.id * 3) < 0.5) continue; seen.add(d.bi);
      const b = this.city.buildings[d.bi];
      // strings run along the street-facing parapet, then cascade down the facade
      const ring = b.o;
      let bestI = 0, bestD = Infinity;
      for (let i = 0; i < ring.length; i++) { const a = ring[i], c = ring[(i + 1) % ring.length]; const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]; const dd = Math.hypot(m[0] - d.p[0], m[1] - d.p[1]); if (dd < bestD) { bestD = dd; bestI = i; } }
      const a = ring[bestI], c = ring[(bestI + 1) % ring.length];
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const nx = d.n[0] * 0.25, nz = d.n[1] * 0.25;
      const n = Math.max(2, Math.floor(L / 1.1));
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = a[0] + (c[0] - a[0]) * t + nx, z = a[1] + (c[1] - a[1]) * t + nz;
        bulbs.push([x, b.h + 0.15 - Math.sin(t * Math.PI) * 0.35, z]);
        if (k % 2 === 0) for (let y = b.h - 0.9; y > Math.max(2.6, b.h - 6.5); y -= 0.9) bulbs.push([x, y - Math.sin((y + k) * 0.7) * 0.1, z]);
      }
    }
    const bulbGeo = new THREE.SphereGeometry(0.09, 5, 3);
    const bulbMat = this.revealMaterial(new THREE.MeshBasicMaterial({ color: '#ffffff' }), g, { cycle: true, emissiveBoost: 2.2 });
    const bulbMesh = new THREE.InstancedMesh(bulbGeo, bulbMat, bulbs.length);
    const cols = ['#ffcf66', '#ff6b3d', '#7fd3ff', '#ff79c6', '#a6ff8f', '#fff2cc'];
    const col = new THREE.Color();
    bulbs.forEach(([x, y, z], i) => { m.compose(new THREE.Vector3(x, y, z), q.identity(), s); bulbMesh.setMatrixAt(i, m); bulbMesh.setColorAt(i, col.set(cols[Math.floor(hash(i * 7) * cols.length)])); });
    g.add(bulbMesh);

    // paper star lanterns hung in front of doorways (a common Chennai sight at festival time)
    const starShape = new THREE.Shape();
    for (let k = 0; k <= 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 0.18 : 0.42; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (k === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y); }
    const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.04, bevelSegments: 1 });
    starGeo.translate(0, 0, -0.08);
    const lanternSpots = this.doorsteps.filter((d) => hash(d.id * 17) < 0.3);
    const starMat = this.revealMaterial(new THREE.MeshBasicMaterial({ color: '#ffffff' }), g, { emissiveBoost: 1.8 });
    const stars = new THREE.InstancedMesh(starGeo, starMat, Math.max(1, lanternSpots.length));
    const tailGeo = new THREE.ConeGeometry(0.12, 0.6, 6, 1, true); tailGeo.translate(0, -0.7, 0);
    const tails = new THREE.InstancedMesh(tailGeo, this.revealMaterial(new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide, transparent: true, opacity: 0.8 }), g, { emissiveBoost: 1.3 }), Math.max(1, lanternSpots.length));
    const lc = ['#ff5a5f', '#ffb347', '#ffd84d', '#7bd389', '#6ec6ff', '#ff79c6'];
    lanternSpots.forEach((d, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(d.n[0], d.n[1]));
      m.compose(new THREE.Vector3(d.p[0] - d.n[0] * 0.6, 3.4, d.p[1] - d.n[1] * 0.6), q, s);
      stars.setMatrixAt(i, m); tails.setMatrixAt(i, m);
      const cc = new THREE.Color(lc[Math.floor(hash(d.id * 5) * lc.length)]);
      stars.setColorAt(i, cc); tails.setColorAt(i, cc);
    });
    g.add(stars, tails);
    // colour rangoli-style kolams at the doors that don't already have the white morning kolam
    g.add(this.kolamDecals(this.doorsteps.filter((d) => hash(d.id * 11) >= 0.45).map((d) => ({ p: d.p, n: d.n })), ['deepa', 'sikku-multi-6', 'pongal-sikku'], 2.6, g, 1.0));
    this.counts = { diyas: spots.length, bulbs: bulbs.length, lanterns: lanternSpots.length };
    void up;
  }

  // ---------------------------------------------------------------- Pongal
  buildPongal() {
    const g = this.decor.pongal;
    g.userData.reveal = { value: 0 }; g.userData.center = { value: new THREE.Vector2() };
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    const spots = this.doorsteps.filter((d) => hash(d.id * 5) < 0.55);
    // pot: lathe profile in clay/brass, with overflowing white foam
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.12 + Math.sin(t * Math.PI) * 0.28 + (t > 0.85 ? (t - 0.85) * 0.6 : 0), t * 0.62)); }
    const potGeo = new THREE.LatheGeometry(pts, 14);
    const pots = new THREE.InstancedMesh(potGeo, this.revealMaterial(new THREE.MeshStandardMaterial({ color: '#b8742f', roughness: 0.45, metalness: 0.35 }), g), spots.length + this.houses.length);
    const foamGeo = new THREE.SphereGeometry(0.24, 10, 6); foamGeo.scale(1, 0.55, 1); foamGeo.translate(0, 0.66, 0);
    const foams = new THREE.InstancedMesh(foamGeo, this.revealMaterial(new THREE.MeshStandardMaterial({ color: '#fbf6ea', roughness: 0.8 }), g), spots.length + this.houses.length);
    // turmeric plant tied to the pot's neck
    const leafGeo = new THREE.ConeGeometry(0.06, 0.5, 4); leafGeo.translate(0.18, 0.75, 0); leafGeo.rotateZ(-0.3);
    const leaves = new THREE.InstancedMesh(leafGeo, this.revealMaterial(new THREE.MeshStandardMaterial({ color: '#3f8b3a' }), g), spots.length + this.houses.length);
    // three hearth stones & firewood glow
    const stoneGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    // sugarcane leaning by the door
    const caneGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.6, 6); caneGeo.translate(0, 1.3, 0); caneGeo.rotateZ(0.16);
    const canes = new THREE.InstancedMesh(caneGeo, this.revealMaterial(new THREE.MeshStandardMaterial({ color: '#5b6b2f', roughness: 0.7 }), g), (spots.length + this.houses.length) * 2);
    const caneLeafGeo = new THREE.ConeGeometry(0.35, 0.9, 5, 1, true); caneLeafGeo.translate(0.4, 2.8, 0); caneLeafGeo.rotateZ(0.25);
    const caneLeaves = new THREE.InstancedMesh(caneLeafGeo, this.revealMaterial(new THREE.MeshStandardMaterial({ color: '#6f9a3a', side: THREE.DoubleSide }), g), (spots.length + this.houses.length) * 2);
    const allSpots = [...spots.map((d) => ({ p: d.p, along: d.along, n: d.n })), ...this.houses.map((h) => ({ p: h.front, along: [Math.cos(h.ang), -Math.sin(h.ang)], n: [Math.sin(h.ang), Math.cos(h.ang)] }))];
    const stones = new THREE.InstancedMesh(stoneGeo, this.revealMaterial(new THREE.MeshStandardMaterial({ color: '#7a6a5a' }), g), allSpots.length * 3);
    allSpots.forEach((d, i) => {
      const potPos = new THREE.Vector3(d.p[0] + d.n[0] * 0.9, 0.22, d.p[1] + d.n[1] * 0.9);
      m.compose(potPos, q.identity(), s); pots.setMatrixAt(i, m); foams.setMatrixAt(i, m); leaves.setMatrixAt(i, m);
      for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; m.compose(new THREE.Vector3(potPos.x + Math.cos(a) * 0.3, 0.11, potPos.z + Math.sin(a) * 0.3), q.identity(), s); stones.setMatrixAt(i * 3 + k, m); }
      for (const [k, side] of [[0, -1], [1, 1]]) {
        const ang = Math.atan2(d.along[0], d.along[1]);
        q.setFromAxisAngle(up, ang + (side < 0 ? Math.PI : 0));
        m.compose(new THREE.Vector3(d.p[0] + d.along[0] * side * 1.3 - d.n[0] * 0.3, 0, d.p[1] + d.along[1] * side * 1.3 - d.n[1] * 0.3), q, s);
        canes.setMatrixAt(i * 2 + k, m); caneLeaves.setMatrixAt(i * 2 + k, m);
      }
    });
    g.add(pots, foams, leaves, canes, caneLeaves, stones);
    // coloured kolams on the thresholds
    g.add(this.kolamDecals(allSpots, ['pongal-sikku', 'pongal-pot', 'sikku-multi-6', 'deepa'], 2.8, g));
    // marigold & mango-leaf thoranam over the story-house doors
    g.add(this.thoranams(g));
    // Mattu Pongal: decorated cattle and a haystack beside the Pongal house
    const ph = this.houses.find((h) => h.place.id === 'home-pongal');
    if (ph) {
      const side = [Math.cos(ph.ang), -Math.sin(ph.ang)], fw = [Math.sin(ph.ang), Math.cos(ph.ang)];
      const at = (a, b) => [ph.c[0] + side[0] * a + fw[0] * b, ph.c[1] + side[1] * a + fw[1] * b];
      [['#c3332f', -3.2, ph.d / 2 + 3.2, 1.5], ['#2a5bb5', 3.4, ph.d / 2 + 4.6, 1.3], ['#d4a640', 0.4, ph.d / 2 + 7.2, -1.7]].forEach(([hc, a, b, r]) => {
        const c = cow({ hornColor: hc }); const p = at(a, b); c.position.set(p[0], 0.2, p[1]); c.rotation.y = ph.ang + r; c.scale.setScalar(1.35); g.add(c);
        this.animated = this.animated || []; this.animated.push(c);
      });
      const hs = haystack(); const hp = at(-6.5, ph.d / 2 + 6.5); hs.position.set(hp[0], 0.2, hp[1]); hs.scale.setScalar(1.3); g.add(hs);
    }
  }

  // ---------------------------------------------------------------- Margazhi
  buildMargazhi() {
    const g = this.decor.margazhi;
    g.userData.reveal = { value: 0 }; g.userData.center = { value: new THREE.Vector2() };
    const allSpots = [...this.doorsteps.map((d) => ({ p: d.p, along: d.along, n: d.n })), ...this.houses.map((h) => ({ p: h.front, along: [Math.cos(h.ang), -Math.sin(h.ang)], n: [Math.sin(h.ang), Math.cos(h.ang)] }))];
    // Margazhi kolams are big: they spill from the door into the street
    g.add(this.kolamDecals(allSpots, ['margazhi-9', 'sikku-7', 'sikku-5-diamond', 'margazhi-11', 'pulli-lotus'], 4.6, g, 1.6));
    // the street-lights stay on in the pre-dawn
  }

  kolamDecals(spots, presetIds, size, g, push = 1.0) {
    const grp = new THREE.Group();
    const per = Math.ceil(spots.length / presetIds.length);
    presetIds.forEach((id, k) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 512;
      const kol = presetKolam(id, { dots: true, width: 7 });
      renderKolam(cv.getContext('2d'), kol, { size: 512, transparent: true });
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      const mat = this.revealMaterial(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), g);
      const geo = new THREE.PlaneGeometry(size, size); geo.rotateX(-Math.PI / 2);
      const list = spots.slice(k * per, (k + 1) * per);
      const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      list.forEach((d, i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(d.n[0], d.n[1]));
        m.compose(new THREE.Vector3(d.p[0] + d.n[0] * size * 0.35 * push, 0.26, d.p[1] + d.n[1] * size * 0.35 * push), q, new THREE.Vector3(1, 1, 1));
        im.setMatrixAt(i, m);
      });
      im.renderOrder = 3;
      grp.add(im);
    });
    return grp;
  }

  thoranams(g) {
    const marigold = [];
    for (const h of this.houses) {
      const ca = Math.cos(h.ang), sa = Math.sin(h.ang);
      const fx = h.front[0] - Math.sin(h.ang) * 2.0, fz = h.front[1] - Math.cos(h.ang) * 2.0;
      for (let k = 0; k <= 16; k++) {
        const t = k / 16, off = (t - 0.5) * 3.2;
        marigold.push([fx + ca * off, 3.6 - Math.sin(t * Math.PI) * 0.35, fz - sa * off]);
      }
    }
    const geo = new THREE.SphereGeometry(0.09, 6, 4);
    const im = new THREE.InstancedMesh(geo, this.revealMaterial(new THREE.MeshStandardMaterial({ color: '#f29a1f', roughness: 0.8 }), g), Math.max(1, marigold.length));
    const m = new THREE.Matrix4();
    marigold.forEach(([x, y, z], i) => { m.makeTranslation(x, y, z); im.setMatrixAt(i, m); });
    return im;
  }
}
