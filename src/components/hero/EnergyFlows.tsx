'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { energyFlowMotion, heroLayoutMotion } from '@/config/motion';
import { getHeroScrollProgress } from '@/lib/heroScroll';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPointSize;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  uniform float uMouseResponse;
  uniform float uScroll;
  uniform float uTextClearCenterY;
  uniform float uTextClearHalfWidth;
  uniform float uTextClearHalfHeight;

  attribute float aT;
  attribute float aStream;
  attribute float aSeed;

  varying float vAlpha;
  varying float vTextClear;

  void main() {
    float speedJitter = 0.048 + aStream * 0.004 + aSeed * 0.006;
    float t = fract(aT + uTime * speedJitter);
    float stream = aStream;
    float side = mod(stream, 2.0) < 1.0 ? -1.0 : 1.0;
    float row = floor(stream / 2.0);

    float sweep = mix(-1.32, 1.18, t) + side * (0.09 + row * 0.025);
    float radius = mix(3.8 + row * 0.34, 2.15 + row * 0.21, sin(t * 3.14159));

    vec3 p;
    p.x = side * 0.52 + cos(sweep) * radius;
    p.y = -0.05 + sin(sweep) * radius * (0.39 + row * 0.018);
    p.y += sin(t * 12.566 + aSeed * 7.0 + stream) * 0.075;
    p.z = -0.35 - row * 0.36 + sin(t * 6.2831 + stream) * 0.15;

    // Keep a breathing corridor around the logo while still visually connecting to it.
    float centerPush = 1.0 - smoothstep(0.92, 1.95, length(p.xy));
    p.x += side * centerPush * (0.24 + row * 0.035);

    vec2 delta = p.xy - uMouse;
    float mouseInfluence = 1.0 - smoothstep(0.0, 1.58, length(delta));
    vec2 radial = normalize(delta + vec2(0.0001));
    vec2 tangent = vec2(-radial.y, radial.x);
    p.xy += radial * mouseInfluence * uMouseResponse * 0.35;
    p.xy += tangent * mouseInfluence * uMouseResponse;

    float scrollStage = smoothstep(0.10, 0.75, uScroll);
    p.x += side * scrollStage * (0.35 + row * 0.11);
    p.y += scrollStage * sin(aSeed * 18.0 + stream) * 0.12;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float depthScale = clamp(6.2 / max(1.0, -mvPosition.z), 0.6, 1.65);
    gl_PointSize = uPointSize * uPixelRatio * depthScale * (0.50 + aSeed * 0.62);

    float head = smoothstep(0.0, 0.10, t) * (1.0 - smoothstep(0.74, 1.0, t));
    float flicker = 0.72 + 0.28 * sin(aSeed * 31.0 + uTime * 0.8);
    vAlpha = head * (0.28 + 0.72 * sin(t * 3.14159)) * flicker;

    float quietX = 1.0 - smoothstep(uTextClearHalfWidth * 0.70, uTextClearHalfWidth, abs(p.x));
    float quietY = 1.0 - smoothstep(uTextClearHalfHeight * 0.70, uTextClearHalfHeight, abs(p.y - uTextClearCenterY));
    vTextClear = quietX * quietY;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  varying float vTextClear;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.07, 0.5, d);
    float core = 1.0 - smoothstep(0.0, 0.10, d);
    vec3 color = mix(vec3(0.45, 0.23, 0.57), vec3(0.94, 0.74, 1.0), core * 0.55 + glow * 0.18);
    float quiet = 1.0 - vTextClear * 0.76;
    gl_FragColor = vec4(color, glow * vAlpha * uOpacity * quiet);
  }
`;

function seeded(index: number, salt: number) {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function EnergyFlows() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { gl, pointer, viewport } = useThree();
  const mouse = useRef(new THREE.Vector2(999, 999));

  const geometry = useMemo(() => {
    const count = energyFlowMotion.streams * energyFlowMotion.pointsPerStream;
    const positions = new Float32Array(count * 3);
    const aT = new Float32Array(count);
    const aStream = new Float32Array(count);
    const aSeed = new Float32Array(count);

    for (let s = 0; s < energyFlowMotion.streams; s++) {
      for (let i = 0; i < energyFlowMotion.pointsPerStream; i++) {
        const idx = s * energyFlowMotion.pointsPerStream + i;
        aT[idx] = i / energyFlowMotion.pointsPerStream;
        aStream[idx] = s;
        aSeed[idx] = seeded(idx, 8.31);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
    g.setAttribute('aStream', new THREE.BufferAttribute(aStream, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    return g;
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPointSize: { value: energyFlowMotion.pointSize },
    uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
    uOpacity: { value: energyFlowMotion.opacity },
    uMouse: { value: new THREE.Vector2(999, 999) },
    uMouseResponse: { value: energyFlowMotion.mouseResponse },
    uScroll: { value: 0 },
    uTextClearCenterY: { value: heroLayoutMotion.textClearCenterY },
    uTextClearHalfWidth: { value: heroLayoutMotion.textClearHalfWidth },
    uTextClearHalfHeight: { value: heroLayoutMotion.textClearHalfHeight },
  }), [gl]);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    mouse.current.lerp(
      new THREE.Vector2(pointer.x * viewport.width * 0.5, pointer.y * viewport.height * 0.5),
      0.08
    );
    const scroll = getHeroScrollProgress();

    materialRef.current.uniforms.uTime.value = clock.elapsedTime * energyFlowMotion.speed * 18.0;
    materialRef.current.uniforms.uMouse.value.copy(mouse.current);
    materialRef.current.uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 1.5);
    materialRef.current.uniforms.uScroll.value = scroll;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
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
