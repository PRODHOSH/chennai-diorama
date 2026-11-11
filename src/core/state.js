// Small shared app state + event bus.
const listeners = new Map();

export const state = {
  mode: 'everyday',
  reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('nc.reduceMotion') === '1',
  traffic: localStorage.getItem('nc.traffic') !== '0',
  fireworks: localStorage.getItem('nc.fireworks') !== '0',
  fireworksLevel: +(localStorage.getItem('nc.fwLevel') ?? 2),
  activeStory: null,
  seen: new Set(JSON.parse(localStorage.getItem('nc.seen') || '[]')),
};

export function markSeen(id) {
  state.seen.add(id);
  try { localStorage.setItem('nc.seen', JSON.stringify([...state.seen])); } catch {}
}

export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => listeners.get(evt).delete(fn);
}
export function emit(evt, data) {
  listeners.get(evt)?.forEach((fn) => fn(data));
}

export function toast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), ms);
}

// deterministic pseudo-random helpers (so the city is the same for every visitor)
export function hash(n) {
  let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; };
}
