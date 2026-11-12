/**
 * CLOUDINARY MEDIA LAYER
 * ---------------------------------------------------------------------------
 * Every image in the experience goes through `img(src, preset)`:
 *   - Archive media (Wikimedia Commons originals) → Cloudinary *fetch* delivery, so a single
 *     high-res original is resized, cropped (g_auto), format-negotiated (f_auto) and
 *     quality-tuned (q_auto) per context: 3D map pin, thumbnail, story card, gallery, full screen.
 *   - Community uploads → Cloudinary *upload* delivery by public_id with the same presets.
 * Community contributions are uploaded with an UNSIGNED upload preset (tags + context metadata),
 * and read back through Cloudinary's client-side resource list (`/image/list/<tag>.json`).
 *
 * Configuration: VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET at build time,
 * or set at runtime from the menu (stored only in this browser).
 * Without a cloud name, archive images fall back to Wikimedia's own thumbnailer and uploads
 * are disabled (the UI says so) — nothing is faked.
 */

const ENV_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const ENV_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
const ENV_FOLDER = import.meta.env.VITE_CLOUDINARY_FOLDER || 'namma-chennai';
export const TAG = 'namma-chennai';

export const cfg = {
  get cloud() { return localStorage.getItem('nc.cld.cloud') || ENV_CLOUD; },
  get preset() { return localStorage.getItem('nc.cld.preset') || ENV_PRESET; },
  get folder() { return localStorage.getItem('nc.cld.folder') || ENV_FOLDER; },
  set(cloud, preset, folder) {
    cloud ? localStorage.setItem('nc.cld.cloud', cloud.trim()) : localStorage.removeItem('nc.cld.cloud');
    preset ? localStorage.setItem('nc.cld.preset', preset.trim()) : localStorage.removeItem('nc.cld.preset');
    folder ? localStorage.setItem('nc.cld.folder', folder.trim()) : localStorage.removeItem('nc.cld.folder');
  },
  get enabled() { return !!this.cloud; },
  get canUpload() { return !!(this.cloud && this.preset); },
};

/** named transformation presets — one per place an image appears */
export const PRESETS = {
  pin: 'c_thumb,g_auto,w_96,h_96,r_max,f_auto,q_auto',
  thumb: 'c_fill,g_auto,w_360,h_360,f_auto,q_auto',
  card: 'c_fill,g_auto,w_640,h_400,f_auto,q_auto',
  hero: 'c_fill,g_auto,w_1040,h_650,f_auto,q_auto:good',
  full: 'c_limit,w_1920,h_1600,f_auto,q_auto:good',
  compare: 'c_fill,g_auto,w_1400,h_875,f_auto,q_auto:good',
  mobile: 'c_fill,g_auto,w_720,h_480,f_auto,q_auto:eco,dpr_auto',
  sepia: 'c_fill,g_auto,w_1400,h_875,e_sepia:40,f_auto,q_auto',
  kolamDecal: 'c_pad,w_512,h_512,b_transparent,f_png',
};
// Wikimedia serves thumbnails in fixed steps; asking for these exact widths avoids a resize
// on their side and keeps phones from downloading multi-megabyte originals.
const WIDTH = { pin: 120, thumb: 330, card: 960, hero: 1280, full: 1920, compare: 1280, mobile: 960, sepia: 1280 };
const STEPS = [120, 250, 330, 500, 960, 1280, 1920];
const step = (w) => STEPS.find((s) => s >= w) || 1920;

const commonsOriginal = (file) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;
const commonsThumb = (file, w) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${w}`;

/**
 * @param src  {commons:'File name.jpg'} | {publicId:'folder/id', resourceType?} | 'https://…'
 * @param preset key of PRESETS
 */
export function img(src, preset = 'card') {
  const small = window.innerWidth < 700 && (preset === 'hero' || preset === 'card');
  const p = PRESETS[small ? 'mobile' : preset] || preset;
  if (src.publicId) {
    if (!cfg.cloud) return '';
    return `https://res.cloudinary.com/${cfg.cloud}/image/upload/${p}/${src.publicId}`;
  }
  const remote = src.commons ? commonsOriginal(src.commons) : src;
  if (cfg.cloud && fetchOk) return `https://res.cloudinary.com/${cfg.cloud}/image/fetch/${p}/${encodeURIComponent(remote)}`;
  return src.commons ? commonsThumb(src.commons, step(WIDTH[small ? 'mobile' : preset] || 1280)) : remote;
}

/**
 * Fetch delivery can be switched off per account ("Images of type fetch are restricted",
 * the default on many new accounts). Probe it once at startup; while it's blocked, archive
 * photos load straight from Wikimedia so nothing breaks, and uploads keep using Cloudinary.
 */
let fetchOk = false;
export let fetchStatus = 'unchecked';
export function probeFetch(timeout = 6000) {
  if (!cfg.cloud) { fetchOk = false; fetchStatus = 'no-cloud'; return Promise.resolve(false); }
  const key = 'nc.cld.fetchOk.' + cfg.cloud;
  const cached = sessionStorage.getItem(key);
  if (cached != null) { fetchOk = cached === '1'; fetchStatus = fetchOk ? 'ok' : 'restricted'; return Promise.resolve(fetchOk); }
  const probe = `https://res.cloudinary.com/${cfg.cloud}/image/fetch/w_8,f_auto/${encodeURIComponent(commonsOriginal('Chennai central.jpg'))}`;
  return new Promise((resolve) => {
    const im = new Image();
    const done = (ok) => { fetchOk = ok; fetchStatus = ok ? 'ok' : 'restricted'; try { sessionStorage.setItem(key, ok ? '1' : '0'); } catch {} resolve(ok); };
    im.onload = () => done(true);
    im.onerror = () => done(false);
    setTimeout(() => done(false), timeout);
    im.src = probe;
  });
}

/** responsive srcset for <img> */
export function srcset(src, preset = 'card') {
  if (!cfg.cloud && !src.commons) return '';
  if (!src.publicId && !src.commons && !(cfg.cloud && fetchOk)) return '';
  const base = PRESETS[preset];
  return [1, 2].map((d) => {
    if (cfg.cloud && (src.publicId || fetchOk)) {
      const p = base.replace(/w_(\d+)/, (_, w) => 'w_' + w * d).replace(/h_(\d+)/, (_, h) => 'h_' + h * d);
      const remote = src.publicId ? null : src.commons ? commonsOriginal(src.commons) : src;
      const url = src.publicId ? `https://res.cloudinary.com/${cfg.cloud}/image/upload/${p}/${src.publicId}` : `https://res.cloudinary.com/${cfg.cloud}/image/fetch/${p}/${encodeURIComponent(remote)}`;
      return `${url} ${d}x`;
    }
    return `${commonsThumb(src.commons, step((WIDTH[preset] || 1280) * d))} ${d}x`;
  }).join(', ');
}

export function video(src) {
  if (src.publicId && cfg.cloud) {
    return {
      mp4: `https://res.cloudinary.com/${cfg.cloud}/video/upload/f_auto,q_auto,c_limit,w_1280/${src.publicId}`,
      poster: `https://res.cloudinary.com/${cfg.cloud}/video/upload/so_1,c_fill,g_auto,w_640,h_400,f_jpg/${src.publicId}.jpg`,
    };
  }
  if (src.commons) return { mp4: commonsOriginal(src.commons), poster: null };
  return { mp4: src, poster: null };
}

/** upload a File/Blob with tags + contextual metadata. onProgress(0..1) */
export function upload(file, { tags = [], context = {}, folder } = {}, onProgress) {
  return new Promise((resolve, reject) => {
    if (!cfg.canUpload) return reject(new Error('Cloudinary is not configured. Add a cloud name and an unsigned upload preset in the menu → Cloudinary settings.'));
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', cfg.preset);
    fd.append('folder', folder || cfg.folder);
    fd.append('tags', [TAG, ...tags].join(','));
    // context values must not contain | or = unescaped
    const ctx = Object.entries(context).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}=${String(v).replace(/([|=])/g, '\\$1')}`).join('|');
    if (ctx) fd.append('context', ctx);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cfg.cloud}/auto/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let j = null; try { j = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && j) resolve(j);
      else reject(new Error(j?.error?.message || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading'));
    xhr.send(fd);
  });
}

/**
 * Read community contributions back via the client-side resource list.
 * Requires "Resource list" to be allowed in Cloudinary Settings → Security.
 */
export async function listTagged(tag = TAG) {
  if (!cfg.cloud) return { items: [], status: 'disabled' };
  const out = [];
  let status = 'ok';
  for (const type of ['image', 'video']) {
    try {
      const r = await fetch(`https://res.cloudinary.com/${cfg.cloud}/${type}/list/${encodeURIComponent(tag)}.json?t=${Date.now() >> 16}`);
      if (r.status === 401 || r.status === 404) { if (type === 'image') status = r.status === 401 ? 'list-restricted' : 'empty'; continue; }
      const j = await r.json();
      for (const res of j.resources || []) out.push({ ...res, resource_type: type, context: res.context?.custom || {} });
    } catch { status = 'error'; }
  }
  return { items: out, status };
}

let playerLoaded = null;
/** lazily load the Cloudinary Video Player for community videos */
export function loadVideoPlayer() {
  if (playerLoaded) return playerLoaded;
  playerLoaded = new Promise((resolve, reject) => {
    const css = document.createElement('link'); css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/cloudinary-video-player@1.10.6/dist/cld-video-player.min.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/cloudinary-video-player@1.10.6/dist/cld-video-player.min.js';
    s.onload = () => resolve(window.cloudinary);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return playerLoaded;
}

export async function testConnection() {
  if (!cfg.cloud) return 'Not configured — archive images load from Wikimedia’s thumbnailer.';
  try {
    const probe = `https://res.cloudinary.com/${cfg.cloud}/image/fetch/${PRESETS.pin}/${encodeURIComponent(commonsOriginal('Chennai central.jpg'))}`;
    const r = await fetch(probe, { method: 'GET' });
    if (!r.ok) return `Cloud “${cfg.cloud}” is connected (uploads are unaffected), but fetch delivery is restricted on this account (HTTP ${r.status}), so archive photos load directly from Wikimedia. To route them through Cloudinary: Settings → Security → Restricted image types → untick “Fetched URL”.`;
    try { sessionStorage.removeItem('nc.cld.fetchOk.' + cfg.cloud); } catch {}
    await probeFetch();
    return `Connected to “${cfg.cloud}” — media delivered via Cloudinary (f_auto, q_auto, g_auto).${cfg.canUpload ? ' Uploads enabled.' : ' Add an unsigned upload preset to enable uploads.'}`;
  } catch {
    return `Couldn’t reach Cloudinary for “${cfg.cloud}”.`;
  }
}
