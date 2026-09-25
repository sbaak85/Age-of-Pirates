// Classic bootstrap stays usable even when the game module or WebGL fails.
(()=>{
 const root=document.getElementById('startup'),art=document.getElementById('cover-art'),button=document.getElementById('continue-button'),retry=document.getElementById('startup-retry'),message=document.getElementById('startup-message'),bar=document.getElementById('startup-progress'),percent=document.getElementById('startup-percent');
 let ready=false,rendered=false,requested=false,failed=false,revealing=false,fadeAt=0,previousA=false,progress=0;
 window.pirateStartup={active:true,report,fail};
 function report(value,text){
  if(failed||value<=progress)return;progress=value;bar.value=progress;percent.textContent=Math.round(progress)+'%';message.textContent=text;
  if(value>=75)rendered=true;if(value>=100){ready=true;maybeReveal();}
 }
 function fail(){
  if(failed)return;failed=true;ready=false;revealing=false;root.hidden=false;root.style.opacity='1';root.dataset.state='error';window.pirateStartup.active=true;
  message.textContent='The voyage could not load. Please retry.';bar.hidden=true;percent.textContent='Check your connection and WebGL support.';retry.hidden=false;retry.focus({preventScroll:true});
  document.querySelector('#screen')?.setAttribute('inert','');
 }
 function maybeReveal(){
  if(!requested||!ready||failed||revealing)return;
  const remaining=fadeAt-performance.now();if(remaining>0){setTimeout(maybeReveal,remaining);return;}
  revealing=true;root.style.opacity='0';
  // A timer, not transitionend: reduced-motion or a cancelled transition cannot trap input.
  setTimeout(()=>{if(failed)return;root.hidden=true;window.pirateStartup.active=false;document.querySelector('#screen')?.removeAttribute('inert');document.getElementById('start-button')?.focus({preventScroll:true});},700);
 }
 function proceed(){if(requested||failed)return;requested=true;window.pirateCoverMusic?.fadeOut();root.dataset.state='loading';fadeAt=performance.now()+650;maybeReveal();}
 root.addEventListener('click',e=>{if(e.target!==retry)proceed();});retry.addEventListener('click',()=>location.reload());
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
  // Paint the cover before starting procedural scene construction.
  setTimeout(()=>import('./main.js').catch(fail),120);
  setTimeout(()=>{if(ready||failed)return;if(rendered){report(100,'Ready to sail');}else fail();},25000);
 });
})();
