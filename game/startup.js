// Classic bootstrap stays usable even when the game module or WebGL fails.
(()=>{
 const root=document.getElementById('startup'),art=document.getElementById('cover-art'),button=document.getElementById('continue-button'),retry=document.getElementById('startup-retry'),message=document.getElementById('startup-message'),bar=document.getElementById('startup-progress'),percent=document.getElementById('startup-percent');
 const logoButton=document.getElementById('cover-logo-button');
 let ready=false,requested=false,failed=false,revealing=false,blackAt=Infinity,previousA=false,progress=0;
 const unlockAt=performance.now()+1000;
 setTimeout(()=>{if(requested||failed)return;for(const target of [button,logoButton]){target.hidden=false;target.disabled=false;}root.dataset.inputReady='true';},1000);
 window.pirateStartup={active:true,report,fail};
 function report(value,text){
  if(failed||value<=progress)return;progress=value;bar.value=progress;percent.textContent=Math.round(progress)+'%';message.textContent=text;
  if(value>=100){ready=true;document.getElementById('startup-background-status').hidden=true;maybeReveal();}
 }
 function fail(){
  if(failed)return;failed=true;ready=false;revealing=false;root.hidden=false;root.style.opacity='1';root.dataset.state='error';root.classList.remove('exit-requested');window.pirateStartup.active=true;
  message.textContent='The voyage could not load. Please retry.';bar.hidden=true;percent.textContent='Check your connection and WebGL support.';retry.hidden=false;retry.focus({preventScroll:true});
  document.querySelector('#screen')?.setAttribute('inert','');
 }
 function maybeReveal(){
  if(!requested||failed||revealing||root.dataset.state!=='loading')return;
  if(!ready&&performance.now()<blackAt+3000)return;
  root.dataset.state='revealing';
  document.getElementById('startup-background-status').hidden=ready;
  if(ready)root.classList.remove('exit-requested');
  revealing=true;root.style.opacity='0';
  // A timer, not transitionend: reduced-motion or a cancelled transition cannot trap input.
  setTimeout(()=>{if(failed)return;root.hidden=true;window.pirateStartup.active=false;document.querySelector('#screen')?.removeAttribute('inert');document.getElementById('start-button')?.focus({preventScroll:true});},ready?700:Math.max(0,blackAt+3700-performance.now()));
 }
 function proceed(){
  if(requested||failed||performance.now()<unlockAt)return;
  requested=true;button.disabled=logoButton.disabled=true;
  window.pirateCoverMusic?.fadeOut();
  root.dataset.state='departing';blackAt=performance.now()+1000;
  // A compositor deadline keeps the screen lighting up even if a scene job
  // briefly delays the JS timer. Readiness may reveal it earlier.
  root.classList.add('exit-requested');
  window.dispatchEvent(new Event('pirate-title-impact'));
  setTimeout(()=>{
   if(failed)return;
   root.dataset.state='loading';
   maybeReveal();setTimeout(maybeReveal,Math.max(0,blackAt+3000-performance.now()));
  },1000);
 }
 button.addEventListener('click',proceed);logoButton.addEventListener('click',proceed);retry.addEventListener('click',()=>location.reload());
 window.addEventListener('keydown',e=>{if(!window.pirateStartup.active||e.target?.id==='cover-music-enable')return;if(['Enter','Space'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)(failed?retry:button).click();}else if(e.code.startsWith('Arrow')){e.preventDefault();e.stopImmediatePropagation();(failed?retry:button).classList.add('is-selected');}},true);
 root.addEventListener('pointermove',()=>{button.classList.remove('is-selected');retry.classList.remove('is-selected');});
 const padTimer=setInterval(()=>{
  if(!window.pirateStartup.active)return;
  try{const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected),a=!!pad?.buttons[0]?.pressed;
   if(pad?.axes.some(v=>Math.abs(v)>.55))(failed?retry:button).classList.add('is-selected');
   if(a&&!previousA)(failed?retry:button).click();previousA=a;
  }catch{/* Keyboard and pointer remain available if Gamepad API is restricted. */}
 },80);
 function showArt(){root.classList.add('art-ready');}
 art.addEventListener('load',showArt);if(art.complete&&art.naturalWidth)requestAnimationFrame(showArt);
 art.addEventListener('error',()=>{art.hidden=true;});
 window.addEventListener('error',()=>{if(window.pirateStartup.active)fail();});
 window.addEventListener('unhandledrejection',()=>{if(window.pirateStartup.active)fail();});
 window.addEventListener('pagehide',()=>clearInterval(padTimer));
 document.addEventListener('DOMContentLoaded',()=>{
  document.querySelector('#screen').setAttribute('inert','');
  report(10,'Loading navigation systems');
  // Boot is independent of input and of cover image decoding.
  import('./main.js').catch(fail);
 });
})();
