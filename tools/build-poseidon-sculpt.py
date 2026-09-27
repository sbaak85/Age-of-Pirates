"""Poseidon authoring sculpt. Dense implicit anatomy; no simplification in this build.
Coordinates: feet y=0, forward +z. Runtime display adds a 2m plinth.
"""
import os,sys,json,time
from pathlib import Path
sys.path.insert(0,str(Path(os.environ['TEMP'])/'pirate-skull-meshing'))
import numpy as np
from skimage.measure import marching_cubes
from scipy.ndimage import gaussian_filter
OUT=Path(__file__).resolve().parents[1]/'game/assets/poseidon-sculpt'
OUT.mkdir(parents=True,exist_ok=True)
meta={'version':1,'status':'high-resolution-review','simplified':False,'parts':{}}

def grid(lo,hi,step):
 global x,y,z,origin,STEP
 STEP=step;origin=np.array(lo,dtype=np.float32)
 x,y,z=np.meshgrid(*[np.arange(a,b+step,step,dtype=np.float32) for a,b in zip(lo,hi)],indexing='ij')
 print('grid',x.shape,flush=True)
def ell(c,r):
 q=[(p-v)/s for p,v,s in zip((x,y,z),c,r)]
 k0=np.sqrt(sum(a*a for a in q));k1=np.sqrt(sum((a/s)**2 for a,s in zip(q,r)))
 return k0*(k0-1)/np.maximum(k1,1e-5)
def sm(a,b,k=.12):
 h=np.maximum(k-np.abs(a-b),0)/k
 return np.minimum(a,b)-h*h*k*.25
def cap(a,b,ra,rb=None,scale=(1,1,1)):
 if rb is None:rb=ra
 dv=(np.array(b,dtype=np.float32)-a)/scale
 q=[(p-c)/s for p,c,s in zip((x,y,z),a,scale)]
 t=np.clip(sum(qi*di for qi,di in zip(q,dv))/sum(dv*dv),0,1)
 return (np.sqrt(sum((qi-t*di)**2 for qi,di in zip(q,dv)))-(ra+(rb-ra)*t))*min(scale)
def unite(f,parts,k=.15):
 for v in parts:f=sm(f,v,k)
 return f
def save(name,f):
 # Light sub-voxel smoothing removes sampling ripples, not anatomy.
 f=gaussian_filter(f,.5)
 v,faces,n,_=marching_cubes(f,0,spacing=(STEP,)*3,allow_degenerate=False,gradient_direction='ascent');v+=origin
 n=-n
 if np.mean(np.sum(np.cross(v[faces[:,1]]-v[faces[:,0]],v[faces[:,2]]-v[faces[:,0]])*n[faces[:,0]],axis=1))<0:faces=faces[:,[0,2,1]]
 v.astype('<f4').tofile(OUT/(name+'-positions.bin'));faces.astype('<u4').tofile(OUT/(name+'-indices.bin'))
 meta['parts'][name]={'vertices':len(v),'triangles':len(faces),'bounds':[v.min(0).tolist(),v.max(0).tolist()]}
 print(name,len(faces),'triangles',flush=True)

if '--head-only' not in sys.argv:
 # Weight carried on right leg, relaxed left knee; broad ribcage tapering to iliac crest.
 grid((-4.1,-.18,-1.35),(2.8,10.65,1.65),.043)
 f=ell((.1,6.0,0),(1.03,.92,.66))
 f=unite(f,[ell((0,7.35,-.02),(.91,1.45,.62)),ell((-.08,8.45,-.03),(1.4,1.12,.77)),ell((-.05,9.14,-.12),(1.38,.5,.62)),cap((-.04,9.2,-.03),(-.04,10.25,-.02),.48,.42)],.25)
 # Continuous pectorals, abdominal wall, obliques and scapulae fused into torso.
 for s in [-1,1]:
  f=unite(f,[ell((s*.67,8.8,.49),(.74,.43,.4)),ell((s*.33,7.95,.53),(.37,.3,.2)),ell((s*.3,7.48,.53),(.33,.28,.18)),ell((s*.27,7.03,.48),(.3,.27,.17)),cap((s*.98,8.2,.2),(s*.77,6.6,.32),.25,.21),ell((s*.64,8.8,-.55),(.55,.64,.27)),cap((s*.18,9.35,.37),(s*1.13,9.3,.34),.1,.12)],.17)
  # Serratus hints, shallow rather than segmented spheres.
  for j in range(3):f=sm(f,cap((s*(1.08-.055*j),8.23-j*.25,.42),(s*(.9-.05*j),8.06-j*.25,.55),.075,.06),.12)
 # Central sternum/linea alba groove, and navel recess.
 f=np.maximum(f,-cap((0,8.77,.875),(0,7.02,.7),.037,.029))
 f=np.maximum(f,-ell((.015,6.8,.68),(.075,.08,.075)))
 # Feet and long legs: muscular upper thigh, patella, calf, ankles.
 for hip,knee,ankle,foot in [((.53,5.9,0),(.7,3.22,.02),(.77,.57,.02),(.8,.23,.46)),((-.55,5.9,0),(-1.03,3.28,.43),(-1.24,.58,.23),(-1.38,.23,.66))]:
  f=unite(f,[cap(hip,knee,.57,.36),cap(knee,ankle,.33,.22),ell(((knee[0]+ankle[0])*.5,1.95,(knee[2]+ankle[2])*.5-.1),(.37,.93,.38)),ell((knee[0],knee[1],knee[2]+.19),(.29,.35,.27)),ell(foot,(.35,.25,.76)),ell((hip[0],4.58,.16),(.53,1.15,.51))],.19)
  for i in range(5):
   tx=foot[0]+(i-2)*.125
   f=sm(f,ell((tx,.19,foot[2]+.56+.06*np.cos(i)),(.09,.145,.22-.02*i)),.045)
 # Shoulder, elbow and wrist chains are fused before surface extraction.
 left=[(-1.38,9.18,0),(-2.3,7.92,.12),(-3.18,8.85,.48)]
 right=[(1.3,9.11,0),(1.85,7.65,-.02),(1.45,6.35,.56)]
 for shoulder,elbow,wrist in [left,right]:
  mid=(np.array(shoulder)+elbow)/2
  fore=np.array(elbow)*.6+np.array(wrist)*.4
  f=unite(f,[ell(shoulder,(.52,.6,.54)),cap(shoulder,elbow,.43,.31),ell((mid[0],mid[1],mid[2]+.13),(.36,.68,.42)),ell(elbow,(.31,.33,.32)),cap(elbow,wrist,.34,.19),ell(fore,(.3,.51,.32))],.21)
  # Flattened palm oriented down/diagonal, connected to wrist.
  hand=(-3.25,9.04,.53) if wrist[0]<0 else (1.37,6.12,.66)
  f=sm(f,ell(hand,(.29,.38,.19)),.12)
  if wrist[0]<0:
   # Fingers curl around shaft at x=-3.38,z=.62, stacked across palm.
   for j in range(4):
    yy=8.87+j*.14
    for a,b in [((-3.08,yy,.63),(-3.29,yy,.83)),((-3.29,yy,.83),(-3.55,yy,.73)),((-3.55,yy,.73),(-3.54,yy,.5))]:f=sm(f,cap(a,b,.066),.045)
   f=sm(f,cap((-3.04,9.23,.51),(-3.28,8.96,.76),.095,.075),.065)
  else:
   for j in range(4):f=sm(f,cap((1.19+j*.12,6.02,.7),(1.1+j*.12,5.67+.07*abs(j-1),.78),.07,.058),.06)
   f=sm(f,cap((1.12,6.22,.69),(1.02,5.96,.83),.09,.06),.06)
 save('body',f);del f
 
 
else:
 meta=json.loads((OUT/'geometry.json').read_text(encoding='utf-8'))

# Head: dense separate sculpture, joins body below beard at the neck.
grid((-1.14,9.25,-1.1),(1.02,12.78,1.3),.015)
f=ell((-.06,11.44,-.06),(.64,.88,.61))
f=unite(f,[ell((-.04,10.95,.08),(.51,.48,.48)),ell((-.04,10.66,.27),(.38,.25,.32)),ell((-.04,11.68,.33),(.53,.44,.34))],.12)
for s in [-1,1]:
 f=unite(f,[ell((-.04+s*.39,11.14,.38),(.19,.22,.105)),cap((-.04+s*.06,11.6,.55),(-.04+s*.48,11.57,.44),.1,.085),ell((-.04+s*.65,11.29,-.02),(.15,.29,.17))],.075)
 # Recessed orbital sockets and ear bowls.
 f=np.maximum(f,-ell((-.04+s*.26,11.4,.57),(.215,.125,.12)))
 f=np.maximum(f,-ell((-.04+s*.716,11.32,.07),(.08,.175,.1)))
 # Eyeballs same marble, lid rims partially cover globe.
 f=sm(f,ell((-.04+s*.26,11.4,.485),(.145,.084,.082)),.025)
 f=sm(f,cap((-.04+s*.09,11.44,.55),(-.04+s*.41,11.46,.52),.043,.032),.025)
f=unite(f,[cap((-.04,11.58,.57),(-.04,11.08,.79),.095,.12),ell((-.04,11.08,.75),(.12,.12,.12)),ell((-.04,10.92,.53),(.29,.13,.18)),ell((-.04,10.78,.54),(.26,.085,.14))],.07)
for s in [-1,1]:
 f=sm(f,ell((-.04+s*.14,11.06,.68),(.105,.095,.14)),.035)
 f=np.maximum(f,-ell((-.04+s*.13,11.015,.76),(.05,.042,.07)))
f=np.maximum(f,-cap((-.25,10.84,.675),(.16,10.84,.675),.027))
# Forehead horizontal furrows and glabellar groove.
# Age planes remain in the brow; no deep isolated forehead incisions.

# Upper and lower lid arcs, following the inset marble eyes.
for s in [-1,1]:
 cx=-.04+s*.26
 for upper in [True,False]:
  pts=[]
  for j in range(9):
   u=j/8;xx=cx+(u-.5)*.3;yy=11.4+(.075 if upper else -.064)*np.sin(np.pi*u)
   pts.append((xx,yy,.535+.034*np.sin(np.pi*u)))
  for a,b in zip(pts[:-1],pts[1:]):f=sm(f,cap(a,b,.025),.028)
save('head',f);del f
# Hair sculpted as continuous material, with directional channels cut into the surface.
a=np.arctan2(x+.06,z+.1)
theta=np.arctan2(np.sqrt((x+.06)**2+(z+.1)**2),y-11.44)
f=ell((-.06,11.47,-.12),(.72,1.0,.7))
f+=.017*np.cos(a*24+theta*4)+.006*np.sin(theta*35+a*3)
front=np.clip((z+.25)/.72,0,1)
f=np.maximum(f,(10.5+.1*np.sin(a*7)+1.3*front+.07*np.cos(x*13)*front)-y)
f=sm(f,ell((-.06,11.13,-.52),(.63,.92,.32)),.1)
# Directional crests are carved into the scalp volume, not raised as a separate slab.
f += .012*np.sin(a*31+theta*7)*np.sin(theta*12)
# Wavy side locks hang behind the ears and join the rear hair mass.
for side in [-1,1]:
 for i in range(5):
  zz=.19-i*.16
  pts=[(side*.59-.04,11.84,zz),(side*(.64+.015*i)-.04,11.42,zz+.04),(side*.65-.04,10.94,zz+.06),(side*.5-.04,10.49+.05*i,zz-.01)]
  for a0,b0 in zip(pts[:-1],pts[1:]):f=sm(f,cap(a0,b0,.105,.085),.07)
save('hair',f);del f
# Continuous long beard, jaw sideburns and moustache. Grooves vary with height.
t=np.clip((y-9.55)/1.52,0,1)
width=.16+.38*np.sqrt(t)
qx=(x+.04)/width;qy=(y-10.3)/.8;qz=(z-.43)/.33
f=(np.sqrt(qx*qx+qy*qy+qz*qz)-1)*.32
ang=np.arctan2(x+.04,z-.37)
f+=.019*np.cos(ang*19+1.1*np.sin(y*7))+.009*np.cos(y*21+ang*4)
f=np.maximum(f,y-11.04)
for s in [-1,1]:
 f=sm(f,cap((s*.52-.04,11.16,.36),(s*.41-.04,10.35,.4),.14,.17),.13)
 pts=[(-.04,10.99,.73),(-.04+s*.16,10.94,.77),(-.04+s*.3,10.82,.69),(-.04+s*.35,10.67,.61)]
 for a0,b0 in zip(pts[:-1],pts[1:]):f=sm(f,cap(a0,b0,.075,.065),.065)
save('beard',f);del f
(OUT/'geometry.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
print('Saved high-resolution sculpt; NO decimation.',flush=True)



