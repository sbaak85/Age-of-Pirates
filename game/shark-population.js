// Shuffle a fixed quota: the population ratio is exact, rather than a probability.
export function populateSharks(encounters,{regions,navigable,regionAt,restricted},random=Math.random){
 const result=encounters.map(t=>({...t,start:[...t.start]}));
 for(const [n,id] of ['redrock','redrock','fjord','mist'].entries()){
  const base=result.find(t=>t.region===id&&t.type==='shark');
  result.push({...base,id:`roaming-shark-${n+1}`,start:[...base.start]});
 }
 const sharks=result.filter(t=>t.type==='shark');
 const quota=sharks.map((_,i)=>i<Math.round(sharks.length/2.5)?0:1);
 for(let i=quota.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[quota[i],quota[j]]=[quota[j],quota[i]];}
 const occupied=result.filter(t=>t.type!=='shark');
 sharks.forEach((t,i)=>{
  t.sharkVariant=quota[i];t.radius=t.sharkVariant===0?3.6:2.4;
  const region=regions.find(r=>r.id===t.region);
  t.name=`${region.name} · ${t.sharkVariant===0?'礁岩巨顎':'碧海獵手'}`;
  let found=false;
  for(let attempt=0;attempt<5000;attempt++){
   const angle=region.angle+(random()-.5)*.9,radius=72+random()*57;
   const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
   if(!navigable(x,z,t.radius+2)||restricted(t,x,z)||regionAt(x,z).id!==t.region)continue;
   if(occupied.some(o=>Math.hypot(x-o.start[0],z-o.start[1])<t.radius+o.radius+4))continue;
   t.start=[x,z];found=true;break;
  }
  if(!found)throw new Error(`No clear shark spawn for ${t.id}`);
  occupied.push(t);
 });
 return result;
}
