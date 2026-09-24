import * as THREE from 'three';
import { createWaterImpact } from './water-impact-variants.js';

// Variant 2 motion and spray retained; the solid surface is replaced by a
// continuous 3D density field with a soft, translucent edge.
export function createWaterMist(){
  const spray=createWaterImpact(1,{surfaces:false}),group=spray.group;
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,
    uniforms:{uTime:{value:0},uEye:{value:new THREE.Vector3()},uToClip:{value:new THREE.Matrix4()}},
    vertexShader:`varying vec3 vLocal;void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`precision highp float;
    varying vec3 vLocal;uniform float uTime;uniform vec3 uEye;uniform mat4 uToClip;
    float hash(vec3 p){p=fract(p*.3183099+vec3(.13,.27,.43));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    float fbm(vec3 p){return noise(p)*.6+noise(p*2.03+7.)*.28+noise(p*4.07)*.12;}
    float field(vec3 p,float t){
      float burst=1.-exp(-t*12.);
      float height=6.2*burst*(1.-.55*smoothstep(.8,2.3,t));
      float d=-10.;
      for(int i=0;i<6;i++){
        float fi=float(i),s=(fi+.5)/6.;
        vec3 c=vec3(sin(fi*2.4+t)*.20*s,height*s+.22*t,sin(fi*1.8-t)*.16*s);
        float radius=(.56+.15*sin(fi*2.))*burst+t*.22;
        vec3 q=(p-c)/vec3(radius,.7+height*.09,radius);
        d=max(d,1.-length(q));
      }
      vec3 drift=p*2.1-vec3(t*.45,t*3.6,t*.2);
      d=max(0.,d+(fbm(drift)-.5)*.48);
      float base=exp(-dot(p.xz,p.xz)/(1.+t*2.))*exp(-pow((p.y-.25)/.4,2.))*.32;
      return (d+base)*smoothstep(0.,.045,t)*(1.-smoothstep(1.05,2.4,t));
    }
    void main(){
      float t=uTime;if(t<=0.||t>=2.4)discard;
      vec3 rd=normalize(vLocal-uEye),inv=1./rd;
      vec3 a=(vec3(-4.,.015,-4.)-uEye)*inv,b=(vec3(4.,10.,4.)-uEye)*inv;
      vec3 lo=min(a,b),hi=max(a,b);float near=max(0.,max(max(lo.x,lo.y),lo.z)),far=min(min(hi.x,hi.y),hi.z);if(far<=near)discard;
      float stepSize=(far-near)/64.,jitter=hash(vec3(gl_FragCoord.xy,0.));vec4 sum=vec4(0.);bool hasDepth=false;
      for(int i=0;i<64;i++){
        vec3 p=uEye+rd*(near+(float(i)+jitter)*stepSize);float d=field(p,t);
        if(d>.008){
          if(!hasDepth){vec4 clip=uToClip*vec4(p,1.);gl_FragDepth=clip.z/clip.w*.5+.5;hasDepth=true;}
          float light=exp(-field(p+vec3(-.32,.5,.25),t)*2.4);
          vec3 col=mix(vec3(.14,.43,.55),vec3(.83,.98,1.0),light);
          col=mix(col,vec3(.85,1.,1.05),smoothstep(2.,6.5,p.y)*.3);
          float alpha=1.-exp(-d*stepSize*3.4);
          sum.rgb+=(1.-sum.a)*alpha*col;sum.a+=(1.-sum.a)*alpha;if(sum.a>.985)break;
        }
      }
      if(sum.a<.006)discard;
      gl_FragColor=vec4(sum.rgb/max(sum.a,.001),sum.a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
  });
  const volume=new THREE.Mesh(new THREE.BoxGeometry(8,9.985,8).translate(0,5.0075,0),material);group.add(volume);
  return {group,update(t){spray.update(t);for(const mesh of spray.surfaceMeshes)mesh.visible=false;material.uniforms.uTime.value=t;},prepare(camera){
    camera.updateMatrixWorld();group.updateMatrixWorld(true);material.uniforms.uEye.value.copy(camera.position);group.worldToLocal(material.uniforms.uEye.value);
    material.uniforms.uToClip.value.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(group.matrixWorld);
  }};
}
