import * as THREE from 'three';
import { polygonGeometry, ribbon, mergeRaw, centroid, lineLength } from './geo.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The diorama: plinth, ground plane, land-use areas, roads (with painted markings),
 * railway tracks, platforms with train sheds, rivers/canals/temple tanks.
 */

const AREA_STYLE = {
  park: { color: '#7f9a62', y: 0.08 },
  grass: { color: '#8ea36a', y: 0.07 },
  pitch: { color: '#93a86b', y: 0.09 },
  cemetery: { color: '#8b9573', y: 0.07 },
  railyard: { color: '#a59a8b', y: 0.03 },
  station: { color: '#cbbfae', y: 0.04 },
  fort: { color: '#a8a487', y: 0.04 },
  campus: { color: '#c8c1ad', y: 0.035 },
  parking: { color: '#a7a39b', y: 0.06 },
  market: { color: '#cdb79a', y: 0.06 },
};

export function buildGround(city, engine) {
  const group = new THREE.Group();
  const { xmin, xmax, zmin, zmax } = city.meta.bounds;
  const W = xmax - xmin, D = zmax - zmin;
  const cx = (xmin + xmax) / 2, cz = (zmin + zmax) / 2;

  // ---- plinth: a crafted wooden base with a brass inlay ------------------
  const pad = 26;
  const plinthGeo = new THREE.BoxGeometry(W + pad * 2, 40, D + pad * 2);
  plinthGeo.translate(cx, -20.02, cz);
  const plinthMat = new THREE.MeshStandardMaterial({ color: '#2a2440', roughness: 0.62, metalness: 0.05 });
  const plinth = new THREE.Mesh(plinthGeo, plinthMat);
  plinth.receiveShadow = true;
  group.add(plinth);
  const trimGeo = new THREE.BoxGeometry(W + pad * 2 + 0.6, 1.2, D + pad * 2 + 0.6);
  trimGeo.translate(cx, -3, cz);
  group.add(new THREE.Mesh(trimGeo, new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.35, metalness: 0.8 })));
  // engraved label strips on the south and east faces
  group.add(plinthLabel(cx, -21, zmax + pad + 0.05, W + pad * 2, 0,
    'நம்ம சென்னை  ·  NAMMA CHENNAI  ·  PARK TOWN  ·  GEORGE TOWN  ·  PERIAMET  ·  13.0825° N  80.2755° E  ·  MAP DATA © OPENSTREETMAP CONTRIBUTORS'));
  group.add(plinthLabel(xmax + pad + 0.05, -21, cz, D + pad * 2, Math.PI / 2,
    'ஒரு நகரம் மட்டுமல்ல — ஆயிரம் கதைகள்  ·  MORE THAN A CITY. A THOUSAND STORIES.'));

  // ---- ground --------------------------------------------------------------
  const groundGeo = new THREE.PlaneGeometry(W + pad * 2, D + pad * 2, 1, 1);
  groundGeo.rotateX(-Math.PI / 2);
  groundGeo.translate(cx, 0, cz);
  const groundMat = new THREE.MeshStandardMaterial({ color: '#cbbda3', roughness: 0.95 });
  addGrain(groundMat);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  ground.name = 'ground';
  group.add(ground);

  // ---- land-use areas (merged per style) -----------------------------------
  const byKind = {};
  for (const a of city.areas) {
    if (!AREA_STYLE[a.k]) continue;
    try {
      const g = polygonGeometry(a.p, [], AREA_STYLE[a.k].y);
      (byKind[a.k] ||= []).push(g);
    } catch {}
  }
  for (const [k, list] of Object.entries(byKind)) {
    const g = mergeGeometries(list.map((x) => x.toNonIndexed()));
    const m = new THREE.MeshStandardMaterial({ color: AREA_STYLE[k].color, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    if (k === 'park' || k === 'grass' || k === 'pitch' || k === 'cemetery') addGrain(m, 0.12);
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // ---- water: Cooum, Buckingham Canal, temple tanks -----------------------
  const water = makeWaterMaterial();
  const waterGeos = [];
  const tanks = [];
  for (const a of city.areas) {
    if (a.k !== 'water' && a.k !== 'pond') continue;
    try { waterGeos.push(polygonGeometry(a.p, [], 0.12).toNonIndexed()); } catch {}
    if (a.k === 'pond') tanks.push(a);
  }
  const wwRaw = city.waterways.map((w) => ribbon(w.p, w.w * 0.8, 0.1));
  if (wwRaw.some(Boolean)) waterGeos.push(mergeRaw(wwRaw).toNonIndexed());
  if (waterGeos.length) {
    const wg = mergeGeometries(waterGeos.map((g) => { g.deleteAttribute('uv'); g.deleteAttribute('normal'); return g; }));
    wg.computeVertexNormals();
    const wm = new THREE.Mesh(wg, water);
    wm.receiveShadow = true;
    group.add(wm);
    engine.onUpdate((dt, t) => { water.uniforms.uTime.value = t; });
  }
  // temple tank stepped edges (படித்துறை) — concentric granite steps
  for (const t of tanks) group.add(templeTankSteps(t.p));

  // ---- roads ---------------------------------------------------------------
  const roadGroups = { major: [], minor: [], foot: [] };
  const bridges = [];
  for (const r of city.roads) {
    const cls = r.c;
    const isFoot = cls === 'footway' || cls === 'path' || cls === 'steps' || cls === 'pedestrian';
    const isMajor = /trunk|primary|secondary/.test(cls);
    const y = isFoot ? 0.16 : isMajor ? 0.22 : 0.19;
    let yFn = null;
    if (r.br) {
      // bridges & viaducts ramp up and down rather than floating
      const L = lineLength(r.p), H = 5.5 * (r.L || 1), ramp = Math.min(60, L / 2.2);
      yFn = (s) => y + H * Math.min(1, s / ramp, (L - s) / ramp);
      bridges.push({ line: r.p, w: r.w, yFn, L });
    }
    const rb = ribbon(r.p, r.w, y, yFn);
    if (!rb) continue;
    rb.cls = cls; rb.w = r.w;
    (isFoot ? roadGroups.foot : isMajor ? roadGroups.major : roadGroups.minor).push(rb);
  }
  const roadMat = makeRoadMaterial();
  const extra = (rb) => [rb.w, rb.cls === 'primary' || rb.cls === 'trunk' ? 2 : rb.cls === 'secondary' ? 1.5 : rb.cls === 'tertiary' ? 1 : 0];
  for (const [k, list] of Object.entries(roadGroups)) {
    if (!list.length) continue;
    const g = mergeRaw(list, extra);
    const mat = k === 'foot' ? new THREE.MeshStandardMaterial({ color: '#b9ab94', roughness: 1 }) : roadMat;
    const mesh = new THREE.Mesh(g, mat);
    mesh.receiveShadow = true;
    mesh.name = 'roads-' + k;
    group.add(mesh);
  }
  // kerbs/footpaths flanking major roads — a lighter band underneath the asphalt
  const kerbRaw = [...roadGroups.major, ...roadGroups.minor.filter((r) => r.w >= 6)].map((r) => r);
  const kerbList = city.roads.filter((r) => /trunk|primary|secondary|tertiary/.test(r.c) && !r.br).map((r) => ribbon(r.p, r.w + 4.2, 0.17));
  if (kerbList.length) {
    const kerb = new THREE.Mesh(mergeRaw(kerbList), new THREE.MeshStandardMaterial({ color: '#c9bba3', roughness: 1 }));
    kerb.receiveShadow = true;
    group.add(kerb);
  }
  void kerbRaw;

  // ---- railway -------------------------------------------------------------
  for (const r of city.rails) if (r.br) bridges.push({ line: r.p, w: 4.6, yFn: bridgeY(r.p, 0.14), L: lineLength(r.p) });
  // bridge decks (roads + MRTS viaduct): side walls + piers
  group.add(buildBridgeStructures(bridges));
  const bedRaw = city.rails.map((r) => ribbon(r.p, 4.2, 0.14, r.br ? bridgeY(r.p, 0.14) : null));
  const bed = new THREE.Mesh(mergeRaw(bedRaw), makeBallastMaterial());
  bed.receiveShadow = true;
  group.add(bed);
  const railRaw = [];
  for (const r of city.rails) {
    for (const off of [-0.84, 0.84]) {
      const line = offsetLine(r.p, off);
      railRaw.push(ribbon(line, 0.22, 0.42, r.br ? bridgeY(r.p, 0.42) : null));
    }
  }
  const rails = new THREE.Mesh(mergeRaw(railRaw), new THREE.MeshStandardMaterial({ color: '#8d8f94', metalness: 0.85, roughness: 0.35 }));
  group.add(rails);

  // platforms & the great train sheds of Central
  const platforms = city.areas.filter((a) => a.k === 'platform');
  const platGeos = [];
  const shedGeos = [];
  for (const p of platforms) {
    try {
      const shape = new THREE.Shape(p.p.map(([x, z]) => new THREE.Vector2(x, -z)));
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.95, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      platGeos.push(g);
      // shed: a slightly wider pitched canopy over each platform
      const ctr = centroid(p.p);
      if (Math.hypot(ctr[0] + 30, ctr[1] + 200) < 420) {
        const s = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelSize: 3.2, bevelThickness: 0.3, bevelSegments: 1 });
        s.rotateX(-Math.PI / 2);
        s.translate(0, 8.2, 0);
        shedGeos.push(s);
      }
    } catch {}
  }
  if (platGeos.length) {
    const pm = new THREE.Mesh(mergeGeometries(platGeos), new THREE.MeshStandardMaterial({ color: '#c2b8a6', roughness: 0.9 }));
    pm.receiveShadow = pm.castShadow = true;
    group.add(pm);
  }
  if (shedGeos.length) {
    const sm = new THREE.Mesh(mergeGeometries(shedGeos), new THREE.MeshStandardMaterial({ color: '#8e979c', roughness: 0.55, metalness: 0.35 }));
    sm.castShadow = sm.receiveShadow = true;
    sm.name = 'sheds';
    group.add(sm);
  }

  return { group, ground, water, roadMat, groundMat };
}

function bridgeY(line, y) {
  const L = lineLength(line), ramp = Math.min(70, L / 2.2), H = 6;
  return (s) => y + H * Math.min(1, s / ramp, (L - s) / ramp);
}

export function offsetLine(line, off) {
  const out = [];
  for (let i = 0; i < line.length; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    out.push([line[i][0] - (dz / L) * off, line[i][1] + (dx / L) * off]);
  }
  return out;
}

function buildBridgeStructures(bridges) {
  const g = new THREE.Group();
  const pierGeo = new THREE.BoxGeometry(1.6, 1, 1.6);
  const pierPts = [];
  const wallRaw = [];
  for (const b of bridges) {
    for (const side of [-1, 1]) {
      const line = offsetLine(b.line, (side * b.w) / 2);
      const rb = ribbon(line, 0.5, 0, (s) => b.yFn(s) + 0.6);
      if (rb) wallRaw.push(rb);
    }
    let acc = 0;
    for (let i = 1; i < b.line.length; i++) {
      const a = b.line[i - 1], c = b.line[i];
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
      for (let s = 12 - (acc % 12); s < L; s += 12) {
        const t = s / L, y = b.yFn(acc + s);
        if (y > 2.5) pierPts.push([a[0] + (c[0] - a[0]) * t, y, a[1] + (c[1] - a[1]) * t]);
      }
      acc += L;
    }
  }
  if (wallRaw.length) g.add(new THREE.Mesh(mergeRaw(wallRaw), new THREE.MeshStandardMaterial({ color: '#d8d0c0', roughness: 0.9, side: THREE.DoubleSide })));
  const piers = new THREE.InstancedMesh(pierGeo, new THREE.MeshStandardMaterial({ color: '#b7ad9c', roughness: 0.9 }), pierPts.length);
  const m = new THREE.Matrix4();
  pierPts.forEach(([x, y, z], i) => { m.makeScale(1, y, 1).setPosition(x, y / 2, z); piers.setMatrixAt(i, m); });
  piers.castShadow = true;
  g.add(piers);
  return g;
}

function templeTankSteps(ring) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#b9ae9a', roughness: 0.95 });
  const ctr = centroid(ring);
  for (let k = 0; k < 3; k++) {
    const s = 1 + 0.06 * (k + 1);
    const pts = ring.map(([x, z]) => new THREE.Vector2(ctr[0] + (x - ctr[0]) * s, -(ctr[1] + (z - ctr[1]) * s)));
    const inner = ring.map(([x, z]) => new THREE.Vector2(ctr[0] + (x - ctr[0]) * (s - 0.06), -(ctr[1] + (z - ctr[1]) * (s - 0.06))));
    const shape = new THREE.Shape(pts);
    shape.holes.push(new THREE.Path(inner));
    try {
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.35 + (2 - k) * 0.35, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      g.add(mesh);
    } catch {}
  }
  return g;
}

function plinthLabel(x, y, z, width, rotY, text) {
  const cv = document.createElement('canvas');
  cv.width = 4096; cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#2a2440'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#c9a24a';
  ctx.font = '600 30px "Hind Madurai", "Noto Serif Tamil", sans-serif';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  let px = 40;
  while (px < cv.width) { ctx.fillText(text, px, 34); px += w + 120; }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(width, width / 64);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.2 }));
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  // redraw once webfonts are ready so Tamil glyphs use the right face
  document.fonts?.ready.then(() => {
    ctx.fillStyle = '#2a2440'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#c9a24a';
    ctx.font = '600 30px "Hind Madurai", "Noto Serif Tamil", sans-serif';
    let p = 40; const ww = ctx.measureText(text).width;
    while (p < cv.width) { ctx.fillText(text, p, 34); p += ww + 120; }
    tex.needsUpdate = true;
  });
  return mesh;
}

/** subtle ground grain so large flat areas don't look like plastic */
function addGrain(mat, amount = 0.08) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vGW;
      float gh(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      float gn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(gh(i),gh(i+vec2(1,0)),f.x), mix(gh(i+vec2(0,1)),gh(i+vec2(1,1)),f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      float gr = gn(vGW.xz*0.08)*0.6 + gn(vGW.xz*0.6)*0.4;
      diffuseColor.rgb *= 1.0 - ${amount.toFixed(3)} + gr * ${(amount * 2).toFixed(3)};`);
  };
  mat.customProgramCacheKey = () => 'grain' + amount;
}

function makeRoadMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: '#56534f', roughness: 0.92 });
  const uniforms = { uNight: { value: 0 } };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aExtra; varying vec2 vRUv; varying vec2 vEx;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvRUv = uv; vEx = aExtra;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vRUv; varying vec2 vEx; uniform float uNight;\nfloat rh(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1))) * 43758.5); }')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float w = vEx.x; float rank = vEx.y;
        float across = vRUv.y * w;            // metres from one edge
        float along = vRUv.x;
        // worn asphalt patches
        float wear = rh(floor(vec2(along*0.12, across*0.3)));
        diffuseColor.rgb *= 0.92 + 0.12 * wear;
        // edge lines on bigger roads
        if (rank > 0.5) {
          float edge = step(across, 0.35) + step(w - 0.35, across);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86,0.84,0.78), edge * 0.6);
          // dashed centre line
          float c = abs(across - w*0.5);
          float dash = step(c, 0.14) * step(0.5, fract(along / 6.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92,0.9,0.82), dash * 0.85);
          // median on primaries
          if (rank > 1.5) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72,0.68,0.6), step(c, 0.55) * 0.7);
        }
      `);
  };
  mat.customProgramCacheKey = () => 'nc-road';
  return mat;
}

function makeBallastMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: '#7d7468', roughness: 1 });
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      // sleepers every 0.65 m
      float sl = step(0.62, fract(vMapUv.x / 0.65));
      float inner = step(0.18, vMapUv.y) * step(vMapUv.y, 0.82);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36,0.32,0.28), sl * inner);`);
  };
  // needs a map for vMapUv to exist → tiny 1px texture
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true;
  mat.map = t;
  return mat;
}

function makeWaterMaterial() {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uDeep: { value: new THREE.Color('#3f5d5c') }, uShallow: { value: new THREE.Color('#6f8f86') },
      uSky: { value: new THREE.Color('#c9d8e0') }, uNight: { value: 0 }, uGlow: { value: new THREE.Color('#ffb35c') },
    }]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vW;
      void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSky; uniform float uNight; uniform vec3 uGlow;
      varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 p = vW.xz * 0.09;
        float w = n(p + vec2(uTime*0.12, uTime*0.05)) * 0.6 + n(p*2.3 - vec2(uTime*0.09, -uTime*0.07)) * 0.4;
        vec3 viewDir = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(viewDir.y, 0.0), 3.0);
        vec3 col = mix(uDeep, uShallow, w);
        col = mix(col, uSky, 0.25 + fres * 0.5);
        float glint = smoothstep(0.82, 0.95, w) * 0.35;
        col += glint * mix(vec3(1.0), uGlow, uNight);
        col = mix(col, col * 0.35 + uGlow * 0.08 * w, uNight * 0.7);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}
