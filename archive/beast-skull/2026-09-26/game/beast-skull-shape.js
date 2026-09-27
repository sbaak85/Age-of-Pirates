// Reversible preview sculpt: +X points toward the nose, Z is skull width.
// Baseline meshes and LOD files remain untouched; triangle counts stay identical.
const cache=new WeakMap();
const smooth=t=>t*t*(3-2*t);
export function skullWidthProfile(x){
 let t,weight,slope;
 if(x<=-31||x>=31)return {scale:1,derivative:0};
 if(x<-16){t=(x+31)/15;weight=smooth(t);slope=6*t*(1-t)/15;}
 else if(x<=-10){weight=1;slope=0;}
 else {t=(x+10)/41;weight=1-smooth(t);slope=-6*t*(1-t)/41;}
 return {scale:1+.45*weight,derivative:.45*slope};
}

function components(geometry){
 const count=geometry.attributes.position.count,parent=Int32Array.from({length:count},(_,i)=>i),indices=geometry.index.array;
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(let i=0;i<indices.length;i+=3){parent[find(indices[i])]=find(indices[i+1]);parent[find(indices[i+2])]=find(indices[i+1]);}
 const groups=new Map();
 for(const i of indices){const root=find(i);if(!groups.has(root))groups.set(root,new Set());groups.get(root).add(i);}
 return [...groups.values()];
}

function warp(geometry,vertices){
 const p=geometry.attributes.position,n=geometry.attributes.normal;
 for(const i of vertices){
  const x=p.getX(i),z=p.getZ(i),{scale,derivative}=skullWidthProfile(x);
  p.setZ(i,z*scale);
  // Inverse-transpose Jacobian preserves smooth normals across the tapered warp.
  const nz=n.getZ(i)/scale,nx=n.getX(i)-z*derivative*nz,ny=n.getY(i),length=Math.hypot(nx,ny,nz);
  n.setXYZ(i,nx/length,ny/length,nz/length);
 }
}

export function setSkullWideProfile(model,enabled=true){
 let entries=cache.get(model);
 if(!entries){
  entries=[];
  const add=(mesh,kind)=>{
   const original=mesh.geometry,geometry=original.clone(),p=geometry.attributes.position;
   if(kind==='bone')warp(geometry,Array.from({length:p.count},(_,i)=>i));
   else for(const group of components(geometry)){
    let maxY=-Infinity;for(const i of group)maxY=Math.max(maxY,p.getY(i));
    if(kind==='teeth'){
     if(maxY<16)continue; // Lower teeth and the jaw stay at their approved widths.
     let x=0,z=0,count=0;
     for(const i of group)if(p.getY(i)>maxY-.3){x+=p.getX(i);z+=p.getZ(i);count++;}
     const offset=z/count*(skullWidthProfile(x/count).scale-1);
     for(const i of group)p.setZ(i,p.getZ(i)+offset); // Move each upper tooth as a rigid piece.
    }else if(maxY>26)warp(geometry,group); // Only skull-attached ferns/vines; not island vegetation.
   }
   p.needsUpdate=true;geometry.attributes.normal.needsUpdate=true;
   geometry.computeBoundingBox();geometry.computeBoundingSphere();entries.push({mesh,original,geometry});
  };
  add(model.cranium,'bone');
  for(const mesh of model.fossil.children){
   if(mesh.material===model.toothMaterial)add(mesh,'teeth');
   else if(mesh!==model.cranium&&mesh!==model.mandible&&mesh.material!==model.plainBone)add(mesh,'bone');
  }
  for(const mesh of model.foliage.children)if(mesh.isMesh)add(mesh,'foliage');
  cache.set(model,entries);
 }
 for(const {mesh,original,geometry} of entries)mesh.geometry=enabled?geometry:original;
}
