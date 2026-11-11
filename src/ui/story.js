import { CATS, COMPARE } from '../content/places.js';
import { MEDIA, creditLine } from '../content/media.js';
import { img, srcset, video as vid, cfg } from '../media/cloudinary.js';
import { renderKolam } from '../kolam/engine.js';
import { presetKolam } from '../kolam/presets.js';
import { escapeHtml } from '../kolam/studio.js';
import { state, markSeen } from '../core/state.js';

const $ = (s) => document.querySelector(s);

/**
 * The story panel: an editorial, scrollable "page" for a place, with tabs when a place
 * holds several stories. Media is lazy-loaded only when a story opens, through the
 * Cloudinary presets (hero / thumb / full).
 */
export class StoryPanel {
  constructor({ onClose, onAction, sound, lightbox, community }) {
    this.el = $('#story'); this.scroll = $('#story-scroll');
    this.onClose = onClose; this.onAction = onAction; this.sound = sound; this.lightbox = lightbox; this.community = community;
    $('#story-close').onclick = () => this.close();
    this.kolamAnims = [];
  }

  isOpen() { return !this.el.hidden; }

  open(place, storyIdx = 0) {
    this.place = place;
    this.stopAnims();
    const cat = CATS[place.cat] || CATS.community;
    this.el.style.setProperty('--c', cat.color);
    this.el.hidden = false; this.el.classList.remove('closing');
    const stories = place.stories || [];
    const hero = place.hero ? MEDIA[place.hero] : null;
    const heroSrc = place.heroSrc || (hero ? hero.src : null);
    const badges = [];
    if (place.kind === 'illustrative') badges.push('<span class="badge illustrative">Illustrative example · not a real family</span>');
    if (place.kind === 'real') badges.push('<span class="badge real">Real place</span>');
    if (place.kind === 'community') badges.push('<span class="badge real">Shared by a visitor</span>');
    if (place.recon) badges.push('<span class="badge recon">3D: stylised reconstruction</span>');
    this.scroll.innerHTML = `
      <figure class="story-hero">${heroSrc ? `<img alt="${escapeHtml(hero?.caption || place.name)}" src="${img(heroSrc, 'hero')}" srcset="${srcset(heroSrc, 'hero')}" decoding="async">${hero ? `<figcaption>${escapeHtml(hero.author)} · ${hero.license}</figcaption>` : ''}` : '<canvas class="art" width="1040" height="650"></canvas>'}</figure>
      <div class="story-head">
        <span class="eyebrow">${cat.label} <span class="ta">· ${cat.ta}</span></span>
        <h2 id="story-title">${escapeHtml(place.name)}</h2>
        ${place.ta ? `<p class="ta-title">${place.ta}</p>` : ''}
        <div class="meta">${place.sub ? `<span>${escapeHtml(place.sub)}</span>` : ''}</div>
        <div>${badges.join(' ')}</div>
        ${place.inside ? `<button class="story-inside" id="story-inside"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M3 21h18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M9 21V11h6v10" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span><b>Step inside</b><small>${place.inside === 'temple' ? 'Walk through the gopuram into the courtyard at dusk' : place.inside === 'deepavali' ? 'The puja room before dawn — lamps, sweets, new clothes' : place.inside === 'pongal' ? 'The courtyard and the cattle shed on Pongal morning' : 'The verandah at sunrise — watch the kolam being drawn'}</small></span></button>` : ''}
      </div>
      ${stories.length > 1 ? `<div class="story-tabs" role="tablist">${stories.map((s, i) => `<button role="tab" aria-selected="${i === storyIdx}" data-i="${i}">${escapeHtml(s.title)}</button>`).join('')}</div>` : ''}
      <article class="story-body" id="story-body"></article>`;
    const heroImg = this.scroll.querySelector('.story-hero img');
    if (heroImg) { heroImg.onload = () => heroImg.classList.add('loaded'); if (heroImg.complete) heroImg.classList.add('loaded'); heroImg.onerror = () => heroImg.closest('figure').replaceChildren(this.artCanvas(place)); }
    else this.drawArt(this.scroll.querySelector('.art'), place);
    this.scroll.querySelectorAll('.story-tabs button').forEach((b) => b.onclick = () => this.showStory(+b.dataset.i));
    this.scroll.querySelector('#story-inside')?.addEventListener('click', () => this.onAction('inside:' + place.inside));
    this.showStory(storyIdx);
    this.scroll.scrollTop = 0;
    markSeen(place.id);
    setTimeout(() => $('#story-close').focus({ preventScroll: true }), 60);
  }

  artCanvas(place) { const c = document.createElement('canvas'); c.className = 'art'; c.width = 1040; c.height = 650; this.drawArt(c, place); return c; }
  /** generated cover art for places without an archive photograph: a kolam on the place's colour */
  drawArt(cv, place) {
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const cat = CATS[place.cat] || CATS.community;
    ctx.fillStyle = '#1f2547'; ctx.fillRect(0, 0, cv.width, cv.height);
    const k = presetKolam(place.kolam || 'sikku-7', { bg: '#1f2547', line: cat.hex, dots: true });
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = 900;
    renderKolam(tmp.getContext('2d'), k, { size: 900, transparent: true });
    ctx.globalAlpha = 0.85; ctx.drawImage(tmp, 70, -125, 900, 900); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(244,236,223,0.9)'; ctx.font = '600 44px "Noto Serif Tamil", serif'; ctx.fillText(place.ta || '', 48, cv.height - 52);
  }

  showStory(i) {
    this.stopAnims();
    const s = this.place.stories?.[i];
    this.scroll.querySelectorAll('.story-tabs button').forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.i === i)));
    const body = $('#story-body');
    body.innerHTML = '';
    if (s?.ta) body.insertAdjacentHTML('beforeend', `<p class="ta" style="color:var(--maroon);margin:0 0 4px;font-size:15px">${s.ta}</p>`);
    if (s && this.place.stories.length === 1 && s.title) body.insertAdjacentHTML('beforeend', `<h4 style="margin-top:0">${escapeHtml(s.title)}</h4>`);
    for (const blk of s?.body || []) body.appendChild(this.block(blk));
    // community memories attached to this place
    const mem = this.community?.(this.place.id) || [];
    if (mem.length) {
      const wrap = document.createElement('section');
      wrap.innerHTML = `<h4>Memories from visitors</h4>`;
      wrap.appendChild(this.block({ gallery: mem }));
      body.appendChild(wrap);
    }
    // credits for every archive item shown
    const used = new Set();
    for (const blk of s?.body || []) { (blk.gallery || []).forEach((k) => typeof k === 'string' && used.add(k)); if (blk.video) used.add(blk.video); if (blk.compare) { used.add(COMPARE[blk.compare].then); used.add(COMPARE[blk.compare].now); } }
    if (this.place.hero) used.add(this.place.hero);
    if (used.size) {
      body.insertAdjacentHTML('beforeend', `<div class="credit"><b>Media</b> — ${[...used].filter((k) => MEDIA[k]).map((k) => `“${escapeHtml(MEDIA[k].caption || MEDIA[k].file)}” ${creditLine(MEDIA[k])}`).join('<br>')}<br>${cfg.enabled ? 'Delivered through Cloudinary (fetch · f_auto · q_auto · g_auto).' : 'Thumbnails by Wikimedia; connect Cloudinary for optimised delivery.'}</div>`);
    }
  }

  block(b) {
    const el = document.createElement('div');
    if (b.lede) el.innerHTML = `<p class="lede">${escapeHtml(b.lede)}</p>`;
    else if (b.p) el.innerHTML = `<p>${escapeHtml(b.p)}</p>`;
    else if (b.h) el.innerHTML = `<h4>${escapeHtml(b.h)}</h4>`;
    else if (b.note) el.innerHTML = `<p class="note">${escapeHtml(b.note)}</p>`;
    else if (b.illustrative) el.innerHTML = `<p class="note warn"><b>Illustrative story.</b> A composite written for this demonstration from widely shared Tamil household practice — not a real family. The house is a stylised stand-in on a real lane.</p>`;
    else if (b.recon) el.innerHTML = `<p class="note"><b>About the 3D model.</b> ${escapeHtml(b.recon)}</p>`;
    else if (b.quote) el.innerHTML = `<blockquote><span class="ta">${escapeHtml(b.quote)}</span>${escapeHtml(b.en || '')}</blockquote>`;
    else if (b.facts) el.innerHTML = `<dl class="facts">${b.facts.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}</dl>`;
    else if (b.steps) el.innerHTML = `<ol class="step-list">${b.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`;
    else if (b.gallery) {
      const items = b.gallery.map((k) => (typeof k === 'string' ? MEDIA[k] : k)).filter(Boolean);
      el.className = 'gallery';
      items.forEach((m, i) => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', `Open ${m.caption || 'media'} (${i + 1} of ${items.length})`);
        const thumb = m.kind === 'video' ? (m.poster || null) : img(m.src, 'thumb');
        btn.innerHTML = thumb ? `<img loading="lazy" alt="${escapeHtml(m.caption || '')}" src="${thumb}">` : '<span style="display:grid;place-items:center;height:100%;color:var(--ink-3)">▶ video</span>';
        if (m.kind === 'video') btn.insertAdjacentHTML('beforeend', '<span class="play">▶</span>');
        btn.onclick = () => this.lightbox.open(items, i);
        el.appendChild(btn);
      });
    } else if (b.video) {
      const m = MEDIA[b.video];
      const v = vid(m.src);
      el.innerHTML = `<figure style="margin:14px 0"><video controls preload="none" playsinline style="width:100%;border-radius:12px;background:#111" ${v.poster ? `poster="${v.poster}"` : ''}><source src="${v.mp4}"></video><figcaption class="credit" style="border:0;margin:6px 0 0;padding:0">${escapeHtml(m.caption)} — ${creditLine(m)}</figcaption></figure>`;
    } else if (b.kolam) {
      el.innerHTML = `<figure style="margin:16px 0;text-align:center"><canvas width="760" height="760" style="width:100%;max-width:380px;border-radius:14px" aria-label="Animated kolam being drawn"></canvas><figcaption style="font-size:12.5px;color:var(--ink-3)">Watch the line being drawn — the same pattern opens in the Kolam Studio.</figcaption></figure>`;
      const cv = el.querySelector('canvas');
      const k = presetKolam(b.kolam);
      const paths = k.paths();
      let p = 0, raf;
      const loop = () => {
        p = Math.min(1, p + (state.reduceMotion ? 1 : 0.0028));
        renderKolam(cv.getContext('2d'), k, { size: 760, progress: p, paths });
        if (p < 1) raf = requestAnimationFrame(loop); else setTimeout(() => { if (this.kolamAnims.includes(anim)) { p = 0; loop(); } }, 2600);
      };
      const anim = { stop: () => cancelAnimationFrame(raf) };
      this.kolamAnims.push(anim);
      loop();
    } else if (b.audio) {
      el.className = 'audio-card';
      el.innerHTML = `<button aria-label="Play ${escapeHtml(b.label)}">▶</button><div><b>${escapeHtml(b.label)}</b><small>${escapeHtml(b.note || '')}</small></div>`;
      el.querySelector('button').onclick = () => this.sound.preview(b.audio);
    } else if (b.compare) {
      const c = COMPARE[b.compare];
      el.appendChild(compareWidget(c));
      el.insertAdjacentHTML('beforeend', `<p style="font-size:13.5px;color:var(--ink-3);margin-top:8px">${escapeHtml(c.text)}</p>`);
    } else if (b.days) {
      el.innerHTML = `<div class="days" role="tablist">${b.days.map((d, i) => `<button role="tab" aria-selected="${i === 1}" data-i="${i}"><span class="ta">${d.ta}</span>${d.en}</button>`).join('')}</div><p class="day-text"></p>`;
      const txt = el.querySelector('.day-text');
      const sel = (i) => { el.querySelectorAll('.days button').forEach((x) => x.setAttribute('aria-selected', String(+x.dataset.i === i))); txt.textContent = b.days[i].text; };
      el.querySelectorAll('.days button').forEach((x) => x.onclick = () => sel(+x.dataset.i));
      sel(1);
    } else if (b.action) {
      el.className = 'story-actions';
      const btn = document.createElement('button');
      btn.className = 'btn ' + (b.action.startsWith('mode') || b.action.startsWith('inside') ? 'terracotta' : b.action.startsWith('studio') ? '' : 'light');
      btn.textContent = b.label;
      btn.onclick = () => this.onAction(b.action);
      el.appendChild(btn);
    }
    return el;
  }

  stopAnims() { this.kolamAnims.forEach((a) => a.stop()); this.kolamAnims = []; }

  close(silent) {
    if (this.el.hidden) return;
    this.stopAnims();
    this.el.classList.add('closing');
    setTimeout(() => { this.el.hidden = true; this.el.classList.remove('closing'); }, state.reduceMotion ? 0 : 320);
    if (!silent) this.onClose?.(this.place);
    this.place = null;
  }
}

export function compareWidget(c) {
  const then = MEDIA[c.then], now = MEDIA[c.now];
  const wrap = document.createElement('div');
  wrap.className = 'compare';
  wrap.style.setProperty('--x', '50%');
  wrap.innerHTML = `<img alt="${escapeHtml(now.caption)}" src="${img(now.src, 'compare')}"><img class="then" alt="${escapeHtml(then.caption)}" src="${img(then.src, 'compare')}">
    <div class="handle"></div><span class="tag l">${escapeHtml(c.thenLabel)}</span><span class="tag r">${escapeHtml(c.nowLabel)}</span>
    <input type="range" min="0" max="100" value="50" aria-label="Compare ${escapeHtml(c.title)} then and now">`;
  const r = wrap.querySelector('input');
  r.oninput = () => wrap.style.setProperty('--x', r.value + '%');
  return wrap;
}

export class Lightbox {
  constructor() {
    this.el = $('#lightbox'); this.fig = $('#lb-figure');
    $('#lb-close').onclick = () => this.close();
    $('#lb-prev').onclick = () => this.show(this.i - 1);
    $('#lb-next').onclick = () => this.show(this.i + 1);
    this.el.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') this.show(this.i - 1); if (e.key === 'ArrowRight') this.show(this.i + 1); if (e.key === 'Escape') { e.stopPropagation(); this.close(); } });
    this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
  }
  open(items, i) { this.items = items; this.prev = document.activeElement; this.el.hidden = false; this.show(i); $('#lb-close').focus(); }
  show(i) {
    const n = this.items.length; this.i = (i + n) % n;
    const m = this.items[this.i];
    const cap = `${escapeHtml(m.caption || '')}${m.author ? ` — ${m.file ? creditLine(m) : escapeHtml(m.author)}` : ''}`;
    if (m.kind === 'video') {
      const v = m.src.publicId ? vid(m.src) : vid(m.src);
      this.fig.innerHTML = `<video controls autoplay playsinline ${v.poster ? `poster="${v.poster}"` : ''}><source src="${v.mp4}"></video><figcaption>${cap}</figcaption>`;
    } else {
      this.fig.innerHTML = `<img alt="${escapeHtml(m.caption || '')}" src="${img(m.src, 'full')}"><figcaption>${cap}</figcaption>`;
    }
    $('#lb-prev').hidden = $('#lb-next').hidden = n < 2;
  }
  close() { this.el.hidden = true; this.fig.innerHTML = ''; this.prev?.focus?.(); }
}
