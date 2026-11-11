import * as THREE from 'three';
import { hash } from '../core/state.js';
import { centroid, inPoly, bboxOf } from './geo.js';

/**
 * All ~2,400 OSM building footprints extruded into ONE merged mesh.
 * A custom shader paints floors, windows, shopfront shutters and night-time window light
 * procedurally, so the whole district costs a single draw call.
 */

// Chennai street palette: lime-wash whites, temple-cream, pista green, rose, sky blue,
// faded ochre, grey concrete — deliberately desaturated so cultural colour can sing.
const WALL_PALETTE = [
  '#efe7d6', '#e9dfc8', '#f1e3c0', '#e4d6b8', '#d9d4c7', '#cfd6cf', '#c9d9c4', '#e8c9b8',
  '#dfc7c9', '#c7d3dc', '#e6d29f', '#d6b48c', '#cbbfae', '#b9b5ac', '#e9e2d0', '#d8cdb0',
];
const ROOF_PALETTE = ['#b9b0a2', '#a9a196', '#c3b9a8', '#9f9488', '#b0846c', '#a6a39c', '#c7bfae'];

export function buildBuildings(city, { exclude = [], overrides = {} } = {}) {
  const pos = [], nor = [], uv = [], col = [], info = [];
  const triStart = []; // per building index → first triangle
  const meta = [];
  let tri = 0;
  const c = new THREE.Color();

  const tanks = [];

  for (const b of city.buildings) {
    const ctr = centroid(b.o);
    if (exclude.some((ex) => ex(b, ctr))) continue;
    const ov = overrides[b.id] || {};
    const seed = hash(b.id);
    const h = ov.h ?? b.h;
    const isRoof = b.k === 'roof';
    const base = isRoof ? Math.max(0, h - 1.2) : 0; // canopies float on posts
    const wallHex = ov.wall || (isRoof ? '#9a9890' : b.col === 'white' ? '#f2efe8' : WALL_PALETTE[Math.floor(seed * WALL_PALETTE.length)]);
    const roofHex = ov.roof || (isRoof ? '#8f8b84' : ROOF_PALETTE[Math.floor(hash(b.id * 7 + 3) * ROOF_PALETTE.length)]);
    // building class drives the facade shader: 0 house/shop, 1 office/apartment, 2 heritage, 3 canopy
    const cls = ov.cls ?? (isRoof ? 3 : b.k === 'office' || b.k === 'hospital' || b.lv >= 5 ? 1 : 0);
    const idx = meta.length;
    triStart.push(tri);
    meta.push({ id: b.id, name: b.n, nameTa: b.nt, levels: ov.lv ?? b.lv, h, kind: b.k, area: b.a, c: ctr, o: b.o, est: !!b.est, ...ov.meta });

    const rings = [b.o, ...(b.hl || [])];
    // ---- walls
    c.set(wallHex);
    for (let r = 0; r < rings.length; r++) {
      const ring = rings[r];
      let u = 0;
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], bb = ring[(i + 1) % ring.length];
        const dx = bb[0] - a[0], dz = bb[1] - a[1];
        const L = Math.hypot(dx, dz); if (L < 0.05) continue;
        // build-geo.mjs normalises outer rings and holes so that (-dz, dx) always faces
        // away from the solid; the triangle order below winds front faces that way.
        const nx = -dz / L, nz = dx / L;
        const quad = [[a[0], base, a[1], u, 0], [bb[0], base, bb[1], u + L, 0], [bb[0], h, bb[1], u + L, h - base], [a[0], h, a[1], u, h - base]];
        const order = [0, 1, 2, 0, 2, 3];
        for (const k of order) {
          const q = quad[k];
          pos.push(q[0], q[1], q[2]); nor.push(nx, 0, nz); uv.push(q[3], q[4]);
          col.push(c.r, c.g, c.b); info.push(idx, 1, seed, cls);
        }
        tri += 2; u += L;
      }
    }
    // ---- roof
    c.set(roofHex);
    const contour = b.o.map(([x, z]) => new THREE.Vector2(x, z));
    const holes = (b.hl || []).map((hh) => hh.map(([x, z]) => new THREE.Vector2(x, z)));
    let tris;
    try { tris = THREE.ShapeUtils.triangulateShape(contour, holes); } catch { tris = []; }
    const all = contour.concat(...holes);
    for (const t of tris) {
      for (const k of upward(all, t)) {
        const v = all[k];
        pos.push(v.x, h, v.y); nor.push(0, 1, 0); uv.push(v.x, v.y);
        col.push(c.r, c.g, c.b); info.push(idx, 0, seed, cls);
      }
      tri += 1;
    }
    // under-side of canopies so they read from low angles
    if (isRoof) {
      for (const t of tris) for (const k of upward(all, t).reverse()) { const v = all[k]; pos.push(v.x, base, v.y); nor.push(0, -1, 0); uv.push(0, 0); col.push(c.r * 0.7, c.g * 0.7, c.b * 0.7); info.push(idx, 0, seed, 3); }
      tri += tris.length;
    }

    // Black PVC water tanks on terraces are a defining Chennai skyline detail.
    if (!isRoof && cls !== 2 && (ov.lv ?? b.lv) >= 2 && b.a > 50 && b.a < 900 && hash(b.id * 13) > 0.38 && !ov.noTank) {
      const bb = bboxOf(b.o);
      for (let tries = 0; tries < 6; tries++) {
        const px = bb.x0 + (bb.x1 - bb.x0) * (0.25 + 0.5 * hash(b.id + tries * 31));
        const pz = bb.z0 + (bb.z1 - bb.z0) * (0.25 + 0.5 * hash(b.id * 3 + tries * 17));
        if (inPoly([px, pz], b.o)) { tanks.push([px, h, pz, 0.55 + hash(b.id * 5) * 0.3]); break; }
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aInfo', new THREE.Float32BufferAttribute(info, 4));
  g.computeBoundingSphere();

  const material = makeBuildingMaterial();
  const mesh = new THREE.Mesh(g, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'buildings';

  // water tanks — instanced
  const tankGeo = new THREE.CylinderGeometry(0.75, 0.75, 1.4, 12);
  tankGeo.translate(0, 0.7 + 0.25, 0);
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.55, metalness: 0.0 });
  const tankMesh = new THREE.InstancedMesh(tankGeo, tankMat, tanks.length);
  const m = new THREE.Matrix4();
  tanks.forEach(([x, y, z, s], i) => { m.makeScale(s, s, s).setPosition(x, y, z); tankMesh.setMatrixAt(i, m); });
  tankMesh.castShadow = true;

  const group = new THREE.Group();
  group.add(mesh, tankMesh);

  const findIndex = (faceIndex) => {
    let lo = 0, hi = triStart.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (triStart[mid] <= faceIndex) lo = mid; else hi = mid - 1; }
    return lo;
  };

  return { group, mesh, material, meta, findIndex };
}

/** order a triangle's indices so its face points up (+y) when vertices are (x, z) Vector2s */
export function upward(all, t) {
  const a = all[t[0]], b = all[t[1]], c = all[t[2]];
  // y component of (b-a)x(c-a) with points (x,0,z): (b.z-a.z)(c.x-a.x) - (b.x-a.x)(c.z-a.z)
  const y = (b.y - a.y) * (c.x - a.x) - (b.x - a.x) * (c.y - a.y);
  return y >= 0 ? [t[0], t[1], t[2]] : [t[0], t[2], t[1]];
}

export function makeBuildingMaterial() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.0 });
  const uniforms = {
    uNight: { value: 0 },        // 0 day → 1 night
    uLit: { value: 0.35 },       // fraction of windows lit at night
    uWarm: { value: new THREE.Color('#ffc477') },
    uHover: { value: -1 },
    uSelect: { value: -1 },
    uTime: { value: 0 },
    uFestive: { value: 0 },      // Deepavali: extra-warm, more windows lit
  };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 aInfo; varying vec4 vInfo; varying vec2 vUv2; varying vec3 vWPos;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vInfo = aInfo; vUv2 = uv;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uNight; uniform float uLit; uniform vec3 uWarm; uniform float uHover; uniform float uSelect; uniform float uTime; uniform float uFestive;
        varying vec4 vInfo; varying vec2 vUv2; varying vec3 vWPos;
        float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float isWall = vInfo.y; float seed = vInfo.z; float cls = vInfo.w;
        vec3 winEmit = vec3(0.0);
        if (isWall > 0.5 && cls < 2.5) {
          float floorH = cls > 0.5 ? 3.2 : 3.4;
          float fy = vUv2.y / floorH;
          float floorIdx = floor(fy);
          float fyf = fract(fy);
          float bayW = cls > 0.5 ? 2.6 : 3.1 + seed * 0.8;
          float fx = vUv2.x / bayW;
          float bayIdx = floor(fx);
          float fxf = fract(fx);
          // horizontal floor band (chajja / sunshade line) — a strong shadow line under each floor
          float band = smoothstep(0.0, 0.05, fyf) * (1.0 - smoothstep(0.93, 0.99, fyf));
          diffuseColor.rgb *= mix(0.78, 1.0, band);
          // top coping
          float top = step(vWPos.y, 0.0);
          bool ground = floorIdx < 0.5;
          float wx = cls > 0.5 ? 0.18 : 0.26; float wy0 = ground ? 0.0 : 0.3; float wy1 = ground ? 0.78 : 0.8;
          float inWin = step(wx, fxf) * step(fxf, 1.0 - wx) * step(wy0, fyf) * step(fyf, wy1);
          float rnd = h21(vec2(bayIdx + seed * 91.0, floorIdx + seed * 13.0));
          if (ground && cls < 0.5) {
            // shopfronts: rolling shutters in faded blues/greens/greys, some open (warm interior)
            vec3 shutter = mix(vec3(0.42,0.48,0.52), mix(vec3(0.32,0.47,0.44), vec3(0.55,0.42,0.33), step(0.5, rnd)), step(0.35, rnd));
            float ribs = 0.88 + 0.12 * step(0.5, fract(vUv2.y * 6.0));
            vec3 open = vec3(0.16,0.12,0.09);
            vec3 sc = rnd > 0.55 ? open : shutter * ribs;
            diffuseColor.rgb = mix(diffuseColor.rgb, sc, inWin);
            float lit = step(0.5, rnd) * uNight;
            winEmit += inWin * lit * uWarm * (0.9 + uFestive * 0.8);
          } else {
            vec3 glass = mix(vec3(0.2,0.24,0.27), vec3(0.32,0.36,0.38), rnd);
            // painted window grills/shutters typical of older buildings
            float grill = step(0.86, fract(fxf * 4.0)) * step(cls, 0.5);
            glass = mix(glass, diffuseColor.rgb * 0.55, grill);
            diffuseColor.rgb = mix(diffuseColor.rgb, glass, inWin);
            float litP = uLit + uFestive * 0.08;
            float lit = step(1.0 - litP, h21(vec2(bayIdx * 1.7 + seed * 33.0, floorIdx * 3.1 + seed))) * uNight;
            vec3 tint = mix(uWarm, vec3(0.75,0.85,1.0), step(0.82, rnd) * (1.0 - uFestive));
            winEmit += inWin * lit * tint * (0.7 + 0.5 * rnd);
          }
        } else if (isWall < 0.5 && cls < 2.5) {
          // terrace: weathered concrete with subtle patching
          float n = h21(floor(vUv2 * 0.5));
          diffuseColor.rgb *= 0.92 + 0.12 * n;
        }
        // hover / select highlight
        float id = vInfo.x;
        float hov = 1.0 - step(0.5, abs(id - uHover));
        float sel = 1.0 - step(0.5, abs(id - uSelect));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, 1.02, 0.9) + vec3(0.06, 0.03, 0.0), hov * 0.9);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.98, 0.78, 0.45), sel * 0.35 * (0.75 + 0.25 * sin(uTime * 3.0)));
        // ambient occlusion at the street: darken the lowest metre
        if (isWall > 0.5) diffuseColor.rgb *= mix(0.62, 1.0, smoothstep(0.0, 2.2, vUv2.y));
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += winEmit * 0.42 + sel * vec3(0.25, 0.14, 0.03) * uNight;`);
  };
  mat.customProgramCacheKey = () => 'nc-buildings-v1';
  return mat;
}
