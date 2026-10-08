# PIKHUO Hero v4 — Living Particle Space

This pass preserves the approved first-screen composition and the existing PIKHUO particle-logo repulsion interaction.

## Added
- Procedural volumetric purple haze and very soft light shafts behind the logo.
- Uneven particle density with deliberate clusters and empty zones.
- Midground vector flow with arc bands, curl, vortex and directional travel.
- Background particle interaction with the pointer, strongest in the midground and intentionally subtle elsewhere.
- Four restrained energy-flow particle streams that read as faint trails rather than a new effect layer.
- Reduced ambient counts slightly so depth comes from size / brightness / velocity / direction / parallax, not brute-force density.

## Preserved
- PIKHUO logo target geometry.
- Logo mouse-repulsion 'hole' effect.
- Logo assembly, breathing and reabsorption behavior.
- HTML/CSS typography and first-screen layout.
- No second scene and no scroll morph.

## Main tuning files
- `src/config/motion.ts`
- `src/components/hero/AmbientParticles.tsx`
- `src/components/hero/AtmosphereField.tsx`
- `src/components/hero/EnergyFlows.tsx`

## Run locally
```bash
npm install
npm run dev
```
Then open `http://localhost:3000`.
