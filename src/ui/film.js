import * as THREE from 'three';
import gsap from 'gsap';
import { state } from '../core/state.js';

/**
 * THE FILM — a two-minute guided showreel of everything in Namma Chennai, for visitors who
 * want the whole thing at a glance. Each shot is a camera move plus a change to the city
 * (festival, weather, metro, an interior), with a bilingual subtitle. Letterboxed, skippable,
 * and it restores the city exactly as it was when you leave.
 */
const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, state.reduceMotion ? Math.min(ms, 1800) : ms));

export class Film {
  constructor(app) {
    this.app = app; // { engine, env, weather, metro, interior, studio, places, setMode, fireworks, story, sound }
    this.el = $('#film');
    $('#film-exit').onclick = () => this.stop();
    $('#film-next').onclick = () => this.skip?.();
    this.el.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.stop(); if (e.key === 'ArrowRight') this.skip?.(); });
  }

  /** slow orbit around a point — the "establishing shot" move */
  orbit(target, dist, polar, az0, az1, dur) {
    const e = this.app.engine, c = e.controls;
    const p = { az: az0 };
    return new Promise((res) => {
      this.tw = gsap.to(p, { az: az1, duration: state.reduceMotion ? 0.01 : dur, ease: 'sine.inOut',
        onUpdate: () => { c.target.set(target[0], 0, target[1]); e.camera.position.copy(c.target).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(dist, polar, p.az))); e.camera.lookAt(c.target); },
        onComplete: res });
    });
  }
  fly(target, dist, polar, az, dur = 3) { return this.app.engine.flyTo({ target: [target[0], 0, target[1]], dist, polar, azimuth: az, duration: dur }); }
  place(id) { return this.app.places.find((p) => p.id === id); }

  caption(ta, en, kicker = '') {
    const c = $('#film-caption');
    c.classList.remove('show');
    void c.offsetWidth;
    c.innerHTML = `${kicker ? `<span class="k">${kicker}</span>` : ''}<span class="ta">${ta}</span><span class="en">${en}</span>`;
    c.classList.add('show');
  }

  shots(S) {
    const A = this.app;
    const P = (id) => this.place(id)?._focus || [0, 0];
    return [
      { title: 'Opening', run: async () => {
        $('#film-title').classList.add('show');
        await S.orbit([-40, 40], 2100, 0.78, -1.2, -0.55, 7);
        if (!S.live()) return;
        $('#film-title').classList.remove('show');
      } },
      { title: 'Chennai Central', run: async () => {
        S.cap('சென்னை சென்ட்ரல் · 1873', 'Chennai Central — the red-brick gateway to the south. Every street here is real, from OpenStreetMap.', '01 · Heritage');
        await S.fly([20, -20], 260, 1.05, 0.2, 3.2);
        if (!S.live()) return;
        await S.orbit([20, -20], 260, 1.05, 0.2, -0.45, 6);
        if (!S.live()) return;
      } },
      { title: 'Ripon & Victoria Hall', run: async () => {
        S.cap('ரிப்பன் மாளிகை · விக்டோரியா மண்டபம்', 'Victoria Public Hall (1890) and the white Ripon Building (1913), seat of the city since 1688.');
        const r = P('ripon');
        await S.fly([r[0] + 60, r[1]], 300, 1.02, -0.1, 3);
        if (!S.live()) return;
        await S.orbit([r[0] + 60, r[1]], 300, 1.02, -0.1, 0.5, 5);
        if (!S.live()) return;
      } },
      { title: 'Metro', run: async () => {
        S.cap('நகரின் கீழ் மெட்ரோ', 'Underneath: the Blue and Green metro lines cross at Central Metro, exactly where they run.', '02 · Under the city');
        A.metro.setXray(true);
        await S.fly([-60, 40], 620, 1.12, -0.55, 3);
        if (!S.live()) return;
        await S.orbit([-60, 40], 620, 1.12, -0.55, -0.2, 5);
        if (!S.live()) return;
        A.metro.setXray(false);
      } },
      { title: 'Temple', run: async () => {
        S.cap('கந்த கோட்டம்', 'Kandha Kottam — a Dravidian temple: seven-tiered gopuram, kaavi-striped walls, the peacock and the flagstaff.', '03 · Temple');
        const k = P('kandhakottam');
        await S.fly(k, 130, 1.08, 0.8, 3.4);
        if (!S.live()) return;
        await S.orbit(k, 130, 1.08, 0.8, 2.3, 7);
        if (!S.live()) return;
      } },
      { title: 'Streets', run: async () => {
        S.cap('ஜார்ஜ் டவுன்', 'George Town & Park Town — real shop and street names, autos, buses and trains on the left.', '04 · Street life');
        await S.fly([75, -225], 70, 1.22, 1.9, 3);
        if (!S.live()) return;
        await S.orbit([75, -225], 70, 1.22, 1.9, 1.3, 5);
        if (!S.live()) return;
      } },
      { title: 'Fort', run: async () => {
        S.cap('புனித ஜார்ஜ் கோட்டை · 1644', 'Fort St. George — where Madras began, on a strip of sand granted in 1639.');
        const f = P('fort');
        await S.fly(f, 420, 0.95, 1.1, 3.2);
        if (!S.live()) return;
        await S.orbit(f, 420, 0.95, 1.1, 0.5, 5);
        if (!S.live()) return;
      } },
      { title: 'Margazhi', run: async () => {
        A.setMode('margazhi');
        S.cap('மார்கழி', 'Margazhi dawn — the month when kolams grow street-sized before sunrise.', '05 · Festivals');
        await S.fly([-600, 590], 230, 0.95, -0.3, 3.4);
        if (!S.live()) return;
        await S.orbit([-600, 590], 230, 0.95, -0.3, 0.3, 5);
        if (!S.live()) return;
      } },
      { title: 'Pongal', run: async () => {
        A.setMode('pongal');
        const h = A.houses.find((x) => x.place.id === 'home-pongal');
        S.cap('பொங்கலோ பொங்கல்!', 'Thai Pongal — pots boiling over at every door, sugarcane, and cattle dressed for Mattu Pongal.');
        if (h) { const f = [h.c[0] + Math.sin(h.ang) * 8, h.c[1] + Math.cos(h.ang) * 8]; await S.fly(f, 60, 1.0, h.ang + 0.6, 3.4); if (!S.live()) return; await S.orbit(f, 60, 1.0, h.ang + 0.6, h.ang - 0.4, 5); }
        else await S.wait(5000);
        if (!S.live()) return;
      } },
      { title: 'Monsoon', run: async () => {
        A.setMode('everyday');
        A.env.setWeather('storm'); A.sound?.setWeather?.('storm');
        S.cap('இடிமழை', 'A Chennai monsoon storm — wet streets, rain and lightning that strikes the tallest towers.', '06 · Weather');
        await S.fly([60, -40], 520, 1.22, -0.35, 3);
        if (!S.live()) return;
        const strike = () => { const d = A.weather.strike(); A.env.lightning(); A.sound?.thunder?.(Math.min(4000, (d / 343) * 1000)); };
        setTimeout(() => S.live() && strike(), 900); setTimeout(() => S.live() && strike(), 3600);
        await S.orbit([60, -40], 520, 1.22, -0.35, 0.05, 6);
        if (!S.live()) return;
        A.env.setWeather('clear'); A.sound?.setWeather?.('clear');
      } },
      { title: 'Deepavali', run: async () => {
        A.setMode('deepavali');
        S.cap('தீபாவளி', 'Deepavali night — lamps on every threshold, lights down the facades, crackers in the lanes.');
        await S.fly([100, 60], 900, 1.15, -0.3, 3.4);
        if (!S.live()) return;
        for (let i = 0; i < 6; i++) setTimeout(() => S.live() && A.fireworks.launch(), i * 650);
        await S.orbit([100, 60], 900, 1.15, -0.3, 0.2, 7);
        if (!S.live()) return;
      } },
      { title: 'Inside the temple', run: async () => {
        S.cap('உள்ளே வாருங்கள்', 'Step inside: the temple courtyard at dusk…', '07 · Step inside');
        A.interior.open('temple');
        await S.wait(6500);
        if (!S.live()) return;
      } },
      { title: 'Inside a home', run: async () => {
        S.cap('தீபாவளி அதிகாலை', '…and a Tamil home at 4:30 am on Deepavali — oil lamps, sweets, new silks.');
        A.interior.open('deepavali');
        await S.wait(6500);
        if (!S.live()) return;
        A.interior.close();
      } },
      { title: 'Kolam Studio', run: async () => {
        A.setMode('everyday');
        S.cap('கோலம்', 'Kolam Studio — one unbroken line looping around every dot. Draw your own and leave it on a doorstep.', '08 · Kolam');
        A.studio.open('margazhi-9');
        await S.wait(8000);
        if (!S.live()) return;
        A.studio.close();
      } },
      { title: 'End', run: async () => {
        $('#film-caption').classList.remove('show');
        $('#film-end').classList.add('show');
        await S.orbit([-40, 40], 1500, 0.86, -0.7, -0.42, 6);
        if (!S.live()) return;
        $('#film-end').classList.remove('show');
      } },
    ];
  }

  async play() {
    if (this.running) return;
    const A = this.app;
    this.running = true;
    this.saved = { mode: A.env.mode, time: A.env.time, weather: A.env.weather, cam: A.engine.cameraState() };
    A.story.close(true);
    document.body.classList.add('filming');
    this.el.hidden = false;
    this.el.focus();
    this.epoch = 0;
    const api = (ep) => {
      const live = () => this.running && this.epoch === ep;
      return {
        live,
        fly: (...a) => (live() ? this.fly(...a) : Promise.resolve()),
        orbit: (...a) => (live() ? this.orbit(...a) : Promise.resolve()),
        cap: (...a) => live() && this.caption(...a),
        wait: (ms) => (live() ? wait(ms) : Promise.resolve()),
      };
    };
    const shotList = this.shots(api(0));
    const bar = $('#film-progress span');
    for (let i = 0; i < shotList.length && this.running; i++) {
      bar.style.width = ((i / shotList.length) * 100).toFixed(1) + '%';
      $('#film-chapter').textContent = `${i + 1} / ${shotList.length} · ${shotList[i].title}`;
      const ep = ++this.epoch;
      const shot = this.shots(api(ep))[i];
      // a shot can be skipped: race the shot against the skip button
      await Promise.race([shot.run(), new Promise((r) => (this.skip = () => { this.epoch++; this.tw?.kill(); r(); }))]);
      if (!this.running) break;
    }
    bar.style.width = '100%';
    this.stop();
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    this.epoch++;
    this.tw?.kill();
    const A = this.app;
    ['#film-title', '#film-caption', '#film-end'].forEach((s) => $(s).classList.remove('show'));
    if (A.interior.renderer) A.interior.close();
    if (A.studio.isOpen()) A.studio.close();
    if (A.metro.on) A.metro.setXray(false);
    A.env.setWeather(this.saved.weather); A.sound?.setWeather?.(this.saved.weather);
    A.setMode(this.saved.mode);
    if (this.saved.time !== A.env.time) A.env.setTime(this.saved.time);
    A.engine.restoreCamera(this.saved.cam, 2);
    document.body.classList.remove('filming');
    this.el.hidden = true;
  }
}
