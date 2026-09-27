// The full-size island sits beyond the existing inner sea lane. Local +Z
// points from the castle toward the main archipelago.
export const FJORD_ISLAND=Object.freeze({angle:4.8,radius:240,rotation:-Math.PI/2-4.8,dock:[-9,12],gate:[0,61],statue:[0,32]});
const c=Math.cos(FJORD_ISLAND.rotation),s=Math.sin(FJORD_ISLAND.rotation);
const cx=Math.cos(FJORD_ISLAND.angle)*FJORD_ISLAND.radius;
const cz=Math.sin(FJORD_ISLAND.angle)*FJORD_ISLAND.radius;
export const fjordIslandToWorld=(x,z)=>({x:cx+c*x+s*z,z:cz-s*x+c*z});
export const fjordIslandToLocal=(x,z)=>({x:c*(x-cx)-s*(z-cz),z:s*(x-cx)+c*(z-cz)});
export const FJORD_ISLAND_CENTER=Object.freeze({x:cx,z:cz});
