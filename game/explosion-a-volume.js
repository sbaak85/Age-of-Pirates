export const explosionAFragment = `precision highp float;varying vec3 vWorld;uniform vec3 uEye;uniform float uTime;
 float hash(vec3 p){p=fract(p*.3183099+vec3(.13,.27,.43));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
 float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float fbm(vec3 p){return noise(p)*.57+noise(p*2.07+13.)*.29+noise(p*4.13)*.14;}
 float field(vec3 p,float t){float grow=1.-exp(-t*4.);float rise=max(0.,t-.35);float r=.55+grow*1.45+rise*.14;float d=-10.;
 for(int i=0;i<4;i++){float a=float(i)*2.39996;float spread=(i==0?0.:1.)*grow*(1.1+rise*.10);vec3 c=vec3(cos(a)*spread,1.2+rise*.93+sin(float(i)*7.)*.7*grow,sin(a)*spread);float q=1.-length((p-c)/vec3(r,r*(1.+.13*sin(a)),r));d=max(d,q);}
 float stem=1.-length((p-vec3(0.,1.+rise*.35,0.))/vec3(.75+grow*.3,1.+rise*.4,.75+grow*.3));
 d=max(d,stem*.65);vec3 adv=p*1.45-vec3(t*.22,t*.8,t*.12);return max(0.,d+(fbm(adv)-.5)*.65)*smoothstep(0.,.09,t)*(1.-smoothstep(2.4,4.4,t));}
 void main(){float t=uTime;vec3 rd=normalize(vWorld-uEye);vec3 inv=1./rd;vec3 a=(vec3(-7.,.13,-7.)-uEye)*inv,b=(vec3(7.,12.,7.)-uEye)*inv;vec3 lo=min(a,b),hi=max(a,b);float near=max(max(lo.x,lo.y),lo.z),far=min(min(hi.x,hi.y),hi.z);near=max(0.,near);if(far<=near||t<0.)discard;
 float stepSize=(far-near)/64.;float jitter=hash(vec3(gl_FragCoord.xy,0.));vec4 sum=vec4(0.);vec3 lightDir=normalize(vec3(-.5,1.,-.65));
 for(int j=0;j<64;j++){vec3 p=uEye+rd*(near+(float(j)+jitter)*stepSize);float d=field(p,t);if(d>.012){float n=fbm(p*2.1-vec3(0,t*1.6,0));float heat=(1.-smoothstep(.35,2.0,t))*smoothstep(.12,.65,d)*smoothstep(.25,.72,n)*1.5;heat*=1.-smoothstep(2.3,5.8,p.y);
 float shade=exp(-field(p+lightDir*.55,t)*7.0);vec3 smoke=mix(vec3(.013,.017,.022),vec3(.14,.17,.20),shade);float inner=exp(-length(p-vec3(0,1.8,0))*.55)*exp(-t*1.6);smoke+=vec3(1.,.22,.025)*inner*1.3;
 vec3 fire=mix(vec3(1.3,.085,.006),vec3(3.2,1.35,.15),smoothstep(.22,.8,heat));vec3 col=mix(smoke,fire,smoothstep(.04,.68,heat));float alpha=1.-exp(-d*stepSize*mix(4.2,3.0,smoothstep(.7,1.8,t)));sum.rgb+=(1.-sum.a)*alpha*col;sum.a+=(1.-sum.a)*alpha;if(sum.a>.985)break;}}
 if(sum.a<.005)discard;gl_FragColor=vec4(sum.rgb/max(sum.a,.001),sum.a);}`;
