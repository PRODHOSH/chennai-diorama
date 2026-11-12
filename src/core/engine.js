import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import gsap from 'gsap';
import { state } from './state.js';
import { RainShader } from '../world/weather.js';

/**
 * Tilt-shift "miniature lens": a separable blur whose radius grows with the distance
 * from a horizontal focus band. It is what makes a 2 km slice of Chennai read as a
 * hand-built diorama rather than a map.
 */
const TiltShift = {
  uniforms: {
    tDiffuse: { value: null },
    uDir: { value: new THREE.Vector2(1, 0) },
    uRes: { value: new THREE.Vector2(1, 1) },
    uFocus: { value: 0.52 },
    uBand: { value: 0.2 },
    uAmount: { value: 2.2 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uDir; uniform vec2 uRes; uniform float uFocus; uniform float uBand; uniform float uAmount;
    varying vec2 vUv;
    void main(){
      float d = max(0.0, abs(vUv.y - uFocus) - uBand);
      float r = clamp(d * 3.2, 0.0, 1.0) * uAmount;
      vec4 sum = vec4(0.0); float wsum = 0.0;
      for (int i = -4; i <= 4; i++) {
        float fi = float(i);
        float w = exp(-fi*fi/8.0);
        sum += texture2D(tDiffuse, vUv + uDir * fi * r / uRes) * w; wsum += w;
      }
      gl_FragColor = sum / wsum;
    }`,
};

export class Engine {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.updaters = new Set();
    this.quality = detectQuality();

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: this.quality !== 'low', powerPreference: 'high-performance', logarithmicDepthBuffer: false }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === 'high' ? 2 : this.quality === 'medium' ? 1.5 : 1));
    r.setSize(container.clientWidth, container.clientHeight);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = this.quality !== 'low';
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    // soft environment reflections so brass, gold and wet roads read as metal, not black
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.22;
    this.camera = new THREE.PerspectiveCamera(32, container.clientWidth / container.clientHeight, 2, 9000);
    this.camera.position.set(-520, 820, 1080);

    const c = (this.controls = new MapControls(this.camera, r.domElement));
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.screenSpacePanning = false;
    c.minDistance = 45;
    c.maxDistance = 2600;
    c.minPolarAngle = 0.12;
    c.maxPolarAngle = 1.28;
    c.zoomSpeed = 1.1;
    c.rotateSpeed = 0.55;
    c.target.set(-60, 0, 20);
    c.zoomToCursor = true;
    c.update();

    this.bounds = { xmin: -1030, xmax: 1030, zmin: -830, zmax: 885 };
    c.addEventListener('change', () => this.clampTarget());

    // ---- lights -------------------------------------------------------
    this.hemi = new THREE.HemisphereLight(0xdfe8ff, 0x6b5a48, 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
    this.sun.castShadow = r.shadowMap.enabled;
    const sm = this.quality === 'high' ? 4096 : 2048;
    this.sun.shadow.mapSize.set(sm, sm);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.6;
    this.sunDir = new THREE.Vector3(-0.55, 0.62, 0.42).normalize();
    this.scene.add(this.sun, this.sun.target);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.12);
    this.scene.add(this.ambient);

    // ---- post ----------------------------------------------------------
    this.usePost = this.quality !== 'low';
    if (this.usePost) {
      const size = r.getDrawingBufferSize(new THREE.Vector2());
      const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: this.quality === 'high' ? 4 : 2 });
      this.composer = new EffectComposer(r, rt);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.0, 0.55, 0.88);
      this.composer.addPass(this.bloom);
      this.tiltH = new ShaderPass(TiltShift);
      this.tiltV = new ShaderPass(TiltShift);
      this.tiltV.uniforms.uDir.value.set(0, 1);
      this.composer.addPass(this.tiltH);
      this.composer.addPass(this.tiltV);
      this.rainPass = new ShaderPass(RainShader);
      this.composer.addPass(this.rainPass);
      this.composer.addPass(new OutputPass());
      this.setTiltShift(true);
    }

    this.raycaster = new THREE.Raycaster();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  setTiltShift(on) {
    if (!this.usePost) return;
    this.tiltOn = on;
    this.tiltH.enabled = this.tiltV.enabled = on;
  }

  setBloom(strength, threshold = 0.85, radius = 0.55) {
    if (!this.bloom) return;
    gsap.to(this.bloom, { strength, threshold, radius, duration: state.reduceMotion ? 0 : 2.2, ease: 'sine.inOut' });
  }

  clampTarget() {
    const t = this.controls.target, b = this.bounds;
    const cx = THREE.MathUtils.clamp(t.x, b.xmin + 40, b.xmax - 40);
    const cz = THREE.MathUtils.clamp(t.z, b.zmin + 40, b.zmax - 40);
    if (cx !== t.x || cz !== t.z || t.y !== 0) {
      const dx = cx - t.x, dz = cz - t.z;
      t.set(cx, 0, cz);
      this.camera.position.x += dx; this.camera.position.z += dz;
    }
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
      const s = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      this.tiltH.uniforms.uRes.value.copy(s);
      this.tiltV.uniforms.uRes.value.copy(s);
      this.rainPass?.uniforms.uRes.value.copy(s);
    }
  }

  /** Cinematic camera move. `to` = { target:[x,y,z], dist, polar, azimuth } */
  flyTo({ target, dist = 260, polar = 0.95, azimuth = null, duration = 2.2 }) {
    const c = this.controls;
    const tgt = new THREE.Vector3(...target);
    const cur = new THREE.Vector3().subVectors(this.camera.position, c.target);
    const sph = new THREE.Spherical().setFromVector3(cur);
    const az = azimuth ?? sph.theta;
    // take the shorter way round
    let dAz = az - sph.theta;
    dAz = Math.atan2(Math.sin(dAz), Math.cos(dAz));
    const from = { tx: c.target.x, ty: c.target.y, tz: c.target.z, r: sph.radius, phi: sph.phi, theta: sph.theta };
    const to = { tx: tgt.x, ty: tgt.y, tz: tgt.z, r: dist, phi: polar, theta: sph.theta + dAz };
    if (this._fly) this._fly.kill();
    const d = state.reduceMotion ? 0.001 : duration;
    // lift the camera mid-flight for long hops so the move reads as a "glide" over the city
    const hop = Math.hypot(to.tx - from.tx, to.tz - from.tz);
    const lift = Math.min(1.0, hop / 900) * 0.6;
    const p = { k: 0 };
    return new Promise((resolve) => {
      this._fly = gsap.to(p, {
        k: 1, duration: d, ease: 'power3.inOut',
        onUpdate: () => {
          const k = p.k;
          const tx = from.tx + (to.tx - from.tx) * k, ty = from.ty + (to.ty - from.ty) * k, tz = from.tz + (to.tz - from.tz) * k;
          const bump = Math.sin(Math.PI * k) * lift;
          const r = from.r + (to.r - from.r) * k + bump * hop * 0.5;
          const phi = from.phi + (to.phi - from.phi) * k - bump * 0.25;
          const th = from.theta + (to.theta - from.theta) * k;
          c.target.set(tx, ty, tz);
          const off = new THREE.Vector3().setFromSpherical(new THREE.Spherical(r, phi, th));
          this.camera.position.copy(c.target).add(off);
          this.camera.lookAt(c.target);
        },
        onComplete: () => { this._fly = null; c.update(); resolve(); },
      });
    });
  }

  cameraState() {
    return { target: this.controls.target.toArray(), pos: this.camera.position.toArray() };
  }

  restoreCamera(s, duration = 1.6) {
    const off = new THREE.Vector3().fromArray(s.pos).sub(new THREE.Vector3().fromArray(s.target));
    const sph = new THREE.Spherical().setFromVector3(off);
    return this.flyTo({ target: s.target, dist: sph.radius, polar: sph.phi, azimuth: sph.theta, duration });
  }

  onUpdate(fn) { this.updaters.add(fn); return () => this.updaters.delete(fn); }

  start() {
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      const t = this.clock.elapsedTime;
      this.controls.update();
      this.updateShadowFrustum();
      for (const fn of this.updaters) fn(dt, t);
      if (this.composer) {
        // focus band follows the camera tilt: steeper views need a wider sharp band
        const polar = this.controls.getPolarAngle();
        const band = THREE.MathUtils.mapLinear(polar, 0.1, 1.3, 0.42, 0.1);
        this.tiltH.uniforms.uBand.value = this.tiltV.uniforms.uBand.value = band;
        this.composer.render(dt);
      } else this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  updateShadowFrustum() {
    const t = this.controls.target;
    const dist = this.camera.position.distanceTo(t);
    // depth precision: scale the near plane with distance so a 2 km overview doesn't
    // z-fight (the flicker between ground, parks and roads that sit centimetres apart)
    const near = THREE.MathUtils.clamp(dist * 0.02, 1, 60);
    if (Math.abs(this.camera.near - near) / near > 0.15) { this.camera.near = near; this.camera.far = Math.max(9000, dist * 8); this.camera.updateProjectionMatrix(); }
    // shadow frustum in coarse steps — resizing it every frame makes shadows shimmer
    const half = THREE.MathUtils.clamp(Math.ceil((dist * 0.62) / 150) * 150, 150, 900);
    const cam = this.sun.shadow.camera;
    if (cam.right !== half) {
      cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
      cam.near = 10; cam.far = 3000;
      cam.updateProjectionMatrix();
    }
    // snap to texel grid to avoid shimmering while panning
    const texel = (half * 2) / this.sun.shadow.mapSize.x;
    const sx = Math.round(t.x / texel) * texel, sz = Math.round(t.z / texel) * texel;
    this.sun.target.position.set(sx, 0, sz);
    this.sun.position.set(sx + this.sunDir.x * 1200, this.sunDir.y * 1200, sz + this.sunDir.z * 1200);
  }

  pick(clientX, clientY, objects) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(v, this.camera);
    return this.raycaster.intersectObjects(objects, false)[0] || null;
  }

  groundPoint(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(v, this.camera);
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? p : null;
  }
}

function detectQuality() {
  const saved = localStorage.getItem('nc.quality');
  if (saved && saved !== 'auto') return saved;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 600;
  if (mobile) return 'low';
  const cores = navigator.hardwareConcurrency || 4;
  return cores >= 8 ? 'high' : 'medium';
}
