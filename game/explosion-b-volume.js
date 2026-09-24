// Stylized 3D density field: expanding lobes, rising crown and radial jets.
// Shapes and illumination live in world space, so orbiting reveals real parallax.
export const explosionBFragment = `
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
 float burst=1.-exp(-t*7.5);
 float lift=max(0.,t-.25);
 float d=-10.;
 // A larger crown surrounded by rolling, individually readable lobes.
 for(int i=0;i<8;i++){
   float fi=float(i),a=fi*2.39996;
   float radius=(i==0?1.55:1.05+.22*sin(fi*3.))*burst+lift*.12;
   float spread=i==0?0.:burst*(1.3+lift*.14);
   vec3 c=vec3(cos(a+lift*.13)*spread,1.25+burst*(i==0?1.3:.7)+lift*.83+sin(fi*1.7)*.65*burst,sin(a+lift*.13)*spread);
   vec3 local=(p-c)/radius;
   float ripple=sin(local.x*5.+t*2.)*sin(local.y*4.-t*3.)*sin(local.z*5.)*.08;
   d=max(d,1.-length(local)+ripple);
 }
 // Six curling outward plumes. These also have volume, not flat trails.
 for(int i=0;i<6;i++){
   float fi=float(i),a=fi*1.0472+.3;
   float travel=burst*(1.+min(lift,1.8)*1.3);
   vec3 c=vec3(cos(a)*travel,.6+burst*(.4+mod(fi,3.)*.6)+lift*.75,sin(a)*travel);
   vec3 q=p-c;
   vec3 along=vec3(cos(a),.3,sin(a));
   float axial=dot(q,along);
   vec3 radial=q-along*axial;
   float r=(.52+lift*.12)*burst;
   d=max(d,1.-sqrt(dot(radial,radial)/(r*r+.001)+axial*axial/(r*r*2.4+.001)));
 }
 // Short trunk and low rolling dust collar.
 vec3 trunk=(p-vec3(0.,.8+lift*.4,0.))/vec3(.65+burst*.3,1.+lift*.55,.65+burst*.3);
 d=max(d,1.-length(trunk));
 float ringRadius=burst*(1.6+min(lift,2.)*.65);
 float ring=1.-length(vec2(length(p.xz)-ringRadius,(p.y-.38)*1.7))/(.4+burst*.18);
 d=max(d,ring*(1.-smoothstep(1.3,2.8,t)));
 return max(0.,d)*smoothstep(0.,.07,t)*(1.-smoothstep(2.3,4.2,t));
}
void main(){
 float t=uTime;
 vec3 rd=normalize(vWorld-uEye),inv=1./rd;
 vec3 a=(vec3(-7.,.13,-7.)-uEye)*inv,b=(vec3(7.,12.,7.)-uEye)*inv;
 vec3 lo=min(a,b),hi=max(a,b);
 float near=max(0.,max(max(lo.x,lo.y),lo.z)),far=min(min(hi.x,hi.y),hi.z);
 if(far<=near||t<=0.||t>=4.2)discard;
 float stepSize=(far-near)/80.;
 vec4 sum=vec4(0.);
 vec3 lightDir=normalize(vec3(-.6,1.,.6));
 for(int j=0;j<80;j++){
   vec3 p=uEye+rd*(near+(float(j)+hash(vec3(gl_FragCoord.xy,0.)))*stepSize);
   float density=field(p,t);
   if(density>.01){
     float n=noise(p*1.7-vec3(t*.2,t*.9,0.))*.75+noise(p*3.4+vec3(0.,t*.7,2.))*.25;
     // Narrow bright channels enclose darker rounded pockets.
     float channels=smoothstep(.47,.60,n);
     float hot=(1.-smoothstep(.6,2.05,t))*channels;
     float shade=exp(-field(p+lightDir*.4,t)*8.);
     vec3 smoke=mix(vec3(.025,.012,.018),vec3(.20,.14,.125),shade);
     float core=exp(-length(p-vec3(0.,1.6,0.))*.7)*exp(-t*1.5);
     smoke+=vec3(.65,.075,.005)*core;
     vec3 flame=mix(vec3(1.4,.10,.003),vec3(2.8,1.25,.15),smoothstep(.2,.9,hot));
     vec3 color=mix(smoke,flame,smoothstep(.12,.78,hot));
     float opacity=1.-exp(-density*stepSize*12.);
     sum.rgb+=(1.-sum.a)*opacity*color;
     sum.a+=(1.-sum.a)*opacity;
     if(sum.a>.993)break;
   }
 }
 if(sum.a<.005)discard;
 gl_FragColor=vec4(sum.rgb/max(sum.a,.001),sum.a);
}
`;
