import * as THREE from 'three';

// Actual world-space flow particles and camera-facing foreground quads.
// Quads avoid the hardware point-size limit for large out-of-focus lights.
export function createAtmosphere(scene, mobile, reducedMotion) {
  const common={uTime:{value:0},uProgress:{value:0},uPixelRatio:{value:1}};
  const count=reducedMotion?600:mobile?2200:7500;
  const positions=new Float32Array(count*3), seeds=new Float32Array(count*4);
  for(let i=0;i<count;i++){
    seeds.set([Math.random(),Math.random(),Math.random(),i%4],i*4);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geo.setAttribute('aSeed',new THREE.BufferAttribute(seeds,4));
  const mat=new THREE.ShaderMaterial({
    uniforms:common,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    vertexShader:`
      attribute vec4 aSeed;
      uniform float uTime,uProgress,uPixelRatio;
      varying float vAlpha,vBright;
      void main(){
        float t=fract(aSeed.x+uTime*(.012+aSeed.z*.006));
        float lane=aSeed.w;
        float x=mix(-14.0,14.0,t);
        float band=(aSeed.y-.5)*.52;
        float y=sin(t*6.28318+lane*.95)*(.8+lane*.32)+band-.3;
        float z=sin(t*6.28318+lane)*1.7+(aSeed.z-.5)*1.1;
        vec4 mv=modelViewMatrix*vec4(x,y,z,1.0);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=max(1.0,(.9+aSeed.z*.8)*uPixelRatio*14.0/-mv.z);
        vBright=step(.97,aSeed.z);
        vAlpha=(.14+aSeed.z*.18)*(1.0-smoothstep(0.0,1.3,uProgress)*.6);
        vAlpha*=smoothstep(0.0,.13,t)*(1.0-smoothstep(.87,1.0,t));
      }`,
    fragmentShader:`
      varying float vAlpha,vBright;
      void main(){
        float r=length(gl_PointCoord-.5);
        float a=exp(-r*r*20.0)*(1.0-smoothstep(.4,.5,r));
        vec3 c=mix(vec3(.42,.24,.72),vec3(1.8,1.5,1.9),vBright);
        gl_FragColor=vec4(c,a*vAlpha);
      }`
  });
  const flows=new THREE.Points(geo,mat);flows.frustumCulled=false;scene.add(flows);

  const fogMat=new THREE.ShaderMaterial({uniforms:common,transparent:true,depthWrite:false,depthTest:false,
    blending:THREE.AdditiveBlending,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`
      varying vec2 vUv; uniform float uTime,uProgress;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vec2 p=vUv*2.0-1.0;
        float n=noise(vUv*4.0+vec2(uTime*.012,-uTime*.009))*.65+noise(vUv*9.0-uTime*.006)*.35;
        float cloud=exp(-dot(p*vec2(1.0,1.5),p*vec2(1.0,1.5))*2.4);
        float beam=exp(-pow((p.x+p.y*.6-.2)*4.0,2.0))*exp(-dot(p,p)*2.5);
        // Light drifts with the same flow phase instead of a fixed CSS circle.
        float wave=.8+.2*sin(p.x*5.0-uTime*.3);
        gl_FragColor=vec4(vec3(.24,.11,.42),(.17*cloud*n*wave+.025*beam)*(1.0-min(uProgress*.08,.4)));
      }`
  });
  const fog=new THREE.Mesh(new THREE.PlaneGeometry(23,17),fogMat);
  fog.position.set(2.4,1,-3.5);fog.renderOrder=-3;scene.add(fog);

  const bokeh=[];
  const n=mobile?5:15;
  for(let i=0;i<n;i++){
    const uniforms={uTime:{value:0},uSeed:{value:Math.random()*20},uAlpha:{value:i<2?.105:.065}};
    const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`varying vec2 vUv;uniform float uTime,uSeed,uAlpha;
        void main(){vec2 p=vUv-.5;float r=length(p);float angle=atan(p.y,p.x);
          float irregular=r*(1.0+.025*sin(angle*5.0+uSeed));
          float soft=exp(-irregular*irregular*19.0)*(1.0-smoothstep(.30,.50,irregular));
          float core=exp(-r*r*90.0)*.12;
          float breath=.8+.2*sin(uTime*.21+uSeed);
          gl_FragColor=vec4(mix(vec3(.56,.27,.72),vec3(.86,.63,.86),sin(uSeed)*.5+.5),(soft+core)*uAlpha*breath);
        }`
    });
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);
    mesh.renderOrder=3;
    const base={x:(i%2?1:-1)*(mobile?2.0:5.1)+Math.random()*1.4-0.7,y:(Math.random()-.55)*6,z:5+Math.random()*2.4};
    const size=i<2?1.25: i<7?.65:.30;
    mesh.scale.setScalar(size);mesh.position.set(base.x,base.y,base.z);
    scene.add(mesh);bokeh.push({mesh,base,uniforms});
  }
  return {update(time,progress,pointer,camera){
    common.uTime.value=time; common.uProgress.value=progress;
    common.uPixelRatio.value=Math.min(devicePixelRatio||1,mobile?1.25:1.5)*innerHeight/850;
    for(const {mesh,base,uniforms} of bokeh){
      uniforms.uTime.value=time;
      mesh.position.x=base.x+Math.sin(time*.045+uniforms.uSeed.value)*.28;
      mesh.position.y=base.y+Math.cos(time*.035+uniforms.uSeed.value)*.2;
      if(pointer.x!==99 && !mobile && !reducedMotion){
        mesh.position.x-=pointer.x*.028;
        mesh.position.y-=pointer.y*.028;
      }
      mesh.quaternion.copy(camera.quaternion);
    }
  }};
}
