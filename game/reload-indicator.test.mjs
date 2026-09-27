import test from 'node:test';
import assert from 'node:assert/strict';
import {reloadIndicatorState} from './reload-indicator.js';
import {createVolley,dueVolleyShots} from './physics.js';

const volley={shotsFired:4,finishedAt:5.9,reloadUntil:9.1};

test('ship ring follows the volley clock clockwise from empty to full',()=>{
 assert.deepEqual(reloadIndicatorState(null,0),{visible:false,text:'',progress:0,opacity:0});
 assert.deepEqual(reloadIndicatorState({...volley,shotsFired:3},5.6),{visible:false,text:'',progress:0,opacity:0});
 const half=reloadIndicatorState(volley,7.5);
 assert.equal(half.text,'Reloading...');
 assert.ok(Math.abs(half.progress-.5)<1e-9);
 assert.equal(half.opacity,1);
 assert.deepEqual(reloadIndicatorState(volley,9.1),{visible:true,text:'Ready',progress:1,opacity:1});
});

test('reload begins on the actual fourth shot, even when that shot is late',()=>{
 const late=createVolley(5,-1);
 dueVolleyShots(late,5);
 dueVolleyShots(late,5.3);
 dueVolleyShots(late,5.6);
 assert.equal(late.finishedAt,null);
 assert.equal(late.reloadUntil,Infinity);
 assert.equal(reloadIndicatorState(late,6.05).visible,false);
 assert.deepEqual(dueVolleyShots(late,6.1),[3]);
 assert.equal(late.finishedAt,6.1);
 assert.ok(Math.abs(late.reloadUntil-9.3)<1e-9);
 assert.deepEqual(reloadIndicatorState(late,6.1),{visible:true,text:'Reloading...',progress:0,opacity:1});
});

test('ready message and completed ring fade out over exactly half a second',()=>{
 assert.equal(reloadIndicatorState(volley,9.35).opacity,.5);
 assert.equal(reloadIndicatorState(volley,9.6).visible,false);
});
