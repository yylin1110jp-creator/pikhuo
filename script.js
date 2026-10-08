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

  class ParticleField {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.count = options.count || 100;
      this.mode = options.mode || "core";
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
        radius: 1 + Math.random() * 2.2,
        speed: .15 + Math.random() * .36,
        orbit: 34 + Math.random() * Math.min(this.width, this.height) * .42,
        lane: index / targetCount,
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        opacity: .18 + Math.random() * .7
      }));
    }

    setMode(mode) { this.mode = mode; }

    getTarget(particle, time) {
      const cx = this.width * (this.mode === "core" ? .73 : .5);
      const cy = this.height * .5;
      const phase = particle.seed + time * particle.speed * .0003;

      if (this.mode === "scatter") {
        return {
          x: this.width * (.15 + .7 * particle.lane) + Math.sin(phase * 1.8) * 55,
          y: this.height * (.18 + .64 * ((particle.lane * 7.7) % 1)) + Math.cos(phase) * 30
        };
      }
      if (this.mode === "expand") {
        const bands = [-.24, -.08, .08, .24];
        const band = bands[Math.floor(particle.lane * bands.length) % bands.length];
        return {
          x: this.width * (.12 + particle.lane * .78),
          y: cy + this.height * band + Math.sin(phase * 2) * 24
        };
      }
      if (this.mode === "return") {
        const angle = phase + particle.lane * Math.PI * 4;
        const ring = this.width * (.08 + .22 * ((particle.lane * 4) % 1));
        return { x: cx + Math.cos(angle) * ring, y: cy + Math.sin(angle) * ring * .64 };
      }
      const angle = phase + particle.lane * Math.PI * 5;
      const orbit = particle.orbit * (.28 + .72 * particle.lane);
      return { x: cx + Math.cos(angle) * orbit, y: cy + Math.sin(angle) * orbit * .63 };
    }

    renderFrame(time) {
      this.ctx.clearRect(0, 0, this.width, this.height);
      const points = [];
      this.particles.forEach((particle) => {
        const target = this.getTarget(particle, time);
        const dx = target.x - particle.x;
        const dy = target.y - particle.y;
        particle.x += dx * .035;
        particle.y += dy * .035;

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

      if (this.mode !== "scatter" && points.length < 150) {
        this.ctx.lineWidth = .5;
        for (let i = 0; i < points.length; i += 1) {
          for (let j = i + 1; j < points.length; j += 1) {
            const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
            if (distance < 72) {
              this.ctx.strokeStyle = `rgba(255, 114, 48, ${(1 - distance / 72) * .15})`;
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
  new ParticleField(heroCanvas, { count: 110, mode: "core" });

  const processCanvas = document.querySelector("[data-process-canvas]");
  const processParticles = new ParticleField(processCanvas, { count: 92, mode: "scatter" });
  const processSection = document.querySelector("#approach");
  const processStages = [...document.querySelectorAll("[data-process-stage]")];
  const stageIndex = document.querySelector("[data-stage-index]");
  let activeStage = 0;

  const setProcessStage = (index) => {
    if (index === activeStage && processStages[index].classList.contains("is-active")) return;
    activeStage = index;
    processStages.forEach((stage, stagePosition) => stage.classList.toggle("is-active", stagePosition === index));
    stageIndex.textContent = String(index + 1).padStart(2, "0");
    processParticles.setMode(["scatter", "expand", "return"][index]);
  };

  const updateProcess = () => {
    if (isMobile()) return;
    const rect = processSection.getBoundingClientRect();
    const distance = processSection.offsetHeight - window.innerHeight;
    const progress = clamp(-rect.top / Math.max(distance, 1), 0, .999);
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
  new ParticleField(contactCanvas, { count: 64, mode: "core" });

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
