export const SAIL_TRANSITION_SECONDS=1.4;
export const sailEase=p=>{p=Math.max(0,Math.min(1,p));return p*p*(3-2*p);};
export function advanceSails(progress,deployed,dt){
  const delta=Math.max(0,dt)/SAIL_TRANSITION_SECONDS;
  return deployed?Math.min(1,progress+delta):Math.max(0,progress-delta);
}
// A single cloth surface gathers into a pleated roll; no mesh visibility swap.
export function sailPoint(rig,u,v,progress,time=0,out={}){
  const p=sailEase(progress),{x,top,height,width}=rig;
  let pinch=0;for(const tie of [.12,.37,.63,.88])pinch+=Math.exp(-(((u-tie)/.026)**2));
  const radius=(.105+height*.027)*(1-.38*pinch)*(1+.12*Math.sin(u*47)+.06*Math.sin(u*93));
  const angle=v*Math.PI*2;
  const foldX=x+.12+radius*Math.sin(angle),foldY=top-.095+radius*Math.cos(angle);
  const billow=Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
  out.x=foldX*(1-p)+(x+.14+.62*billow)*p
    +Math.sin(v*8*Math.PI+u*5)*.085*Math.sin(Math.PI*v)*4*p*(1-p)
    +Math.sin(time*2.4+u*7+v*3)*.028*billow*p;
  out.y=foldY*(1-p)+(top-v*height+.14*Math.sin(Math.PI*u)*v*v)*p;
  out.z=(u-.5)*width*(1-.18*v*p);
  return out;
}
