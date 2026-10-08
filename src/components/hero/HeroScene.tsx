'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { HeroOverlay } from './HeroOverlay';

const HeroCanvas = dynamic(
  () => import('./HeroCanvas').then((module) => module.HeroCanvas),
  { ssr: false }
);

export function HeroScene() {
  const shellRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: '20% 0px 20% 0px' }
    );
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return (
    <section id="top" className="hero-scroll-shell" data-hero-shell ref={shellRef}>
      <div className="hero-scene">
        <div className="hero-atmosphere" aria-hidden="true" />
        <HeroCanvas active={active} reducedMotion={reducedMotion} />
        <HeroOverlay />
      </div>
    </section>
  );
}
