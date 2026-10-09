// A reproducible branching root network. Sample real connected curves, not a silhouette.
export function sampleRootSystem(count) {
  let seed=9173;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const segments=[];
  const add=(start,end,radius,depth)=>{
    const dx=end[0]-start[0],dy=end[1]-start[1],dz=end[2]-start[2];
    const length=Math.hypot(dx,dy,dz);
    segments.push({start,end,radius,depth,length,bend:(random()-.5)*.5});
  };
  const branch=(start,angle,length,radius,depth)=>{
    const spread=depth===0?.85:.70;
    const end=[start[0]+Math.cos(angle)*length*spread,start[1]-length,start[2]+Math.sin(angle)*length*spread];
    add(start,end,radius,depth);
    if(depth>=4)return;
    const forks=depth<2?3:2;
    for(let i=0;i<forks;i++){
      const turn=(i-(forks-1)/2)*.8+(random()-.5)*.55;
      branch(end,angle+turn,length*(.66+random()*.13),radius*.58,depth+1);
    }
  };
  add([0,3.35,0],[.05,2.1,.05],.24,-1);
  for(let i=0;i<9;i++)branch([.05,2.1,.05],i/9*Math.PI*2+.15,1.65+random()*.28,.16+random()*.05,0);
  const weights=segments.map(s=>s.length*Math.pow(s.radius,.3));
  const total=weights.reduce((a,b)=>a+b,0);
  const positions=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    let ticket=random()*total,index=0;
    while(index<weights.length-1 && ticket>weights[index])ticket-=weights[index++];
    const s=segments[index],t=random(),angle=random()*Math.PI*2;
    const r=s.radius*(1-t*.42)*Math.sqrt(random());
    // Curvature tapers to zero at branch junctions, so every fork connects.
    const curve=Math.sin(t*Math.PI)*s.bend;
    positions[i*3]=s.start[0]+(s.end[0]-s.start[0])*t+curve+Math.cos(angle)*r;
    positions[i*3+1]=s.start[1]+(s.end[1]-s.start[1])*t+Math.sin(angle)*r*.35;
    positions[i*3+2]=s.start[2]+(s.end[2]-s.start[2])*t+curve*.6+Math.sin(angle)*r;
  }
  return positions;
}
