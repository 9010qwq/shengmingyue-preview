(() => {
  'use strict';
  const audio=document.getElementById('moon-music'),button=document.getElementById('music-toggle'),label=document.getElementById('music-label'),feedback=document.getElementById('music-feedback');
  if(!audio||!button)return;
  document.querySelector('.music-volume')?.remove();
  let saved={},wanted=false;
  try{saved=JSON.parse(sessionStorage.getItem('smy-music')||'{}');}catch{}
  audio.volume=.25;
  const persist=()=>{try{sessionStorage.setItem('smy-music',JSON.stringify({volume:audio.volume,enabled:wanted,time:audio.currentTime}));}catch{}};
  const reflect=()=>{const text=audio.paused?(wanted?'继续音乐':'开启音乐'):'暂停音乐';button.setAttribute('aria-label',text);button.setAttribute('aria-pressed',String(!audio.paused));button.title=text;label.textContent=text;};
  async function play(){wanted=true;feedback.textContent='正在载入音乐…';try{await audio.play();feedback.textContent='';}catch{feedback.textContent='点一下继续播放';}reflect();persist();}
  button.addEventListener('click',()=>{if(audio.paused)play();else{wanted=false;audio.pause();feedback.textContent='';reflect();persist();}});
  audio.addEventListener('play',reflect);audio.addEventListener('pause',reflect);
  audio.addEventListener('error',()=>{feedback.textContent='音乐暂未载入，点一下重试';reflect();});
  audio.addEventListener('loadedmetadata',()=>{if(saved.time>0&&saved.time<audio.duration)audio.currentTime=saved.time;saved.time=0;},{once:true});
  window.addEventListener('pagehide',persist);reflect();if(saved.enabled)play();
})();
