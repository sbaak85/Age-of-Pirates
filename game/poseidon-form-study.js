import * as T from 'three';
// New silhouette study, hand-authored at low resolution. No prior statue geometry is used.
const palette={stone:0xc9c6b4,cloth:0x547779,gold:0x9b8050,hair:0x959e94,dark:0x344443};
function part(root,name,vertices,indices,kind='stone'){
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices.flat(),3));geometry.setIndex(indices.flat());geometry.computeVertexNormals();
 const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color:palette[kind],roughness:.87,flatShading:true,side:T.DoubleSide}));mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;
}
// Clockwise ring when viewed from above: +z is the sculpture's face.
function ring(cx,y,cz,rx,rz,n=6,phase=0){return Array.from({length:n},(_,i)=>{const a=phase+i/n*Math.PI*2;return[cx+Math.sin(a)*rx,y,cz+Math.cos(a)*rz];});}
function loft(root,name,rings,kind='stone',caps=true){if(name==='胸廓與腰胯'||name==='王冠箍')caps=false;const n=rings[0].length,v=rings.flat(),f=[];for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;f.push([a,b,a+n],[b,b+n,a+n]);}if(caps){for(let i=1;i<n-1;i++){f.push([0,i+1,i]);const a=(rings.length-1)*n;f.push([a,a+i,a+i+1]);}}return part(root,name,v,f,kind);}
function limb(root,name,points,widths,depths,kind='stone',n=4){const rings=points.map((p,i)=>{const dir=new T.Vector3(...points[Math.min(i+1,points.length-1)]).sub(new T.Vector3(...points[Math.max(0,i-1)])).normalize();let across=new T.Vector3(0,0,1).cross(dir).normalize();const forward=dir.clone().cross(across).normalize();return Array.from({length:n},(_,k)=>{const a=2*Math.PI*(k+.5)/n;return new T.Vector3(...p).addScaledVector(across,Math.cos(a)*widths[i]).addScaledVector(forward,Math.sin(a)*depths[i]).toArray();});});return loft(root,name,rings,kind);}
function slab(root,name,outline,depth,kind){const v=[...outline,...outline.map(p=>[p[0],p[1],p[2]-depth])],n=outline.length,f=[];const tris=T.ShapeUtils.triangulateShape(outline.map(p=>new T.Vector2(p[0],p[1])),[]);for(const [a,b,c] of tris)f.push([a,b,c],[n+c,n+b,n+a]);for(let i=0;i<n;i++){const j=(i+1)%n;f.push([i,n+i,j],[j,n+i,n+j]);}return part(root,name,v,f,kind);}
export function createPoseidonForm(){const root=new T.Group();root.name='Poseidon / new 500 triangle silhouette';
 // Low plinth, wide stance. The figure has a weight-bearing right leg and a relaxed left leg.
 loft(root,'八角低台',[ring(0,0,0,2.6,2.1,8),ring(0,.45,0,2.6,2.1,8)],'gold');
 limb(root,'右側承重腿',[[.68,.66,.08],[.67,2.7,.08],[.42,5.25,-.04]],[.3,.39,.55],[.34,.43,.5]);
 limb(root,'左侧前踏腿',[[-.8,.64,.54],[-1,2.9,.78],[-.45,5.32,0]],[.28,.4,.54],[.33,.45,.51]);
 for(const [x,z] of [[.68,.23],[-.81,.75]])loft(root,'足部',[ring(x,.46,z+.24,.36,.62,4,Math.PI/4),ring(x,.8,z,.3,.45,4,Math.PI/4)]);
 // Six-sided torso rings concentrate faces on broad pectoral planes and tapering flank.
 loft(root,'胸廓與腰胯',[
 ring(.08,4.95,0,.93,.56),ring(.18,6.05,-.04,.85,.53),ring(.08,6.92,0,.81,.48),
 ring(-.05,8.22,.02,1.5,.78),ring(-.04,8.9,-.06,1.46,.67),ring(-.04,9.28,-.03,.54,.4)
 ]);
 limb(root,'頸部',[[-.04,9.12,-.08],[-.12,9.87,.02]],[.42,.39],[.38,.36]);
 limb(root,'張開持戟臂',[[-1.34,8.64,-.01],[-2.04,7.25,.14],[-2.83,7.88,.48]],[.61,.41,.25],[.53,.36,.26]);
 limb(root,'垂落右臂',[[1.36,8.64,-.06],[1.87,7.11,.02],[1.72,5.87,.44]],[.53,.34,.21],[.49,.34,.23]);
 limb(root,'握戟手',[[-2.83,7.77,.48],[-2.88,8.15,.48]],[.34,.3],[.3,.29]);
 limb(root,'垂落手',[[1.72,5.95,.44],[1.64,5.49,.48]],[.25,.22],[.2,.15]);
 // Head is tipped down: jaw farther forward than forehead, with a single assertive brow plane.
 loft(root,'俯視頭部',[ring(-.12,9.72,.23,.37,.35),ring(-.12,10.3,.18,.53,.45),ring(-.1,10.88,.03,.55,.45),ring(-.08,11.15,-.02,.44,.34)],'stone');
 part(root,'眉骨與鼻樑',[[-.59,10.48,.57],[-.12,10.42,.68],[.34,10.48,.57],[-.12,10.04,.82],[-.25,10.04,.63],[.01,10.04,.63]],[[0,1,4],[1,3,4],[1,2,5],[1,5,3],[4,3,5]]);
 part(root,'眼窩陰影',[[-.52,10.4,.574],[-.22,10.35,.663],[-.42,10.28,.6],[-.02,10.35,.663],[.28,10.4,.574],[.18,10.28,.6]],[[0,1,2],[3,4,5]],'dark');
 // Beard is an arrow-shaped jaw mass, not individual cylinders.
 loft(root,'楔形長鬚',[ring(-.12,9.06,.44,.08,.1,4),ring(-.12,9.53,.51,.38,.24,4),ring(-.12,10.03,.36,.5,.31,4)],'hair');
 // Back hair widens the temples into a mane without obscuring the eyes.
 slab(root,'後側鬃髮',[[-.67,10.85,-.03],[-.48,11.23,-.09],[.35,11.22,-.09],[.64,10.55,-.02],[.39,9.55,.05],[-.15,9.38,.1],[-.64,9.78,.07]],.4,'hair');
 // Royal crown: five sharp points rise from a single angular band.
 loft(root,'王冠箍',[ring(-.08,10.94,-.02,.56,.44,6),ring(-.08,11.13,-.02,.57,.45,6)],'gold');
 for(let i=0;i<5;i++){const a=(i-2)*.65,x=-.08+Math.sin(a)*.56,z=-.02+Math.cos(a)*.45;part(root,'冠尖',[[x-.12,11.1,z],[x+.12,11.1,z],[x,11.48+(i===2?.28:0),z+.015]],[[0,1,2]],'gold');}
 // Cloak: one heavy mass hangs off the raised right shoulder, expands slightly at the hem.
 loft(root,'單肩後披風',[
 [[.87,8.95,.29],[1.48,9.05,.16],[1.77,8.63,-.17],[1.34,8.55,-.68],[.8,8.8,-.55]],
 [[1.13,5.75,.05],[1.86,5.71,.18],[2.04,5.75,-.4],[1.48,5.8,-.87],[.53,5.85,-.59]],
 [[1.03,1.03,.08],[2.07,.78,.17],[2.33,.81,-.51],[1.44,.68,-1.03],[.26,.9,-.58]]
 ],'cloth');
 // Front drapery forms a diagonal sash and two large crossing folds. Exposes the forward knee.
 const clothV=[[-1,5.9,.58],[-.53,6.7,.76],[.66,8.45,.77],[1.33,9.03,.41],[1.64,8.73,.5],[.97,6.53,.84],[.35,5.47,.91],[-.55,4.93,.88],[-1.08,5.17,.65],
 [-.75,1,.3],[-.03,.72,.78],[.71,.73,.64],[1.15,2.05,.58],[.57,3.89,.98],[-.48,3.19,.84],[-1.14,4.33,.77]];
 part(root,'斜跨胸前與垂墜衣褶',clothV,[[0,1,7],[1,2,6],[1,6,7],[2,3,4],[2,4,5],[2,5,6],[0,7,8],[7,6,13],[7,13,14],[7,14,15],[15,14,9],[14,10,9],[14,13,10],[13,11,10],[13,12,11],[6,5,12],[6,12,13]],'cloth');
 // Back of the hip wrap closes the garment around the legs; no exposed rear pelvis.
 const rear=[[1.05,5.9,.1],[.76,5.87,-.7],[-.36,5.9,-.72],[-.97,5.9,-.1],[-.96,5.9,.57],
 [.99,3.7,.05],[.81,3.67,-.8],[-.34,3.73,-.8],[-.85,3.8,-.15],[-1.08,4.3,.71],
 [.91,.81,.1],[.72,.73,-.86],[-.28,.85,-.8],[-.69,1.05,-.1],[-.72,1.05,.3]];
 const rearF=[];for(let j=0;j<2;j++)for(let i=0;i<4;i++){const a=j*5+i;rearF.push([a,a+5,a+1],[a+1,a+5,a+6]);}part(root,'環腰後裙',rear,rearF,'cloth');
 // Bronze edging follows the long diagonal without adding ornamental noise.
 part(root,'披袍斜邊',[[-1,5.9,.635],[-.9,5.9,.675],[-.53,6.7,.815],[-.43,6.7,.855],[.66,8.45,.825],[.76,8.45,.825],[1.33,9.03,.465],[1.41,8.97,.5]],[[0,1,2],[1,3,2],[2,3,4],[3,5,4],[4,5,6],[5,7,6]],'gold');
 part(root,'肩部圓扣',[[1.35,9.05,.57],[1.56,8.91,.57],[1.48,8.67,.61],[1.22,8.67,.64],[1.14,8.91,.63]],[[0,1,2],[0,2,3],[0,3,4]],'gold'); // Staff leans outward, echoing the open left arm. Wide fork has distinct hooked side prongs.
 limb(root,'三叉戟長柄',[[-2.51,.47,.43],[-2.9,8,.48],[-3.24,12.24,.5]],[.085,.085,.105],[.085,.085,.105],'gold');
 slab(root,'海神三叉戟',[[-3.4,12.02,.5],[-4.03,12.35,.5],[-4.31,13.17,.5],[-4.44,14.03,.5],[-4.09,13.66,.5],[-4.02,13.01,.5],[-3.67,12.66,.5],[-3.43,12.63,.5],[-3.53,14.39,.5],[-3.33,14.91,.5],[-3.13,14.37,.5],[-3.22,12.63,.5],[-2.96,12.68,.5],[-2.67,13.08,.5],[-2.62,13.78,.5],[-2.33,14.16,.5],[-2.38,13.19,.5],[-2.62,12.42,.5],[-3.07,12.06,.5]],.16,'gold');
 // Constrain the complete statue, including weapon, crown and plinth.
 root.userData.status='silhouette-review';return root;
}
export function formStats(root){const parts=[];root.traverse(o=>{if(o.isMesh)parts.push({name:o.name,triangles:o.geometry.index.count/3});});return {triangles:parts.reduce((n,p)=>n+p.triangles,0),parts};}




