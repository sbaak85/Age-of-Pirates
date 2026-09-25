// Convert stick directions in screen space to a sea-plane heading.
// view is the camera's world-space forward direction (only x/z are needed).
export function directionalInput(x,y,view,deadzone=.13){
 const length=Math.hypot(x,y);
 if(length<=deadzone)return {directional:true,throttle:0,steer:0};
 const planar=Math.hypot(view.x,view.z);
 const up=planar>1e-6?{x:view.x/planar,z:view.z/planar}:{x:0,z:-1};
 const worldX=(-up.z*x-up.x*y)/length;
 const worldZ=(up.x*x-up.z*y)/length;
 return {directional:true,targetYaw:Math.atan2(-worldZ,worldX),throttle:Math.min(1,(length-deadzone)/(1-deadzone))};
}
