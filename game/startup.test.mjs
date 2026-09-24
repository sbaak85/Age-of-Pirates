import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./startup.js',import.meta.url),'utf8');
function harness(){
 const nodes=new Map(),timers=[],events={},docEvents={};let now=0,pads=[],reloads=0;
 function node(id){if(!nodes.has(id)){const handlers={};nodes.set(id,{dataset:{},style:{},hidden:false,classList:{add(){},remove(){}},addEventListener(k,f){handlers[k]=f;},click(){handlers.click?.({target:this});if(id==='continue-button')node('startup').dispatch('click',{target:this});},dispatch(k,e){handlers[k]?.(e);},focus(){},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];}});}return nodes.get(id);}
 const window={addEventListener(k,f){events[k]=f;}};
 const context={window,document:{getElementById:node,querySelector:s=>node(s.slice(1)),addEventListener(k,f){docEvents[k]=f;}},performance:{now:()=>now},navigator:{getGamepads:()=>pads},location:{reload(){reloads++;}},setTimeout:(f,ms)=>{timers.push({f,ms});},setInterval:f=>{context.poll=f;return 1;},clearInterval(){},requestAnimationFrame:f=>f()};
 vm.runInNewContext(source,context);docEvents.DOMContentLoaded();
 return {api:window.pirateStartup,node,events,run(ms){const t=timers.findIndex(t=>t.ms===ms);assert.notEqual(t,-1,`timer ${ms}`);now+=ms;timers.splice(t,1)[0].f();},pad(a){pads=[{connected:true,axes:[0,0],buttons:[{pressed:a}]}];context.poll();},get reloads(){return reloads;}};
}
test('early click waits for playable scene then reveals without transitionend',()=>{
 const h=harness();h.node('continue-button').click();assert.equal(h.node('startup').dataset.state,'loading');assert.equal(h.api.active,true);
 h.api.report(100,'Ready');h.run(650);h.run(700);assert.equal(h.node('startup').hidden,true);assert.equal(h.api.active,false);assert.equal(h.node('screen').inert,undefined);
});
test('load timeout with no rendered frame exposes working recovery, never fake success',()=>{
 const h=harness();h.node('continue-button').click();h.run(25000);assert.equal(h.node('startup').dataset.state,'error');assert.equal(h.node('startup-retry').hidden,false);h.node('startup-retry').click();assert.equal(h.reloads,1);
});
test('slow optional region details cannot trap an already rendered game',()=>{
 const h=harness();h.node('continue-button').click();h.api.report(75,'Building');h.run(25000);h.run(700);assert.equal(h.api.active,false);
});
test('failure during fade cancels reveal and a held gamepad A only retries once',()=>{
 const h=harness();h.node('continue-button').click();h.api.report(100,'Ready');h.run(650);h.api.fail();h.run(700);assert.equal(h.node('startup').hidden,false);assert.equal(h.node('startup').style.opacity,'1');assert.equal(h.api.active,true);h.pad(true);h.pad(true);assert.equal(h.reloads,1);
});
test('keyboard continue is captured so it cannot also activate the title menu',()=>{
 const h=harness();let stopped=false;h.events.keydown({code:'Enter',preventDefault(){},stopImmediatePropagation(){stopped=true;}});assert.equal(stopped,true);assert.equal(h.node('startup').dataset.state,'loading');
});
