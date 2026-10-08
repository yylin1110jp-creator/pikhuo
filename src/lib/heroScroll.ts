import * as THREE from 'three';

export function getHeroScrollProgress() {
  if (typeof window === 'undefined') return 0;
  const shell = document.querySelector<HTMLElement>('[data-hero-shell]');
  if (!shell) return 0;
  const rect = shell.getBoundingClientRect();
  const distance = Math.max(1, shell.offsetHeight - window.innerHeight);
  return THREE.MathUtils.clamp(-rect.top / distance, 0, 1);
}
