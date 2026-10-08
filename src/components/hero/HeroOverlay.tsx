import { heroContent } from '@/config/content';

export function HeroOverlay() {
  return (
    <div className="hero-overlay">
      <div className="hero-copy">
        <p className="hero-eyebrow">{heroContent.eyebrow}</p>
        <h1>{heroContent.headline.map((line) => <span key={line}>{line}</span>)}</h1>
        <p className="hero-statement">{heroContent.statement}</p>
        <div className="hero-actions">
          <a className="primary-button" href="#contact">聊聊你的行銷需求</a>
          <a className="text-button" href="#approach">了解我們的做法 <span aria-hidden="true">↓</span></a>
        </div>
      </div>

      <div className="scroll-cue" aria-hidden="true">
        <span>向下探索</span>
        <i />
      </div>
    </div>
  );
}
