// Compact cannon impact: four true 3D lobes, no rising mushroom or radial jets.
export const explosionCFragment = `
precision highp float;
varying vec3 vWorld;
uniform vec3 uEye;
uniform float uTime;
float hash(vec3 p){p=fract(p*.3183099+vec3(.13,.27,.43));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float field(vec3 p,float t){
 float burst=1.-exp(-t*23.);
 float d=-10.;
 for(int i=0;i<4;i++){
   float fi=float(i),a=fi*2.39996;
   float r=(.45+.09*sin(fi*3.))*burst+t*.13;
   vec3 c=vec3(cos(a)*.33*burst+t*.22,.65+sin(fi*1.7)*.17*burst+t*.38,sin(a)*.33*burst);
   vec3 local=(p-c)/max(r,.001);
   float ripple=sin(local.x*5.+t*4.)*sin(local.y*4.-t*5.)*sin(local.z*5.)*.07;
   d=max(d,1.-length(local)+ripple);
 }
 return max(0.,d)*smoothstep(0.,.025,t)*(1.-smoothstep(.5,1.5,t));
}
void main(){
 float t=uTime;
 vec3 rd=normalize(vWorld-uEye),inv=1./rd;
 vec3 a=(vec3(-2.4,.13,-2.4)-uEye)*inv,b=(vec3(2.4,4.,2.4)-uEye)*inv;
 vec3 lo=min(a,b),hi=max(a,b);
 float near=max(0.,max(max(lo.x,lo.y),lo.z)),far=min(min(hi.x,hi.y),hi.z);
 if(far<=near||t<=0.||t>=1.5)discard;
 float stepSize=(far-near)/40.;
 float jitter=hash(vec3(gl_FragCoord.xy,0.));
 vec4 sum=vec4(0.);
 vec3 lightDir=normalize(vec3(-.6,1.,.6));
 for(int j=0;j<40;j++){
   vec3 p=uEye+rd*(near+(float(j)+jitter)*stepSize);
   float density=field(p,t);
   if(density>.01){
     float n=noise(p*4.-vec3(0.,t*3.,0.));
     float hot=(1.-smoothstep(.12,.5,t))*smoothstep(.3,.62,n);
     float shade=exp(-field(p+lightDir*.18,t)*7.);
     vec3 smoke=mix(vec3(.023,.019,.018),vec3(.17,.145,.12),shade);
     smoke+=vec3(.3,.055,.002)*exp(-t*8.);
     vec3 flame=mix(vec3(1.6,.12,.003),vec3(3.,1.5,.25),smoothstep(.2,.9,hot));
     vec3 color=mix(smoke,flame,smoothstep(.08,.72,hot));
     float opacity=1.-exp(-density*stepSize*13.);
     sum.rgb+=(1.-sum.a)*opacity*color;sum.a+=(1.-sum.a)*opacity;
     if(sum.a>.99)break;
   }
 }
 if(sum.a<.005)discard;
 gl_FragColor=vec4(sum.rgb/max(sum.a,.001),sum.a);
}
`;
