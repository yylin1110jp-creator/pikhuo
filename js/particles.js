import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createAtmosphere } from "./atmosphere.js";
import { sampleRootSystem } from "./root-system.js";

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
    this.count = this.reducedMotion ? 2400 : this.isMobile ? 5200 : 22000;
    this.ambientCount = this.reducedMotion ? 240 : this.isMobile ? 1200 : 3000;
    this.pointer = new THREE.Vector2(99, 99);
    this.pointerTarget = new THREE.Vector2(99, 99);
    this.progress = 0;
    this.progressTarget = 0;
    this.heroRelease = 0;
    this.heroReleaseTarget = 0;
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
      this.bloom = new UnrealBloomPass(new THREE.Vector2(1,1), 0.66, 0.72, 1.05);
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
    this.setReadingRects(this.readingRects);
    this.introStart=null;
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
    const logoWidth = this.isMobile ? 3.8 : 4.7;
    const logoX = 0;
    const logoY = this.isMobile ? 2.65 : 0.35;
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
    geometry.setAttribute("aRoot",new THREE.BufferAttribute(sampleRootSystem(this.count),3));
    geometry.setAttribute("aLogo", new THREE.BufferAttribute(logo, 3));
    geometry.setAttribute("aParams", new THREE.BufferAttribute(params, 4));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    this.uniforms = {
      uTime: { value: 0 }, uProgress: { value: 0 }, uIntro: { value: this.intro }, uHeroRelease: { value: 0 },
      uPointer: { value: this.pointer.clone() },
      uPointerStrength: { value: this.reducedMotion || this.isMobile ? 0 : 0.075 },
      uPointScale: { value: 1 }, uCompact: { value: this.isMobile ? 1 : 0 },
      uServiceFocus: { value: -1 }, uReadRect: {value:new THREE.Vector4(-2,-2,-1,-1)}, uReadRect2: {value:new THREE.Vector4(-2,-2,-1,-1)}, uReadRect3: {value:new THREE.Vector4(-2,-2,-1,-1)}
    };
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aLogo;
        attribute vec3 aRoot;
        attribute float aLayer;
        attribute vec4 aParams;
        attribute float aSize;
        uniform float uTime, uProgress, uIntro, uHeroRelease, uPointerStrength, uPointScale, uCompact, uServiceFocus;
        uniform vec2 uPointer;
        uniform vec4 uReadRect,uReadRect2,uReadRect3;
        varying float vAlpha, vSeed, vDepth, vHighlight, vLayer;
        const float TWO_PI = 6.283185307179586;
        float ease(float v) { v=clamp(v,0.0,1.0); return v*v*(3.0-2.0*v); }

        // Abstract business motifs: signal ribbons, folded surfaces and orbital systems.
        vec3 gravityField() {
          vec3 p=aRoot;
          p.x+=sin(uTime*.10+aParams.x*6.28318)*.025;
          p.z+=cos(uTime*.08+aParams.y*6.28318)*.035;
          return p;
        }
        vec3 dualAttractor() {
          float u=(aParams.x-.5)*6.0,v=(aParams.y-.5)*5.5;
          float fold=sin(u*.85+uTime*.06)*cos(v*.65)*1.7;
          return vec3(u*cos(v*.25),v+sin(u*.6)*.5,fold+(aParams.z-.5)*.5);
        }
        // Three substantial streams converge into one shared execution direction.
        vec3 executionStreams() {
          float lane=floor(aParams.x*3.0)-1.0;
          float t=aParams.y;
          float x=mix(-3.7,3.4,t);
          float spread=1.0-smoothstep(.15,1.0,t);
          float y=lane*1.75*spread+sin(t*3.14159265)*.65;
          float width=mix(.85,.48,t);
          y+=(fract(aParams.x*3.0)-.5)*width;
          float z=lane*.65*spread+sin(t*4.0+lane*.7+uTime*.07)*.48;
          z+=(aParams.z-.5)*.65;
          return vec3(x,y,z);
        }
        // Solid ascending terraces: a legible growth motif with genuine depth.
        vec3 growthTerraces() {
          float column=min(4.0,floor(aParams.x*5.0));
          float height=1.15+column*.70;
          float x=(column-2.0)*1.32+(fract(aParams.x*5.0)-.5)*.98;
          float y=-2.35+aParams.y*height;
          float z=(aParams.z-.5)*1.65;
          // A mild perspective slant keeps the silhouette calm and architectural.
          x+=z*.22;
          y+=z*.12;
          return vec3(x,y,z);
        }
        vec3 timeTunnel(float travel) {
          float ring=floor(aParams.y*18.0);
          float angle=aParams.x*TWO_PI;
          float z=-27.0+mod(ring*2.0+travel*11.0,36.0);
          float radius=3.3+(aParams.z-.5)*.65;
          // Broken rings and short axial trails, with an open central vanishing point.
          z+=(fract(aParams.y*18.0)-.5)*.65;
          return vec3(cos(angle)*radius,sin(angle)*radius,z);
        }
        vec3 serviceFlows() {
          float x=mix(-9.5,-2.1,aParams.x);
          float y=(aParams.y-.5)*10.0;
          float z=sin(x*.55+uTime*.09)*1.2+cos(y*.6+uTime*.04)*.9+(aParams.z-.5)*1.8;
          return vec3(x+sin(y*.45+uTime*.03)*.7,y,z);
        }
        vec3 orbitCloud() {
          float t=aParams.x*TWO_PI+uTime*.025;
          float phi=acos(aParams.y*2.0-1.0);
          float r=2.3+.65*sin(t*3.0+phi*2.0);
          return vec3(sin(phi)*cos(t)*r,cos(phi)*r,sin(phi)*sin(t)*r+(aParams.z-.5)*.45);
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
          if(i<3.5)return executionStreams();
          if(i<4.5)return growthTerraces();
          if(i<5.5)return serviceFlows();
          return orbitCloud();
        }
        void main() {
          float p=min(uProgress,5.999), from=floor(p), to=min(6.0,from+1.0);
          vec3 target=mix(stage(from),stage(to),ease(fract(p)));
          // Scroll drives expansion into the whole viewport and contraction into a new form.
          // The hero Logo remains intact while it is being read.
          float quiet=step(.5,from)*(1.0-step(3.5,from));
          float burst=(from<.5?pow(sin(fract(p)*3.14159265),4.0)*.65:pow(sin(fract(p)*3.14159265),2.0)*.85)*(1.0-quiet);
          vec3 field=vec3((aParams.x-.5)*mix(6.0,22.0,1.0-uCompact),(aParams.y-.5)*13.0,(aParams.z-.5)*7.0);
          target=mix(target,field,burst);
          // Release the Logo from the very first scroll, then settle into the roots.
          if(from<.5) target=mix(target,field,uHeroRelease*.85*(1.0-ease(fract(p))));
          // Rush past the lens near mid-transition, then settle at the next form.
          float rush=pow(max(0.0,sin(fract(p)*3.14159265)),8.0)*(1.0-quiet);
          // Lateral flow, then gentle vertical unfolding: no forward thrust here.
          if(from>.5 && from<1.5) target.x+=sin(fract(p)*3.14159265)*.5;
          if(from>1.5 && from<2.5) target.y+=sin(fract(p)*3.14159265)*.35;
          target*=1.0+rush*.65;
          target.z+=rush*(1.4+aParams.z*1.4);
          // Only execution → feedback passes through a tunnel. No camera roll.
          float tunnel=0.0;
          if(from>2.5 && from<3.5) {
            float t=fract(p);
            tunnel=smoothstep(.08,.36,t)*(1.0-smoothstep(.64,.94,t));
            target=mix(target,timeTunnel(t),tunnel);
          }
          float gather=ease(uIntro);
          vec3 start=position;
          float spin=(1.0-gather)*1.2;
          start.xy=mat2(cos(spin),-sin(spin),sin(spin),cos(spin))*start.xy;
          vec3 pos=mix(start,target,gather);
          pos.z+=sin(uTime*(0.10+aParams.z*0.07)+aParams.x*24.0)*0.045;
          float fall=1.0-smoothstep(0.0,1.25,distance(pos.xy,uPointer));
          pos.xy+=normalize(pos.xy-uPointer+vec2(0.0001))*fall*uPointerStrength;
          vec4 mv=modelViewMatrix*vec4(pos,1.0);
          gl_Position=projectionMatrix*mv;
          float mass=mix(1.0,1.85,smoothstep(.3,1.0,uProgress));
          gl_PointSize=max(1.0,aSize*mass*uPointScale*(14.0/-mv.z));
          gl_PointSize=min(gl_PointSize,mix(6.0,4.0,tunnel)*uPointScale);
          vLayer=aLayer;
          vSeed=aParams.z;
          vDepth=clamp((pos.z+3.4)/6.8,0.0,1.0);
          vAlpha=(aLayer<.5?.48:aLayer<1.5?.76:aLayer<2.5?1.0:.32)*(0.88+0.12*sin(uTime*0.38+aParams.x*31.0));
          vec2 screen=gl_Position.xy/gl_Position.w*.5+.5;
          vec2 inside=smoothstep(uReadRect.xy-.045,uReadRect.xy+.025,screen)*(1.0-smoothstep(uReadRect.zw-.025,uReadRect.zw+.045,screen));
          vec2 inside2=smoothstep(uReadRect2.xy-.04,uReadRect2.xy+.02,screen)*(1.0-smoothstep(uReadRect2.zw-.02,uReadRect2.zw+.04,screen));
          vec2 inside3=smoothstep(uReadRect3.xy-.04,uReadRect3.xy+.02,screen)*(1.0-smoothstep(uReadRect3.zw-.02,uReadRect3.zw+.04,screen));
          vAlpha*=1.0-max(inside.x*inside.y,max(inside2.x*inside2.y,inside3.x*inside3.y))*.90;
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
          // A wider shoulder gives the cloud a visible luminous body.
          float body=mix(soft,exp(-d*d*11.0)*(1.0-smoothstep(.43,.5,d)),smoothstep(.6,1.0,vDepth)*.3);
          gl_FragColor=vec4(color,body*vAlpha);
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

  setReadingRects(rects=[]) {
    this.readingRects=rects;
    if(!this.uniforms)return;
    ['uReadRect','uReadRect2','uReadRect3'].forEach((name,index)=>{
      const rect=rects?.[index];
      if(!rect)this.uniforms[name].value.set(-2,-2,-1,-1);
      else this.uniforms[name].value.set(rect.left/innerWidth,1-rect.bottom/innerHeight,rect.right/innerWidth,1-rect.top/innerHeight);
    });
  }
  setHeroRelease(value){
    this.heroReleaseTarget=clamp(value,0,1);
    // A visitor who scrolls is already leaving the opening; do not gather again.
    if(this.heroReleaseTarget>.001)this.introCancelledByScroll=true;
  }
  setProgress(value){this.progressTarget=clamp(value,0,6);}
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
      this.heroRelease=this.heroReleaseTarget;
      this.serviceFocus=this.serviceFocusTarget;
    }else{
      const t=this.introStart===null?0:clamp((performance.now()-this.introStart)/3000,0,1);
      this.intro=this.introCancelledByScroll?1:t*t*(3-2*t);
      this.heroRelease+=(this.heroReleaseTarget-this.heroRelease)*(1-Math.exp(-dt*12));
      this.progress+=(this.progressTarget-this.progress)*(1-Math.exp(-dt*(this.progressTarget<1?8:3)));
      this.serviceFocus+=(this.serviceFocusTarget-this.serviceFocus)*0.12;
      this.pointer.lerp(this.pointerTarget,0.045);
      this.uniforms.uTime.value=elapsed;
      this.ambientUniforms.uTime.value=elapsed;
    }
    this.uniforms.uIntro.value=this.intro;
    this.uniforms.uHeroRelease.value=this.heroRelease;
    this.uniforms.uProgress.value=this.progress;
    this.uniforms.uPointer.value.copy(this.pointer);
    this.uniforms.uServiceFocus.value=this.serviceFocus;
    const away=this.pointerTarget.x===99;
    this.camera.position.x+=((away?0:this.pointer.x*0.008)-this.camera.position.x)*0.02;
    this.camera.position.y+=((away?0:this.pointer.y*0.005)-this.camera.position.y)*0.02;
    this.camera.lookAt(0,0,0);
    this.atmosphere?.update(elapsed, this.progress, this.pointer, this.camera);
    this.composer.render();
    // The initial HTML particle field stays visible until a real GPU frame exists.
    this.canvas.parentElement.classList.add('is-ready');
    // Begin only after the first draw has compiled the shaders.
    if(this.introStart===null)this.introStart=performance.now();
    this.canvas.dataset.introProgress=this.intro.toFixed(3);
    this.canvas.dataset.sceneProgress=this.progress.toFixed(3);
    this.canvas.dataset.heroRelease=this.heroRelease.toFixed(3);
  }
}
