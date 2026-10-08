'use client';

import { Canvas } from '@react-three/fiber';
import { AmbientParticles } from './AmbientParticles';
import { AtmosphereField } from './AtmosphereField';
import { EnergyFlows } from './EnergyFlows';
import { ParticleLogo } from './ParticleLogo';

export function HeroCanvas({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  return (
    <Canvas
      className="hero-canvas"
      frameloop={active && !reducedMotion ? 'always' : 'demand'}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6.8], fov: 42, near: 0.1, far: 50 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
    >
      <AtmosphereField />
      <AmbientParticles />
      <EnergyFlows />
      <ParticleLogo reducedMotion={reducedMotion} />
    </Canvas>
  );
}
