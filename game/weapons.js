import { CANNON } from './constants.js';

export const WEAPONS=Object.freeze({
  standard:Object.freeze({...CANNON,id:'standard',name:'水手加農砲',description:'均衡火力，適合抓住側舷射擊節奏。',color:0x364b50}),
  long:Object.freeze({...CANNON,id:'long',name:'長管追獵砲',description:'高速遠射，較容易預判魚群航向。',speed:30,life:1.5,damage:17,reload:3.6,color:0x547885}),
  rapid:Object.freeze({...CANNON,id:'rapid',name:'珊瑚速射砲',description:'快速填裝，擅長連續打擊魚群與小型敵船。',speed:24,life:1.4,damage:16,reload:2.25,color:0x419b8c}),
  storm:Object.freeze({...CANNON,id:'storm',name:'風暴重擊砲',description:'工坊重砲，兼具彈速與單發破壞力。',speed:26,life:1.65,damage:29,reload:4.2,color:0x897297}),
  heavy:Object.freeze({...CANNON,id:'heavy',name:'重型破艦砲',description:'低速重彈，貼近敵船後威力更大。',speed:15,life:1.8,damage:34,reload:4.7,color:0xa67840}),
});
export const WEAPON_IDS=Object.keys(WEAPONS);
export function normalizeLoadout(value={}){
  return {port:Object.hasOwn(WEAPONS,value?.port)?value.port:'standard',starboard:Object.hasOwn(WEAPONS,value?.starboard)?value.starboard:'standard'};
}
export function weaponForSide(loadout,side){return WEAPONS[normalizeLoadout(loadout)[side===1?'starboard':'port']];}
