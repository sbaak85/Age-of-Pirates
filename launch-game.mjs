import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=dirname(fileURLToPath(import.meta.url));
const url='http://127.0.0.1:4317/game/';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function ready(){
  try{const response=await fetch(url,{signal:AbortSignal.timeout(1600)});return response.ok;}
  catch{return false;}
}

if(!existsSync(join(root,'vendor','three','build','three.module.js')) || !existsSync(join(root,'vendor','three','build','three.core.js'))){
  console.error('Bundled Three.js is missing. Restore the vendor/three folder from the game download.');
  process.exitCode=1;
}else{
  if(!await ready()){
    const server=spawn(process.execPath,[join(root,'preview-server.mjs')],{cwd:root,detached:true,stdio:'ignore',windowsHide:true});
    server.unref();
    let started=false;
    for(let attempt=0;attempt<24;attempt++){await sleep(250);if(await ready()){started=true;break;}}
    if(!started){console.error('The local server could not start. Check whether port 4317 is already in use.');process.exitCode=1;}
  }
  if(!process.exitCode){
    console.log(`Opening ${url}`);
    const browser=spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{detached:true,stdio:'ignore',windowsHide:true});
    browser.on('error',()=>console.log(`Open this URL in your browser: ${url}`));
    browser.unref();
  }
}
