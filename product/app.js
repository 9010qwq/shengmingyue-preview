/* 生明月 · all personal input stays in this page's memory. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const state={a:null,b:null,nameA:'你',nameB:'对方',message:'',hideYear:true,theme:'sea',reading:null,progress:0};
  let posterFrame=0,toastTimer=0,revision=0;
  function notify(message){clearTimeout(toastTimer);$('status-message').textContent=message;$('status-message').classList.add('visible');toastTimer=setTimeout(()=>$('status-message').classList.remove('visible'),4200);}
  function plain(value,limit){return Array.from(value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim()).slice(0,limit).join('');}
  function number(x){return (x*100).toFixed(1)+'%';}
  function dateDisplay(value){return value.replace(/-/g,' . ');}
  function readPosterInputs(){
    state.nameA=plain($('name-a').value,16)||'你';
    state.nameB=plain($('name-b').value,16)||'对方';
    state.message=plain($('message').value,60);
    state.hideYear=$('hide-year').checked;
  }
  function fillFacts(){
    [['a',state.a,state.nameA],['b',state.b,state.nameB]].forEach(([id,moon,name])=>{
      $('fact-name-'+id).textContent=name;$('fact-date-'+id).textContent=dateDisplay(moon.date);
      $('fact-phase-'+id).textContent=moon.name+' · '+(moon.waxing?'渐盈':'渐亏');
      $('fact-light-'+id).textContent='受光 '+number(moon.fraction)+' · '+moon.side;
    });
    $('moon-reading').textContent=state.nameA+'：'+Lunar.moonLine(state.a)+'\n'+state.nameB+'：'+Lunar.moonLine(state.b);
    $('moon-stage').setAttribute('aria-label',`${state.nameA}的${state.a.name}，${state.nameB}的${state.b.name}。${state.progress===1?'已在统一视向下叠合':'两轮月亮逐渐靠近'}。可用下方滑轨控制。`);
  }
  function mergedCaption(geometry){
    if(geometry.union===1)return '相遇，则是圆满';
    // The three areas use the same sampled disk, so equal pixel counts give equal fractions.
    if(geometry.union>Math.max(geometry.a,geometry.b))return '月色，从此有了两轮弧光';
    return '不变的光辉里，多了一份陪伴';
  }
  function progress(value){
    state.progress=Math.max(0,Math.min(1,value));$('merge-range').value=String(Math.round(state.progress*100));
    const desc=state.progress===0?'各自的月色':state.progress===1?'同一片月色':'正在靠近';
    $('merge-description').textContent=desc;$('merge-range').setAttribute('aria-valuetext',desc);
    const caption=state.progress===1&&state.reading?mergedCaption(state.reading.geometry):'各自的月亮，向彼此靠近';
    $('stage-label').textContent=caption;
    if(state.a){MoonArt.stage($('moon-stage'),state.a,state.b,state.theme,state.progress);fillFacts();}
  }
  function renderPoster(){
    readPosterInputs();
    const card=MoonArt.makeCanvas(1080,1440);
    MoonArt.renderCard(card,state);
    const url=card.toDataURL('image/png');
    $('export-image').src=url;
    $('export-image').alt=`${state.nameA}与${state.nameB}的月色纪念海报`;
    $('download').href=url;
  }
  function refreshPoster(){
    cancelAnimationFrame(posterFrame);
    posterFrame=0;
    if(!state.a||$('result').hidden)return;
    try{renderPoster();}
    catch(e){
      $('export-image').removeAttribute('src');
      $('download').removeAttribute('href');
      notify('海报暂未生成，请重新试一次。');
    }
  }
  function validate(which){
    const input=$('date-'+which);let moon=null;
    try {moon=Lunar.calculate(input.value);$('error-'+which).textContent='';input.removeAttribute('aria-invalid');}
    catch(e){$('error-'+which).textContent=input.value?e.message:'请填写这位的完整公历生日。';input.setAttribute('aria-invalid','true');}
    return moon;
  }
  async function generate(){
    const a=validate('a'),b=validate('b');if(!a||!b){(!a?$('date-a'):$('date-b')).focus();return;}
    const ownRevision=++revision;$('generate').disabled=true;$('generate').textContent='正在找回月色…';
    try {
      await MoonArt.ready;
      await document.fonts.load('24px "Moon Serif"');
      if(ownRevision!==revision)return;
      state.a=a;state.b=b;state.reading=Lunar.interpret(a,b);
      renderPoster();
      $('meeting-label').textContent=state.reading.label;$('result-heading').textContent=state.reading.title;
      $('meeting-reading').textContent=state.reading.meeting;$('action-reading').textContent=state.reading.action;
      $('entry').hidden=true;$('result').hidden=false;progress(0);
      window.scrollTo({top:0,behavior:'instant'});$('result').focus({preventScroll:true});
      notify('两轮月亮已找到。拖动滑轨，让月色相遇。');
    }catch(e){notify(e.message||'月色暂未生成，请重新打开完整文件夹后再试。');}
    finally{$('generate').disabled=false;$('generate').innerHTML='让月色相遇 <span aria-hidden="true">→</span>';}
  }
  function returnToDates(clear){
    revision++;
    cancelAnimationFrame(posterFrame);
    posterFrame=0;
    $('export-image').removeAttribute('src');
    $('download').removeAttribute('href');
    if(clear){
      $('birthday-form').reset();$('message').value='';$('hide-year').checked=true;
      state.a=null;state.b=null;state.reading=null;state.nameA='你';state.nameB='对方';state.message='';state.hideYear=true;state.progress=0;
      ['fact-name-a','fact-name-b','fact-date-a','fact-date-b','fact-phase-a','fact-phase-b','fact-light-a','fact-light-b','moon-reading','meeting-reading','action-reading','result-heading','meeting-label'].forEach(id=>$(id).textContent='');
      const stage=$('moon-stage');
      stage.getContext('2d').clearRect(0,0,stage.width,stage.height);
      window.dispatchEvent(new Event('moon:reset'));
    }
    ['a','b'].forEach(id=>{$('error-'+id).textContent='';$('date-'+id).removeAttribute('aria-invalid');});
    $('result').hidden=true;$('entry').hidden=false;window.scrollTo({top:0,behavior:'instant'});
    if(clear)notify('已清除这次输入。下一片月色，重新开始。');
  }
  $('birthday-form').addEventListener('submit',e=>{e.preventDefault();generate();});
  ['a','b'].forEach(id=>$('date-'+id).addEventListener('input',()=>{$('error-'+id).textContent='';$('date-'+id).removeAttribute('aria-invalid');}));
  $('merge-range').addEventListener('input',e=>progress(Number(e.target.value)/100));
  $('edit-dates').addEventListener('click',()=>returnToDates(false));
  $('message').addEventListener('input',()=>{
    cancelAnimationFrame(posterFrame);
    posterFrame=requestAnimationFrame(refreshPoster);
  });
  $('hide-year').addEventListener('change',refreshPoster);
  $('download').addEventListener('click',e=>{
    if(posterFrame)refreshPoster();
    if(!$('download').hasAttribute('href'))e.preventDefault();
  });
  document.querySelectorAll('.about-button').forEach(button=>button.addEventListener('click',()=>$('about-dialog').showModal()));
  document.querySelectorAll('.close-about').forEach(button=>button.addEventListener('click',()=>$('about-dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}));
  MoonArt.ready.then(()=>MoonArt.welcome($('welcome-art'),Lunar.calculate('2000-02-12'),Lunar.calculate('2000-02-27'))).catch(e=>notify(e.message));
  // Do not preserve input through the browser's back-forward cache.
  window.addEventListener('pageshow',e=>{if(e.persisted)returnToDates(true);});
})();
