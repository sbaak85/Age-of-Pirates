import * as THREE from 'three';
import { WAVES, WAVE_GLSL, sampleBoatPose } from './waves.js';

export function createOcean(reefs,options={}) {
  const uniforms={time:{value:0},strength:{value:1},openSea:{value:options.openSea?1:0},waves:{value:WAVES.map(w=>new THREE.Vector4(...w.direction,w.k,w.amplitude))},speeds:{value:WAVES.map(w=>w.speed)}};
  // One nonuniform grid: dense around the island, sparse toward the horizon.
  const segments=160,geometry=new THREE.PlaneGeometry(200,200,segments,segments);geometry.rotateX(-Math.PI/2);
  const positions=geometry.attributes.position;
  const coordinate=i=>{const n=i-segments/2,a=Math.abs(n);return Math.sign(n)*(a<=64?a*.375:24+Math.pow((a-64)/16,1.7)*76);};
  for(let j=0;j<=segments;j++)for(let i=0;i<=segments;i++)positions.setXYZ(j*(segments+1)+i,coordinate(i),0,coordinate(j));
  // Row direction is unchanged, so the existing triangle winding faces +Y.
  geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.boundingSphere.radius+=1;
  const material=new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,
    vertexShader:`${WAVE_GLSL}
      varying vec3 worldPosition;varying vec3 waveNormal;varying float crest;
      void main(){
        vec3 field=waveField(position.xz);
        vec3 p=vec3(position.x,field.x,position.z);
        worldPosition=p;waveNormal=normalize(vec3(-field.y,1.,-field.z));
        crest=field.x/max(.04,envelope(position.xz));
        gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
      }`,
    fragmentShader:`uniform float time;uniform float strength;uniform float openSea;
      varying vec3 worldPosition;varying vec3 waveNormal;varying float crest;
      void main(){
        vec2 p=worldPosition.xz;
        float deep=smoothstep(9.,28.,length(p));
        vec2 fine=vec2(cos(p.x*5.3+p.y*2.7-time*.8),sin(p.y*5.1-p.x*1.7+time*.65))*.025*strength*(1.-smoothstep(15.,40.,length(p)));
        vec3 n=normalize(waveNormal+vec3(fine.x,0.,fine.y));
        vec3 viewDirection=normalize(cameraPosition-worldPosition);
        vec3 light=normalize(vec3(-.45,1.,.55));
        float diffuse=max(dot(n,light),0.);
        float fresnel=pow(1.-max(dot(n,viewDirection),0.),4.);
        float specular=pow(max(dot(n,normalize(viewDirection+light)),0.),85.);
        vec3 color=mix(vec3(.008,.24,.24),vec3(.004,.062,.095),deep);
        color*=.52+diffuse*.75;
        color=mix(color,vec3(.12,.32,.36),fresnel*.48);
        color+=vec3(.58,.80,.74)*specular*.30;
        // Sparse broken whitecaps accent only the highest wave crests.
        float breakup=.5+.5*sin(p.x*2.1+sin(p.y*1.3-time*.4))*sin(p.y*1.7+p.x*.7);
        float whitecap=smoothstep(.30,.43,crest)*smoothstep(.48,.82,breakup)*smoothstep(10.,15.,length(p))*(1.-smoothstep(22.,38.,length(p)))*strength;
        color=mix(color,vec3(.66,.88,.79),whitecap*.48);
        float alpha=mix(.46,.95,deep)+fresnel*.05;
        float edgeFog=openSea*smoothstep(70.,96.,length(p));
        gl_FragColor=vec4(color,mix(min(alpha+whitecap*.15,.98),1.,edgeFog));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.435294,.662745,.682353),edgeFog);
      }`
  });
  const surface=new THREE.Mesh(geometry,material);surface.name='GPU displaced ocean';surface.renderOrder=2;
  // Shore and reef foam share one batched ribbon mesh and the same height function.
  const vertices=[],uvs=[],indices=[];
  function ribbon(cx,cz,rx,rz,width,shore=false){
    const base=vertices.length/3,n=shore?192:64,m=4;
    for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){
      const a=i/n*Math.PI*2,t=j/m;
      const irregular=shore?1+.055*Math.sin(3*a+.5)+.044*Math.cos(5*a-.4)+.025*Math.sin(9*a):1+.07*Math.sin(5*a);
      vertices.push(cx+Math.cos(a)*(rx*irregular+t*width),0,cz+Math.sin(a)*(rz*irregular+t*width));uvs.push(i/n,t);
      if(i<n&&j<m){const k=base+j*(n+1)+i;indices.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}
    }
  }
  ribbon(0,0,8.90,6.66,.95,true);
  for(const [x,z,size]of reefs)ribbon(x,z,size*.85,size*.70,.65);
  const foamGeo=new THREE.BufferGeometry();foamGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));foamGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));foamGeo.setIndex(indices);foamGeo.computeBoundingSphere();foamGeo.boundingSphere.radius+=1;
  const foam=new THREE.Mesh(foamGeo,new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`${WAVE_GLSL}
      varying vec2 ribbonUv;varying vec2 p;
      void main(){ribbonUv=uv;p=position.xz;vec3 pos=vec3(position.x,waveField(p).x+.022,position.z);gl_Position=projectionMatrix*viewMatrix*vec4(pos,1.);}`,
    fragmentShader:`uniform float time;uniform float strength;uniform float openSea;varying vec2 ribbonUv;varying vec2 p;
      void main(){
        float rough=sin(p.x*9.+sin(p.y*6.))*sin(p.y*8.-time*.6);
        float phase=fract(ribbonUv.y*.8+time*.16+sin(ribbonUv.x*37.7)*.09);
        float edge=1.-smoothstep(.025,.19,abs(phase-.48)+rough*.035);
        float fade=smoothstep(0.,.08,ribbonUv.y)*(1.-smoothstep(.55,1.,ribbonUv.y));
        float broken=.48+.52*smoothstep(-.6,.75,sin(p.x*6.2+time*.35)*sin(p.y*4.7));
        float alpha=edge*fade*broken*.74*strength*(1.-openSea*smoothstep(70.,96.,length(p)));
        if(alpha<.015)discard;
        gl_FragColor=vec4(.76,.94,.87,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));foam.name='Animated shore and reef foam';foam.renderOrder=3;
  let enabled=true,currentStrength=1;
  return {
    surface,foam,
    setEnabled(value){enabled=value;},
    update(time,dt,boat){
      currentStrength=THREE.MathUtils.damp(currentStrength,enabled?1:0,4,dt);
      uniforms.time.value=time;uniforms.strength.value=currentStrength;
      foam.visible=currentStrength>.005;
      if(boat){
        const pose=sampleBoatPose(4.7,8.7,-.12,time,currentStrength);
        boat.position.y=THREE.MathUtils.damp(boat.position.y,.32+pose.height,6,dt);
        // YXZ applies local rocking before the fixed world heading.
        boat.rotation.order='YXZ';
        boat.rotation.x=THREE.MathUtils.damp(boat.rotation.x,THREE.MathUtils.clamp(pose.roll,-.10,.10),5,dt);
        boat.rotation.z=THREE.MathUtils.damp(boat.rotation.z,THREE.MathUtils.clamp(pose.pitch,-.09,.09),5,dt);
      }
    },
    get enabled(){return enabled;},
    budget:{waterVertices:positions.count,waterTriangles:geometry.index.count/3,foamTriangles:indices.length/3,drawCalls:2}
  };
}
