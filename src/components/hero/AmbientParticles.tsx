'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ambientMotion, heroLayoutMotion } from '@/config/motion';
import { getHeroScrollProgress } from '@/lib/heroScroll';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPointSize;
  uniform float uPixelRatio;
  uniform float uFlow;
  uniform float uSpeed;
  uniform float uLayerMode;
  uniform vec2 uMouse;
  uniform float uMouseRadius;
  uniform float uMouseStrength;
  uniform float uScroll;
  uniform float uTextClearCenterY;
  uniform float uTextClearHalfWidth;
  uniform float uTextClearHalfHeight;
  uniform float uTextClearStrength;

  attribute float aSeed;
  attribute float aBrightness;
  attribute float aCurve;

  varying float vAlpha;
  varying float vBrightness;
  varying float vTextClear;

  mat2 rotate2d(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    vec3 p = position;
    float t = uTime * uSpeed;

    if (uLayerMode < 0.5) {
      p.x += sin(t * 0.42 + aSeed * 21.0) * uFlow * 0.34;
      p.y += cos(t * 0.35 + aSeed * 17.0) * uFlow * 0.22;
      p.z += sin(t * 0.25 + aSeed * 13.0) * uFlow * 0.14;
    } else if (uLayerMode < 1.5) {
      float radius = length(p.xy);
      float angle = atan(p.y, p.x);
      float curlA = sin(p.y * 0.74 + t * 0.92 + aCurve * 6.2);
      float curlB = cos(p.x * 0.55 - t * 0.68 + aSeed * 8.5);
      float broadWave = sin(angle * 2.2 + radius * 0.70 - t * 0.88 + aCurve * 6.2831);
      float localTurn = (0.12 + 0.20 * sin(t * 0.29 + aSeed * 7.0)) * uFlow / (0.82 + radius * 0.38);

      p.xy = rotate2d(localTurn) * p.xy;
      p.x += (curlA * 0.64 + curlB * 0.20 + broadWave * 0.16) * uFlow;
      p.y += (curlB * 0.54 - curlA * 0.16 + broadWave * 0.12) * uFlow;
      p.z += broadWave * uFlow * 0.38;

      // Slow directional travel plus two broad bends makes the midground read as a field,
      // not a uniformly drifting star layer.
      p.x += sin(t * 0.23 + aCurve * 5.4) * uFlow * 0.16;
      p.y += cos(t * 0.19 + aSeed * 4.7) * uFlow * 0.08;
      p.y += sin(p.x * 0.48 + t * 0.42 + aCurve * 4.0) * uFlow * 0.18;

      // Scroll gradually stretches the same field into travel direction. Kept restrained
      // in this build so the real object morph can be plugged in later.
      float scrollStage = smoothstep(0.08, 0.72, uScroll);
      p.x += scrollStage * (aSeed - 0.5) * 1.45;
      p.y += scrollStage * sin(aSeed * 19.0 + t * 0.4) * 0.18;
    } else {
      p.x += sin(t * 1.52 + aSeed * 15.0 + p.y * 0.30) * uFlow;
      p.y += cos(t * 1.16 + aSeed * 19.0 + p.x * 0.22) * uFlow * 0.72;
      p.z += sin(t * 0.96 + aSeed * 23.0) * uFlow * 0.54;
    }

    vec2 delta = p.xy - uMouse;
    float dMouse = length(delta);
    float influence = 1.0 - smoothstep(0.0, uMouseRadius, dMouse);
    influence = influence * influence;
    vec2 radial = normalize(delta + vec2(0.0001));
    vec2 tangent = vec2(-radial.y, radial.x);
    float swirl = sin(aSeed * 22.0 + uTime * 0.55) * 0.42;
    p.xy += radial * influence * uMouseStrength;
    p.xy += tangent * influence * uMouseStrength * swirl;
    p.z += influence * uMouseStrength * 0.18 * sin(aSeed * 17.0);

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float perspective = 7.0 / max(0.9, -mvPosition.z);
    float depthScale = clamp(perspective, 0.58, 2.5);
    gl_PointSize = uPointSize * uPixelRatio * depthScale * (0.70 + aSeed * 0.60);

    float quietX = 1.0 - smoothstep(uTextClearHalfWidth * 0.68, uTextClearHalfWidth, abs(p.x));
    float quietY = 1.0 - smoothstep(uTextClearHalfHeight * 0.68, uTextClearHalfHeight, abs(p.y - uTextClearCenterY));
    vTextClear = quietX * quietY * uTextClearStrength;
    vBrightness = aBrightness;
    vAlpha = 0.82 + 0.18 * sin(aSeed * 17.0 + uTime * 0.14);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uLayerMode;

  varying float vAlpha;
  varying float vBrightness;
  varying float vTextClear;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float isForeground = step(1.5, uLayerMode);
    float edgeStart = mix(0.17, 0.035, isForeground);
    float coreSize = mix(0.095, 0.022, isForeground);
    float glow = 1.0 - smoothstep(edgeStart, 0.5, d);
    float core = 1.0 - smoothstep(0.0, coreSize, d);

    vec3 color = uColor * (0.50 + glow * 0.34 + core * 0.24);
    float quiet = 1.0 - vTextClear;
    float alpha = glow * uOpacity * vAlpha * vBrightness * quiet;
    gl_FragColor = vec4(color * (0.56 + vBrightness * 0.74), alpha);
  }
`;

type LayerName = keyof typeof ambientMotion;
type LayerSetup = {
  zMin: number;
  zMax: number;
  radiusMin: number;
  radiusMax: number;
  yRange: number;
  color: string;
  mode: number;
};

const layerSetup: Record<LayerName, LayerSetup> = {
  foreground: { zMin: 2.2, zMax: 4.7, radiusMin: 1.8, radiusMax: 6.6, yRange: 5.2, color: '#ecd5ff', mode: 2 },
  midground: { zMin: -1.0, zMax: 1.6, radiusMin: 1.65, radiusMax: 6.25, yRange: 4.8, color: '#d3a0f4', mode: 1 },
  background: { zMin: -5.7, zMax: -1.75, radiusMin: 1.6, radiusMax: 7.7, yRange: 6.0, color: '#9f74bd', mode: 0 },
};

function seeded(index: number, salt: number) {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function tieredBrightness(r: number, low: number, mid: number, high: number) {
  if (r < 0.85) return low * (0.68 + r * 0.32);
  if (r < 0.982) return mid * (0.74 + (r - 0.85) * 1.35);
  return high * (0.88 + (r - 0.982) * 5.0);
}

function ParticleLayer({ name }: { name: LayerName }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { gl, pointer, viewport } = useThree();
  const config = ambientMotion[name];
  const setup = layerSetup[name];
  const mouse = useRef(new THREE.Vector2(999, 999));

  const geometry = useMemo(() => {
    const positions = new Float32Array(config.count * 3);
    const seeds = new Float32Array(config.count);
    const brightness = new Float32Array(config.count);
    const curve = new Float32Array(config.count);

    for (let i = 0; i < config.count; i++) {
      const s1 = seeded(i, 1.13 + config.count);
      const s2 = seeded(i, 2.71 + config.count);
      const s3 = seeded(i, 4.92 + config.count);
      const s4 = seeded(i, 7.84 + config.count);
      const s5 = seeded(i, 10.17 + config.count);
      const angle = s1 * Math.PI * 2;
      const radius = setup.radiusMin + (setup.radiusMax - setup.radiusMin) * Math.pow(s2, 0.82);

      let x = Math.cos(angle) * radius;
      let y = (s3 - 0.5) * setup.yRange;

      if (name === 'midground') {
        // Broad left/right corridors and voids echo the reference's living field without
        // turning the background into a full-screen effect wall.
        const side = s5 < 0.5 ? -1 : 1;
        const band = Math.sin(angle * 1.55 + s4 * 5.0) * 0.52;
        x += side * (0.48 + s2 * 0.56) + band * 0.42;
        y += Math.sin(angle * 1.75 + s5 * 6.0) * 0.38;
        if (s3 > 0.64 && s2 < 0.52) {
          x *= 1.22;
          y *= 0.82;
        }
      } else if (name === 'background') {
        const cluster = Math.floor(s5 * 5.0);
        const cx = [-4.1, -2.0, 0.4, 2.8, 4.4][cluster] ?? 0;
        const cy = [1.6, -1.2, 2.0, -1.5, 0.5][cluster] ?? 0;
        const blend = s5 > 0.32 ? 0.31 : 0.06;
        x = THREE.MathUtils.lerp(x, cx + (s2 - 0.5) * 2.9, blend);
        y = THREE.MathUtils.lerp(y, cy + (s3 - 0.5) * 2.2, blend);
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = THREE.MathUtils.lerp(setup.zMin, setup.zMax, s4);
      seeds[i] = seeded(i, 11.31 + config.count);
      curve[i] = seeded(i, 17.77 + config.count);
      brightness[i] = tieredBrightness(
        seeded(i, 23.19 + config.count),
        config.brightnessLow,
        config.brightnessMid,
        config.brightnessHigh
      );
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    g.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1));
    g.setAttribute('aCurve', new THREE.BufferAttribute(curve, 1));
    g.computeBoundingSphere();
    return g;
  }, [config, name, setup]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPointSize: { value: config.pointSize },
    uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
    uFlow: { value: config.flow },
    uSpeed: { value: config.speed },
    uLayerMode: { value: setup.mode },
    uColor: { value: new THREE.Color(setup.color) },
    uOpacity: { value: config.opacity },
    uMouse: { value: new THREE.Vector2(999, 999) },
    uMouseRadius: { value: config.mouseRadius },
    uMouseStrength: { value: config.mouseStrength },
    uScroll: { value: 0 },
    uTextClearCenterY: { value: heroLayoutMotion.textClearCenterY },
    uTextClearHalfWidth: { value: heroLayoutMotion.textClearHalfWidth },
    uTextClearHalfHeight: { value: heroLayoutMotion.textClearHalfHeight },
    uTextClearStrength: { value: heroLayoutMotion.textClearStrength },
  }), [config, gl, setup]);

  useFrame(({ clock }) => {
    if (!pointsRef.current || !materialRef.current) return;
    const scroll = getHeroScrollProgress();

    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    materialRef.current.uniforms.uScroll.value = scroll;
    mouse.current.lerp(
      new THREE.Vector2(pointer.x * viewport.width * 0.5, pointer.y * viewport.height * 0.5),
      0.08
    );
    materialRef.current.uniforms.uMouse.value.copy(mouse.current);
    materialRef.current.uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 1.5);

    // Layer-specific camera parallax: foreground travels the most, background barely moves.
    pointsRef.current.position.x = THREE.MathUtils.lerp(pointsRef.current.position.x, -pointer.x * config.parallax, 0.045);
    pointsRef.current.position.y = THREE.MathUtils.lerp(pointsRef.current.position.y, -pointer.y * config.parallax * 0.48, 0.045);
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

export function AmbientParticles() {
  return (
    <>
      <ParticleLayer name="background" />
      <ParticleLayer name="midground" />
      <ParticleLayer name="foreground" />
    </>
  );
}
