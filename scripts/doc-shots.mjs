#!/usr/bin/env node
/**
 * Captures every feature of the live site for the documentation PDF.
 *   node scripts/doc-shots.mjs            (live site)
 *   BASE=http://localhost:4173 node scripts/doc-shots.mjs
 * Runs its own headless Chrome via playwright-core. Output: docs/guide/shots/*.jpg
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE || 'https://chennai-diorama.pages.dev';
const OUT = 'docs/guide/shots';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });

async function shot(name, setup, { width = 1600, height = 1000, scale = 1, hideUi = false, mobile = false, onboard = true } = {}) {
  if (ONLY && !ONLY.includes(name)) return;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  await page.addInitScript((ob) => { if (ob) localStorage.setItem('nc.onboarded', '1'); localStorage.setItem('nc.quality', 'high'); }, onboard);
  await page.goto(BASE + '/');
  if (name === 'loader') { await sleep(900); await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 84 }); await ctx.close(); return console.log('✓', name); }
  await page.waitForFunction(() => document.querySelector('#loader.done') && window.__nc, null, { timeout: 120000 });
  await sleep(4800);
  if (onboard) await page.evaluate(() => { document.querySelector('#modal').hidden = true; });
  try { await page.evaluate(setup); } catch (e) { console.log('!', name, e.message); }
  if (hideUi) await page.evaluate(() => document.body.classList.add('filming'));
  await sleep(700);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 84 });
  console.log('✓', name);
  await ctx.close();
}

const wait = (ms) => `await new Promise((r) => setTimeout(r, ${ms}));`;
const S = (body) => new Function(`return (async () => { const nc = window.__nc; const $ = (s) => document.querySelector(s); ${body} })();`);
const fly = (t, dist, polar, az) => `await nc.engine.flyTo({ target: [${t}], dist: ${dist}, polar: ${polar}, azimuth: ${az}, duration: 0.01 });`;
const OVER = fly('-150, 0, -40', 480, 1.1, -0.42);

try {
  // ---- first contact
  await shot('loader', S(''));
  await shot('welcome', S(`${wait(500)}`), { onboard: false });
  await shot('overview', S(`${wait(1500)}`));

  // ---- the city
  await shot('city-wide', S(`nc.env.setTime('morning'); nc.env.transition(0.01); ${fly('0, 0, 0', 1300, 0.95, -0.3)} ${wait(2500)}`), { hideUi: true });
  await shot('hero-golden', S(`nc.env.setTime('golden'); nc.env.transition(0.01); ${OVER} ${wait(2500)}`), { hideUi: true });
  await shot('ripon', S(`const p = nc.places.find((x) => x.id === 'ripon'); nc.env.setTime('morning'); nc.env.transition(0.01);
    ${fly('p._focus[0], 0, p._focus[1]', 190, 1.05, 0.9)} ${wait(2500)}`), { hideUi: true });
  await shot('temple-aerial', S(`const p = nc.places.find((x) => x.id === 'kandhakottam'); nc.env.setTime('evening'); nc.env.transition(0.01);
    ${fly('p._focus[0], 0, p._focus[1]', 120, 1.12, 2.0)} ${wait(2500)}`), { hideUi: true });
  await shot('streets', S(`const it = nc.names.group.userData.named.find((n) => /City Tower/.test(n.en));
    ${fly('it.p[0] + it.n[0] * 6, 0, it.p[1] + it.n[1] * 6', 70, 1.0, 'Math.atan2(it.n[0], it.n[1]) + 0.25')} ${wait(2200)}`), { hideUi: true });
  await shot('hover', S(`${OVER} ${wait(1500)} const pin = document.querySelector('#pins .pin, #pins button'); pin && pin.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })); ${wait(500)}`));

  // ---- stories
  await shot('story-central', S(`nc.env.setTime('golden'); nc.env.transition(0.01); nc.openPlace(nc.places.find((p) => p.id === 'central')); ${wait(4200)}`));
  await shot('story-thennow', S(`nc.openPlace(nc.places.find((p) => p.id === 'central')); ${wait(4200)}
    document.querySelectorAll('.story-tabs button')[1]?.click(); ${wait(1500)} const c = document.querySelector('#story-scroll .compare, #story-scroll [class*=compare]'); c?.scrollIntoView({ block: 'center' }); ${wait(1500)}`));
  await shot('story-fort', S(`nc.openPlace(nc.places.find((p) => p.id === 'fort')); ${wait(4500)}`));
  await shot('story-temple', S(`nc.openPlace(nc.places.find((p) => p.id === 'kandhakottam')); ${wait(4200)}
    const h = [...document.querySelectorAll('#story-scroll h4, #story-scroll h3')].find((e) => /read a Tamil temple/i.test(e.textContent)); h?.scrollIntoView({ block: 'start' }); ${wait(1200)}`));
  await shot('story-kaapi', S(`nc.openPlace(nc.places.find((p) => p.id === 'kaapi')); ${wait(4500)}`));
  await shot('lightbox', S(`nc.openPlace(nc.places.find((p) => p.id === 'central')); ${wait(4200)} document.querySelector('#story-scroll .gallery img, #story-scroll figure img')?.click(); ${wait(2500)}`));

  // ---- festivals
  await shot('fest-everyday', S(`nc.setMode('everyday'); nc.env.transition(0.01); ${fly('-60, 0, 40', 260, 1.08, 0.5)} ${wait(3500)}`));
  await shot('fest-margazhi', S(`nc.setMode('margazhi'); nc.env.transition(0.01); ${fly('-60, 0, 40', 260, 1.08, 0.5)} ${wait(4500)}`));
  await shot('fest-pongal', S(`nc.setMode('pongal'); nc.env.transition(0.01); ${fly('-60, 0, 40', 260, 1.08, 0.5)} ${wait(4500)}`));
  await shot('fest-deepavali', S(`nc.setMode('deepavali'); nc.env.transition(0.01); ${fly('100, 0, 60', 900, 1.15, -0.3)} ${wait(5000)}
    for (let i = 0; i < 5; i++) nc.fireworks.launch([-30 + i * 60, -200], ['peony', 'ring', 'willow', 'crossette', 'peony'][i]); ${wait(2300)}`), { hideUi: true });
  await shot('fest-deepavali-street', S(`nc.setMode('deepavali'); nc.env.transition(0.01); ${fly('-60, 0, 40', 140, 1.15, 0.5)} ${wait(5500)}`), { hideUi: true });

  // ---- sky
  await shot('sky-panel', S(`$('#btn-sky').click(); ${wait(1200)}`));
  await shot('time-dawn', S(`nc.env.setTime('dawn'); nc.env.transition(0.01); ${OVER} ${wait(2500)}`), { hideUi: true });
  await shot('time-noon', S(`nc.env.setTime('noon'); nc.env.setWeather('haze'); nc.env.transition(0.01); ${OVER} ${wait(2500)}`), { hideUi: true });
  await shot('time-night', S(`nc.env.setTime('night'); nc.env.transition(0.01); ${OVER} ${wait(2500)}`), { hideUi: true });
  await shot('weather-rain', S(`nc.env.setWeather('rain'); nc.weather.set('rain', 0.01); ${wait(300)} nc.env.transition(0.01); ${fly('60, 0, -40', 300, 1.12, -0.35)} ${wait(3500)}`), { hideUi: true });
  await shot('weather-storm', S(`nc.env.setWeather('storm'); nc.weather.set('storm', 0.01); ${wait(300)} nc.env.transition(0.01); ${fly('60, 0, -40', 300, 1.12, -0.35)} ${wait(3500)}`), { hideUi: true });

  // ---- metro
  await shot('metro', S(`nc.metro.setXray(true); $('#metro-legend').hidden = false; $('#btn-metro').setAttribute('aria-pressed', 'true'); ${fly('-80, 0, 60', 520, 1.15, -0.6)} ${wait(3500)}`));

  // ---- step inside
  await shot('inside-picker', S(`$('#btn-inside').click(); ${wait(1200)}`));
  await shot('inside-temple', S(`nc.interior.open('temple'); ${wait(4500)}`));
  await shot('inside-temple-info', S(`nc.interior.open('temple'); ${wait(4500)} document.querySelectorAll('#interior-hotspots button, #interior-hotspots .hotspot')[3]?.click(); ${wait(1500)}`));
  await shot('inside-deepavali', S(`nc.interior.open('deepavali'); ${wait(4500)}`));
  await shot('inside-pongal', S(`nc.interior.open('pongal'); ${wait(2500)} document.querySelectorAll('#interior-days button')[1].click(); ${wait(3200)}`));
  await shot('inside-mattu', S(`nc.interior.open('pongal'); ${wait(2500)} document.querySelectorAll('#interior-days button')[2].click(); ${wait(3200)}`));
  await shot('inside-kolam', S(`nc.interior.open('kolam'); ${wait(7000)}`));

  // ---- kolam studio
  await shot('studio', S(`nc.studio.open('margazhi-9'); ${wait(600)} nc.studio.loadPreset('margazhi-9'); nc.studio.progress = 1; nc.studio.pause(); nc.studio.render(); ${wait(800)}`));
  await shot('studio-drawing', S(`nc.studio.open('sikku-5-diamond'); ${wait(600)} nc.studio.loadPreset('sikku-5-diamond'); nc.studio.progress = 0.55; nc.studio.pause(); nc.studio.render(); ${wait(800)}`));
  await shot('studio-weave', S(`nc.studio.open(); ${wait(800)} $('#g-generate').click(); ${wait(1500)} nc.studio.progress = 1; nc.studio.pause(); nc.studio.render(); ${wait(600)}`));
  await shot('studio-export', S(`nc.studio.open('margazhi-9'); ${wait(600)} nc.studio.loadPreset('margazhi-9'); nc.studio.progress = 1; nc.studio.pause(); nc.studio.render(); $('#k-export').click(); ${wait(800)}`));
  await shot('doorstep-kolams', S(`nc.setMode('margazhi'); nc.env.transition(0.01); const d = nc.doorsteps.find((x) => x.tag === 'chintadripet') || nc.doorsteps[0]; const p = d.p;
    ${fly('p[0], 0, p[1]', 38, 1.0, 'Math.atan2(d.n[0], d.n[1])')} ${wait(4000)}`), { hideUi: true });

  // ---- menu & modals
  await shot('menu', S(`$('#btn-menu').click(); ${wait(900)}`));
  await shot('search', S(`const i = $('#search-input'); i.focus(); i.value = 'kolam'; i.dispatchEvent(new Event('input', { bubbles: true })); ${wait(1200)}`));
  await shot('tours', S(`$('#btn-menu').click(); ${wait(400)} $('#m-tours').click(); ${wait(1200)}`));
  await shot('tour-running', S(`$('#btn-menu').click(); ${wait(400)} $('#m-tours').click(); ${wait(1000)} [...document.querySelectorAll('#modal-card button')].find((b) => /Begin/.test(b.textContent))?.click(); ${wait(6000)}`));
  await shot('places', S(`$('#btn-menu').click(); ${wait(400)} $('#m-places').click(); ${wait(1200)}`));
  await shot('atlas', S(`$('#btn-menu').click(); ${wait(400)} $('#m-atlas').click(); ${wait(2500)}`));
  await shot('timetravel', S(`$('#btn-menu').click(); ${wait(400)} $('#m-timetravel').click(); ${wait(3000)}`));
  await shot('words', S(`$('#btn-menu').click(); ${wait(400)} $('#m-words').click(); ${wait(1200)}`));
  await shot('contribute', S(`$('#btn-menu').click(); ${wait(400)} $('#m-contribute').click(); ${wait(1500)}`));
  await shot('cloudinary-settings', S(`$('#btn-menu').click(); ${wait(400)} $('#m-cloud').click(); ${wait(2000)}`));
  await shot('about', S(`$('#btn-menu').click(); ${wait(400)} $('#m-about').click(); ${wait(1500)}`));

  // ---- film
  await shot('film-open', S(`nc.film.play(); ${wait(3500)}`));
  await shot('film-temple', S(`nc.film.play(); ${wait(1500)} for (let i = 0; i < 4; i++) { $('#film-next').click(); ${wait(400)} } ${wait(6000)} $('#film-title').classList.remove('show'); ${wait(800)}`));
  await shot('film-monsoon', S(`nc.film.play(); ${wait(1500)} for (let i = 0; i < 9; i++) { $('#film-next').click(); ${wait(400)} } ${wait(6000)} $('#film-title').classList.remove('show'); ${wait(800)}`));

  // ---- mobile
  const M = { width: 390, height: 844, scale: 2, mobile: true };
  await shot('m-city', S(`nc.env.setTime('golden'); nc.env.transition(0.01); ${wait(1500)}`), M);
  await shot('m-story', S(`nc.openPlace(nc.places.find((p) => p.id === 'central')); ${wait(4200)}`), M);
  await shot('m-inside', S(`nc.interior.open('deepavali'); ${wait(4500)}`), M);
  await shot('m-studio', S(`nc.studio.open('margazhi-9'); ${wait(600)} nc.studio.loadPreset('margazhi-9'); nc.studio.progress = 1; nc.studio.pause(); nc.studio.render(); ${wait(800)}`), M);
} finally {
  await browser.close();
}
