// The logo is baked into the cover, so build a pixel-aligned transparent
// lettering layer once, then restrict every animated highlight to its matte.
(()=>{
 const root=document.getElementById('startup');
 const art=document.getElementById('cover-art');
 if(!root||!art)return;

 const region={x:390,y:792,w:1280,h:274}; // 2048 × 1152 cover coordinates
 const glyphs=[
  [404,802,682,1044],[630,862,755,997],[746,863,851,999],
  [859,879,957,983],[944,847,1024,984],[1014,804,1180,994],
  [1159,867,1220,992],[1195,861,1320,994],[1296,862,1416,1000],
  [1390,857,1502,997],[1480,858,1591,997],[1547,843,1659,1043]
 ];
 const glintTargets=[[560,873],[696,892],[790,890],[915,900],[981,866],[1107,849],
  [1191,896],[1255,885],[1370,884],[1450,878],[1552,883],[1608,915]];
 const debug=new URLSearchParams(location.search).has('titleMask');
 const clamp=x=>Math.max(0,Math.min(1,x));
 let overlays=[document.getElementById('cover-logo-button')].filter(Boolean),ready=false;

 function inGlyph(x,y){
  // The ship's gold glint above the A is not part of the lettering.
  if(x>=630&&x<682&&y<835)return false;
  for(const [left,top,right,bottom] of glyphs)
   if(x>=left&&x<right&&y>=top&&y<bottom)return true;
  return false;
 }

 function extractTitle(){
  const matte=document.createElement('canvas');
  matte.width=region.w;matte.height=region.h;
  const mc=matte.getContext('2d',{willReadFrequently:true});
  mc.drawImage(art,region.x,region.y,region.w,region.h,0,0,region.w,region.h);
  const pixels=mc.getImageData(0,0,region.w,region.h);
  const data=pixels.data,alpha=new Uint8Array(region.w*region.h);

  for(let y=0;y<region.h;y++)for(let x=0;x<region.w;x++){
   if(!inGlyph(x+region.x,y+region.y))continue;
   const p=y*region.w+x,i=p*4,r=data[i],g=data[i+1],b=data[i+2];
   // Local glyph envelopes plus gold chroma exclude the blue sea and foam.
   const gold=clamp((g-b-17)/33)*clamp((r-b-34)/46)*clamp((r-66)/82);
   alpha[p]=Math.round(255*gold);
  }
  for(let y=0;y<region.h;y++)for(let x=0;x<region.w;x++){
   const p=y*region.w+x,i=p*4,a=alpha[p];
   let neighbours=0;
   if(x>0)neighbours+=alpha[p-1]>25;
   if(x<region.w-1)neighbours+=alpha[p+1]>25;
   if(y>0)neighbours+=alpha[p-region.w]>25;
   if(y<region.h-1)neighbours+=alpha[p+region.w]>25;
   data[i]=data[i+1]=data[i+2]=255;
   data[i+3]=a>22&&neighbours>=2?a:0;
  }

  // Remove disconnected warm wave flecks; real letter surfaces form large pieces.
  const seen=new Uint8Array(region.w*region.h);
  for(let start=0;start<seen.length;start++){
   if(seen[start]||!data[start*4+3])continue;
   const component=[start];seen[start]=1;
   for(let q=0;q<component.length;q++){
    const p=component[q],x=p%region.w,y=Math.floor(p/region.w);
    const next=[];
    if(x>0)next.push(p-1);
    if(x<region.w-1)next.push(p+1);
    if(y>0)next.push(p-region.w);
    if(y<region.h-1)next.push(p+region.w);
    for(const n of next)if(!seen[n]&&data[n*4+3]){seen[n]=1;component.push(n);}
   }
   if(component.length<250)for(const p of component)data[p*4+3]=0;
  }
  mc.putImageData(pixels,0,0);

  const isolated=document.createElement('canvas');
  isolated.width=region.w;isolated.height=region.h;
  const ic=isolated.getContext('2d');
  ic.drawImage(art,region.x,region.y,region.w,region.h,0,0,region.w,region.h);
  ic.globalCompositeOperation='destination-in';ic.drawImage(matte,0,0);

  const softMatte=document.createElement('canvas');
  softMatte.width=region.w;softMatte.height=region.h;
  const sc=softMatte.getContext('2d');
  sc.filter='blur(1.5px)';
  sc.drawImage(matte,0,0);

  const anchors=glintTargets.map(([tx,ty])=>{
   let best=null,score=0;
   for(let dy=-22;dy<=22;dy++)for(let dx=-22;dx<=22;dx++){
    const x=tx+dx-region.x,y=ty+dy-region.y;
    if(x<0||y<0||x>=region.w||y>=region.h)continue;
    const a=data[(y*region.w+x)*4+3]/(1+(dx*dx+dy*dy)/360);
    if(a>score){score=a;best=[x,y];}
   }
   return score>70?best:null;
  }).filter(Boolean);
  return {maskUrl:matte.toDataURL('image/png'),sweepMaskUrl:softMatte.toDataURL('image/png'),titleUrl:isolated.toDataURL('image/png'),anchors};
 }

 function overlay(name){
  const node=document.createElement('div');
  node.className='cover-title-overlay '+name;
  node.setAttribute('aria-hidden','true');
  root.appendChild(node);overlays.push(node);
  return node;
 }

 function createLayers({maskUrl,sweepMaskUrl,titleUrl,anchors}){
  const maskImage='url("'+maskUrl+'")';
  if(debug){
   const preview=overlay('cover-title-debug');
   preview.style.maskImage=maskImage;
   preview.style.webkitMaskImage=maskImage;
   preview.style.maskSize=preview.style.webkitMaskSize='100% 100%';
   return;
  }

  const copy=document.createElement('img');
  copy.src=titleUrl;
  copy.alt='';
  copy.className='cover-title-overlay cover-title-copy';
  copy.setAttribute('aria-hidden','true');
  root.appendChild(copy);overlays.push(copy);

  for(const name of ['cover-title-glow','cover-title-sweep']){
   const node=overlay(name);
   const layerMask=name==='cover-title-sweep'?'url("'+sweepMaskUrl+'")':maskImage;
   node.style.maskImage=layerMask;
   node.style.webkitMaskImage=layerMask;
   node.style.maskSize=node.style.webkitMaskSize='100% 100%';
  }

  // Isolated lettering only: duplicate silhouettes expand without lighting the sea.
  for(const name of ['cover-title-impact','cover-title-echo','cover-title-echo-secondary']){
   const echo=document.createElement('img');echo.src=titleUrl;echo.alt='';
   echo.className='cover-title-overlay '+name;echo.setAttribute('aria-hidden','true');
   root.appendChild(echo);overlays.push(echo);
  }
  const stars=overlay('cover-title-glints');
  for(const [index,anchorIndex] of [0,5,8,11].entries()){
   const point=anchors[anchorIndex];
   if(!point)continue;
   const star=document.createElement('i');
   star.className='cover-title-star';
   star.style.left=(point[0]/region.w*100)+'%';
   star.style.top=(point[1]/region.h*100)+'%';
   star.style.animationDelay=(-index*1.85)+'s';
   stars.appendChild(star);
  }
 }

 function layout(){
  if(!ready)return;
  const box=root.getBoundingClientRect();
  if(!box.width||!box.height)return;
  const scale=Math.min(box.width/art.naturalWidth,box.height/art.naturalHeight);
  const left=(box.width-art.naturalWidth*scale)/2+region.x*scale;
  const top=(box.height-art.naturalHeight*scale)/2+region.y*scale;
  for(const node of overlays){
   node.style.left=left+'px';node.style.top=top+'px';
   node.style.width=region.w*scale+'px';
   node.style.height=region.h*scale+'px';
  }
 }

 function init(){
  if(ready||!art.naturalWidth)return;
  try{
   if(art.naturalWidth!==2048||art.naturalHeight!==1152)return;
   createLayers(extractTitle());
   ready=true;layout();
   root.dataset.titleEffectsReady='true';
   window.dispatchEvent(new Event('pirate-title-ready'));
  }catch(error){console.warn('Title light unavailable:',error);}
 }
 art.addEventListener('load',init);
 if(art.complete&&art.naturalWidth)init();
 window.addEventListener('resize',layout,{passive:true});
})();
