import * as THREE from 'three';
import gsap from 'gsap';

/**
 * WEATHER — designed for a diorama seen from 200–1500 m away, where real-scale raindrops
 * would be sub-pixel. So rain is composed of three layers that read correctly at this scale:
 *
 *  1. CLOUD DECK — two noise-shaded layers above the city; coverage and darkness follow the
 *     weather, and lightning lights them from inside.
 *  2. SCREEN RAIN — a post-processing pass of slanted streaks in three depth layers, plus mist
 *     and desaturation, so the whole frame feels wet (the way rain looks through a window).
 *  3. GROUND — ripple rings blooming on the streets around where you look, and wet, reflective
 *     asphalt (handled in environment.js).
 *  Thunderstorms add branching lightning bolts that strike real tall structures (the gopuram,
 *  Central's clock tower, the tallest buildings), with a delayed thunder roll.
 */

export const RainShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRain: { value: 0 }, uWind: { value: 0.25 }, uFlash: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uRain; uniform float uWind; uniform float uFlash; uniform vec2 uRes;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    // one layer of streaks: columns of drops falling at speed, slanted by wind
    float layer(vec2 uv, float scale, float speed, float len, float density){
      uv.x += uv.y * uWind;
      vec2 p = uv * vec2(scale, scale * 0.25);
      float col = floor(p.x);
      float r = h(vec2(col, 1.7));
      float fy = p.y + uTime * speed * (0.8 + r * 0.6) + r * 7.0;
      float y = fract(fy);
      float x = fract(p.x);
      float thin = smoothstep(0.38, 0.5, x) * (1.0 - smoothstep(0.5, 0.62, x));
      float streak = smoothstep(0.0, len, y) * (1.0 - smoothstep(len, len + 0.02, y)) * (y / len);
      return thin * streak * step(1.0 - density, h(vec2(col, floor(fy))));
    }
    void main(){
      vec4 col = texture2D(tDiffuse, vUv);
      if (uRain <= 0.001 && uFlash <= 0.001) { gl_FragColor = col; return; }
      vec2 uv = vec2(vUv.x * uRes.x / uRes.y, vUv.y);
      float r = 0.0;
      r += layer(uv, 110.0, 2.1, 0.22, 0.65) * 0.42;
      r += layer(uv + 3.1, 60.0, 1.6, 0.28, 0.55) * 0.62;
      r += layer(uv + 7.7, 28.0, 1.2, 0.34, 0.38) * 0.85;
      r += layer(uv + 1.3, 170.0, 2.6, 0.18, 0.7) * 0.3;
      r *= uRain;
      float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      vec3 wet = mix(col.rgb, vec3(lum) * vec3(0.9, 0.96, 1.06), 0.38 * uRain) * (1.0 - 0.12 * uRain);
      wet = mix(wet, vec3(0.5, 0.55, 0.62) * (0.7 + 0.3 * lum), smoothstep(0.45, 1.0, vUv.y) * 0.3 * uRain);
      wet += vec3(0.75, 0.82, 0.92) * r;
      wet += vec3(0.85, 0.9, 1.0) * uFlash * 0.55;
      gl_FragColor = vec4(wet, col.a);
    }`,
};

function cloudMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    uniforms: { uTime: { value: 0 }, uCover: { value: 0 }, uDark: { value: 0 }, uFlash: { value: 0 }, uFlashPos: { value: new THREE.Vector2() } },
    vertexShader: /* glsl */ `varying vec2 vW; varying vec2 vL; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xz; vL = position.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uCover; uniform float uDark; uniform float uFlash; uniform vec2 uFlashPos;
      varying vec2 vW; varying vec2 vL;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.03; a*=0.5; } return v; }
      void main(){
        if (uCover < 0.01) discard;
        vec2 p = vW * 0.0016 + vec2(uTime * 0.012, uTime * 0.004);
        float d = fbm(p) * 0.65 + fbm(p * 2.7 - uTime * 0.01) * 0.35;
        float a = smoothstep(1.0 - uCover, 1.0 - uCover + 0.35, d);
        a *= clamp((1.0 - length(vL) / 3400.0) * 2.0, 0.0, 1.0);
        vec3 c = mix(vec3(0.95,0.95,0.96), vec3(0.2,0.22,0.27), uDark * (0.55 + d * 0.6));
        float fl = uFlash * exp(-length(vW - uFlashPos) / 650.0);
        c += vec3(0.8,0.85,1.0) * fl * 1.6;
        gl_FragColor = vec4(c, a * 0.95);
      }`,
  });
}

/** branching lightning bolt from the cloud base to a strike point */
function boltGeometry(from, to) {
  const pts = [from.clone()];
  const segs = 18;
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const p = from.clone().lerp(to, t);
    const j = (1 - Math.abs(t - 0.5) * 1.4) * 38;
    p.x += (Math.random() - 0.5) * j; p.z += (Math.random() - 0.5) * j;
    pts.push(p);
  }
  pts.push(to.clone());
  const geos = [new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1), 80, 0.9, 5, false)];
  for (let b = 0; b < 2 + Math.floor(Math.random() * 2); b++) {
    const start = pts[3 + Math.floor(Math.random() * 8)].clone();
    const bp = [start];
    let cur = start.clone();
    const dir = new THREE.Vector3((Math.random() - 0.5) * 2, -1.2, (Math.random() - 0.5) * 2).normalize();
    for (let k = 0; k < 6; k++) { cur = cur.clone().addScaledVector(dir, 18 + Math.random() * 12); cur.x += (Math.random() - 0.5) * 14; cur.z += (Math.random() - 0.5) * 14; bp.push(cur); }
    geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp), 30, 0.45, 4, false));
  }
  return geos;
}

export class Weather {
  constructor(engine, { strikeTargets = [] } = {}) {
    this.e = engine;
    this.strikeTargets = strikeTargets;
    this.cloudMat = cloudMaterial();
    const cg = new THREE.PlaneGeometry(7000, 7000, 1, 1); cg.rotateX(-Math.PI / 2);
    this.clouds = new THREE.Mesh(cg, this.cloudMat); this.clouds.position.y = 340; this.clouds.renderOrder = 5; this.clouds.frustumCulled = false;
    engine.scene.add(this.clouds);
    this.low = new THREE.Mesh(cg.clone(), cloudMaterial()); this.low.position.y = 215; this.low.renderOrder = 5; this.low.frustumCulled = false;
    engine.scene.add(this.low);
    this.pass = engine.rainPass || null;
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const c2 = cv.getContext('2d'); c2.strokeStyle = 'rgba(255,255,255,0.9)'; c2.lineWidth = 3; c2.beginPath(); c2.arc(32, 32, 26, 0, Math.PI * 2); c2.stroke();
    const ringTex = new THREE.CanvasTexture(cv);
    const rg = new THREE.PlaneGeometry(1, 1); rg.rotateX(-Math.PI / 2);
    this.N = engine.quality === 'low' ? 200 : 700;
    this.ripples = new THREE.InstancedMesh(rg, new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, opacity: 0, color: '#dfe8f2' }), this.N);
    this.ripples.frustumCulled = false; this.ripples.visible = false;
    this.rip = Array.from({ length: this.N }, () => ({ x: 0, z: 0, t: Math.random() }));
    engine.scene.add(this.ripples);
    this.bolts = new THREE.Group(); engine.scene.add(this.bolts);
    this.kind = 'clear';
    this.state = { rain: 0, cover: 0, dark: 0, low: 0 };
    const m = new THREE.Matrix4();
    engine.onUpdate((dt, t) => {
      this.cloudMat.uniforms.uTime.value = t; this.low.material.uniforms.uTime.value = t * 1.6;
      const tg = engine.controls.target;
      this.clouds.position.set(tg.x * 0.3, 520, tg.z * 0.3); this.low.position.set(tg.x * 0.5, 420, tg.z * 0.5);
      // never look *through* a cloud deck: fade each layer as the camera nears it
      const cy = engine.camera.position.y;
      this.clouds.visible = cy < 470; this.low.visible = cy < 370;
      if (this.pass) this.pass.uniforms.uTime.value = t;
      if (this.ripples.visible) {
        const dist = engine.camera.position.distanceTo(tg);
        const R = Math.min(500, Math.max(90, dist * 0.5));
        const size = Math.max(0.8, dist / 260);
        for (let i = 0; i < this.N; i++) {
          const r = this.rip[i];
          r.t += dt * (1.2 + (i % 5) * 0.15);
          if (r.t >= 1) { r.t = 0; r.x = tg.x + (Math.random() - 0.5) * 2 * R; r.z = tg.z + (Math.random() - 0.5) * 2 * R; }
          const sc = size * (0.3 + r.t * 1.6);
          m.makeScale(sc, 1, sc).setPosition(r.x, 0.32, r.z);
          this.ripples.setMatrixAt(i, m);
        }
        this.ripples.instanceMatrix.needsUpdate = true;
        this.ripples.material.opacity = 0.32 * this.state.rain;
      }
    });
  }

  set(kind, dur = 2.4) {
    this.kind = kind;
    const target = {
      clear: { rain: 0, cover: 0.0, dark: 0, low: 0 },
      haze: { rain: 0, cover: 0.22, dark: 0, low: 0 },
      rain: { rain: 0.8, cover: 0.85, dark: 0.55, low: 0.55 },
      storm: { rain: 1.0, cover: 1.0, dark: 0.95, low: 0.8 },
    }[kind] || { rain: 0, cover: 0, dark: 0, low: 0 };
    if (target.rain > 0) this.ripples.visible = true;
    gsap.to(this.state, { ...target, duration: dur, ease: 'sine.inOut', onUpdate: () => this.apply(kind), onComplete: () => { this.apply(kind); if (target.rain === 0) this.ripples.visible = false; } });
  }
  apply(kind) {
    const s = this.state;
    this.cloudMat.uniforms.uCover.value = s.cover; this.cloudMat.uniforms.uDark.value = s.dark;
    this.low.material.uniforms.uCover.value = s.low; this.low.material.uniforms.uDark.value = s.dark * 0.9;
    if (this.pass) { this.pass.uniforms.uRain.value = s.rain; this.pass.uniforms.uWind.value = kind === 'storm' ? 0.42 : 0.18; }
  }

  /** one strike: bolt + cloud glow + screen flash. Returns metres to the strike for thunder delay */
  strike() {
    const tg = this.e.controls.target;
    const cands = this.strikeTargets.filter((p) => Math.hypot(p.x - tg.x, p.z - tg.z) < 1400);
    const to = cands.length && Math.random() < 0.6 ? cands[Math.floor(Math.random() * cands.length)].clone()
      : new THREE.Vector3(tg.x + (Math.random() - 0.5) * 1400, 0, tg.z + (Math.random() - 0.5) * 1400);
    const from = new THREE.Vector3(to.x + (Math.random() - 0.5) * 200, 410, to.z + (Math.random() - 0.5) * 200);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4.2, 6), transparent: true, opacity: 1, fog: false });
    const meshes = boltGeometry(from, to).map((g) => new THREE.Mesh(g, mat));
    meshes.forEach((m) => this.bolts.add(m));
    const flash = { k: 1 };
    const u = this.cloudMat.uniforms; u.uFlashPos.value.set(from.x, from.z);
    const tl = gsap.timeline({ onComplete: () => { meshes.forEach((m) => { this.bolts.remove(m); m.geometry.dispose(); }); mat.dispose(); u.uFlash.value = 0; if (this.pass) this.pass.uniforms.uFlash.value = 0; } });
    tl.to(flash, { k: 0.15, duration: 0.07 }).to(flash, { k: 1, duration: 0.05 }).to(flash, { k: 0.3, duration: 0.09 }).to(flash, { k: 0.9, duration: 0.04 }).to(flash, { k: 0, duration: 0.5, ease: 'expo.out' });
    tl.eventCallback('onUpdate', () => {
      mat.opacity = flash.k; u.uFlash.value = flash.k; this.low.material.uniforms.uFlash.value = flash.k; this.low.material.uniforms.uFlashPos.value.set(from.x, from.z);
      if (this.pass) this.pass.uniforms.uFlash.value = flash.k * 0.6;
    });
    return Math.hypot(to.x - tg.x, to.z - tg.z);
  }
}
