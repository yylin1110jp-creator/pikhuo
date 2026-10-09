import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createAtmosphere } from "./atmosphere.js";

const TAU = Math.PI * 2;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;

function gaussian() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

export class ParticleExperience {
  constructor(canvas) {
    this.canvas = canvas;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.isMobile = matchMedia("(max-width: 820px)").matches;
    this.count = this.reducedMotion ? 2200 : this.isMobile ? 4000 : 16000;
    this.ambientCount = this.reducedMotion ? 240 : this.isMobile ? 1200 : 3000;
    this.pointer = new THREE.Vector2(99, 99);
    this.pointerTarget = new THREE.Vector2(99, 99);
    this.progress = 0;
    this.progressTarget = 0;
    this.serviceFocus = -1;
    this.serviceFocusTarget = -1;
    this.intro = this.reducedMotion ? 1 : 0;
    this.introStart = performance.now();
    this.clock = new THREE.Clock();
    this.running = true;

    if (!this.canUseWebGL()) {
      document.body.classList.add("no-webgl");
      return;
    }
    try {
      this.initRenderer();
      this.loadLogo().catch(error => this.fail(error));
    } catch (error) {
      console.warn("PIKHUO particle scene unavailable:", error);
      document.body.classList.add("no-webgl");
    }
  }

  fail(error) {
    console.warn("PIKHUO scene fallback:", error);
    document.body.classList.add("no-webgl");
    this.renderer?.setAnimationLoop(null);
  }

  canUseWebGL() {
    try {
      const probe = document.createElement("canvas");
      return Boolean(probe.getContext("webgl2"));
    } catch (_error) {
      return false;
    }
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, alpha: true, antialias: false,
      powerPreference: "high-performance"
    });
    this.renderer.setClearColor(0x050308, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    this.camera.position.set(0, 0, 14);
    this.scene.background = new THREE.Color(0x050308);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // HDR threshold: only the sparse warm-white highlights reach bloom.
    if (!this.isMobile && !this.reducedMotion) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(1,1), 0.48, 0.65, 1.05);
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());
    this.handleResize = this.handleResize.bind(this);
    this.handlePointer = this.handlePointer.bind(this);
    this.animate = this.animate.bind(this);
    window.addEventListener("resize", this.handleResize, { passive: true });
    window.addEventListener("pointermove", this.handlePointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => this.pointerTarget.set(99, 99));
    document.addEventListener("visibilitychange", () => { this.running = !document.hidden; });
    this.canvas.addEventListener("webglcontextrestored", () => location.reload());
    this.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.running = false;
      document.body.classList.add("no-webgl");
    });
    this.handleResize();
  }

  async loadLogo() {
    const image = new Image();
    image.decoding = "async";
    image.src = new URL("../assets/pikhuo-mark.png", import.meta.url).href;
    await image.decode();
    const result = this.readLogoPixels(image);
    this.logoPixels = result.samples;
    this.logoBounds = result.bounds;
    if (!this.logoPixels.length) throw new Error("Logo alpha data is empty.");
    this.createMainParticles();
    this.createAmbientParticles();
    this.atmosphere = createAtmosphere(this.scene, this.isMobile, this.reducedMotion);
    this.handleResize();
    this.canvas.dataset.ready = "true";
    this.renderer.setAnimationLoop(this.animate);
  }

  readLogoPixels(image) {
    const surface = document.createElement("canvas");
    const context = surface.getContext("2d", { willReadFrequently: true });
    surface.width = image.naturalWidth;
    surface.height = image.naturalHeight;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, surface.width, surface.height).data;
    const samples = [], edges = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let y = 0; y < surface.height; y += 2) {
      for (let x = 0; x < surface.width; x += 2) {
        if (pixels[(y * surface.width + x) * 4 + 3] > 105) {
          samples.push({ x, y });
          const alpha = (xx, yy) => xx < 0 || yy < 0 || xx >= surface.width || yy >= surface.height ? 0 : pixels[(yy * surface.width + xx) * 4 + 3];
          if (alpha(x-3,y)<105 || alpha(x+3,y)<105 || alpha(x,y-3)<105 || alpha(x,y+3)<105) edges.push({x,y});
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
      }
    }
    this.edgePixels = edges.length ? edges : samples;
    return { samples, bounds: { minX, maxX, minY, maxY } };
  }

  createMainParticles() {
    const geometry = new THREE.BufferGeometry();
    const scatter = new Float32Array(this.count * 3);
    const logo = new Float32Array(this.count * 3);
    const params = new Float32Array(this.count * 4);
    const sizes = new Float32Array(this.count);
    const layers = new Float32Array(this.count);
    const logoWidth = this.isMobile ? 4.4 : 5.65;
    const logoX = this.isMobile ? 0 : 3.0;
    const logoY = this.isMobile ? 2.35 : 0.65;
    const ratio = (this.logoBounds.maxY - this.logoBounds.minY) /
      (this.logoBounds.maxX - this.logoBounds.minX);

    for (let i = 0; i < this.count; i += 1) {
      const i3 = i * 3, i4 = i * 4;
      const layer = i < this.count*.55 ? 0 : i < this.count*.80 ? 1 : i < this.count*.87 ? 2 : 3;
      layers[i] = layer;
      const source = layer === 1 || layer === 3 ? this.edgePixels : this.logoPixels;
      const sample = source[Math.floor(Math.random() * source.length)];
      const nx = (sample.x - this.logoBounds.minX) /
        (this.logoBounds.maxX - this.logoBounds.minX) - 0.5;
      const ny = 0.5 - (sample.y - this.logoBounds.minY) /
        (this.logoBounds.maxY - this.logoBounds.minY);
      const angle = Math.random() * TAU;
      const radius = Math.pow(Math.random(), 0.62);
      scatter[i3] = Math.cos(angle) * radius * (this.isMobile ? 6.5 : 11.8);
      scatter[i3 + 1] = Math.sin(angle) * radius * 6.3;
      scatter[i3 + 2] = gaussian() * 3.5;
      logo[i3] = logoX + nx * logoWidth;
      logo[i3 + 1] = logoY + ny * logoWidth * ratio;
      logo[i3 + 2] = gaussian() * 0.075;
      params[i4] = Math.random();
      params[i4 + 1] = Math.random();
      params[i4 + 2] = Math.random();
      params[i4 + 3] = Math.floor(Math.random() * 4);
      sizes[i] = layer === 2 ? lerp(1.8,2.5,Math.random()) : lerp(0.9,1.65,Math.random());
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(scatter, 3));
    geometry.setAttribute("aLayer", new THREE.BufferAttribute(layers, 1));
    geometry.setAttribute("aLogo", new THREE.BufferAttribute(logo, 3));
    geometry.setAttribute("aParams", new THREE.BufferAttribute(params, 4));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    this.uniforms = {
      uTime: { value: 0 }, uProgress: { value: 0 }, uIntro: { value: this.intro },
      uPointer: { value: this.pointer.clone() },
      uPointerStrength: { value: this.reducedMotion || this.isMobile ? 0 : 0.075 },
      uPointScale: { value: 1 }, uCompact: { value: this.isMobile ? 1 : 0 },
      uServiceFocus: { value: -1 }
    };
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aLogo;
        attribute float aLayer;
        attribute vec4 aParams;
        attribute float aSize;
        uniform float uTime, uProgress, uIntro, uPointerStrength, uPointScale, uCompact, uServiceFocus;
        uniform vec2 uPointer;
        varying float vAlpha, vSeed, vDepth, vHighlight, vLayer;
        const float TWO_PI = 6.283185307179586;
        float ease(float v) { v=clamp(v,0.0,1.0); return v*v*(3.0-2.0*v); }

        vec3 gravityField() {
          float t=aParams.x*TWO_PI+uTime*(0.018+aParams.z*0.014);
          float band=aParams.w, ring=(band-1.5)*0.16;
          float breathe=1.0+sin(t*3.0+band*1.7)*0.055;
          float rx=mix(1.7,2.25,1.0-uCompact)+ring;
          float ry=mix(3.75,4.6,1.0-uCompact)+ring*1.4;
          float release=smoothstep(0.76,0.98,sin(t*0.5+0.8)*0.5+0.5);
          return vec3(mix(0.0,1.55,1.0-uCompact)+cos(t)*rx*breathe+release*0.35,
            mix(0.15,0.0,1.0-uCompact)+sin(t)*ry,
            sin(t*1.5+band)*0.72+cos(t*0.5)*ring*2.0);
        }
        vec3 dualAttractor() {
          float t=aParams.x*TWO_PI*2.0+uTime*.065;
          float strand=mod(aParams.w,2.0)*3.14159265;
          float tube=(aParams.y-.5)*.14;
          return vec3(mix(0.0,1.7,1.0-uCompact)+cos(t+strand)*(1.55+tube),
            (aParams.x-.5)*7.8, sin(t+strand)*(1.55+tube));
        }
        vec3 trefoil() {
          float t=aParams.x*TWO_PI+uTime*(0.017+aParams.z*0.011);
          float tube=(aParams.y-0.5)*0.42;
          vec3 p=vec3(sin(t)+2.0*sin(2.0*t),cos(t)-2.0*cos(2.0*t),-sin(3.0*t));
          p*=mix(0.92,1.13,1.0-uCompact);
          p.x+=mix(0.0,-1.55,1.0-uCompact);
          p.xy+=vec2(cos(t*4.0),sin(t*4.0))*tube;
          float x=p.x*0.94-p.z*0.34, z=p.x*0.34+p.z*0.94;
          p.x=x; p.z=z; return p;
        }
        vec3 mobius() {
          float u=aParams.x*TWO_PI+uTime*(0.013+aParams.z*0.008);
          float w=(aParams.y-0.5)*mix(1.15,1.65,1.0-uCompact);
          float r=mix(1.75,2.35,1.0-uCompact);
          vec3 p=vec3((r+w*cos(u*0.5))*cos(u),(r+w*cos(u*0.5))*sin(u),w*sin(u*0.5));
          p.y*=1.22;
          float y=p.y*0.93-p.z*0.37, z=p.y*0.37+p.z*0.93;
          p.y=y; p.z=z; p.x+=sin(u*3.0)*0.08; return p;
        }
        vec3 serviceFlows() {
          float lane=aParams.w;
          float f=fract(aParams.x+uTime*(0.004+aParams.z*0.0025));
          return vec3(mix(-5.8,5.8,f),(lane-1.5)*mix(1.1,1.5,1.0-uCompact)+sin(f*TWO_PI*1.35+lane*1.18)*0.72,
            cos(f*TWO_PI+lane*0.9)*0.9);
        }
        vec3 stage(float i) {
          if(i<0.5){
            vec3 p=aLogo;
            if(aLayer>2.5){
              float release=pow(max(0.0,sin(uTime*.23+aParams.x*TWO_PI)),8.0);
              p+=vec3(sin(aParams.x*19.0)*1.6,cos(aParams.x*17.0)*.7,sin(aParams.y*12.0)*1.2)*release;
            }
            return p;
          }
          if(i<1.5)return gravityField();
          if(i<2.5)return dualAttractor();
          if(i<3.5)return trefoil();
          if(i<4.5)return mobius();
          return serviceFlows();
        }
        void main() {
          float p=min(uProgress,4.999), from=floor(p), to=min(5.0,from+1.0);
          vec3 target=mix(stage(from),stage(to),ease(fract(p)));
          vec3 pos=mix(position,target,ease(uIntro));
          pos.z+=sin(uTime*(0.10+aParams.z*0.07)+aParams.x*24.0)*0.045;
          float fall=1.0-smoothstep(0.0,1.25,distance(pos.xy,uPointer));
          pos.xy+=normalize(pos.xy-uPointer+vec2(0.0001))*fall*uPointerStrength;
          vec4 mv=modelViewMatrix*vec4(pos,1.0);
          gl_Position=projectionMatrix*mv;
          gl_PointSize=max(1.0,aSize*uPointScale*(14.0/-mv.z));
          vLayer=aLayer;
          vSeed=aParams.z;
          vDepth=clamp((pos.z+3.4)/6.8,0.0,1.0);
          vAlpha=(aLayer<.5?.48:aLayer<1.5?.76:aLayer<2.5?1.0:.32)*(0.88+0.12*sin(uTime*0.38+aParams.x*31.0));
          float match=1.0-step(0.45,abs(aParams.w-uServiceFocus));
          vHighlight=uServiceFocus< -0.5?0.0:match;
        }`,
      fragmentShader: `
        varying float vAlpha,vSeed,vDepth,vHighlight,vLayer;
        void main(){
          float d=length(gl_PointCoord-.5);
          float soft=exp(-d*d*18.0)*(1.0-smoothstep(.40,.5,d));
          vec3 color=mix(vec3(.43,.24,.70),vec3(.80,.55,.91),vSeed);
          if(vLayer>1.5 && vLayer<2.5) color=vec3(1.85,1.65,1.90);
          else if(vLayer>.5 && vLayer<1.5) color*=1.15;
          color*=1.0+vHighlight*.25;
          if(soft<.01)discard;
          gl_FragColor=vec4(color,soft*vAlpha);
        }`

    });
    this.points = new THREE.Points(geometry, material);
    this.points.renderOrder = 1;
    this.scene.add(this.points);
  }

  createAmbientParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.ambientCount * 3);
    const motion = new Float32Array(this.ambientCount * 4);
    const sizes = new Float32Array(this.ambientCount);
    for (let i = 0; i < this.ambientCount; i += 1) {
      const i3=i*3, i4=i*4, select=Math.random();
      const layer=select<0.70?0:1;
      positions[i3]=lerp(-12.5,12.5,Math.random());
      positions[i3+1]=lerp(-6.7,6.7,Math.random());
      positions[i3+2]=layer===0?lerp(-5.2,-2.6,Math.random()):layer===1?lerp(-1.9,0.8,Math.random()):lerp(1.7,3.5,Math.random());
      motion[i4]=lerp(0.015,0.048,Math.random())*(Math.random()>0.16?1:-1);
      motion[i4+1]=lerp(-0.008,0.024,Math.random());
      motion[i4+2]=Math.random()*TAU;
      motion[i4+3]=layer;
      sizes[i]=layer===0?lerp(0.18,0.42,Math.random()):layer===1?lerp(0.34,0.72,Math.random()):lerp(1.5,2.8,Math.random());
    }
    geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
    geometry.setAttribute("aMotion",new THREE.BufferAttribute(motion,4));
    geometry.setAttribute("aSize",new THREE.BufferAttribute(sizes,1));
    this.ambientUniforms={uTime:{value:0},uPointScale:{value:1},uCompact:{value:this.isMobile?1:0}};
    const material=new THREE.ShaderMaterial({
      uniforms:this.ambientUniforms,transparent:true,depthWrite:false,depthTest:false,
      blending:THREE.NormalBlending,
      vertexShader:`
        attribute vec4 aMotion; attribute float aSize;
        uniform float uTime,uPointScale,uCompact;
        varying float vLayer,vSeed,vAlpha;
        void main(){
          vec3 p=position; float sx=mix(13.8,25.0,1.0-uCompact),sy=13.4;
          p.x=mod(p.x+aMotion.x*uTime+sx*0.5,sx)-sx*0.5;
          p.y=mod(p.y+aMotion.y*uTime+sy*0.5,sy)-sy*0.5;
          p.x+=sin(uTime*0.018+aMotion.z)*(0.1+aMotion.w*0.15);
          p.y+=cos(uTime*0.014+aMotion.z*1.31)*(0.07+aMotion.w*0.12);
          vec4 mv=modelViewMatrix*vec4(p,1.0);
          gl_Position=projectionMatrix*mv;
          gl_PointSize=max(1.0,aSize*uPointScale*(34.0/-mv.z));
          vLayer=aMotion.w;vSeed=fract(aMotion.z/6.2831853);
          vAlpha=mix(0.045,0.15,vSeed)*mix(0.74,1.0,aMotion.w*0.5);
        }`,
      fragmentShader:`
        varying float vLayer,vSeed,vAlpha;
        void main(){
          float d=length(gl_PointCoord-0.5);
          float soft=1.0-smoothstep(mix(0.16,0.015,vLayer*0.5),0.5,d);
          vec3 color=mix(vec3(0.44,0.30,0.54),vec3(0.90,0.62,0.86),vLayer*0.28+vSeed*0.34);
          float alpha=soft*vAlpha*mix(1.0,0.62,step(1.5,vLayer));
          if(alpha<0.004)discard;gl_FragColor=vec4(color,alpha);
        }`
    });
    this.ambientPoints=new THREE.Points(geometry,material);
    this.ambientPoints.renderOrder=-1;
    this.scene.add(this.ambientPoints);
  }

  handleResize() {
    if (!this.renderer) return;
    const mobile=innerWidth<=820;
    const ratio=Math.min(devicePixelRatio||1,mobile?1.25:1.5);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(innerWidth,innerHeight,false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(innerWidth,innerHeight);
    this.camera.aspect=innerWidth/innerHeight;
    this.camera.fov=mobile?50:42;
    // Rebuild on layout breakpoint only; ordinary resizes keep the GPU buffers.
    if (mobile !== this.isMobile) { this.isMobile=mobile; location.reload(); return; }
    this.camera.updateProjectionMatrix();
    if(this.uniforms)this.uniforms.uPointScale.value=ratio * innerHeight/850;
    if(this.ambientUniforms)this.ambientUniforms.uPointScale.value=Math.min(ratio,mobile?1:1.2);
  }

  handlePointer(event) {
    if(this.reducedMotion||this.isMobile)return;
    const x=event.clientX/innerWidth*2-1,y=-(event.clientY/innerHeight*2-1);
    const height=2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov*0.5))*this.camera.position.z;
    this.pointerTarget.set(x*height*this.camera.aspect*0.5,y*height*0.5);
  }

  setProgress(value){this.progressTarget=clamp(value,0,5);}
  setServiceFocus(value){this.serviceFocusTarget=Number.isInteger(value)?value:-1;}
  setSceneOpacity(value){this.canvas.style.opacity=String(clamp(value,0,1));}

  animate() {
    if(!this.points||!this.running)return;
    const elapsed=this.reducedMotion ? 0 : Math.min(this.clock.getElapsedTime(), 36000);
    const now=performance.now();
    const dt=Math.min((now-(this.previousFrame||now-16.7))/1000,.05);
    this.previousFrame=now;
    if(this.reducedMotion){
      this.progress=Math.round(this.progressTarget);
      this.serviceFocus=this.serviceFocusTarget;
    }else{
      const t=clamp((performance.now()-this.introStart)/2400,0,1);
      this.intro=t*t*(3-2*t);
      this.progress+=(this.progressTarget-this.progress)*(1-Math.exp(-dt*3));
      this.serviceFocus+=(this.serviceFocusTarget-this.serviceFocus)*0.12;
      this.pointer.lerp(this.pointerTarget,0.045);
      this.uniforms.uTime.value=elapsed;
      this.ambientUniforms.uTime.value=elapsed;
    }
    this.uniforms.uIntro.value=this.intro;
    this.uniforms.uProgress.value=this.progress;
    this.uniforms.uPointer.value.copy(this.pointer);
    this.uniforms.uServiceFocus.value=this.serviceFocus;
    const away=this.pointerTarget.x===99;
    this.camera.position.x+=((away?0:this.pointer.x*0.008)-this.camera.position.x)*0.02;
    this.camera.position.y+=((away?0:this.pointer.y*0.005)-this.camera.position.y)*0.02;
    this.camera.lookAt(0,0,0);
    this.atmosphere?.update(elapsed, this.progress, this.pointer, this.camera);
    this.composer.render();
  }
}
