// Approved procedural weathering shared by the compact production model.
export function applyBeastSkullWeathering(bone,plainBone,mossUniform){
 // Object-space mineral weathering stays attached to the bone from every angle.
 for(const material of [bone,plainBone]){
  material.onBeforeCompile=shader=>{
   shader.uniforms.boneMoss=mossUniform;
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 boneP;\nvarying vec3 boneN;').replace('#include <begin_vertex>','#include <begin_vertex>\nboneP=position;boneN=normal;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 boneP;varying vec3 boneN;uniform float boneMoss;
float bHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float bNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(bHash(i),bHash(i+vec3(1,0,0)),f.x),mix(bHash(i+vec3(0,1,0)),bHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(bHash(i+vec3(0,0,1)),bHash(i+vec3(1,0,1)),f.x),mix(bHash(i+vec3(0,1,1)),bHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float bFbm(vec3 p){return bNoise(p)*.56+bNoise(p*2.13+7.3)*.27+bNoise(p*4.17-3.4)*.12+bNoise(p*8.3+1.1)*.05;}
`).replace('#include <color_fragment>',`#include <color_fragment>
float mineral=bFbm(boneP*.47),pores=bNoise(boneP*9.4);
diffuseColor.rgb*=mix(vec3(.42,.40,.32),vec3(1.12,1.09,1.01),smoothstep(.17,.72,mineral));
diffuseColor.rgb*=.9+.1*smoothstep(.23,.44,pores);
float damp=(1.-smoothstep(2.,9.,boneP.y))*.4;
diffuseColor.rgb*=1.-damp;
float mossArea=smoothstep(.42,.69,mineral+.07*bNoise(boneP*2.3))*smoothstep(.1,.75,boneN.y)*smoothstep(19.,30.,boneP.y)*(1.-smoothstep(-9.,9.,boneP.x))*boneMoss;
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.13,.18,.065)*(.65+mineral*.7),mossArea*.92);
`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
float relief=(bFbm(boneP*2.3)*.12+bNoise(boneP*13.1)*.025);
normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(relief),dFdy(relief)),faceDirection);
`);
  };
  material.customProgramCacheKey=()=> 'weathered-fossil-v2';
 }
}
