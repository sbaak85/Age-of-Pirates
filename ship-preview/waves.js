// Shared wave parameters for GPU surface displacement and CPU boat sampling.
export const WAVES = [
  { direction: [.92, .39], wavelength: 5.8, amplitude: .25, speed: 1.22 },
  { direction: [-.34, .94], wavelength: 3.8, amplitude: .12, speed: 1.48 },
  { direction: [.68, -.73], wavelength: 2.8, amplitude: .055, speed: 1.78 },
].map(w => {
  const length = Math.hypot(...w.direction);
  return { ...w, direction: w.direction.map(v => v / length), k: Math.PI * 2 / w.wavelength };
});
const smoothstep = (a,b,x) => {const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function waveEnvelope(x,z,openSea=false) {
  const angle=Math.atan2(z/6.5,x/8.7);
  const coast=1+.055*Math.sin(3*angle+.5)+.044*Math.cos(5*angle-.4)+.025*Math.sin(9*angle);
  const shore=Math.hypot(x/8.7,z/6.5)/coast;
  const harbor=Math.exp(-((x-1.5)**2/28+(z-8)**2/12));
  const base=(.035+.965*smoothstep(1.02,1.75,shore))*(1-.60*harbor);
  return openSea?base*(1-smoothstep(185,220,Math.hypot(x,z))):base*(1-smoothstep(24,42,Math.hypot(x,z)));
}
export function sampleWaveHeight(x,z,time,strength=1,openSea=false) {
  let height=0;
  for(const w of WAVES){const p=w.k*(w.direction[0]*x+w.direction[1]*z)-w.speed*time;height+=w.amplitude*(Math.sin(p)+.18*Math.sin(2*p));}
  return height*waveEnvelope(x,z,openSea)*strength;
}
export function sampleBoatPose(x,z,yaw,time,strength=1,openSea=false) {
  const forward=[Math.cos(yaw),-Math.sin(yaw)],side=[Math.sin(yaw),Math.cos(yaw)];
  const ahead=sampleWaveHeight(x+forward[0]*1.5,z+forward[1]*1.5,time,strength,openSea);
  const astern=sampleWaveHeight(x-forward[0]*1.5,z-forward[1]*1.5,time,strength,openSea);
  const right=sampleWaveHeight(x+side[0]*.65,z+side[1]*.65,time,strength,openSea);
  const left=sampleWaveHeight(x-side[0]*.65,z-side[1]*.65,time,strength,openSea);
  return {height:sampleWaveHeight(x,z,time,strength,openSea),pitch:Math.atan2(ahead-astern,3),roll:-Math.atan2(right-left,1.3)};
}
export const WAVE_GLSL = `
uniform float time;
uniform float strength;
uniform float openSea;
uniform vec4 waves[3];
uniform float speeds[3];
float envelope(vec2 p){
  float angle=atan(p.y/6.5,p.x/8.7);
  float coast=1.+.055*sin(3.*angle+.5)+.044*cos(5.*angle-.4)+.025*sin(9.*angle);
  float shore=length(p/vec2(8.7,6.5))/coast;
  vec2 h=p-vec2(1.5,8.);
  float harbor=exp(-(h.x*h.x/28.+h.y*h.y/12.));
  float base=(.035+.965*smoothstep(1.02,1.75,shore))*(1.-.60*harbor);
  return openSea>.5?base*(1.-smoothstep(185.,220.,length(p))):base*(1.-smoothstep(24.,42.,length(p)));
}
vec3 waveField(vec2 p){
  if(strength<.001)return vec3(0.);
  vec3 value=vec3(0.);
  for(int i=0;i<3;i++){
    vec4 w=waves[i];float phase=w.z*dot(w.xy,p)-speeds[i]*time;
    float dh=w.w*w.z*(cos(phase)+.36*cos(phase*2.));
    value+=vec3(w.w*(sin(phase)+.18*sin(phase*2.)),dh*w.x,dh*w.y);
  }
  float mask=envelope(p);
  vec2 gradient=vec2(envelope(p+vec2(.04,0.))-envelope(p-vec2(.04,0.)),envelope(p+vec2(0.,.04))-envelope(p-vec2(0.,.04)))/.08;
  return vec3(value.x*mask,value.yz*mask+value.x*gradient)*strength;
}`;
