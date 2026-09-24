import * as THREE from 'three';
import {WAVES,WAVE_GLSL} from '../ship-preview/waves.js';
import {TERRAIN,CORALHAVEN} from './archipelago-data.js';

// Signed approximate distance to the authored coasts. Kept in a small texture so
// the vertex and fragment shaders can share the same shore transition cheaply.
export function createShoreTexture(size=384){
 const pixels=new Uint8Array(size*size*4);
 for(let z=0;z<size;z++)for(let x=0;x<size;x++){
  const wx=(x/(size-1)-.5)*512,wz=(z/(size-1)-.5)*512;
  let distance=999;
  for(const land of TERRAIN)distance=Math.min(distance,(Math.hypot((wx-land.x)/land.rx,(wz-land.z)/land.rz)-1)*Math.min(land.rx,land.rz));
  distance=Math.min(distance,(Math.hypot((wx-CORALHAVEN.x)/15,(wz-CORALHAVEN.z)/12)-1)*12);
  const value=Math.round(255*THREE.MathUtils.clamp(distance/18,0,1)),i=(z*size+x)*4;
  pixels[i]=pixels[i+1]=pixels[i+2]=value;pixels[i+3]=255;
 }
 const texture=new THREE.DataTexture(pixels,size,size);
 texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.needsUpdate=true;
 return texture;
}

const vertexShader=`${WAVE_GLSL}
 uniform sampler2D shore;
 uniform float overview;
 varying vec3 seaPosition;
 void main(){
  float coast=texture2D(shore,position.xz/512.+.5).r;
  float attenuation=mix(.23,1.,smoothstep(.025,.28,coast));
  float distanceFade=(1.-overview*.9)*(1.-.85*smoothstep(55.,135.,length(cameraPosition.xz-position.xz)));
  vec3 field=waveField(position.xz);
  seaPosition=vec3(position.x,field.x*attenuation*distanceFade,position.z);
  gl_Position=projectionMatrix*viewMatrix*vec4(seaPosition,1.);
 }`;

const fragmentShader=`
 uniform sampler2D shore;
 uniform float time;
 uniform float strength;
 uniform float overview;
 uniform vec4 waves[3];
 uniform float speeds[3];
 varying vec3 seaPosition;
 void main(){
  vec2 p=seaPosition.xz;
  float d=texture2D(shore,p/512.+.5).r;
  float shallow=1.-smoothstep(.035,.72,d);
  float distanceFade=(1.-overview*.9)*(1.-.85*smoothstep(55.,135.,length(cameraPosition.xz-p)));
  float attenuation=mix(.23,1.,smoothstep(.025,.28,d))*strength*distanceFade;
  // Evaluate the normal per pixel. The old 160-cell mesh interpolated normals
  // over multi-metre triangles, making specular highlights look like polygons.
  vec2 slope=vec2(0.);
  for(int i=0;i<3;i++){
   vec4 w=waves[i];float phase=w.z*dot(w.xy,p)-speeds[i]*time;
   slope+=w.xy*w.w*w.z*(cos(phase)+.36*cos(phase*2.));
  }
  float detailPhase=dot(p,vec2(2.3,1.2))+sin(p.y*.47+p.x*.19+time*.18)*1.15-time*1.05;
  float detail=sin(detailPhase);
  float antiAlias=1.-smoothstep(.25,.85,fwidth(detailPhase));
  slope+=vec2(.75,.4)*detail*.015*antiAlias;
  vec3 normal=normalize(vec3(-slope.x*attenuation,1.,-slope.y*attenuation));
  vec3 viewDirection=normalize(cameraPosition-seaPosition);
  vec3 lightDirection=normalize(vec3(-.52,1.,.38));
  float diffuse=max(dot(normal,lightDirection),0.);
  float fresnel=pow(1.-max(dot(normal,viewDirection),0.),3.);
  float specular=pow(max(dot(normal,normalize(viewDirection+lightDirection)),0.),38.);
  specular*=.84+.16*sin(p.x*.79+sin(p.y*.42)+time*.25)*sin(p.y*.69-p.x*.23);
  vec3 color=mix(vec3(.018,.23,.34),vec3(.045,.59,.59),shallow);
  color*=.78+diffuse*.25;
  color=mix(color,vec3(.24,.54,.59),fresnel*.26);
  color+=vec3(.58,.85,.82)*specular*.024;
  float shimmer=detail*.006*antiAlias*(.3+.7*shallow);
  color+=vec3(shimmer,shimmer*1.25,shimmer);
  // A narrow, broken moving ribbon follows the same coast-distance field.
  float foamLine=exp(-pow((d-.062)*22.,2.));
  float breakup=.5+.5*sin(p.x*1.8+p.y*.65+sin(p.y*1.3-time*.8))
                    *sin(p.y*1.5-p.x*.85+time*.65);
  float foam=foamLine*smoothstep(.29,.75,breakup)*(.52+.18*sin(time*1.7));
  color=mix(color,vec3(.72,.94,.86),foam*.67);
  // Real alpha blending reveals sand, rock and reef colour beneath the shallows.
  float alpha=mix(1.,.49,1.-smoothstep(.025,.55,d));
  alpha=min(1.,alpha+fresnel*.18+foam*.23);
  float fog=max(smoothstep(178.,212.,length(p)),smoothstep(65.,165.,length(cameraPosition-seaPosition))*.7*(1.-overview));
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.6588,.7765,.8),fog);
 }`;

const bedFragment=`
 uniform sampler2D shore;
 varying vec2 bedPosition;
 void main(){
  float d=texture2D(shore,bedPosition/512.+.5).r;
  float sand=1.-smoothstep(.12,.70,d);
  float mottling=sin(bedPosition.x*.61+sin(bedPosition.y*.39)*1.3)*sin(bedPosition.y*.77-bedPosition.x*.23);
  vec3 floorColor=mix(vec3(.025,.19,.24),vec3(.57,.69,.50),sand);
  floorColor+=vec3(.019,.025,.011)*mottling*sand;
  gl_FragColor=vec4(floorColor,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;

export function createSea(){
 const shore=createShoreTexture();
 const uniforms={overview:{value:0},time:{value:0},strength:{value:1},openSea:{value:1},shore:{value:shore},waves:{value:WAVES.map(w=>new THREE.Vector4(...w.direction,w.k,w.amplitude))},speeds:{value:WAVES.map(w=>w.speed)}};
 // More samples for the geometry silhouette; normal and fine sparkle are
 // computed per fragment so the open sea has no obvious triangle pattern.
 const geometry=new THREE.PlaneGeometry(512,512,256,256);geometry.rotateX(-Math.PI/2);
 const material=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false});
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.name='A2 translucent coastal ocean';
 const bedGeometry=new THREE.PlaneGeometry(512,512);bedGeometry.rotateX(-Math.PI/2);
 const bedMaterial=new THREE.ShaderMaterial({uniforms:{shore:{value:shore}},vertexShader:'varying vec2 bedPosition;void main(){bedPosition=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:bedFragment});
 const seabed=new THREE.Mesh(bedGeometry,bedMaterial);seabed.position.y=-2.1;seabed.name='A2 shallow-water seabed';
 return {mesh,seabed,setOverview:value=>uniforms.overview.value=value?1:0,update:time=>uniforms.time.value=time,setEnabled:value=>uniforms.strength.value=value?1:0};
}


