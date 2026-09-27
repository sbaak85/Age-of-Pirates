import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,sep,join} from 'node:path';
import {buildPages} from './build-pages.mjs';

test('Pages artifact includes the playable dependency tree and supports a project URL',async()=>{
 const prefix=resolve(tmpdir(),'age-of-pirates-pages-test-');
 const output=await mkdtemp(prefix);
 try{
  const result=await buildPages({output,base:'/Age-of-Pirates/'});
  const files=new Set(result.files);
  for(const required of ['game/main.js','game/startup.js','game/treasure.js','game/cover-gold-effects.js','ship-preview/ship.js','vendor/three/build/three.core.js','vendor/three/LICENSE','game/assets/age-of-pirates-Title.png','game/assets/audio/Horizon of Discovery.mp3','game/assets/beast-skull-final/scene.json','game/assets/central-jungle/terrain.positions.bin'])assert.ok(files.has(required),required);
  for(const file of files){
   assert.ok(!/^(Assets|archive|backups|node_modules|docs)\//.test(file),file);
   assert.ok(!/(?:\.test\.mjs|-preview\.html|-check\.html)$/.test(file),file);
  }
  const html=await readFile(join(output,'game/index.html'),'utf8');
  assert.ok(html.includes('/Age-of-Pirates/game/startup.js'));
  assert.ok(html.includes('/Age-of-Pirates/vendor/three/build/three.module.js'));
  assert.ok(!html.includes('"/game/'));
  const manifest=JSON.parse(await readFile(join(output,'game/assets/beast-skull-final/scene.json'),'utf8'));
  for(const binary of Object.keys(manifest.beastSkull.files))assert.ok(files.has('game/assets/beast-skull-final/'+binary),binary);
  assert.ok((await readdir(output)).includes('.nojekyll'));
 }finally{
  if(!resolve(output).startsWith(prefix)||!resolve(output).startsWith(resolve(tmpdir())+sep))throw Error('Unsafe temporary cleanup');
  await rm(output,{recursive:true,force:true});
 }
});
