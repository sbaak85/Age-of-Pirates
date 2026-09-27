export const CHEST_SCALE=1.2;
export const GOLD_CHEST_CHANCE=.20;

// Decide once when a kill drops its chest, never again on animation or pickup.
export function rollKillTreasure(gold,parts,random=Math.random){
 const golden=random()<GOLD_CHEST_CHANCE,multiplier=golden?2:1;
 return {golden,gold:gold*multiplier,parts:parts*multiplier};
}

export function chestRewards(chest){
 return chest.rewards??{gold:chest.kind==='parts'?0:chest.reward,parts:chest.kind==='parts'?chest.reward:0};
}
