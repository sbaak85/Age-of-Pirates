const LIFETIME=1.05;
const MAX_NUMBERS=48;

// Separate from the health labels so a lethal hit survives the label disappearing.
export function createDamageNumbers(layer){
  const active=[];
  const sequences=new WeakMap();
  return {
    spawn(target,amount,now){
      if(!Number.isFinite(amount)||amount<=0)return;
      if(active.length>=MAX_NUMBERS)active.shift().element.remove();
      const sequence=sequences.get(target)||0;
      sequences.set(target,sequence+1);
      const element=layer.ownerDocument.createElement('span');
      element.className='damage-number';
      element.textContent=`-${Number(amount.toFixed(1))}`;
      layer.appendChild(element);
      active.push({target,element,born:now,lane:[0,-1,1,-.5,.5][sequence%5]});
    },
    update(now,project,visible=true){
      layer.hidden=!visible;
      for(let i=active.length-1;i>=0;i--){
        const hit=active[i],age=Math.max(0,now-hit.born);
        if(age>=LIFETIME){hit.element.remove();active.splice(i,1);continue;}
        if(!visible)continue;
        const anchor=project(hit.target);
        hit.element.hidden=!anchor.visible;
        if(!anchor.visible)continue;
        const t=age/LIFETIME;
        const rise=10+58*Math.pow(t,.7);
        const scale=age<.11?.65+age/.11*.6:age<.24?1.25-(age-.11)/.13*.25:1;
        hit.element.style.left=`${anchor.x+hit.lane*(46+6*t)}px`;
        hit.element.style.top=`${anchor.y-rise}px`;
        hit.element.style.transform=`translate(-50%,-100%) scale(${scale})`;
        hit.element.style.opacity=String(t<.55?1:Math.max(0,(1-t)/.45));
      }
    },
    clear(){for(const hit of active)hit.element.remove();active.length=0;},
  };
}
