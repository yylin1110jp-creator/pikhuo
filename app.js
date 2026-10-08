(() => {
  'use strict';

  document.documentElement.classList.add('motion-ready');

  const canvas = document.querySelector('#particle-canvas');
  const fallback = document.querySelector('.fallback-mark');
  const experience = document.querySelector('.experience');
  const scenes = [...document.querySelectorAll('.scene')];
  const header = document.querySelector('#site-header');
  const progressNumber = document.querySelector('#progress-number');
  const progressBar = document.querySelector('#progress-bar');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelector('#year').textContent = new Date().getFullYear();

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function easeInOut(value) {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  }

  function seeded(index, salt = 0) {
    const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function setFallback() {
    canvas.hidden = true;
    fallback.style.display = 'block';
    document.documentElement.classList.add('canvas-fallback');
  }

  function getScrollProgress() {
    const rect = experience.getBoundingClientRect();
    const distance = Math.max(1, experience.offsetHeight - window.innerHeight);
    return clamp(-rect.top / distance);
  }

  function updateScene(progress) {
    const active = Math.min(3, Math.max(0, Math.round(progress * 3)));
    scenes.forEach((scene, index) => scene.classList.toggle('is-active', index === active));
    progressNumber.textContent = String(active).padStart(2, '0');
    progressBar.style.width = `${progress * 100}%`;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  }

  class ParticleField {
    constructor(element, logoPoints) {
      this.canvas = element;
      this.ctx = element.getContext('2d', { alpha: true });
      if (!this.ctx) throw new Error('Canvas 2D is unavailable');
      this.logoSource = logoPoints;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.width = 0;
      this.height = 0;
      this.count = 0;
      this.positions = [];
      this.targets = [];
      this.pointer = { x: -9999, y: -9999, active: false };
      this.progress = 0;
      this.assemble = reducedMotion.matches ? 1 : 0;
      this.lastTime = performance.now();
      this.visible = true;
      this.frame = 0;

      this.resize = this.resize.bind(this);
      this.animate = this.animate.bind(this);
      this.handlePointer = this.handlePointer.bind(this);
      this.handleLeave = this.handleLeave.bind(this);
      this.handleVisibility = this.handleVisibility.bind(this);

      window.addEventListener('resize', this.resize, { passive: true });
      window.addEventListener('pointermove', this.handlePointer, { passive: true });
      document.addEventListener('pointerleave', this.handleLeave);
      document.addEventListener('visibilitychange', this.handleVisibility);

      this.observer = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible && !this.frame && !reducedMotion.matches) this.frame = requestAnimationFrame(this.animate);
      }, { rootMargin: '15% 0px' });
      this.observer.observe(experience);

      this.resize();
      if (reducedMotion.matches) this.draw(performance.now());
      else this.frame = requestAnimationFrame(this.animate);
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      const desired = this.width < 760 ? 2200 : this.width < 1100 ? 3400 : 5200;
      this.count = Math.min(desired, this.logoSource.length);
      this.createTargets();
      if (!this.positions.length || this.positions.length !== this.count) {
        this.positions = Array.from({ length: this.count }, (_, i) => ({
          x: seeded(i, 2) * this.width,
          y: seeded(i, 5) * this.height,
          vx: 0,
          vy: 0,
        }));
      }
      if (reducedMotion.matches) this.draw(performance.now());
    }

    createTargets() {
      const logo = [];
      const scatter = [];
      const strategy = [];
      const creative = [];
      const reach = [];
      const feedback = [];
      const mobile = this.width < 760;
      const tablet = this.width < 1100;
      const logoScale = Math.min(this.width, this.height) * (mobile ? .185 : tablet ? .16 : .22);
      const logoX = mobile ? this.width * .5 : tablet ? this.width * .81 : this.width * .78;
      const logoY = mobile ? this.height * .28 : this.height * .48;
      const step = this.logoSource.length / this.count;

      for (let i = 0; i < this.count; i += 1) {
        const source = this.logoSource[Math.floor(i * step)];
        logo.push({ x: logoX + source[0] * logoScale, y: logoY - source[1] * logoScale });
        scatter.push({ x: this.width * (.08 + seeded(i, 7) * .84), y: this.height * (.12 + seeded(i, 11) * .76) });

        const group = i % 4;
        const col = group % 2;
        const row = Math.floor(group / 2);
        const gx = this.width * (.60 + col * .18);
        const gy = this.height * (.30 + row * .33);
        const angle = seeded(i, 13) * Math.PI * 2;
        const radius = Math.sqrt(seeded(i, 17)) * Math.min(this.width, this.height) * .105;
        strategy.push({ x: gx + Math.cos(angle) * radius, y: gy + Math.sin(angle) * radius * .58 });

        const panel = i % 5;
        const panels = mobile
          ? [[.17,.16,.66,.13],[.09,.38,.82,.15],[.14,.62,.38,.18],[.57,.61,.31,.18],[.24,.86,.52,.08]]
          : [[.53,.17,.20,.24],[.75,.20,.17,.16],[.56,.48,.34,.22],[.48,.75,.20,.12],[.72,.74,.22,.13]];
        const [px, py, pw, ph] = panels[panel];
        const edge = Math.floor(seeded(i, 19) * 4);
        const t = seeded(i, 23);
        creative.push(edge < 2
          ? { x: this.width * (px + (edge === 0 ? t * pw : (edge === 1 ? pw : 0))), y: this.height * (py + (edge === 0 ? 0 : t * ph)) }
          : { x: this.width * (px + (edge === 2 ? t * pw : 0)), y: this.height * (py + (edge === 2 ? ph : t * ph)) });

        const side = i % 2 === 0 ? -1 : 1;
        const ring = i % 6;
        const r = Math.min(this.width, this.height) * (.09 + ring * .038);
        const a = seeded(i, 29) * Math.PI * 2;
        const cx = this.width * (mobile ? .5 : .72);
        const cy = this.height * .49;
        reach.push({ x: cx + Math.cos(a) * r * (1 + side * .08), y: cy + Math.sin(a) * r * .72 });

        const loopA = seeded(i, 31) * Math.PI * 2;
        const loopR = Math.min(this.width, this.height) * (.17 + (i % 5) * .006);
        feedback.push({
          x: this.width * (mobile ? .5 : .72) + Math.sin(loopA) * loopR,
          y: this.height * .48 + Math.sin(loopA * 2) * loopR * .42,
        });
      }
      this.targets = [logo, strategy, creative, reach, feedback];
      this.scatter = scatter;
    }

    handlePointer(event) {
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.pointer.active = event.pointerType !== 'touch';
    }

    handleLeave() {
      this.pointer.active = false;
    }

    handleVisibility() {
      if (document.hidden && this.frame) {
        cancelAnimationFrame(this.frame);
        this.frame = 0;
      } else if (!document.hidden && this.visible && !reducedMotion.matches && !this.frame) {
        this.lastTime = performance.now();
        this.frame = requestAnimationFrame(this.animate);
      }
    }

    targetFor(index) {
      const phase = this.progress * 4;
      const fromIndex = Math.min(4, Math.floor(phase));
      const toIndex = Math.min(4, fromIndex + 1);
      const blend = easeInOut(phase - fromIndex);
      let from = this.targets[fromIndex][index];
      const to = this.targets[toIndex][index];
      if (fromIndex === 0 && this.assemble < 1) {
        const scattered = this.scatter[index];
        from = { x: lerp(scattered.x, from.x, this.assemble), y: lerp(scattered.y, from.y, this.assemble) };
      }
      return { x: lerp(from.x, to.x, blend), y: lerp(from.y, to.y, blend) };
    }

    drawGuides(phase) {
      const ctx = this.ctx;
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,90,31,.20)';
      if (phase > .65 && phase < 1.4) {
        const points = [[.60,.30],[.78,.30],[.60,.63],[.78,.63]];
        ctx.beginPath();
        points.forEach(([x,y], i) => i ? ctx.lineTo(this.width*x,this.height*y) : ctx.moveTo(this.width*x,this.height*y));
        ctx.closePath(); ctx.stroke();
      }
      if (phase > 2.45 && phase < 3.55) {
        const cx = this.width * (this.width < 760 ? .5 : .72);
        const cy = this.height * .49;
        for (let i = 1; i < 5; i += 1) {
          ctx.beginPath(); ctx.ellipse(cx, cy, i*42, i*28, 0, 0, Math.PI*2); ctx.stroke();
        }
      }
      ctx.restore();
    }

    draw(time) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      const phase = this.progress * 4;
      this.drawGuides(phase);
      const drift = reducedMotion.matches ? 0 : time * .00045;

      for (let i = 0; i < this.count; i += 1) {
        const particle = this.positions[i];
        const target = this.targetFor(i);
        let tx = target.x + Math.sin(drift + i * .71) * 1.1;
        let ty = target.y + Math.cos(drift * .8 + i * .53) * 1.1;

        if (this.pointer.active) {
          const dx = tx - this.pointer.x;
          const dy = ty - this.pointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const radius = 78;
          if (distance < radius && distance > .01) {
            const force = (1 - distance / radius) * 19;
            tx += (dx / distance) * force;
            ty += (dy / distance) * force;
          }
        }

        particle.x += (tx - particle.x) * (reducedMotion.matches ? 1 : .085);
        particle.y += (ty - particle.y) * (reducedMotion.matches ? 1 : .085);
        const highlight = i % 23 === 0 || i % 47 === 0;
        const size = highlight ? 2.25 : (i % 5 === 0 ? 1.5 : 1.05);
        ctx.fillStyle = highlight ? 'rgba(255,90,31,.92)' : `rgba(245,243,237,${.28 + seeded(i, 41) * .58})`;
        ctx.fillRect(particle.x, particle.y, size, size);
      }
    }

    animate(time) {
      this.frame = 0;
      if (!this.visible || document.hidden) return;
      const delta = Math.min(34, time - this.lastTime);
      this.lastTime = time;
      this.progress = getScrollProgress();
      this.assemble = Math.min(1, this.assemble + delta / 1900);
      this.draw(time);
      updateScene(this.progress);
      if (!reducedMotion.matches) this.frame = requestAnimationFrame(this.animate);
    }
  }

  async function startParticles() {
    try {
      const response = await fetch('assets/logo-targets.json');
      if (!response.ok) throw new Error('Logo target data unavailable');
      const data = await response.json();
      if (!Array.isArray(data.points) || !data.points.length) throw new Error('Invalid logo target data');
      const field = new ParticleField(canvas, data.points);
      const sync = () => {
        field.progress = getScrollProgress();
        updateScene(field.progress);
        if (reducedMotion.matches) field.draw(performance.now());
      };
      window.addEventListener('scroll', sync, { passive: true });
      reducedMotion.addEventListener('change', () => window.location.reload());
      sync();
    } catch (error) {
      console.warn('Particle fallback enabled:', error);
      setFallback();
      window.addEventListener('scroll', () => updateScene(getScrollProgress()), { passive: true });
      updateScene(getScrollProgress());
    }
  }

  const form = document.querySelector('#contact-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = document.querySelector('#form-status');
    if (!form.checkValidity()) {
      form.reportValidity();
      status.textContent = '請先填寫姓名、電子郵件與需求說明。';
      return;
    }
    status.textContent = '表單寄送功能尚未設定，資料未送出。正式上線前請串接實際收件方式。';
  });

  startParticles();
})();
