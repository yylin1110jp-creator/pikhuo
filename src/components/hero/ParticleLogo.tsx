'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import logoData from '@/data/logo-targets.json';
import { particleMotion } from '@/config/motion';
import { getHeroScrollProgress } from '@/lib/heroScroll';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAssemble;
  uniform float uScroll;
  uniform vec2 uMouse;
  uniform float uMouseActive;
  uniform float uPixelRatio;
  uniform float uPointSize;
  uniform float uDriftAmplitude;
  uniform float uDriftSpeed;
  uniform float uMouseRadius;
  uniform float uMouseStrength;
  uniform float uMouseFalloff;
  uniform float uEscapeThreshold;
  uniform float uEscapeStrength;
  uniform float uEscapeSpeed;
  uniform float uEscapeTangential;
  uniform float uReabsorbTightness;
  uniform float uScrollDeconstructStrength;
  uniform float uScrollFlowStrength;

  attribute vec3 aTarget;
  attribute float aSeed;

  varying float vAlpha;
  varying float vDepth;

  float easeOutCubic(float t) {
    float p = 1.0 - t;
    return 1.0 - p * p * p;
  }

  void main() {
    float assemble = easeOutCubic(clamp(uAssemble, 0.0, 1.0));
    vec3 base = mix(position, aTarget, assemble);

    float driftGate = smoothstep(0.58, 1.0, uAssemble);
    float phase = aSeed * 34.0 + uTime * uDriftSpeed;
    vec3 drift = vec3(
      sin(phase * 1.17),
      cos(phase * 0.91),
      sin(phase * 0.73 + 1.9)
    ) * uDriftAmplitude * driftGate;

    vec3 p = base + drift;

    // Idle breathing: a tiny tail of particles leaves and returns to the exact target.
    float escapeMask = smoothstep(uEscapeThreshold, 1.0, aSeed) * driftGate;
    float escapePhase = uTime * uEscapeSpeed + aSeed * 37.0;
    float rawPulse = 0.5 + 0.5 * sin(escapePhase);
    float outPulse = pow(rawPulse, 2.2);
    float reabsorb = pow(1.0 - rawPulse, uReabsorbTightness);
    float escapePulse = outPulse * escapeMask * (1.0 - reabsorb * 0.32);

    vec2 radial = normalize(aTarget.xy + vec2(0.0001));
    vec2 tangent = vec2(-radial.y, radial.x);
    float handedness = aSeed > 0.972 ? 1.0 : -1.0;

    p.xy += radial * escapePulse * uEscapeStrength * (0.55 + aSeed * 0.52);
    p.xy += tangent * escapePulse * uEscapeTangential * handedness * sin(escapePhase * 0.76 + aSeed * 11.0);
    p.z += escapePulse * uEscapeStrength * 0.38 * sin(aSeed * 41.0 + escapePhase * 0.45);

    // Pointer repulsion: produces the temporary moving hole only after actual pointer intent.
    vec2 delta = p.xy - uMouse;
    float distanceToMouse = length(delta);
    float influence = 1.0 - smoothstep(0.0, uMouseRadius, distanceToMouse);
    influence = pow(max(influence, 0.0), uMouseFalloff) * uMouseActive * assemble;
    vec2 direction = normalize(delta + vec2(0.0001));
    p.xy += direction * influence * uMouseStrength;
    p.z += influence * 0.08 * sin(aSeed * 26.0);

    // Scroll state begins only after the hero has been experienced. The current target is
    // a restrained flow-staging field, not a fabricated second object.
    float scrollStage = smoothstep(0.08, 0.82, uScroll);
    float scrollBand = sin(aSeed * 31.0 + aTarget.y * 1.8 + uTime * 0.18);
    vec2 scrollTangent = normalize(vec2(-aTarget.y, aTarget.x) + vec2(0.0001));
    p.xy += scrollTangent * scrollStage * uScrollFlowStrength * (0.18 + 0.82 * aSeed) * scrollBand;
    p.x += scrollStage * uScrollDeconstructStrength * (aSeed - 0.5) * 1.25;
    p.y += scrollStage * uScrollDeconstructStrength * sin(aSeed * 21.0 + aTarget.x * 1.2) * 0.16;
    p.z += scrollStage * sin(aSeed * 27.0 + uTime * 0.16) * 0.22;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float perspective = 6.0 / max(1.0, -mvPosition.z);
    gl_PointSize = uPointSize * uPixelRatio * perspective * (0.72 + aSeed * 0.52);

    vDepth = clamp((p.z + 0.18) / 0.36, 0.0, 1.0);
    vAlpha = mix(0.56, 1.0, aSeed) * (0.28 + 0.72 * assemble) * (1.0 - scrollStage * 0.06);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  varying float vDepth;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float glow = smoothstep(0.5, 0.0, d);
    float core = smoothstep(0.18, 0.0, d);
    vec3 lavender = vec3(0.82, 0.56, 1.0);
    vec3 whitePink = vec3(1.0, 0.92, 1.0);
    vec3 color = mix(lavender, whitePink, 0.42 + vDepth * 0.42);
    color *= (0.72 + glow * 0.52 + core * 0.56);
    gl_FragColor = vec4(color, glow * vAlpha * uOpacity);
  }
`;

type LogoPoint = [number, number, number, number];

export function ParticleLogo({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const startTime = useRef<number | null>(null);
  const { camera, pointer, viewport, gl } = useThree();
  const mouseWorld = useRef(new THREE.Vector2(999, 999));
  const mouseActive = useRef(0);
  const pointerInside = useRef(false);
  const pointerMoved = useRef(false);

  const geometry = useMemo(() => {
    const points = logoData.points as LogoPoint[];
    const count = points.length;
    const target = new Float32Array(count * 3);
    const start = new Float32Array(count * 3);
    const seed = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const [x, y, z, s] = points[i];
      target[i * 3] = x;
      target[i * 3 + 1] = y;
      target[i * 3 + 2] = z;
      seed[i] = s;

      const angle = s * Math.PI * 2 * 13.0 + (i % 31) * 0.11;
      const radius = 1.1 + ((i * 16807) % 1000) / 1000 * 3.4;
      const vertical = ((((i * 48271) % 1000) / 1000) - 0.5) * 4.3;
      start[i * 3] = Math.cos(angle) * radius;
      start[i * 3 + 1] = Math.sin(angle) * radius * 0.48 + vertical * 0.25;
      start[i * 3 + 2] = ((((i * 69621) % 1000) / 1000) - 0.5) * 2.4;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(start, 3));
    g.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.computeBoundingSphere();
    return g;
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAssemble: { value: 0 },
    uScroll: { value: 0 },
    uMouse: { value: new THREE.Vector2(999, 999) },
    uMouseActive: { value: 0 },
    uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
    uPointSize: { value: particleMotion.pointSize },
    uDriftAmplitude: { value: particleMotion.driftAmplitude },
    uDriftSpeed: { value: particleMotion.driftSpeed },
    uMouseRadius: { value: particleMotion.mouseRadius },
    uMouseStrength: { value: particleMotion.mouseStrength },
    uMouseFalloff: { value: particleMotion.mouseFalloff },
    uEscapeThreshold: { value: particleMotion.escapeThreshold },
    uEscapeStrength: { value: particleMotion.escapeStrength },
    uEscapeSpeed: { value: particleMotion.escapeSpeed },
    uEscapeTangential: { value: particleMotion.escapeTangential },
    uReabsorbTightness: { value: particleMotion.reabsorbTightness },
    uScrollDeconstructStrength: { value: particleMotion.scrollDeconstructStrength },
    uScrollFlowStrength: { value: particleMotion.scrollFlowStrength },
    uOpacity: { value: particleMotion.opacity },
  }), [gl]);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleEnter = () => { pointerInside.current = true; };
    const handleLeave = () => { pointerInside.current = false; };
    const handleMove = () => { pointerMoved.current = true; };
    canvas.addEventListener('pointerenter', handleEnter);
    canvas.addEventListener('pointerleave', handleLeave);
    canvas.addEventListener('pointermove', handleMove, { passive: true });
    return () => {
      canvas.removeEventListener('pointerenter', handleEnter);
      canvas.removeEventListener('pointerleave', handleLeave);
      canvas.removeEventListener('pointermove', handleMove);
      geometry.dispose();
    };
  }, [geometry, gl]);

  useFrame(({ clock }) => {
    const material = materialRef.current;
    if (!material) return;

    const elapsed = reducedMotion ? 0 : clock.getElapsedTime();
    if (startTime.current === null) startTime.current = elapsed;
    const localTime = elapsed - startTime.current;
    const assemble = reducedMotion ? 1 : THREE.MathUtils.clamp(
      (localTime - particleMotion.assembleDelay) / particleMotion.assembleDuration,
      0,
      1
    );

    const ndc = new THREE.Vector3(pointer.x, pointer.y, 0.5).unproject(camera);
    const direction = ndc.sub(camera.position).normalize();
    const distance = -camera.position.z / direction.z;
    const worldPoint = camera.position.clone().add(direction.multiplyScalar(distance));
    const responsiveScale = THREE.MathUtils.clamp(viewport.width / 8.8, 0.72, 1.08);
    mouseWorld.current.set(worldPoint.x / responsiveScale, worldPoint.y / responsiveScale);

    const pointerNearLogo = mouseWorld.current.length() < particleMotion.pointerActivationRadius;
    const desiredMouseActive =
      pointerInside.current &&
      pointerMoved.current &&
      pointerNearLogo &&
      assemble > particleMotion.interactiveAfterAssemble ? 1 : 0;
    mouseActive.current = THREE.MathUtils.lerp(mouseActive.current, desiredMouseActive, 0.09);

    const scroll = reducedMotion ? 0 : getHeroScrollProgress();

    material.uniforms.uTime.value = elapsed;
    material.uniforms.uAssemble.value = assemble;
    material.uniforms.uScroll.value = scroll;
    material.uniforms.uMouse.value.lerp(mouseWorld.current, 0.22);
    material.uniforms.uMouseActive.value = mouseActive.current;
    material.uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 1.5);
  });

  const responsiveScale = THREE.MathUtils.clamp(viewport.width / 8.8, 0.72, 1.08);

  return (
    <points ref={pointsRef} geometry={geometry} scale={responsiveScale} frustumCulled={false}>
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
