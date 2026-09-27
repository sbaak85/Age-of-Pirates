import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./startup.js',import.meta.url),'utf8').replace("import('./main.js')","bootGame()");
function harness(){
 let now=0,boots=0;const tasks=[],nodes=new Map(),events={};
 const node=id=>{if(!nodes.has(id)){const listeners={};nodes.set(id,{id,style:{},dataset:id==='startup'?{state:'cover'}:{},hidden:['continue-button','cover-logo-button','startup-retry'].includes(id),disabled:id.includes('button'),classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){},focus(){},addEventListener(k,f){(listeners[k]??=[]).push(f);},click(){if(!this.disabled)this.fire('click',{target:this});},fire(k,e){for(const f of listeners[k]||[])f(e);}});}return nodes.get(id);};
 const win={addEventListener(k,f){(events[k]??=[]).push(f);},dispatchEvent(){}};
 const doc={getElementById:node,querySelector:s=>node(s.slice(1)),addEventListener(k,f){events[k]=[f];}};
 const later=(f,delay=0)=>tasks.push({f,at:now+delay});
 vm.runInNewContext(source,{window:win,document:doc,performance:{now:()=>now},setTimeout:later,setInterval(){return 1;},clearInterval(){},requestAnimationFrame:f=>later(f,16),navigator:{},location:{reload(){}},Event:class{},bootGame(){boots++;return Promise.resolve();}});
 return {node,win,get boots(){return boots;},dom(){events.DOMContentLoaded[0]();},advance(ms){const end=now+ms;while(true){tasks.sort((a,b)=>a.at-b.at);if(!tasks.length||tasks[0].at>end)break;const task=tasks.shift();now=task.at;task.f();}now=end;}};
}
test('boot starts without click; both hit targets unlock at one second, outside cover does not continue',()=>{
 const h=harness();h.dom();assert.equal(h.boots,1);h.advance(999);h.node('continue-button').click();assert.equal(h.node('startup').dataset.state,'cover');assert.equal(h.node('cover-logo-button').hidden,true);
 h.advance(1);for(const id of ['continue-button','cover-logo-button']){assert.equal(h.node(id).hidden,false);assert.equal(h.node(id).disabled,false);}
 h.node('startup').fire('click',{target:h.node('cover-art')});assert.equal(h.node('startup').dataset.state,'cover');
 h.node('cover-logo-button').click();assert.equal(h.node('startup').dataset.state,'departing');
});
test('already warm: one full second to black before menu fade, no loading wait',()=>{
 const h=harness();h.dom();h.win.pirateStartup.report(100,'Ready');h.advance(1000);h.node('continue-button').click();h.advance(999);assert.equal(h.node('startup').dataset.state,'departing');
 h.advance(1);assert.equal(h.node('startup').dataset.state,'revealing');h.advance(700);assert.equal(h.win.pirateStartup.active,false);
});
test('pending data: black waits at most three seconds without falsely claiming ready',()=>{
 const h=harness();h.dom();h.advance(1000);h.node('cover-logo-button').click();h.advance(1000);assert.equal(h.node('startup').dataset.state,'loading');
 h.advance(2999);assert.notEqual(h.node('startup').style.opacity,'0');h.advance(1);assert.equal(h.node('startup').dataset.state,'revealing');assert.notEqual(h.node('startup-progress').value,100);
 h.advance(700);assert.equal(h.node('startup').hidden,true);h.win.pirateStartup.report(100,'Ready');assert.equal(h.node('startup').hidden,true);
});
test('data finishing during black exits immediately; repeat click cannot reset deadlines',()=>{
 const h=harness();h.dom();h.advance(1000);h.node('continue-button').click();h.advance(500);h.node('cover-logo-button').click();h.advance(500);assert.equal(h.node('startup').dataset.state,'loading');
 h.advance(600);h.win.pirateStartup.report(100,'Ready');assert.equal(h.node('startup').dataset.state,'revealing');
});
