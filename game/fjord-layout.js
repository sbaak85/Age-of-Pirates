// One local-coordinate source for the fjord shore, buildable shelves and navigation.
// +Z faces the sea. Both the front gate and east passage remain open water.
export const FJORD={angle:4.8,radius:156,rotation:-Math.PI/2-4.8,gate:[0,31],statue:[0,6],castle:[0,-34],dock:[-8,-8]};
const c=Math.cos(FJORD.rotation),s=Math.sin(FJORD.rotation),cx=Math.cos(FJORD.angle)*FJORD.radius,cz=Math.sin(FJORD.angle)*FJORD.radius;
export const fjordToWorld=(x,z)=>({x:cx+c*x+s*z,z:cz-s*x+c*z});
export const fjordToLocal=(x,z)=>({x:c*(x-cx)-s*(z-cz),z:s*(x-cx)+c*(z-cz)});
// Waterline footprints. The irregular rear crown closes the bay; unequal arms
// frame the basin without closing the two ship entrances.
export const FJORD_LANDS=[
 {id:'crown',height:3.5,points:[[-44,-30],[-43,-36],[-45,-40],[-39,-48],[-34,-54],[-30,-56],[-23,-55],[-18,-54],[-9,-50],[-3,-52],[6,-50],[13,-53],[22,-55],[28,-56],[34,-53],[39,-47],[41,-37],[45,-31],[43,-26],[35,-22],[25,-19],[12,-19],[-13,-19],[-29,-20],[-38,-24]]},
 {id:'west',height:3.7,points:[[-45,-30],[-49,-29],[-52,-25],[-50,-22],[-53,-19],[-54,-16],[-52,-12],[-53,-8],[-51,-5],[-51,0],[-49,4],[-50,8],[-47,12],[-47,17],[-44,22],[-38,27],[-32,30],[-27,29],[-23,30],[-20,33],[-16,34],[-13.8,31],[-15.5,28],[-20,25],[-21,22],[-27,17],[-30,7],[-27,-5],[-29,-15],[-33,-24],[-40,-28]]},
 {id:'east',height:3.8,points:[[30,-35],[37,-34],[42,-33],[47,-28],[49,-25],[51,-21],[50,-18],[53,-14],[51,-11],[52,-8],[49,-5],[49,-2],[46,3],[37,4],[31,1],[28,-7],[27,-19],[26,-29]]},
 {id:'east-mouth',height:3.6,points:[[40,18],[42,22],[41,25],[42,29],[39,32],[36,36],[30,37],[27,36],[20,34],[13,34],[12,29],[18,25],[25,23],[31,20],[35,18]]},
 {id:'watch',height:3.4,points:[[-51,30],[-49,24],[-44,22],[-39,24],[-36,30],[-39,36],[-45,38],[-50,35]]},
];

// Seaward rock slopes are authored against the existing dry-land outline.
// Each arc starts under a cliff rim and runs out to a low underwater foot;
// only its above-water portion joins ship collision. The protected inner bay
// and both arch openings deliberately have no apron.
const FJORD_COAST_APRON_SPECS=[
 {id:'rear-crown',land:'crown',from:1,to:17,reach:15},
 {id:'outer-west',land:'west',from:0,to:18,reach:15},
 {id:'west-gate-shoulder',land:'west',from:18,to:23,reach:10},
 {id:'outer-east',land:'east',from:0,to:10,reach:13},
 {id:'east-gate-shoulder',land:'east-mouth',from:2,to:8,reach:7.5},
 {id:'watch-seaward-foot',land:'watch',from:4,to:8,reach:7},
];
export const FJORD_COAST_APRONS=FJORD_COAST_APRON_SPECS.map((spec,seed)=>{
 const land=FJORD_LANDS.find(item=>item.id===spec.land),arc=[];
 for(let k=spec.from;k<spec.to;k++){
  const a=land.points[k%land.points.length],b=land.points[(k+1)%land.points.length],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3.7));
  for(let j=0;j<steps;j++){const t=j/steps;arc.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
 }
 arc.push(land.points[spec.to%land.points.length]);
 const stations=arc.map(([x,z],i)=>{
  const t=i/(arc.length-1),radial=Math.hypot(x,z+6),dx=x/radial,dz=(z+6)/radial;
  const taper=.02+.98*Math.pow(Math.sin(Math.PI*t),.65);
  const reach=spec.reach*taper*(.86+.15*Math.sin(i*1.47+seed*2.3)+.06*Math.sin(i*.38+seed));
  return {x,z,dx,dz,reach};
 });
 return {id:spec.id,land:spec.land,height:land.height,stations,
  collision:[...stations.map(p=>[p.x,p.z]),...stations.slice().reverse().map(p=>[p.x+p.dx*p.reach*.78,p.z+p.dz*p.reach*.78])]};
});

// Flat tops are buildable rock. Each higher shelf grows out of the previous
// cliff, exposing broad, sloped faces toward both the sea and inner harbour.
export const FJORD_TERRACES=[
 {id:'rear-apron',land:'crown',baseHeight:3.5,height:5.5,points:[[-36,-31],[-34,-40],[-24,-46],[-9,-48],[8,-49],[24,-46],[34,-39],[38,-31],[31,-25],[24,-23],[17,-20.7],[7,-21.1],[-5,-20.2],[-14,-21.3],[-23,-20.8],[-31,-25]]},
 {id:'rear-ramp',land:'crown',baseHeight:5.5,height:7.8,points:[[-28,-34],[-27,-43],[-19,-46.5],[-3,-47],[10,-48],[24,-45],[29,-38],[30,-29],[23,-24.5],[16,-22.3],[5,-21.7],[-7,-22.4],[-21,-21.7],[-27,-28]]},
 {id:'citadel',land:'crown',baseHeight:7.8,height:10,points:[[-21,-45.5],[-17,-46.2],[-4,-46.5],[12,-47],[21,-45],[23,-36],[22,-28],[20,-23],[14,-23.3],[6,-22.6],[-6,-22.6],[-15,-23.4],[-20,-22.6],[-23,-32],[-23,-41]]},
 {id:'west-harbour',land:'west',baseHeight:3.7,height:4.8,points:[[-47,-26],[-50,-21],[-51,-14],[-49,-5],[-48,5],[-43,16],[-35,20],[-32,15],[-33,5],[-31,-6],[-33,-17],[-38,-24]]},
 {id:'west-ridge',land:'west',baseHeight:4.8,height:6.6,points:[[-46,-24.5],[-49,-20],[-49,-12],[-46,-2],[-43,9],[-38,12],[-36,5],[-37,-8],[-38,-19],[-41,-24.5]]},
 {id:'west-crest',land:'west',baseHeight:6.6,height:8.2,points:[[-45,-23],[-47,-16],[-45,-7],[-42,1],[-40,2],[-40,-11],[-42,-22]]},
 {id:'east-harbour',land:'east',baseHeight:3.8,height:4.9,points:[[34,-31],[43,-30],[48,-25],[50,-16],[48,-8],[44,-2],[38,-1],[34,-7],[32,-18],[30,-27]]},
 {id:'east-ridge',land:'east',baseHeight:4.9,height:6.7,points:[[37,-29],[43,-28],[47,-23],[47,-15],[44,-8],[40,-6],[37,-11],[35,-18],[35,-25]]},
 {id:'east-crest',land:'east',baseHeight:6.7,height:8.2,points:[[40,-27],[44,-24],[45,-18],[42,-13],[39,-14],[37,-20],[38,-25]]},
 {id:'outer-village',land:'east-mouth',baseHeight:3.6,height:4.8,points:[[36,21],[39,24],[38,30],[34,33],[27,32],[23,29],[27,25],[32,22]]},
];
const rect=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
const circle=(x,z,r,n=16)=>Array.from({length:n},(_,i)=>[x+Math.cos(i/n*Math.PI*2)*r,z+Math.sin(i/n*Math.PI*2)*r]);
const ellipse=(x,z,rx,rz,yaw,n=16)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,u=Math.cos(a)*rx,v=Math.sin(a)*rz;return[x+Math.cos(yaw)*u+Math.sin(yaw)*v,z-Math.sin(yaw)*u+Math.cos(yaw)*v];});
export const FJORD_SOLIDS=[...FJORD_LANDS.map(l=>({...l})),
 ...FJORD_COAST_APRONS.map(apron=>({id:'coast-apron-'+apron.id,height:.35,points:apron.collision})),
 {id:'statue-plinth',height:3,points:circle(0,6,5.1)},
 {id:'main-quay',height:2.1,points:rect(0,-17,46,8)},
 ...[-16,0,16].map(x=>({id:'pier-'+x,height:1.5,points:rect(x,-9.5,2.8,9)})),
 // Hulls placed by createFjordHarborProps, including the town's +4 Z shift.
 // Tight ellipses prevent a boat sailing through a moored skiff without
 // consuming the existing 1.7 m hull clearance through the inner harbour.
 {id:'west-moored-skiff',height:.45,points:ellipse(-20.1,-3.65,.68,2.12,-.13)},
 {id:'east-moored-skiff',height:.45,points:ellipse(20,-3.55,.69,2.15,.17)},
 {id:'inner-moored-skiff',height:.45,points:ellipse(5.5,-3.3,.62,1.92,-.4)},
 ...[-17.5,17.5].map(x=>({id:'gate-foot-'+x,height:24.5,points:circle(x,31,5.55)})),
];
const FJORD_PROJECTILE_SOLIDS=[...FJORD_SOLIDS,...FJORD_TERRACES];
const solidBounds=solid=>solid.points.reduce((b,[x,z])=>{
 b.minX=Math.min(b.minX,x);b.maxX=Math.max(b.maxX,x);b.minZ=Math.min(b.minZ,z);b.maxZ=Math.max(b.maxZ,z);return b;
},{minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity});
const FJORD_SOLID_BOUNDS=FJORD_SOLIDS.map(solidBounds);
const FJORD_BOUNDS=FJORD_SOLID_BOUNDS.reduce((all,b)=>({
 minX:Math.min(all.minX,b.minX),maxX:Math.max(all.maxX,b.maxX),minZ:Math.min(all.minZ,b.minZ),maxZ:Math.max(all.maxZ,b.maxZ),
}),{minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity});
function polygonDistance(x,z,p){let inside=false,d=Infinity;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[j],b=p[i],dx=b[0]-a[0],dz=b[1]-a[1],denom=dx*dx+dz*dz,t=denom?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/denom)):0;d=Math.min(d,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside?-d:d;}

// Local coordinates, for landing buildings and walls on the exact tier tops.
// Includes the working quay and piers but deliberately excludes gate towers.
export function fjordSurfaceHeight(x,z){let h=0;
 for(const land of FJORD_LANDS)if(polygonDistance(x,z,land.points)<=0)h=Math.max(h,land.height);
 for(const shelf of FJORD_TERRACES)if(polygonDistance(x,z,shelf.points)<=0)h=Math.max(h,shelf.height);
 for(const solid of FJORD_SOLIDS)if((solid.id==='main-quay'||solid.id.startsWith('pier-'))&&polygonDistance(x,z,solid.points)<=0)h=Math.max(h,solid.height);
 return h;
}
export function fjordDistance(x,z,limit=18){const p=fjordToLocal(x,z);if(p.x<FJORD_BOUNDS.minX-limit||p.x>FJORD_BOUNDS.maxX+limit||p.z<FJORD_BOUNDS.minZ-limit||p.z>FJORD_BOUNDS.maxZ+limit)return limit;let d=limit;
 for(let i=0;i<FJORD_SOLIDS.length;i++){
  const b=FJORD_SOLID_BOUNDS[i];if(p.x<b.minX-limit||p.x>b.maxX+limit||p.z<b.minZ-limit||p.z>b.maxZ+limit)continue;
  d=Math.min(d,polygonDistance(p.x,p.z,FJORD_SOLIDS[i].points));
 }
 return d;}
export const fjordBlocked=(x,z,r=0)=>fjordDistance(x,z,r+.02)<=r;
export function fjordProjectileBlocked(x,z,y){const p=fjordToLocal(x,z);return FJORD_PROJECTILE_SOLIDS.some(s=>y<s.height&&polygonDistance(p.x,p.z,s.points)<0);}
export function resolveFjordMotion(boat,oldX,oldZ,radius){boat.fjordContact=false;const dx=boat.x-oldX,dz=boat.z-oldZ,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.3));let x=oldX,z=oldZ;
 for(let k=0;k<n;k++){let xx=x+dx/n,zz=z+dz/n;for(let j=0;j<12;j++){const d=fjordDistance(xx,zz,radius+1);if(d>radius+.015)break;boat.fjordContact=true;const e=.08,gx=fjordDistance(xx+e,zz,30)-fjordDistance(xx-e,zz,30),gz=fjordDistance(xx,zz+e,30)-fjordDistance(xx,zz-e,30),len=Math.hypot(gx,gz);if(len<1e-7){xx=x;zz=z;break;}const ux=gx/len,uz=gz/len;xx+=ux*(radius+.025-d);zz+=uz*(radius+.025-d);const into=boat.vx*ux+boat.vz*uz;if(into<0){boat.vx-=into*ux;boat.vz-=into*uz;}}if(!fjordBlocked(xx,zz,radius)){x=xx;z=zz;}}
 boat.x=x;boat.z=z;
}
