(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  document.querySelector("[data-current-year]").textContent = new Date().getFullYear();

  const header = document.querySelector("[data-header]");
  const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#site-nav");
  const closeMenu = () => {
    menuButton.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  };
  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  class LogoParticleHero {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.parent = canvas.parentElement;
      this.progress = 0;
      this.pointer = { x: -9999, y: -9999, active: false };
      this.logoParticles = [];
      this.atmosphere = [];
      this.logoBounds = { left: 0, right: 0, top: 0, bottom: 0 };
      this.running = !prefersReducedMotion;
      this.resize = this.resize.bind(this);
      this.draw = this.draw.bind(this);
      this.parent.addEventListener("pointermove", (event) => {
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.x = event.clientX - rect.left;
        this.pointer.y = event.clientY - rect.top;
        this.pointer.active = this.progress < .42 && this.pointer.x > this.logoBounds.left - 80 && this.pointer.x < this.logoBounds.right + 80 && this.pointer.y > this.logoBounds.top - 80 && this.pointer.y < this.logoBounds.bottom + 80;
      });
      this.parent.addEventListener("pointerleave", () => {
        this.pointer.active = false;
        this.pointer.x = -9999;
        this.pointer.y = -9999;
      });
      new ResizeObserver(this.resize).observe(this.parent);
      this.resize();
      if (this.running) requestAnimationFrame(this.draw);
      else this.renderFrame(0);
    }

    random(seed) {
      const value = Math.sin(seed * 91.3458) * 47453.5453;
      return value - Math.floor(value);
    }

    buildLogoPoints() {
      const mask = document.createElement("canvas");
      mask.width = 1200;
      mask.height = 320;
      const context = mask.getContext("2d", { willReadFrequently: true });
      context.clearRect(0, 0, mask.width, mask.height);
      context.fillStyle = "#fff";
      context.strokeStyle = "#fff";
      context.lineWidth = 16;
      context.lineCap = "round";

      const markX = 145;
      const markY = 160;
      const radius = 92;
      context.beginPath();
      context.arc(markX, markY, radius, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(markX - 48, markY - 45);
      context.lineTo(markX + 48, markY + 52);
      context.moveTo(markX + 48, markY - 45);
      context.lineTo(markX - 48, markY + 52);
      context.stroke();
      context.beginPath();
      context.arc(markX, markY - 58, 13, 0, Math.PI * 2);
      context.fill();

      context.font = "800 182px Arial, Helvetica, sans-serif";
      context.textBaseline = "middle";
      context.letterSpacing = "12px";
      context.fillText("PIKHUO", 285, 169);

      const image = context.getImageData(0, 0, mask.width, mask.height).data;
      const candidates = [];
      for (let y = 18; y < mask.height - 18; y += 4) {
        for (let x = 18; x < mask.width - 18; x += 4) {
          if (image[(y * mask.width + x) * 4 + 3] > 100) candidates.push({ x: x / mask.width, y: y / mask.height });
        }
      }
      return candidates;
    }

    resize() {
      const rect = this.parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = Math.max(1, rect.width);
      this.height = Math.max(1, rect.height);
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const candidates = this.buildLogoPoints();
      const desiredCount = isMobile() ? 520 : 1450;
      const logoWidth = isMobile() ? this.width * .84 : Math.min(this.width * .47, 720);
      const logoHeight = logoWidth * (320 / 1200);
      const centerX = isMobile() ? this.width * .5 : this.width * .735;
      const centerY = isMobile() ? this.height * .27 : this.height * .45;
      this.logoBounds = {
        left: centerX - logoWidth / 2,
        right: centerX + logoWidth / 2,
        top: centerY - logoHeight / 2,
        bottom: centerY + logoHeight / 2
      };

      this.logoParticles = Array.from({ length: desiredCount }, (_, index) => {
        const sample = candidates[Math.floor(this.random(index + 11) * candidates.length)] || { x: .5, y: .5 };
        const depth = index % 9 < 2 ? 2 : index % 3 === 0 ? 1 : 0;
        return {
          targetX: this.logoBounds.left + sample.x * logoWidth,
          targetY: this.logoBounds.top + sample.y * logoHeight,
          x: this.random(index + 31) * this.width,
          y: this.random(index + 71) * this.height,
          seed: this.random(index + 121) * Math.PI * 2,
          lane: index / desiredCount,
          depth,
          radius: depth === 2 ? 2.1 : depth === 1 ? 1.45 : .9,
          opacity: depth === 2 ? .9 : depth === 1 ? .62 : .42
        };
      });

      const atmosphereCount = isMobile() ? 80 : 230;
      this.atmosphere = Array.from({ length: atmosphereCount }, (_, index) => ({
        x: this.random(index + 300) * this.width,
        y: this.random(index + 500) * this.height,
        z: this.random(index + 700),
        seed: this.random(index + 900) * Math.PI * 2,
        radius: .35 + this.random(index + 1100) * 1.5,
        opacity: .06 + this.random(index + 1300) * .24
      }));
      if (!this.running) this.renderFrame(0);
    }

    setProgress(progress) {
      this.progress = clamp(progress, 0, 1);
      if (!this.running) this.renderFrame(0);
    }

    smooth(value) {
      const t = clamp(value, 0, 1);
      return t * t * (3 - 2 * t);
    }

    flowTarget(particle, time) {
      const group = Math.floor(particle.lane * 6);
      const local = (particle.lane * 6) % 1;
      const direction = [-1, -1, -1, 1, 1, 1][group];
      const row = group % 3;
      const centerX = (this.logoBounds.left + this.logoBounds.right) / 2;
      const centerY = (this.logoBounds.top + this.logoBounds.bottom) / 2;
      const distance = (local - .5) * this.width * .92;
      const bend = (row - 1) * 105 + Math.sin(local * Math.PI) * (group % 2 ? -95 : 95);
      const drift = Math.sin(time * .00035 + particle.seed) * 7;
      return {
        x: centerX + distance * direction,
        y: centerY + bend + Math.sin(local * Math.PI * 2 + group) * 24 + drift
      };
    }

    vortexTarget(particle, time) {
      const centerX = this.width * .54;
      const centerY = this.height * .5;
      const angle = particle.lane * Math.PI * 10 - time * .00018;
      const radius = 30 + particle.lane * Math.min(this.width, this.height) * .52;
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius * .55
      };
    }

    drawEnergyFlow(time, intensity) {
      if (intensity <= .01) return;
      const centerX = (this.logoBounds.left + this.logoBounds.right) / 2;
      const centerY = (this.logoBounds.top + this.logoBounds.bottom) / 2;
      this.ctx.save();
      this.ctx.globalCompositeOperation = "screen";
      for (let index = 0; index < 6; index += 1) {
        const side = index < 3 ? -1 : 1;
        const row = index % 3;
        const y = centerY + (row - 1) * 92;
        const reach = this.width * (.24 + row * .035);
        const pulse = Math.sin(time * .0005 + index) * 8;
        const gradient = this.ctx.createLinearGradient(centerX, y, centerX + side * reach, y);
        gradient.addColorStop(0, `rgba(205,185,255,${.2 * intensity})`);
        gradient.addColorStop(.45, `rgba(143,93,255,${.13 * intensity})`);
        gradient.addColorStop(1, "rgba(112,66,230,0)");
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = .8;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX + side * 80, y);
        this.ctx.bezierCurveTo(centerX + side * reach * .32, y + pulse + (row - 1) * 25, centerX + side * reach * .7, y - pulse * 2, centerX + side * reach, y + pulse);
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    renderFrame(time) {
      this.ctx.clearRect(0, 0, this.width, this.height);
      const background = this.ctx.createRadialGradient(this.width * .73, this.height * .42, 0, this.width * .73, this.height * .42, this.width * .48);
      background.addColorStop(0, "rgba(91,48,162,.18)");
      background.addColorStop(.46, "rgba(45,24,82,.08)");
      background.addColorStop(1, "rgba(7,6,11,0)");
      this.ctx.fillStyle = background;
      this.ctx.fillRect(0, 0, this.width, this.height);

      this.ctx.save();
      this.ctx.globalCompositeOperation = "screen";
      this.atmosphere.forEach((particle) => {
        const drift = time * (.004 + particle.z * .008);
        const parallaxX = this.pointer.active ? (this.pointer.x - this.width / 2) * (.003 + particle.z * .006) : 0;
        const x = particle.x + Math.sin(particle.seed + drift * .01) * (8 + particle.z * 22) + parallaxX;
        const y = particle.y + Math.cos(particle.seed * 1.7 + drift * .009) * (6 + particle.z * 14);
        this.ctx.fillStyle = `rgba(183,151,255,${particle.opacity})`;
        this.ctx.beginPath();
        this.ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
        this.ctx.fill();
      });

      const flowMix = this.smooth((this.progress - .22) / .48);
      const vortexMix = this.smooth((this.progress - .68) / .32);
      this.drawEnergyFlow(time, .35 + flowMix * .65);

      this.logoParticles.forEach((particle) => {
        const flow = this.flowTarget(particle, time);
        const vortex = this.vortexTarget(particle, time);
        let targetX = particle.targetX + (flow.x - particle.targetX) * flowMix;
        let targetY = particle.targetY + (flow.y - particle.targetY) * flowMix;
        targetX += (vortex.x - targetX) * vortexMix;
        targetY += (vortex.y - targetY) * vortexMix;

        const micro = 1 + particle.depth * 1.2;
        targetX += Math.sin(time * .00022 + particle.seed) * micro;
        targetY += Math.cos(time * .00018 + particle.seed * 1.4) * micro;
        particle.x += (targetX - particle.x) * (prefersReducedMotion ? 1 : .075);
        particle.y += (targetY - particle.y) * (prefersReducedMotion ? 1 : .075);

        if (this.pointer.active && flowMix < .12) {
          const dx = particle.x - this.pointer.x;
          const dy = particle.y - this.pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 92 && distance > 0) {
            const force = Math.pow((92 - distance) / 92, 1.8) * 24;
            particle.x += dx / distance * force;
            particle.y += dy / distance * force;
          }
        }

        const color = particle.depth === 2 ? "223,211,255" : particle.depth === 1 ? "178,139,255" : "130,84,224";
        const alpha = particle.opacity * (1 - vortexMix * .18);
        this.ctx.shadowBlur = particle.depth === 2 ? 10 : 4;
        this.ctx.shadowColor = `rgba(${color},${alpha})`;
        this.ctx.fillStyle = `rgba(${color},${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        this.ctx.fill();
      });
      this.ctx.restore();
    }

    draw(time) {
      this.renderFrame(time);
      requestAnimationFrame(this.draw);
    }
  }

  class ParticleField {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.count = options.count || 100;
      this.mode = options.mode || "flame";
      this.progress = 0;
      this.pointer = { x: -9999, y: -9999 };
      this.particles = [];
      this.running = !prefersReducedMotion;
      this.resize = this.resize.bind(this);
      this.draw = this.draw.bind(this);
      this.canvas.parentElement.addEventListener("pointermove", (event) => {
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.x = event.clientX - rect.left;
        this.pointer.y = event.clientY - rect.top;
      });
      this.canvas.parentElement.addEventListener("pointerleave", () => {
        this.pointer.x = -9999;
        this.pointer.y = -9999;
      });
      new ResizeObserver(this.resize).observe(this.canvas.parentElement);
      this.resize();
      if (this.running) requestAnimationFrame(this.draw);
      else this.renderFrame(0);
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = Math.max(1, rect.width);
      this.height = Math.max(1, rect.height);
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.createParticles();
      if (!this.running) this.renderFrame(0);
    }

    createParticles() {
      const targetCount = isMobile() ? Math.round(this.count * .48) : this.count;
      this.particles = Array.from({ length: targetCount }, (_, index) => ({
        seed: Math.random() * Math.PI * 2,
        randomA: Math.random(),
        randomB: Math.random(),
        radius: 1 + Math.random() * 2.2,
        speed: .15 + Math.random() * .36,
        lane: index / targetCount,
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        opacity: .18 + Math.random() * .7
      }));
    }

    setMode(mode) {
      this.mode = mode;
      if (!this.running) this.renderFrame(0);
    }

    setProgress(progress) {
      this.progress = clamp(progress, 0, 1);
      if (!this.running) this.renderFrame(0);
    }

    ease(value) {
      return value < .5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
    }

    mixPoint(from, to, amount) {
      return {
        x: from.x + (to.x - from.x) * amount,
        y: from.y + (to.y - from.y) * amount
      };
    }

    flameTarget(particle, time, centerX = .72) {
      const t = particle.randomA;
      const side = particle.randomB * 2 - 1;
      const flameWidth = Math.sin(Math.PI * Math.pow(t, .82)) * (1 - t * .34);
      const inner = .16 + Math.pow(particle.randomB, .72) * .84;
      const sway = Math.sin(time * .00034 + particle.seed) * (5 + t * 9);
      return {
        x: this.width * centerX + side * flameWidth * inner * Math.min(this.width, this.height) * .18 + sway,
        y: this.height * (.72 - t * .48) + Math.sin(particle.seed * 1.7) * 8
      };
    }

    scatteredTarget(particle, time) {
      const drift = time * particle.speed * .00013;
      return {
        x: this.width * (.1 + particle.randomA * .8) + Math.sin(particle.seed + drift) * 28,
        y: this.height * (.12 + particle.randomB * .76) + Math.cos(particle.seed * 1.4 + drift) * 20
      };
    }

    strategyTarget(particle, time) {
      const columns = 9;
      const rows = 7;
      const index = Math.floor(particle.lane * columns * rows) % (columns * rows);
      const column = index % columns;
      const row = Math.floor(index / columns);
      const phase = time * .00025 + particle.seed;
      return {
        x: this.width * (.2 + column / (columns - 1) * .6) + Math.sin(phase) * 7,
        y: this.height * (.25 + row / (rows - 1) * .5) + Math.cos(phase * .8) * 7
      };
    }

    broadcastTarget(particle, time) {
      const group = Math.floor(particle.lane * 3);
      const local = (particle.lane * 3) % 1;
      const cx = [this.width * .27, this.width * .53, this.width * .76][group];
      const cy = [this.height * .42, this.height * .57, this.height * .38][group];
      const frameWidth = this.width * [0.24, 0.29, 0.2][group];
      const frameHeight = this.height * [0.23, 0.27, 0.32][group];
      const edge = Math.floor(local * 4);
      const edgeT = (local * 4) % 1;
      let x = cx;
      let y = cy;
      if (edge === 0) { x -= frameWidth / 2; y += (edgeT - .5) * frameHeight; }
      if (edge === 1) { x += (edgeT - .5) * frameWidth; y -= frameHeight / 2; }
      if (edge === 2) { x += frameWidth / 2; y += (edgeT - .5) * frameHeight; }
      if (edge === 3) { x += (edgeT - .5) * frameWidth; y += frameHeight / 2; }
      const pulse = Math.sin(time * .00042 + particle.seed) * 4;
      return { x: x + pulse, y: y + pulse * .45 };
    }

    returnTarget(particle, time) {
      const turns = particle.lane * Math.PI * 6.5;
      const radius = (1 - particle.lane) * Math.min(this.width, this.height) * .34 + 10;
      const angle = turns - time * .00016;
      return {
        x: this.width * .5 + Math.cos(angle) * radius,
        y: this.height * .5 + Math.sin(angle) * radius * .62
      };
    }

    processTarget(particle, time) {
      const stops = [0, .28, .64, 1];
      const shapes = [
        this.scatteredTarget(particle, time),
        this.strategyTarget(particle, time),
        this.broadcastTarget(particle, time),
        this.returnTarget(particle, time)
      ];
      let segment = 0;
      while (segment < stops.length - 2 && this.progress > stops[segment + 1]) segment += 1;
      const local = clamp((this.progress - stops[segment]) / (stops[segment + 1] - stops[segment]), 0, 1);
      return this.mixPoint(shapes[segment], shapes[segment + 1], this.ease(local));
    }

    getTarget(particle, time) {
      if (this.mode === "process") return this.processTarget(particle, time);
      if (this.mode === "return") return this.returnTarget(particle, time);
      return this.flameTarget(particle, time, this.mode === "contact" ? .82 : .72);
    }

    renderFrame(time) {
      this.ctx.clearRect(0, 0, this.width, this.height);
      const points = [];
      this.particles.forEach((particle) => {
        const target = this.getTarget(particle, time);
        const dx = target.x - particle.x;
        const dy = target.y - particle.y;
        const follow = this.mode === "process" ? .115 : .05;
        particle.x += dx * follow;
        particle.y += dy * follow;

        const px = particle.x - this.pointer.x;
        const py = particle.y - this.pointer.y;
        const distance = Math.hypot(px, py);
        if (distance < 110 && distance > 0) {
          const force = (110 - distance) / 110;
          particle.x += (px / distance) * force * 2.4;
          particle.y += (py / distance) * force * 2.4;
        }
        points.push(particle);
      });

      if (points.length < 150) {
        this.ctx.lineWidth = .5;
        for (let i = 0; i < points.length; i += 1) {
          for (let j = i + 1; j < points.length; j += 1) {
            const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
            const connectionRange = this.mode === "process" ? 58 : 70;
            if (distance < connectionRange) {
              this.ctx.strokeStyle = `rgba(255, 114, 48, ${(1 - distance / connectionRange) * .17})`;
              this.ctx.beginPath();
              this.ctx.moveTo(points[i].x, points[i].y);
              this.ctx.lineTo(points[j].x, points[j].y);
              this.ctx.stroke();
            }
          }
        }
      }

      points.forEach((particle) => {
        const glow = this.ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius * 5);
        glow.addColorStop(0, `rgba(255, 178, 105, ${particle.opacity})`);
        glow.addColorStop(.3, `rgba(255, 100, 35, ${particle.opacity * .65})`);
        glow.addColorStop(1, "rgba(255, 80, 20, 0)");
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.radius * 5, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }

    draw(time) {
      this.renderFrame(time);
      requestAnimationFrame(this.draw);
    }
  }

  const heroCanvas = document.querySelector("[data-particles]");
  const heroParticles = new LogoParticleHero(heroCanvas);
  const heroSection = document.querySelector("#top");
  const heroState = document.querySelector("[data-hero-state]");
  const updateHero = () => {
    if (isMobile()) {
      heroParticles.setProgress(0);
      heroSection.style.setProperty("--hero-progress", "0");
      return;
    }
    const rect = heroSection.getBoundingClientRect();
    const distance = heroSection.offsetHeight - window.innerHeight;
    const progress = clamp(-rect.top / Math.max(distance, 1), 0, 1);
    heroParticles.setProgress(progress);
    heroSection.style.setProperty("--hero-progress", progress.toFixed(4));
    heroState.textContent = progress < .25 ? "PIKHUO" : progress < .68 ? "ENERGY FLOW" : "NEXT SIGNAL";
  };
  updateHero();
  window.addEventListener("scroll", updateHero, { passive: true });
  window.addEventListener("resize", updateHero);

  const processCanvas = document.querySelector("[data-process-canvas]");
  const processParticles = new ParticleField(processCanvas, { count: 150, mode: "process" });
  const processSection = document.querySelector("#approach");
  const processStages = [...document.querySelectorAll("[data-process-stage]")];
  const stageIndex = document.querySelector("[data-stage-index]");
  let activeStage = 0;

  const setProcessStage = (index) => {
    if (index === activeStage && processStages[index].classList.contains("is-active")) return;
    activeStage = index;
    processStages.forEach((stage, stagePosition) => stage.classList.toggle("is-active", stagePosition === index));
    stageIndex.textContent = String(index + 1).padStart(2, "0");
  };

  const updateProcess = () => {
    if (isMobile()) return;
    const rect = processSection.getBoundingClientRect();
    const distance = processSection.offsetHeight - window.innerHeight;
    const progress = clamp(-rect.top / Math.max(distance, 1), 0, .999);
    const localProgress = (progress * 3) % 1;
    const transitionPulse = Math.sin(localProgress * Math.PI);
    processParticles.setProgress(progress);
    processSection.style.setProperty("--story-progress", progress.toFixed(4));
    processSection.style.setProperty("--transition-pulse", transitionPulse.toFixed(4));
    setProcessStage(Math.min(2, Math.floor(progress * 3)));
  };
  updateProcess();
  window.addEventListener("scroll", updateProcess, { passive: true });
  window.addEventListener("resize", updateProcess);

  const serviceList = document.querySelector("[data-service-list]");
  const serviceVisual = document.querySelector("[data-service-visual]");
  const serviceRows = [...document.querySelectorAll("[data-service]")];
  const activateService = (row) => {
    serviceRows.forEach((item) => item.classList.toggle("is-active", item === row));
    serviceVisual.dataset.mode = row.dataset.service;
  };
  serviceRows.forEach((row) => {
    row.addEventListener("mouseenter", () => activateService(row));
    row.addEventListener("focus", () => activateService(row));
  });
  serviceList.addEventListener("mouseenter", () => serviceList.classList.add("is-hovering"));
  serviceList.addEventListener("mouseleave", () => serviceList.classList.remove("is-hovering"));
  serviceList.addEventListener("pointermove", (event) => {
    serviceVisual.style.left = `${event.clientX + 20}px`;
    serviceVisual.style.top = `${event.clientY + 20}px`;
  });

  const contactCanvas = document.querySelector("[data-contact-canvas]");
  new ParticleField(contactCanvas, { count: 82, mode: "contact" });

  const contactForm = document.querySelector("[data-contact-form]");
  const formStatus = document.querySelector("[data-form-status]");
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      formStatus.textContent = "請先填寫必填欄位。";
      return;
    }
    formStatus.textContent = "表單寄送功能尚未設定，資料未送出。請於網站上線前串接實際收件方式。";
  });
})();
