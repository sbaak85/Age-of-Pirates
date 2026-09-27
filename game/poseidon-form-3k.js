import * as T from 'three';
// Refines the new 500-face study's pose. Independent of the rejected high-resolution sculpt.
const palette={stone:0xc9c6b4,cloth:0x496d70,gold:0x9b8050,hair:0x8e9990,dark:0x344443};
function mesh(root,name,v,f,kind='stone',smooth=true){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v.flat(),3));g.setIndex(f.flat());g.computeVertexNormals();const m=new T.Mesh(g,new T.MeshStandardMaterial({color:palette[kind],roughness:kind==='gold'?.65:.88,metalness:kind==='gold'?.25:0,flatShading:!smooth,side:T.DoubleSide}));m.name=name;m.castShadow=m.receiveShadow=true;root.add(m);return m;}
function ring(x,y,z,rx,rz,n=12){return Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return[x+Math.sin(a)*rx,y,z+Math.cos(a)*rz];});}
function loft(root,name,rows,kind='stone',caps=true,smooth=true){const n=rows[0].length,f=[];for(let j=0;j<rows.length-1;j++)for(let i=0;i<n;i++){let a=j*n+i,b=j*n+(i+1)%n;f.push([a,b,a+n],[b,b+n,a+n]);}if(caps)for(let i=1;i<n-1;i++){f.push([0,i+1,i]);const a=(rows.length-1)*n;f.push([a,a+i,a+i+1]);}return mesh(root,name,rows.flat(),f,kind,smooth);}
function limb(root,name,points,width,depth,kind='stone',n=8){return loft(root,name,points.map((p,i)=>{const d=new T.Vector3(...points[Math.min(i+1,points.length-1)]).sub(new T.Vector3(...points[Math.max(i-1,0)])).normalize(),u=new T.Vector3(0,0,1).cross(d).normalize(),v=d.clone().cross(u);return Array.from({length:n},(_,j)=>new T.Vector3(...p).addScaledVector(u,Math.cos((j+.5)*Math.PI*2/n)*width[i]).addScaledVector(v,Math.sin((j+.5)*Math.PI*2/n)*depth[i]).toArray());}),kind);}
function sheet(root,name,rows,kind='cloth'){const n=rows[0].length,f=[];for(let j=0;j<rows.length-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i;f.push([a,a+1,a+n],[a+1,a+n+1,a+n]);}return mesh(root,name,rows.flat(),f,kind,false);}
function slab(root,name,p,depth,kind='gold'){const n=p.length,f=[];for(const[a,b,c]of T.ShapeUtils.triangulateShape(p.map(v=>new T.Vector2(v[0],v[1])),[]))f.push([a,b,c],[n+c,n+b,n+a]);for(let i=0;i<n;i++){const j=(i+1)%n;f.push([i,n+i,j],[j,n+i,n+j]);}return mesh(root,name,[...p,...p.map(v=>[v[0],v[1],v[2]-depth])],f,kind,false);}
export function createPoseidon3K(){const r=new T.Group();r.name='Poseidon / substantial form 3K';
 loft(r,'青銅低台',[ring(0,0,0,2.6,2.1,12),ring(0,.14,0,2.6,2.1,12),ring(0,.42,0,2.4,1.95,12),ring(0,.47,0,2.4,1.95,12)],'gold',true,false);
 const torso=[
 [.08,4.95,0,1.03,.76],[.15,5.48,-.02,1.12,.8],[.17,6.04,-.03,.98,.74],[.1,6.35,-.02,.96,.73],[.1,6.55,-.02,.95,.7],[.07,6.82,-.03,.97,.75],
 [.04,7.05,-.04,1.02,.77],[.01,7.28,-.03,1.11,.83],[-.01,7.5,-.03,1.2,.88],[-.03,7.7,-.03,1.38,.86],[-.05,7.87,-.04,1.48,1.02],[-.06,8.17,-.06,1.64,1.09],
 [-.06,8.48,-.07,1.69,1.03],[-.05,8.79,-.09,1.57,.89],[-.04,9.02,-.09,1.12,.65],[-.05,9.3,-.04,.51,.46]
 ];
 loft(r,'連續胸背與腰胯',torso.map(p=>ring(...p,20).map(v=>{const a=(v[0]-p[0])/p[3],front=v[2]>p[2];if(front){const chest=Math.exp(-1*((p[1]-8.2)/.55)**2);v[2]+=.36*chest*Math.exp(-1*((Math.abs(a)-.46)/.25)**2)-.14*chest*Math.exp(-1*(a/.14)**2);if(p[1]>6.2&&p[1]<7.8)v[2]+=.13*Math.cos((p[1]-6.5)*13)*Math.exp(-1*((Math.abs(a)-.24)/.25)**2);}else v[2]-=.08*Math.exp(-1*((p[1]-8.2)/.7)**2)*(1-a*a);return v;})),'stone',false);
 limb(r,'厚實頸部',[[-.04,9.13,-.07],[-.08,9.43,-.04],[-.13,9.89,.04]],[.51,.44,.41],[.45,.42,.38],'stone',10);
 limb(r,'外張持戟臂',[[-1.36,8.64,-.02],[-1.65,8.47,.02],[-1.86,8.05,.05],[-2.03,7.54,.14],[-2.05,7.29,.23],[-2.34,7.44,.32],[-2.64,7.76,.44],[-2.85,7.95,.48]],[.45,.65,.57,.41,.36,.43,.32,.25],[.49,.63,.58,.44,.37,.4,.3,.26],'stone',10);
 limb(r,'垂落臂肩峰至腕',[[1.39,8.66,-.08],[1.65,8.39,-.02],[1.77,7.92,0],[1.88,7.43,.03],[1.89,7.1,.12],[1.82,6.66,.27],[1.73,6.02,.43]],[.42,.59,.5,.35,.32,.38,.23],[.44,.59,.53,.39,.34,.36,.24],'stone',10);
 limb(r,'握戟手掌',[[-2.86,7.77,.48],[-2.92,7.99,.5],[-2.91,8.19,.49]],[.29,.33,.25],[.31,.33,.26],'stone',8);
 limb(r,'垂落手掌',[[1.73,6.02,.43],[1.76,5.76,.5],[1.67,5.49,.58]],[.24,.27,.19],[.24,.23,.16],'stone',8);
 for(const [name,p,w,d]of[
 ['右側承重腿',[[.68,.68,.08],[.7,1.37,.05],[.7,2.15,.07],[.67,2.9,.12],[.6,3.2,.17],[.48,4.18,.04],[.43,5.25,-.02]],[.3,.37,.46,.37,.44,.65,.62],[.36,.4,.49,.44,.5,.64,.6]],
 ['左側前踏腿',[[-.8,.68,.54],[-.86,1.39,.6],[-1.01,2.15,.71],[-1,2.85,.79],[-.91,3.24,.77],[-.65,4.2,.35],[-.46,5.3,.02]],[.3,.35,.45,.38,.47,.63,.6],[.36,.4,.48,.43,.51,.64,.6]]])limb(r,name,p,w,d,'stone',10);
 for(const[x,z]of[[.68,.23],[-.81,.75]])loft(r,'足弓與腳背',[ring(x,.48,z+.27,.4,.68,8),ring(x,.66,z+.26,.41,.65,8),ring(x,.87,z-.02,.3,.36,8)]);
 // Faceted anatomy of the face remains stern rather than rounded into a mask.
 loft(r,'下頷顴骨與額頭',[[ -.12,9.72,.24,.36,.36],[-.12,9.94,.23,.47,.39],[-.12,10.2,.17,.57,.47],[-.1,10.44,.11,.58,.48],[-.09,10.68,.05,.55,.45],[-.08,10.94,0,.5,.4],[-.08,11.13,-.02,.38,.32]].map(p=>ring(...p,12)),'stone',true,false);
 for(const sign of[-1,1]){
 const cx=-.12;slab(r,'壓低眉骨',[[cx+sign*.07,10.49,.68],[cx+sign*.45,10.58,.56],[cx+sign*.54,10.46,.5],[cx+sign*.17,10.39,.68]],.075,'stone');
 mesh(r,'深眼窩',[[cx+sign*.1,10.37,.667],[cx+sign*.43,10.44,.576],[cx+sign*.34,10.3,.606]],[[0,1,2]],'dark');
 }
 slab(r,'鼻樑與鼻翼',[[-.2,10.43,.68],[-.07,10.43,.68],[.005,10.09,.77],[-.12,10.045,.87],[-.27,10.09,.77]],.14,'stone');
 loft(r,'長鬚主體',[[ -.15,9.03,.54,.07,.1],[-.1,9.32,.6,.27,.26],[-.11,9.64,.57,.42,.31],[-.12,9.92,.45,.49,.34],[-.12,10.04,.4,.43,.29]].map(p=>ring(...p,10)),'hair');
 for(let i=0;i<5;i++){const x=(i-2)*.17-.12;limb(r,'鬚流雕紋',[[x,9.97,.75],[x+(i-2)*.022,9.68,.89],[x*.75-.045,9.36,.84],[-.13+(i-2)*.055,9.08+Math.abs(i-2)*.08,.59]],[.09,.105,.078,.016],[.06,.085,.07,.015],'hair',4);}
 // Swept temple hair and rear mane, carved into long masses.
 loft(r,'後側鬃髮',[[ -.1,9.45,-.19,.42,.36],[-.1,9.91,-.19,.64,.49],[-.08,10.54,-.13,.68,.51],[-.08,11.06,-.08,.54,.43],[-.08,11.21,-.05,.31,.26]].map(p=>ring(...p,10)),'hair');
 for(const s of[-1,1])limb(r,'鬢髮流線',[[s*.36-.08,11.06,.26],[s*.56-.08,10.8,.36],[s*.62-.08,10.31,.23],[s*.51-.1,9.72,.15]],[.17,.16,.15,.05],[.15,.15,.13,.06],'hair',5);
 loft(r,'王冠立體箍',[ring(-.08,10.99,-.02,.59,.48,10),ring(-.08,11.16,-.02,.57,.47,10)],'gold',false,false);
 for(let i=0;i<5;i++){const a=(i-2)*.65,x=-.08+Math.sin(a)*.58,z=-.02+Math.cos(a)*.49;slab(r,'冠葉',[[x-.1,11.12,z],[x,11.51+(i===2?.25:0),z+.025],[x+.1,11.12,z]],.09);}
 // Diagonal toga wraps over the enlarged ribcage. Rows describe real broad folds.
 const sash=[[-1.09,5.81,.63,.4],[-.92,6.24,.83,.6],[-.63,6.72,.99,.67],[-.33,7.18,1.12,.73],[.01,7.65,1.18,.74],[.35,8.12,1.2,.72],[.72,8.61,1.01,.59],[1.13,8.97,.7,.35],[1.4,9.06,.34,.15]];
 const sashRows=sash.map(([x,y,z,w],j)=>Array.from({length:9},(_,i)=>{const u=i/8;return[x+u*w,y-u*.35,z+.13+.17*Math.exp(-1*((y-8.1)/.7)**2)-.23*u+.1*Math.sin(u*Math.PI*6)*Math.sin(Math.PI*j/(sash.length-1))];}));sheet(r,'胸前斜披袍褶',sashRows);
 sheet(r,'胸前古銅滾邊',sashRows.map(row=>{const p=row[0];return[[p[0]-.045,p[1],p[2]+.028],[p[0]+.04,p[1]-.03,p[2]+.03]];}),'gold');
 const skirt=[];for(let j=0;j<8;j++){const t=j/7,y=5.95-t*5.12;skirt.push(Array.from({length:17},(_,i)=>{const a=.08+i/16*Math.PI*2,fold=.065*Math.cos(a*8+t*.65),rx=1.25-.23*t+fold,rz=1.02-.08*t+fold;let yy=y;if(j>3)yy+=.24*Math.sin(a*2);return[.07+Math.sin(a)*rx,yy,Math.cos(a)*rz+.05];}));}sheet(r,'環腰長裙與垂直深褶',skirt);
 // Exposed forward knee: a raised front-side hem, with robe swept toward the planted leg.
 const skirtMesh=r.getObjectByName('環腰長裙與垂直深褶'),sp=skirtMesh.geometry.attributes.position;
 for(let j=1;j<8;j++)for(let i=0;i<17;i++){const a=.08+i/16*Math.PI*2,expose=Math.exp(-1*((a-5.53)/.45)**2);sp.setY(j*17+i,sp.getY(j*17+i)+expose*(j/7)*3.35);}sp.needsUpdate=true;skirtMesh.geometry.computeVertexNormals();
 const cape=[];for(let j=0;j<8;j++){const t=j/7;cape.push(Array.from({length:9},(_,i)=>{const u=i/8,a=-.7+u*3.5;return[1.0+Math.sin(a)*(.76+.25*t),9.0-t*8.15-.23*Math.sin(u*Math.PI),-.55+Math.cos(a)*(.74+.11*t)+.12*Math.cos(u*Math.PI*8)*(.4+.6*t)];}));}sheet(r,'單肩後披風長褶',cape);
 // Flat medallion fixed directly to the shoulder cloth.
 slab(r,'肩扣',Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return[1.43+Math.sin(a)*.23,8.92+Math.cos(a)*.23,.56];}),.1);
 limb(r,'三叉戟長柄',[[-2.51,.47,.43],[-2.9,8,.48],[-3.24,12.24,.5]],[.1,.1,.12],[.1,.1,.12],'gold',8);
 slab(r,'海神三叉戟',[[-3.4,12.02,.5],[-4.03,12.35,.5],[-4.31,13.17,.5],[-4.44,14.03,.5],[-4.09,13.66,.5],[-4.02,13.01,.5],[-3.67,12.66,.5],[-3.43,12.63,.5],[-3.53,14.39,.5],[-3.33,14.91,.5],[-3.13,14.37,.5],[-3.22,12.63,.5],[-2.96,12.68,.5],[-2.67,13.08,.5],[-2.62,13.78,.5],[-2.33,14.16,.5],[-2.38,13.19,.5],[-2.62,12.42,.5],[-3.07,12.06,.5]],.22);
 // Grip curls around the shaft; the hanging hand has grouped finger planes.
 for(let i=0;i<4;i++){
 const y=7.78+i*.105;
 limb(r,'持戟指節',[[-2.74,y,.72],[-2.93,y,.79],[-3.12,y,.65],[-3.02,y,.47]],[.065,.075,.07,.055],[.07,.07,.07,.05],'stone',4);
 limb(r,'垂手指節',[[1.59+i*.105,5.74,.65],[1.58+i*.1,5.48,.7],[1.57+i*.09,5.36,.63]],[.065,.06,.045],[.065,.06,.045],'stone',4);
 }
 limb(r,'握持拇指',[[-2.67,8.14,.52],[-2.68,7.97,.73],[-2.9,7.97,.79]],[.12,.105,.075],[.1,.09,.07],'stone',6);
 limb(r,'持戟腕箍',[[-2.6,7.72,.42],[-2.7,7.82,.46]],[.32,.29],[.3,.28],'gold',8);
 limb(r,'垂臂腕箍',[[1.75,6.16,.4],[1.73,6.03,.43]],[.27,.25],[.27,.26],'gold',8);
 r.userData={status:'form-refinement-review',approved:false,baseline:'new 500 triangle study',targetTriangles:3000};return r;
}





