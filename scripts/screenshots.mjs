#!/usr/bin/env node
/**
 * Captures the README screenshots from the real app.
 *   npm run build && npm run screenshots
 * Uses your installed Google Chrome through playwright-core (no extra browser download),
 * serves dist/ with `vite preview`, and writes JPGs to docs/screenshots/.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 4181;
const OUT = 'docs/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(2500);

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });

const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null; // e.g. ONLY=storm,film npm run screenshots

async function shot(name, setup, { width = 1600, height = 1000, scale = 1, hideUi = false, mobile = false } = {}) {
  if (ONLY && !ONLY.includes(name)) return;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  await page.addInitScript(() => { localStorage.setItem('nc.onboarded', '1'); localStorage.setItem('nc.quality', 'high'); });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => document.querySelector('#loader.done') && window.__nc, null, { timeout: 90000 });
  await sleep(4800); // let the opening fly-in finish
  await page.evaluate(() => { document.querySelector('#modal').hidden = true; });
  await page.evaluate(setup);
  if (hideUi) await page.evaluate(() => document.body.classList.add('filming'));
  await sleep(600);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 86 });
  console.log('✓', name);
  await ctx.close();
}

const wait = (ms) => `await new Promise((r) => setTimeout(r, ${ms}));`;
const S = (body) => new Function(`return (async () => { const nc = window.__nc; ${body} })();`);

try {
  await shot('hero', S(`nc.env.setTime('golden'); nc.env.transition(0.01);
    await nc.engine.flyTo({ target: [-150, 0, -40], dist: 480, polar: 1.1, azimuth: -0.42, duration: 0.01 }); ${wait(2500)}`), { hideUi: true });

  await shot('central-story', S(`nc.env.setTime('golden'); nc.env.transition(0.01);
    nc.openPlace(nc.places.find((p) => p.id === 'central')); ${wait(4200)}`));

  await shot('temple', S(`const p = nc.places.find((x) => x.id === 'kandhakottam');
    nc.env.setTime('evening'); nc.env.transition(0.01);
    await nc.engine.flyTo({ target: [p._focus[0], 0, p._focus[1]], dist: 120, polar: 1.12, azimuth: 2.0, duration: 0.01 }); ${wait(2500)}`), { hideUi: true });

  await shot('temple-inside', S(`nc.interior.open('temple'); ${wait(4500)}`));

  await shot('deepavali', S(`nc.setMode('deepavali'); nc.env.transition(0.01);
    await nc.engine.flyTo({ target: [100, 0, 60], dist: 900, polar: 1.15, azimuth: -0.3, duration: 0.01 }); ${wait(5000)}
    for (let i = 0; i < 5; i++) nc.fireworks.launch([-30 + i * 60, -200], ['peony', 'ring', 'willow', 'crossette', 'peony'][i]); ${wait(2300)}`), { hideUi: true });

  await shot('deepavali-room', S(`nc.interior.open('deepavali'); ${wait(4500)}`));

  await shot('pongal-cattle', S(`nc.interior.open('pongal'); ${wait(2500)}
    document.querySelectorAll('#interior-days button')[2].click(); ${wait(3200)}`));

  await shot('kolam-studio', S(`nc.studio.open('margazhi-9'); ${wait(600)} nc.studio.loadPreset('margazhi-9'); nc.studio.progress = 1; nc.studio.pause(); nc.studio.render(); ${wait(800)}`));

  await shot('storm', S(`nc.env.setWeather('storm'); nc.weather.set('storm', 0.01); ${wait(300)} nc.env.transition(0.01);
    await nc.engine.flyTo({ target: [60, 0, -40], dist: 300, polar: 1.12, azimuth: -0.35, duration: 0.01 }); ${wait(3500)}`), { hideUi: true });

  await shot('metro', S(`nc.metro.setXray(true); document.querySelector('#metro-legend').hidden = false; document.querySelector('#btn-metro').setAttribute('aria-pressed', 'true');
    await nc.engine.flyTo({ target: [-80, 0, 60], dist: 520, polar: 1.15, azimuth: -0.6, duration: 0.01 }); ${wait(3500)}`));

  await shot('streets', S(`const it = nc.names.group.userData.named.find((n) => /City Tower/.test(n.en));
    await nc.engine.flyTo({ target: [it.p[0] + it.n[0] * 6, 0, it.p[1] + it.n[1] * 6], dist: 70, polar: 1.0, azimuth: Math.atan2(it.n[0], it.n[1]) + 0.25, duration: 0.01 }); ${wait(2000)}`), { hideUi: true });

  await shot('fort-story', S(`nc.openPlace(nc.places.find((p) => p.id === 'fort')); ${wait(4200)}
    document.querySelectorAll('.story-tabs button')[0]?.click(); ${wait(1500)}`));

  await shot('step-inside', S(`document.querySelector('#btn-inside').click(); ${wait(1200)}`));

  await shot('film', S(`nc.film.play(); ${wait(1500)}
    for (let i = 0; i < 4; i++) { document.querySelector('#film-next').click(); ${wait(400)} } ${wait(6000)}
    document.querySelector('#film-title').classList.remove('show'); ${wait(800)}`));

  await shot('mobile', S(`nc.env.setTime('golden'); nc.env.transition(0.01); ${wait(1500)}`), { width: 390, height: 844, scale: 2, mobile: true });
  await shot('mobile-story', S(`nc.openPlace(nc.places.find((p) => p.id === 'central')); ${wait(4200)}`), { width: 390, height: 844, scale: 2, mobile: true });
} finally {
  await browser.close();
  server.kill();
}
