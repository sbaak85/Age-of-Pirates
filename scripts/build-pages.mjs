import {readFile,writeFile,mkdir,readdir,stat,copyFile} from 'node:fs/promises';
import {resolve,dirname,relative,sep,posix} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function buildPages({output=resolve(root,'dist'),base='/Age-of-Pirates/'}={}){
 if(!/^\/(?:[A-Za-z0-9_.-]+\/)*$/.test(base))throw Error('Invalid Pages base path');
 const files=new Set(['game/index.html','vendor/three/LICENSE']);
 const assetDirectories=new Set();
 function localPath(spec,from){
  if(spec==='three')return 'vendor/three/build/three.module.js';
  if(spec.startsWith('three/addons/'))return 'vendor/three/examples/jsm/'+spec.slice(13);
  if(/^(?:https?:|data:|#)/.test(spec))return null;
  const decoded=decodeURIComponent(spec);
  const path=posix.normalize(decoded.startsWith('/')?decoded.slice(1):posix.join(posix.dirname(from),decoded));
  if(!/^(game|ship-preview|vendor)\//.test(path))throw Error(`Unexpected public dependency: ${from} -> ${spec}`);
  return path;
 }
 function add(spec,from){const path=localPath(spec,from);if(path)files.add(path);}
 for(const file of files){
  const content=await readFile(resolve(root,file));
  if(file.endsWith('.html')){
   const text=content.toString();
   for(const match of text.matchAll(/(?:src|href)="([^"]+)"/g))add(match[1],file);
  }
  if(file.endsWith('.js')){
   const text=content.toString();
   for(const match of text.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g))add(match[1],file);
   for(const match of text.matchAll(/new URL\(['"](\.\/assets\/[^'"]+\/)['"],\s*import\.meta\.url\)/g))assetDirectories.add(localPath(match[1],file));
  }
  if(file.endsWith('.css'))for(const match of content.toString().matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))add(match[1],file);
 }
 async function addAssets(directory){
  for(const entry of await readdir(resolve(root,directory),{withFileTypes:true})){
   const path=directory+'/'+entry.name;
   if(entry.isDirectory())await addAssets(path);
   else if(/\.(bin|json|png|webp|jpg|mp3)$/i.test(entry.name))files.add(path);
  }
 }
 for(const directory of assetDirectories)await addAssets(directory.replace(/\/$/,''));
 await mkdir(output,{recursive:true});
 // Refuse stale or user-owned output instead of recursively deleting anything.
 if((await readdir(output)).length)throw Error('Pages output must be empty; use a fresh output directory.');
 let bytes=0;
 for(const file of files){
  const target=resolve(output,file);
  if(!target.startsWith(resolve(output)+sep))throw Error('Output path escaped site directory');
  await mkdir(dirname(target),{recursive:true});
  if(/\.(html|js|css)$/.test(file)){
   const text=await readFile(resolve(root,file),'utf8');
   const built=text.replace(/(["'`(])\/(game|vendor|ship-preview)\//g,(_,quote,folder)=>quote+base+folder+'/');
   await writeFile(target,built);
  }else await copyFile(resolve(root,file),target);
  bytes+=(await stat(target)).size;
 }
 await writeFile(resolve(output,'.nojekyll'),'');
 await writeFile(resolve(output,'index.html'),'<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>海戰紀元 · Age of Pirates</title><meta http-equiv="refresh" content="0;url=./game/"><script>location.replace("./game/"+location.search+location.hash)</script><a href="./game/">開始遊戲 / Play Age of Pirates</a></html>');
 console.log(`Pages: ${files.size} runtime files, ${(bytes/1024/1024).toFixed(1)} MiB, base ${base}`);
 return {files:[...files],base,bytes};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 await buildPages({output:process.env.PAGES_OUTPUT?resolve(process.env.PAGES_OUTPUT):undefined,base:process.env.PAGES_BASE_PATH||'/Age-of-Pirates/'});
}
