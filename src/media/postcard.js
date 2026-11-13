import { cfg } from './cloudinary.js';

/**
 * KOLAM POSTCARDS — composed entirely by Cloudinary.
 * The uploaded kolam PNG is the only asset; everything else on the card is a chain of
 * transformations on its delivery URL: pad to a postcard, text layers in Tamil and English
 * (Cloudinary renders Google fonts — Hind Madurai covers Tamil), a postmark and a border.
 * The result is a single, permanent, shareable image URL.
 */

// Cloudinary text layers need commas and slashes double-escaped
const enc = (s) => encodeURIComponent(s).replace(/%2C/g, '%252C').replace(/%2F/g, '%252F');
const font = (name) => encodeURIComponent(name);
const hex = (c) => String(c || '#2a2440').replace('#', '').slice(0, 6);

export const GREETINGS = {
  everyday: { ta: 'காலை வணக்கம்', en: 'A kolam drawn at dawn on a Chintadripet doorstep' },
  margazhi: { ta: 'மார்கழிக் காலை', en: 'A Margazhi morning, before the sun was up' },
  pongal: { ta: 'பொங்கல் நல்வாழ்த்துகள்', en: 'Happy Pongal — may the pot overflow all year' },
  deepavali: { ta: 'தீபாவளி நல்வாழ்த்துகள்', en: 'Happy Deepavali — lamps at every threshold' },
};

/**
 * @param publicId   the uploaded kolam
 * @param opts {greeting, from, bg, fg}
 */
export function postcardUrl(publicId, { greeting = 'everyday', from = '', bg = '#2a2440', fg = '#f4ecdf', format = 'jpg' } = {}) {
  const g = GREETINGS[greeting] || GREETINGS.everyday;
  const gold = 'e2c47e';
  const ink = hex(fg);
  const L = [
    // the kolam, on the right of a 1800×1100 card in its own ground colour
    'c_scale,w_960',
    `c_pad,w_1800,h_1100,g_east,b_rgb:${hex(bg)}`,
    `co_rgb:${gold},l_text:${font('Hind Madurai')}_36_bold_letter_spacing_14:${enc('GREETINGS FROM')}/fl_layer_apply,g_north_west,x_110,y_160`,
    `co_rgb:${ink},l_text:${font('Playfair Display')}_104:${enc('Namma Chennai')}/fl_layer_apply,g_north_west,x_100,y_215`,
    `co_rgb:${gold},l_text:${font('Hind Madurai')}_92_bold:${enc('நம்ம சென்னை')}/fl_layer_apply,g_north_west,x_100,y_365`,
    `co_rgb:${ink},l_text:${font('Hind Madurai')}_48_bold:${enc(g.ta)}/fl_layer_apply,g_south_west,x_110,y_330`,
    `co_rgb:${ink},w_700,c_fit,l_text:${font('Hind Madurai')}_32:${enc(g.en)}/fl_layer_apply,g_south_west,x_110,y_255`,
  ];
  const name = String(from || '').trim().slice(0, 32);
  if (name) L.push(`co_rgb:${gold},l_text:${font('Playfair Display')}_36_italic:${enc('— ' + name)}/fl_layer_apply,g_south_west,x_110,y_185`);
  L.push(
    `co_rgb:${gold},l_text:${font('Hind Madurai')}_30:${enc('யாதும் ஊரே யாவரும் கேளிர்')}/fl_layer_apply,g_south_west,x_110,y_110`,
    // a postmark for Park Town, Chennai 600 003, tilted like a real one
    `co_rgb:${gold},o_70,a_-14,l_text:${font('Hind Madurai')}_26_bold_letter_spacing_6:${enc('CHENNAI · 600 003')}/fl_layer_apply,g_north_east,x_60,y_60`,
    'bo_16px_solid_rgb:c9a24a',
    `f_${format},q_auto`,
  );
  return `https://res.cloudinary.com/${cfg.cloud}/image/upload/${L.join('/')}/${publicId}`;
}

/** a small version for previews / link cards */
export function postcardThumb(url) { return url.replace(`/f_jpg,q_auto/`, '/c_scale,w_900/f_auto,q_auto/'); }
