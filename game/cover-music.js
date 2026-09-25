// Cover-only music. Audio failure must never block game startup.
(()=>{
 const audio=document.getElementById('cover-music'),button=document.getElementById('cover-music-enable');
 let context,gain,leaving=false,stopped=false,stopTimer;
 function stop(){stopped=true;clearTimeout(stopTimer);audio.pause();audio.currentTime=0;button.hidden=true;context?.close().catch(()=>{});}
 function start(){
  if(stopped)return;
  try{
   if(!context){
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    context=new AudioContext();gain=context.createGain();
    context.createMediaElementSource(audio).connect(gain);gain.connect(context.destination);
   }
   // Invoke both within the input handler so user activation is preserved.
   const resumed=context.resume(),playing=audio.play();
   Promise.all([resumed,playing]).then(()=>{
    if(stopped){audio.pause();return;}
    button.hidden=true;
   }).catch(()=>{if(!leaving&&!stopped)button.hidden=false;});
   if(context.state!=='running'&&!leaving)button.hidden=false;
  }catch{if(!leaving&&!stopped)button.hidden=false;}
 }
 function fadeOut(){
  if(leaving||stopped)return;leaving=true;button.hidden=true;
  start();
  if(gain){
   const now=context.currentTime;
   gain.gain.cancelScheduledValues(now);
   gain.gain.setValueAtTime(gain.gain.value,now);
   gain.gain.linearRampToValueAtTime(0,now+2);
  }
  stopTimer=setTimeout(stop,2000);
 }
 button.addEventListener('click',event=>{event.stopPropagation();start();});
 window.addEventListener('pagehide',stop);
 window.pirateCoverMusic={start,fadeOut};
 start();
})();
