#!/usr/bin/env node
/**
 * Writes public/llms-full.txt from the app's own story content (src/content/places.js),
 * so the text that AI assistants read is always the text visitors read.
 * Runs automatically before `npm run build`.
 */
import fs from 'node:fs';
import { PLACES, CATS, ATLAS, VERSES, GLOSSARY, TOURS, INTERIORS, COMPARE } from '../src/content/places.js';

const SITE = 'https://chennai-diorama.pages.dev';
const out = [];
const w = (s = '') => out.push(s);

w('# Namma Chennai · நம்ம சென்னை — full text');
w();
w(`> A living 3D miniature of central Chennai (Park Town, George Town, Periamet, Chintadripet), built from real OpenStreetMap data. Live at ${SITE}/`);
w();
w('This file contains every story, place note and glossary entry shown in the app, in plain text. Facts about real places are drawn from widely documented history. Stories marked "illustrative" are composites written for this project and are not about real families. 3D landmarks are stylised reconstructions, not measured surveys.');
w();
w(`Source code: https://github.com/PRODHOSH/chennai-diorama · Short summary: ${SITE}/llms.txt`);
w();

function block(b) {
  if (b.lede) return w(b.lede), w();
  if (b.p) return w(b.p), w();
  if (b.h) return w(`#### ${b.h}`), w();
  if (b.facts) return b.facts.forEach(([k, v]) => w(`- ${k}: ${v}`)), w();
  if (b.steps) return b.steps.forEach((s, i) => w(`${i + 1}. ${s}`)), w();
  if (b.days) return b.days.forEach((d) => w(`- ${d.en} (${d.ta}): ${d.text}`)), w();
  if (b.quote) return w(`> ${b.quote}`), b.en && w(`> ${b.en}`), b.src && w(`> — ${b.src}`), w();
  if (b.recon) return w(`Reconstruction note: ${b.recon}`), w();
  if (b.note) return w(`Note: ${b.note}`), w();
  if (b.illustrative) return w('(Illustrative story — a composite, not a real family.)'), w();
  if (b.compare && COMPARE[b.compare]) { const c = COMPARE[b.compare]; return w(`Then & now — ${c.title} (${c.thenLabel} → ${c.nowLabel}): ${c.text}`), w(); }
}

w('## Places and stories');
w();
for (const p of PLACES) {
  const cat = CATS[p.cat]?.label || p.cat;
  w(`### ${p.name} (${p.ta})`);
  w();
  w(`${cat}${p.sub ? ' · ' + p.sub : ''} · ${p.kind === 'illustrative' ? 'Illustrative composite' : 'Real place'}${p.recon ? ' · 3D: stylised reconstruction' : ''}`);
  w(`Link: ${SITE}/#place=${p.id}`);
  w();
  for (const s of p.stories || []) {
    w(`**${s.title}** (${s.ta})`);
    w();
    (s.body || []).forEach(block);
  }
}

w('## Step inside — walk-in scenes');
w();
INTERIORS.forEach((i) => w(`- **${i.title}** (${i.ta}): ${i.text}`));
w();

w('## Guided journeys');
w();
TOURS.forEach((t) => w(`- **${t.name}** (${t.ta}): ${t.about} Stops: ${t.stops.join(', ')}.`));
w();

w('## Atlas — places beyond the map');
w();
ATLAS.forEach((a) => w(`- **${a.name}** (${a.ta}, ${a.lat}, ${a.lon}): ${a.text}`));
w();

w('## Verses');
w();
VERSES.forEach((v) => { w(`> ${v.ta.replace(/\n/g, ' / ')}`); w(`> ${v.en} — ${v.src}`); w(); });

w('## Glossary');
w();
GLOSSARY.forEach(([ta, tr, en]) => w(`- ${ta} (${tr}): ${en}`));
w();

w('## Credits');
w();
w('Map data © OpenStreetMap contributors (ODbL). Photographs from Wikimedia Commons, credited in the app. Built by Prodhosh VS — https://prodhosh.me');

fs.writeFileSync('public/llms-full.txt', out.join('\n') + '\n');
console.log(`llms-full.txt: ${PLACES.length} places, ${out.length} lines`);
