import {CANNON} from './constants.js';

const FADE_SECONDS=.5;

export function reloadIndicatorState(volley,now){
 if(!volley||volley.shotsFired<CANNON.volleyCount)return {visible:false,text:'',progress:0,opacity:0};
 if(now<volley.reloadUntil){
  const duration=Math.max(.001,volley.reloadUntil-volley.finishedAt);
  return {visible:true,text:'Reloading...',progress:Math.max(0,Math.min(1,(now-volley.finishedAt)/duration)),opacity:1};
 }
 const opacity=Math.max(0,1-(now-volley.reloadUntil)/FADE_SECONDS);
 return {visible:opacity>0,text:'Ready',progress:1,opacity};
}
