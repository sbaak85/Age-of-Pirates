import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./cover-music.js',import.meta.url),'utf8');
function harness(blocked=false){
 const calls=[],timers=[],events={};let reject=blocked;
 const audio={currentTime:12,play(){calls.push('play');return reject?Promise.reject(new Error('NotAllowedError')):Promise.resolve();},pause(){calls.push('pause');}};
 const button={hidden:true,addEventListener(k,f){this[k]=f;}};
 class AudioContext{
  state='running';currentTime=10;
  createGain(){return {connect(){},gain:{value:1,cancelScheduledValues(t){calls.push(['cancel',t]);},setValueAtTime(v,t){calls.push(['set',v,t]);},linearRampToValueAtTime(v,t){calls.push(['ramp',v,t]);}}};}
  createMediaElementSource(){return {connect(){}};}
  resume(){return Promise.resolve();}close(){calls.push('close');return Promise.resolve();}
 }
 const window={AudioContext,addEventListener(k,f){events[k]=f;}};
 vm.runInNewContext(source,{window,document:{getElementById:id=>id==='cover-music'?audio:button},setTimeout(f,ms){timers.push({f,ms});return 1;},clearTimeout(){}});
 return {calls,timers,audio,button,events,api:window.pirateCoverMusic,allow(){reject=false;}};
}
test('cover music fades over exactly two audio-clock seconds and stops once',async()=>{
 const h=harness();await new Promise(setImmediate);assert.equal(h.button.hidden,true);
 h.api.fadeOut();h.api.fadeOut();
 assert.deepEqual(h.calls.find(c=>Array.isArray(c)&&c[0]==='ramp'),['ramp',0,12]);
 assert.equal(h.timers.length,1);assert.equal(h.timers[0].ms,2000);
 h.timers[0].f();assert.equal(h.audio.currentTime,0);assert.ok(h.calls.includes('pause'));assert.ok(h.calls.includes('close'));
});
test('blocked autoplay offers a cover-only retry and handles rejection without startup failure',async()=>{
 const h=harness(true);await new Promise(setImmediate);assert.equal(h.button.hidden,false);
 h.allow();let stopped=false;h.button.click({stopPropagation(){stopped=true;}});await new Promise(setImmediate);
 assert.equal(stopped,true);assert.equal(h.button.hidden,true);assert.equal(h.timers.length,0);
 h.api.fadeOut();h.timers[0].f();h.api.start();assert.equal(h.button.hidden,true);
});
