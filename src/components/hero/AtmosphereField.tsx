'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { atmosphereMotion } from '@/config/motion';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uFogStrength;
  uniform float uBeamStrength;
  uniform float uPulseStrength;
  uniform vec2 uMouse;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.52;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(11.7, 7.3);
      a *= 0.49;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv - 0.5;
    uv.x *= 1.78;
    float t = uTime;

    vec2 warped = uv + vec2(
      sin(uv.y * 2.2 + t * 0.14) * 0.060,
      cos(uv.x * 1.8 - t * 0.11) * 0.042
    );
    float cloud = fbm(warped * 1.26 + vec2(t * 0.020, -t * 0.014));
    float cloud2 = fbm(warped * 2.05 + vec2(-t * 0.014, t * 0.017));
    float cloud3 = fbm(warped * 3.55 + vec2(t * 0.009, t * 0.006));
    float hazeMask = smoothstep(0.31, 0.79, cloud * 0.62 + cloud2 * 0.29 + cloud3 * 0.13);

    // Protect the central mark from becoming a glowing fog patch.
    float centerDistance = length((uv - vec2(0.0, 0.025)) * vec2(0.84, 1.02));
    float centerProtection = smoothstep(0.19, 0.58, centerDistance);

    // Volumetric shafts: one broad top-center source plus asymmetrical side shafts.
    float topSource = exp(-pow(uv.x * 2.35, 2.0)) * smoothstep(0.15, -0.58, uv.y);
    float beam1 = exp(-pow((uv.x + 0.48 + uv.y * 0.22) * 4.0, 2.0));
    float beam2 = exp(-pow((uv.x - 0.03 + uv.y * 0.11) * 5.0, 2.0));
    float beam3 = exp(-pow((uv.x - 0.53 + uv.y * 0.20) * 5.4, 2.0));
    float verticalFade = smoothstep(0.61, -0.46, uv.y) * smoothstep(-0.60, 0.35, uv.y);
    float beams = (topSource * 0.48 + beam1 * 0.46 + beam2 * 0.31 + beam3 * 0.29) * verticalFade;

    // Side haze creates the impression that streams are travelling through a volume.
    float leftHaze = exp(-pow((uv.x + 0.78) * 2.0, 2.0)) * (0.45 + 0.55 * hazeMask);
    float rightHaze = exp(-pow((uv.x - 0.78) * 2.1, 2.0)) * (0.45 + 0.55 * hazeMask);

    vec2 mouseUv = vec2(uMouse.x * 0.90, uMouse.y * 0.52);
    float mouseGlow = exp(-length(uv - mouseUv) * 3.2) * 0.085;

    float vignette = smoothstep(1.07, 0.22, length(uv * vec2(0.78, 1.0)));
    float pulse = 1.0 + sin(t * 1.6) * uPulseStrength;
    float fog = hazeMask * centerProtection * vignette * uFogStrength * pulse;
    float sideVolume = (leftHaze + rightHaze) * 0.12 * centerProtection;
    float light = beams * centerProtection * uBeamStrength;

    // HTML copy lives near the lower center; make that strip quieter.
    float textBandX = 1.0 - smoothstep(0.32, 0.62, abs(uv.x));
    float textBandY = 1.0 - smoothstep(0.055, 0.17, abs(uv.y + 0.31));
    float textQuiet = 1.0 - textBandX * textBandY * 0.72;

    float alpha = (fog + sideVolume + light + mouseGlow * centerProtection) * uOpacity * textQuiet;

    vec3 deepPurple = vec3(0.17, 0.065, 0.235);
    vec3 plum = vec3(0.31, 0.12, 0.39);
    vec3 lavender = vec3(0.53, 0.27, 0.64);
    vec3 color = mix(deepPurple, plum, clamp(hazeMask * 0.55 + sideVolume * 2.0, 0.0, 1.0));
    color = mix(color, lavender, clamp(light * 4.5, 0.0, 0.62));

    gl_FragColor = vec4(color, alpha);
  }
`;

export function AtmosphereField() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { pointer } = useThree();
  const mouse = useRef(new THREE.Vector2());

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uOpacity: { value: atmosphereMotion.opacity },
    uFogStrength: { value: atmosphereMotion.purpleFogStrength },
    uBeamStrength: { value: atmosphereMotion.beamStrength },
    uPulseStrength: { value: atmosphereMotion.pulseStrength },
    uMouse: { value: new THREE.Vector2() },
  }), []);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    mouse.current.lerp(new THREE.Vector2(pointer.x, pointer.y), atmosphereMotion.mouseResponse);
    materialRef.current.uniforms.uTime.value = clock.elapsedTime * atmosphereMotion.speed;
    materialRef.current.uniforms.uMouse.value.copy(mouse.current);
  });

  return (
    <mesh position={[0, 0.25, -5.8]} scale={[15.8, 9.2, 1]} frustumCulled={false}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
