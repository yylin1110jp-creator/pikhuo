import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";

const TAU = Math.PI * 2;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  const value = clamp(t, 0, 1);
  return value * value * (3 - 2 * value);
}

function randomGaussian() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

export class ParticleExperience {
  constructor(canvas) {
    this.canvas = canvas;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.isMobile = window.matchMedia("(max-width: 820px)").matches;
    this.count = this.reducedMotion ? 1800 : this.isMobile ? 3200 : 8600;
    this.ambientCount = this.reducedMotion ? 180 : this.isMobile ? 380 : 1200;
    this.pointer = new THREE.Vector2(99, 99);
    this.pointerTarget = new THREE.Vector2(99, 99);
    this.progress = 1;
    this.progressTarget = 1;
    this.intro = this.reducedMotion ? 1 : 0;
    this.introStart = performance.now();
    this.running = true;
    this.clock = new THREE.Clock();
    this.logoPixels = [];

    if (!this.canUseWebGL()) {
      document.body.classList.add("no-webgl");
      return;
    }

    try {
      this.initRenderer();
      this.loadLogo();
    } catch (error) {
      console.warn("PIKHUO particle scene unavailable:", error);
      document.body.classList.add("no-webgl");
    }
  }

  canUseWebGL() {
    try {
      const probe = document.createElement("canvas");
      return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
    } catch (_error) {
      return false;
    }
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance"
    });
    this.renderer.setClearColor(0x050308, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    this.camera.position.set(0, 0, 14);

    this.handleResize = this.handleResize.bind(this);
    this.handlePointer = this.handlePointer.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);
    this.animate = this.animate.bind(this);

    window.addEventListener("resize", this.handleResize, { passive: true });
    window.addEventListener("pointermove", this.handlePointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.handlePointerLeave);
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.running = false;
      document.body.classList.add("no-webgl");
    });
    this.handleResize();
  }

  async loadLogo() {
    const image = new Image();
    image.decoding = "async";
    image.src = new URL("../assets/pikhuo-mark.png", import.meta.url).href;
    await image.decode();
    this.logoPixels = this.readLogoPixels(image);
    if (!this.logoPixels.length) throw new Error("Logo alpha data is empty.");
    this.createMainParticles();
    this.createAmbientParticles();
    this.renderer.setAnimationLoop(this.animate);
  }

  readLogoPixels(image) {
    const surface = document.createElement("canvas");
    const context = surface.getContext("2d", { willReadFrequently: true });
    surface.width = image.naturalWidth;
    surface.height = image.naturalHeight;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, surface.width, surface.height).data;
    const samples = [];
    for (let y = 0; y < surface.height; y += 2) {
      for (let x = 0; x < surface.width; x += 2) {
        if (pixels[(y * surface.width + x) * 4 + 3] > 100) samples.push({ x, y });
      }
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    samples.forEach((sample) => {
      minX = Math.min(minX, sample.x);
      maxX = Math.max(maxX, sample.x);
      minY = Math.min(minY, sample.y);
      maxY = Math.max(maxY, sample.y);
    });
    this.logoBounds = { minX, maxX, minY, maxY };
    return samples;
  }

  createMainParticles() {
    const geometry = new THREE.BufferGeometry();
    const scatter = new Float32Array(this.count * 3);
    const logo = new Float32Array(this.count * 3);
    const params = new Float32Array(this.count * 4);
    const offsets = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const seeds = new Float32Array(this.count);
    const compact = this.isMobile ? 1 : 0;
    const logoWidth = this.isMobile ? 4.25 : 5.45;
    const logoCenterX = this.isMobile ? 0 : 3.05;
    const logoCenterY = this.isMobile ? 2.35 : 0.75;
    const logoRatio = (this.logoBounds.maxY - this.logoBounds.minY) / (this.logoBounds.maxX - this.logoBounds.minX);
    const logoHeight = logoWidth * logoRatio;

    for (let i = 0; i < this.count; i += 1) {
      const index = i * 3;
      const paramIndex = i * 4;
      const seed = Math.random();
      const scatterRadius = Math.pow(Math.random(), 0.54);
      const scatterAngle = Math.random() * TAU;
      const sample = this.logoPixels[Math.floor(Math.random() * this.logoPixels.length)];
      const nx = (sample.x - this.logoBounds.minX) / (this.logoBounds.maxX - this.logoBounds.minX) - 0.5;
      const ny = 0.5 - (sample.y - this.logoBounds.minY) / (this.logoBounds.maxY - this.logoBounds.minY);

      scatter[index] = Math.cos(scatterAngle) * scatterRadius * (compact ? 6.2 : 11.5);
      scatter[index + 1] = Math.sin(scatterAngle) * scatterRadius * 6.2;
      scatter[index + 2] = randomGaussian() * 3.4;
      logo[index] = logoCenterX + nx * logoWidth + randomGaussian() * 0.007;
      logo[index + 1] = logoCenterY + ny * logoHeight + randomGaussian() * 0.007;
      logo[index + 2] = randomGaussian() * 0.1;

      params[paramIndex] = Math.random() * TAU;
      params[paramIndex + 1] = Math.random();
      params[paramIndex + 2] = Math.random();
      params[paramIndex + 3] = lerp(0.7, 1.3, Math.random());
      offsets[index] = randomGaussian() * 0.14;
      offsets[index + 1] = i % 2 === 0 ? -1 : 1;
      offsets[index + 2] = randomGaussian() * 0.18;
      sizes[i] = seed > 0.975 ? lerp(1.05, 1.45, Math.random()) : lerp(0.42, 0.96, Math.pow(Math.random(), 1.75));
      seeds[i] = seed;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(scatter, 3));
    geometry.setAttribute("aLogo", new THREE.BufferAttribute(logo, 3));
    geometry.setAttribute("aParams", new THREE.BufferAttribute(params, 4));
    geometry.setAttribute("aOffsets", new THREE.BufferAttribute(offsets, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    this.uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 1 },
      uIntro: { value: this.intro },
      uPointer: { value: this.pointer.clone() },
      uPointerStrength: { value: this.reducedMotion ? 0 : this.isMobile ? 0.025 : 0.065 },
      uPointScale: { value: Math.min(window.devicePixelRatio || 1, this.isMobile ? 1 : 1.35) },
      uCompact: { value: compact }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      vertexShader: `
        attribute vec3 aLogo;
        attribute vec4 aParams;
        attribute vec3 aOffsets;
        attribute float aSize;
        attribute float aSeed;
        uniform float uTime;
        uniform float uProgress;
        uniform float uIntro;
        uniform vec2 uPointer;
        uniform float uPointerStrength;
        uniform float uPointScale;
        uniform float uCompact;
        varying float vAlpha;
        varying float vSeed;
        varying float vDepth;
        varying float vPathFade;
        varying vec2 vScreen;
        const float TWO_PI = 6.283185307179586;

        float ease(float t) {
          t = clamp(t, 0.0, 1.0);
          return t * t * (3.0 - 2.0 * t);
        }

        vec3 signalPosition() {
          float angle = aParams.x + uTime * (0.026 + aParams.w * 0.016);
          float organic = 1.0 + sin(angle * 3.0 + 0.8) * 0.055 + cos(angle * 5.0) * 0.025;
          float rx = mix(1.55, 1.82, 1.0 - uCompact) * organic;
          float ry = mix(3.75, 4.45, 1.0 - uCompact) * organic;
          float centerY = mix(0.35, 0.05, 1.0 - uCompact);
          float openPull = smoothstep(0.82, 1.0, sin(angle * 0.5) * 0.5 + 0.5);
          return vec3(0.55 + cos(angle) * (rx + aOffsets.x) + openPull * 0.22,
            centerY + sin(angle) * (ry + aOffsets.x * 0.7),
            sin(angle * 1.35) * 0.72 + aOffsets.z);
        }

        vec3 weavePosition(out float edgeFade) {
          float flow = fract(aParams.y + uTime * (0.0038 + aParams.w * 0.0028));
          edgeFade = smoothstep(0.015, 0.09, flow) * (1.0 - smoothstep(0.91, 0.985, flow));
          float phase = flow * TWO_PI * 2.15;
          float radius = mix(0.9, 1.22, 1.0 - uCompact);
          float centerX = mix(0.0, -0.25, 1.0 - uCompact);
          return vec3(centerX + sin(phase) * radius * aOffsets.y + aOffsets.x,
            mix(-5.0, 5.0, flow),
            cos(phase) * 1.05 * aOffsets.y + aOffsets.z);
        }

        vec3 returnPosition() {
          float angle = 0.34 + aParams.z * (TWO_PI - 0.68) + uTime * (0.018 + aParams.w * 0.012);
          float radiusX = mix(1.65, 2.05, 1.0 - uCompact);
          float radiusY = mix(3.35, 4.05, 1.0 - uCompact);
          float curl = sin(angle * 2.0) * 0.16;
          return vec3(sin(angle) * (radiusX + aOffsets.x) + cos(angle * 3.0) * 0.16,
            -0.72 + cos(angle) * (radiusY + aOffsets.x * 0.6),
            sin(angle * 0.5) * 0.85 + curl + aOffsets.z);
        }

        void main() {
          float weaveFade = 1.0;
          vec3 signal = signalPosition();
          vec3 weave = weavePosition(weaveFade);
          vec3 returnFlow = returnPosition();
          vec3 target;
          if (uProgress < 2.0) target = mix(aLogo, signal, ease(uProgress - 1.0));
          else if (uProgress < 3.0) target = mix(signal, weave, ease(uProgress - 2.0));
          else target = mix(weave, returnFlow, ease(uProgress - 3.0));

          vec3 p = mix(position, target, ease(uIntro));
          p.z += sin(uTime * (0.12 + aSeed * 0.08) + aSeed * 31.4) * 0.035;
          float pointerDistance = distance(p.xy, uPointer);
          float pointerFalloff = smoothstep(1.25, 0.0, pointerDistance);
          vec2 direction = normalize(p.xy - uPointer + vec2(0.0001));
          p.xy += direction * pointerFalloff * uPointerStrength;
          p.z += pointerFalloff * uPointerStrength * 0.45;

          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * uPointScale * (66.0 / -mvPosition.z);
          vScreen = gl_Position.xy / gl_Position.w;
          vSeed = aSeed;
          vDepth = clamp((p.z + 3.0) / 6.0, 0.0, 1.0);
          vAlpha = mix(0.11, 0.43, pow(aSeed, 2.35));
          float weaveInfluence = 1.0 - smoothstep(0.72, 1.0, abs(uProgress - 3.0));
          vPathFade = mix(1.0, weaveFade, weaveInfluence);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform float uCompact;
        varying float vAlpha;
        varying float vSeed;
        varying float vDepth;
        varying float vPathFade;
        varying vec2 vScreen;

        float roundedBoxMask(vec2 point, vec4 box) {
          vec2 center = (box.xy + box.zw) * 0.5;
          vec2 halfSize = (box.zw - box.xy) * 0.5;
          vec2 q = abs(point - center) - halfSize;
          float distanceToBox = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
          return 1.0 - smoothstep(-0.05, 0.24, distanceToBox);
        }

        vec4 safeZone() {
          if (uCompact > 0.5) return vec4(-1.08, -1.08, 1.08, -0.04);
          if (uProgress < 1.62) return vec4(-1.08, -0.64, -0.12, 0.72);
          if (uProgress < 2.58) return vec4(-1.08, -0.72, -0.30, 0.64);
          if (uProgress < 3.45) return vec4(0.28, -0.78, 1.08, 0.40);
          return vec4(-0.55, 0.15, 0.55, 1.08);
        }

        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float distanceToCenter = length(uv);
          float softEdge = 1.0 - smoothstep(0.12, 0.5, distanceToCenter);
          float tinyCore = 1.0 - smoothstep(0.0, 0.11, distanceToCenter);
          vec3 deepLavender = vec3(0.43, 0.31, 0.49);
          vec3 softLavender = vec3(0.72, 0.60, 0.76);
          vec3 quietWhite = vec3(0.86, 0.82, 0.88);
          vec3 color = mix(deepLavender, softLavender, smoothstep(0.38, 0.9, vSeed));
          color = mix(color, quietWhite, smoothstep(0.965, 1.0, vSeed) * 0.42);
          color += tinyCore * smoothstep(0.985, 1.0, vSeed) * 0.08;
          float textMask = roundedBoxMask(vScreen, safeZone());
          float alpha = softEdge * vAlpha * mix(0.72, 1.0, vDepth) * vPathFade * mix(1.0, 0.12, textMask);
          if (alpha < 0.008) discard;
          gl_FragColor = vec4(color, alpha);
        }
      `
    });
    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);
  }

  createAmbientParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.ambientCount * 3);
    const drifts = new Float32Array(this.ambientCount * 3);
    const sizes = new Float32Array(this.ambientCount);
    const seeds = new Float32Array(this.ambientCount);
    const layers = new Float32Array(this.ambientCount);

    for (let i = 0; i < this.ambientCount; i += 1) {
      const index = i * 3;
      const selector = Math.random();
      const layer = selector < 0.56 ? 0 : selector < 0.9 ? 0.5 : 1;
      positions[index] = lerp(-11.5, 11.5, Math.random());
      positions[index + 1] = lerp(-6.2, 6.2, Math.random());
      positions[index + 2] = layer === 0 ? lerp(-4.4, -2.0, Math.random()) : layer === 0.5 ? lerp(-1.8, 0.8, Math.random()) : lerp(1.2, 3.3, Math.random());
      drifts[index] = lerp(0.018, 0.046, Math.random()) * (Math.random() > 0.22 ? 1 : -1);
      drifts[index + 1] = lerp(-0.012, 0.022, Math.random());
      drifts[index + 2] = Math.random() * TAU;
      sizes[i] = layer === 0 ? lerp(0.22, 0.48, Math.random()) : layer === 0.5 ? lerp(0.38, 0.72, Math.random()) : lerp(0.8, 1.35, Math.random());
      seeds[i] = Math.random();
      layers[i] = layer;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aDrift", new THREE.BufferAttribute(drifts, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute("aLayer", new THREE.BufferAttribute(layers, 1));
    this.ambientUniforms = {
      uTime: { value: 0 },
      uProgress: { value: 1 },
      uPointScale: { value: Math.min(window.devicePixelRatio || 1, this.isMobile ? 1 : 1.25) },
      uCompact: { value: this.isMobile ? 1 : 0 }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.ambientUniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      vertexShader: `
        attribute vec3 aDrift;
        attribute float aSize;
        attribute float aSeed;
        attribute float aLayer;
        uniform float uTime;
        uniform float uPointScale;
        uniform float uCompact;
        varying float vAlpha;
        varying float vLayer;
        varying float vSeed;
        varying vec2 vScreen;

        void main() {
          vec3 p = position;
          float spanX = mix(13.0, 23.0, 1.0 - uCompact);
          float spanY = 12.4;
          p.x = mod(p.x + aDrift.x * uTime + spanX * 0.5, spanX) - spanX * 0.5;
          p.y = mod(p.y + aDrift.y * uTime + spanY * 0.5, spanY) - spanY * 0.5;
          p.x += sin(uTime * 0.018 + aDrift.z) * (0.12 + aLayer * 0.18);
          p.y += cos(uTime * 0.014 + aDrift.z * 1.3) * (0.08 + aLayer * 0.12);
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * mix(0.82, 1.3, aLayer) * uPointScale * (70.0 / -mvPosition.z);
          vScreen = gl_Position.xy / gl_Position.w;
          vLayer = aLayer;
          vSeed = aSeed;
          vAlpha = mix(0.025, 0.105, aSeed) * mix(0.78, 1.0, aLayer);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform float uCompact;
        varying float vAlpha;
        varying float vLayer;
        varying float vSeed;
        varying vec2 vScreen;

        float roundedBoxMask(vec2 point, vec4 box) {
          vec2 center = (box.xy + box.zw) * 0.5;
          vec2 halfSize = (box.zw - box.xy) * 0.5;
          vec2 q = abs(point - center) - halfSize;
          float distanceToBox = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
          return 1.0 - smoothstep(-0.04, 0.28, distanceToBox);
        }

        vec4 safeZone() {
          if (uCompact > 0.5) return vec4(-1.08, -1.08, 1.08, -0.02);
          if (uProgress < 1.62) return vec4(-1.08, -0.67, -0.10, 0.74);
          if (uProgress < 2.58) return vec4(-1.08, -0.76, -0.28, 0.66);
          if (uProgress < 3.45) return vec4(0.24, -0.82, 1.08, 0.44);
          return vec4(-0.62, 0.10, 0.62, 1.08);
        }

        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float softness = 1.0 - smoothstep(mix(0.1, 0.02, vLayer), 0.5, d);
          float textMask = roundedBoxMask(vScreen, safeZone());
          float edgeFade = smoothstep(-1.08, -0.83, vScreen.x) * (1.0 - smoothstep(0.83, 1.08, vScreen.x));
          vec3 color = mix(vec3(0.35, 0.27, 0.39), vec3(0.63, 0.51, 0.68), vLayer * 0.72 + vSeed * 0.18);
          float alpha = softness * vAlpha * mix(1.0, 0.08, textMask) * edgeFade;
          if (alpha < 0.004) discard;
          gl_FragColor = vec4(color, alpha);
        }
      `
    });
    this.ambientPoints = new THREE.Points(geometry, material);
    this.ambientPoints.renderOrder = -1;
    this.scene.add(this.ambientPoints);
  }

  handleResize() {
    if (!this.renderer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const mobile = width <= 820;
    const ratio = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.35);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.uniforms) this.uniforms.uPointScale.value = ratio;
    if (this.ambientUniforms) this.ambientUniforms.uPointScale.value = Math.min(ratio, mobile ? 1 : 1.25);
  }

  handlePointer(event) {
    if (this.reducedMotion || this.isMobile) return;
    const normalizedX = event.clientX / window.innerWidth * 2 - 1;
    const normalizedY = -(event.clientY / window.innerHeight * 2 - 1);
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * this.camera.position.z;
    const visibleWidth = visibleHeight * this.camera.aspect;
    this.pointerTarget.set(normalizedX * visibleWidth * 0.5, normalizedY * visibleHeight * 0.5);
  }

  handlePointerLeave() {
    this.pointerTarget.set(99, 99);
  }

  handleVisibility() {
    this.running = !document.hidden;
  }

  setProgress(progress) {
    this.progressTarget = clamp(progress, 1, 4);
  }

  setSceneOpacity(value) {
    this.canvas.style.opacity = String(clamp(value, 0, 1));
  }

  animate() {
    if (!this.points || !this.running) return;
    const now = performance.now();
    const elapsed = this.clock.getElapsedTime();
    if (!this.reducedMotion) {
      this.intro = smoothstep((now - this.introStart) / 2500);
      this.progress += (this.progressTarget - this.progress) * 0.042;
      this.pointer.lerp(this.pointerTarget, 0.045);
      this.uniforms.uTime.value = elapsed;
      this.ambientUniforms.uTime.value = elapsed;
    } else {
      this.progress = Math.round(this.progressTarget);
    }
    this.uniforms.uIntro.value = this.intro;
    this.uniforms.uProgress.value = this.progress;
    this.uniforms.uPointer.value.copy(this.pointer);
    this.ambientUniforms.uProgress.value = this.progress;
    const pointerIsAway = this.pointerTarget.x === 99;
    const cameraTargetX = pointerIsAway ? 0 : this.pointer.x * 0.009;
    const cameraTargetY = pointerIsAway ? 0 : this.pointer.y * 0.006;
    this.camera.position.x += (cameraTargetX - this.camera.position.x) * 0.02;
    this.camera.position.y += (cameraTargetY - this.camera.position.y) * 0.02;
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }
}
