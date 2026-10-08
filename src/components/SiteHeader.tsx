'use client';

import { useEffect, useState } from 'react';
import { heroContent } from '@/config/content';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <a className="site-brand" href="#top" aria-label="拾火創意首頁">
        <span>{heroContent.brand}</span>
        <small>{heroContent.descriptor}</small>
      </a>
      <button
        className="menu-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="site-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        <span>選單</span><i /><i />
      </button>
      <nav id="site-navigation" className={`site-navigation${open ? ' is-open' : ''}`} aria-label="主要導覽">
        {heroContent.nav.map((item) => (
          <a href={item.href} key={item.href} onClick={() => setOpen(false)}>{item.label}</a>
        ))}
        <a className="header-cta" href="#contact" onClick={() => setOpen(false)}>聊聊你的行銷需求</a>
      </nav>
    </header>
  );
}
