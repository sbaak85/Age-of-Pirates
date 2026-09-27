import test from 'node:test';
import assert from 'node:assert/strict';
import {createTitleExplosionWarmup} from './title-explosion-warmup.js';

function harness(){
 const calls=[];
 const effects={explosion(...args){calls.push(['explosion',...args]);},update(dt){calls.push(['update',dt]);},clear(){calls.push(['clear']);}};
 const warmup=createTitleExplosionWarmup(effects,[{kind:'impact',x:-4,y:1,z:0},{kind:'kill',x:4,y:1,z:0}],4.2);
 return {calls,warmup};
}

test('both gameplay explosion variants advance through their full lifetime only once',()=>{
 const {calls,warmup}=harness();
 assert.equal(warmup.complete,false);
 assert.equal(warmup.update(1,null,true),true);
 assert.deepEqual(calls.slice(0,2),[['explosion',-4,1,0,'impact'],['explosion',4,1,0,'kill']]);
 for(let i=0;i<4;i++)warmup.update(.8,null,true);
 assert.deepEqual(calls.at(-1),['clear']);
 assert.equal(warmup.complete,true);
 const count=calls.length;
 assert.equal(warmup.update(1,null,true),false);
 assert.equal(calls.length,count);
});

test('cover reveal clears an unfinished explosion before the title menu is visible',()=>{
 const {calls,warmup}=harness();
 warmup.update(.1,null,true);
 assert.equal(warmup.update(.1,null,false),false);
 assert.deepEqual(calls.at(-1),['clear']);
 const count=calls.length;
 assert.equal(warmup.update(1,null,true),false);
 assert.equal(calls.length,count);
});
