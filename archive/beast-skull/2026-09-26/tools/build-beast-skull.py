"""Rebuild continuous fossil meshes. Python + numpy + scikit-image; runtime needs only generated binaries."""
import os,sys,json
from pathlib import Path
sys.path.insert(0,str(Path(os.environ['TEMP'])/'pirate-skull-meshing'))
import numpy as np
from skimage.measure import marching_cubes
from scipy.ndimage import gaussian_filter
OUT=Path(__file__).resolve().parents[1]/'game/assets/beast-skull'
OUT.mkdir(parents=True,exist_ok=True)
STEP=.24
origin=np.array([-31.,-2.,-14.],dtype=np.float32)
axes=[np.arange(a,b,STEP,dtype=np.float32) for a,b in zip(origin,[34.,39.,14.])]
x,y,z=np.meshgrid(*axes,indexing='ij')

def ell(c,r):
 qx=(x-c[0])/r[0];qy=(y-c[1])/r[1];qz=(z-c[2])/r[2]
 return (np.sqrt(qx*qx+qy*qy+qz*qz)-1)*min(r)
def smooth(a,b,k=1.):
 h=np.clip(.5+.5*(b-a)/k,0,1)
 return b*(1-h)+a*h-k*h*(1-h)
def union(parts,k=1.):
 f=parts[0]
 for p in parts[1:]:f=smooth(f,p,k)
 return f

def capsule(a,b,ra,rb,scale=(1,1,1)):
 av=np.array(a)/scale;bv=np.array(b)/scale;dv=bv-av
 q=[(p-c)/s for p,c,s in zip((x,y,z),a,scale)]
 h=np.clip(sum(qi*di for qi,di in zip(q,dv))/sum(dv*dv),0,1)
 return (np.sqrt(sum((qi-h*di)**2 for qi,di in zip(q,dv)))-(ra+(rb-ra)*h))*min(scale)

def weather(f):
 # Fine mesh relief; larger erosion follows the bone surface rather than polygon facets.
 rng=np.random.default_rng(137)
 n=gaussian_filter(rng.standard_normal(f.shape,dtype=np.float32),3.)
 n*=.055/n.std()
 micro=gaussian_filter(rng.standard_normal(f.shape,dtype=np.float32),.9)
 n+=micro*(.012/micro.std())
 return f+n

def write_mesh(name,f):
 verts,faces,normals,_=marching_cubes(f,level=0,spacing=(STEP,STEP,STEP),allow_degenerate=False,gradient_direction='ascent')
 verts+=origin
 normals=-normals  # Our SDF is negative inside; skimage reports the opposite convention.
 # Normals are evaluated again in Three.js after consistent winding.
 a=verts[faces[:,1]]-verts[faces[:,0]];b=verts[faces[:,2]]-verts[faces[:,0]]
 if np.mean(np.sum(np.cross(a,b)*normals[faces[:,0]],axis=1))<0: faces=faces[:,[0,2,1]]
 vx,vy,vz=verts.T
 # Bone strata, stains and mineral mottling. Detail shader adds smaller pores.
 grain=(np.sin(vx*.19+np.sin(vz*.39))*np.sin(vy*.21+np.sin(vx*.11)))*.5+.5
 light=np.clip(.78+grain*.1+np.maximum(normals[:,1],0)*.04,0,1)
 cols=np.stack((.59*light,.57*light,.49*light),axis=1).astype('<f4')
 verts.astype('<f4').tofile(OUT/(name+'-positions.bin'))
 faces.astype('<u4').tofile(OUT/(name+'-indices.bin'))
 cols.tofile(OUT/(name+'-colors.bin'))
 print(name,len(verts),'vertices',len(faces),'triangles',flush=True)
 return {'vertices':len(verts),'triangles':len(faces),'bounds':[verts.min(0).tolist(),verts.max(0).tolist()]}

print('Sculpting upper cranium',x.shape,flush=True)
outer=union([ell((-15,26,0),(13,10,10)),ell((4,24,0),(22,7.8,8.3)),ell((24,22.1,0),(8,5.8,6.4))],2.8)
inner=union([ell((-14,25.4,0),(10.3,7.8,7.6)),ell((5,23.7,0),(21.5,5.9,6.4)),ell((25,21.8,0),(5.6,3.8,4.7))],1.4)
f=np.maximum(outer,-inner)
f=np.maximum(f,17.2-y)
# Smooth paired maxillary and cheek rails fuse into the shell.
for s in [-1,1]:
 for a,b,ra,rb in [((-23,19,7),(-12,17.8,8.1),1.9,1.55),((-12,17.8,8.1),(8,17.7,7),1.55,1.3),((8,17.7,7),(25,18.1,4.8),1.3,1.6),((25,18.1,4.8),(30,20,1.7),1.6,1.3)]:
  f=smooth(f,capsule((a[0],a[1],a[2]*s),(b[0],b[1],b[2]*s),ra,rb,(1,1.25,1)),.9)
 # Raised orbital buttress and thick lacrimal bone.
 f=smooth(f,ell((-11.5,32,s*6.7),(5.5,2.3,3.1)),1.5)
# The fenestrae go right through the side walls and communicate with the hollow interior.
for c,r in [((-21.8,25,0),(3.2,4.8,25)),((25.6,25,0),(3.4,2.15,24))]:
 f=np.maximum(f,-ell(c,r))
# Tear-shaped orbital and triangular antorbital fenestrae have different bone boundaries.
antorbital=smooth(ell((4.4,25.2,0),(5.6,3.1,25)),ell((8.3,22.6,0),(7.2,2.6,25)),1.3)
orbital=smooth(ell((-11.5,27.3,0),(4.6,4.65,25)),ell((-9.3,22.9,0),(2.3,3.4,25)),1.1)
f=np.maximum(f,-antorbital);f=np.maximum(f,-orbital)
for s in [-1,1]: f=np.maximum(f,-ell((-18.3,35.2,s*4.6),(3.1,7,2.1)))
f=np.maximum(f,-ell((-27,25.4,0),(8,3.6,3.5)))
# Small maxillary foramina and uneven damage, modelled as recesses rather than drawn dots.
for s in [-1,1]:
 for i in range(17):
  px=-12+i*2.3;pz=s*(8.1-(px+12)/43*3.8)
  f=np.maximum(f,-ell((px,19.5+.3*np.sin(i*2),pz+ s*.9),(.25+.08*(i%3),.28,.6)))
# Shallow suture channels on the rostrum and crown.
for a,b,r in [((-3,31,-6),(-1,30,6),.16),((15,29,-5),(16,28,5),.14),((-23,30,-8),(-20,33,-2),.19)]:
 f=np.maximum(f,-capsule(a,b,r,r))
meta={'cranium':write_mesh('cranium',weather(f))}
del f,outer,inner
print('Sculpting mandible',flush=True)
f=np.full(x.shape,100,dtype=np.float32)
# The jaws flare at the hinge, then converge into the dentary symphysis.
for s in [-1,1]:
 pts=[(-24,17.3,s*7.6),(-20,12.2,s*8.3),(-14,8.2,s*8),(-5,4.7,s*7.1),(10,3.0,s*5.4),(24,3.1,s*3.7),(30,4,s*.6)]
 radii=[2.1,3,2.9,2.3,1.6,1.65,1.4]
 for i in range(len(pts)-1): f=smooth(f,capsule(pts[i],pts[i+1],radii[i],radii[i+1],(1,1.3, .67)),1.1)
 # Surangular fenestra.
 f=np.maximum(f,-ell((-17,11,s*8),(4,2.15,4)))
meta['mandible']=write_mesh('mandible',weather(f))
(OUT/'geometry.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
print('Done',flush=True)
