/* 生明月 · original canvas layouts; continuous physical phase masks. */
(function(root){
  'use strict';
  const SERIF='"Moon Serif", "Songti SC", "SimSun", serif';
  const SANS='"Segoe UI", "Microsoft YaHei", sans-serif';
  let texture=null, tw=0, th=0, textureMode='standard', highPromise=null;
  const sphereCache=new Map(), moonCache=new Map(), backdropCache=new Map();
  const renderAudit=[];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function random(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
  function loadTexture(source,mode){return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{try{tw=img.naturalWidth;th=img.naturalHeight;const c=makeCanvas(tw,th),x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0);texture=x.getImageData(0,0,tw,th).data;textureMode=mode;sphereCache.clear();moonCache.clear();resolve();}catch(e){reject(e);}};
    img.onerror=()=>reject(new Error('月面素材未能载入，请保留完整文件夹后重试。'));
    img.src=source;
  });}
  const ready=loadTexture(root.MOON_TEXTURE,'standard');
  function highReady(){if(!root.MOON_TEXTURE_HIGH)return Promise.reject(new Error('请保留完整礼物包素材。'));if(!highPromise)highPromise=ready.then(()=>loadTexture(root.MOON_TEXTURE_HIGH,'high'));return highPromise;}
  function scaleOf(ctx){const t=ctx.getTransform();return Math.max(Math.hypot(t.a,t.b),Math.hypot(t.c,t.d));}
  function sphere(size){
    if(sphereCache.has(size))return sphereCache.get(size);
    if(!texture)throw new Error('月面素材尚未载入');
    const data=new Float32Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=(x+.5)*2/size-1,v=1-(y+.5)*2/size,r2=u*u+v*v,i=(y*size+x)*4;
      if(r2>1)continue;
      const z=Math.sqrt(1-r2),lon=Math.atan2(u,z),lat=Math.asin(v);
      const tx=clamp(Math.round((.5+lon/(2*Math.PI))*(tw-1)),0,tw-1),ty=clamp(Math.round((.5-lat/Math.PI)*(th-1)),0,th-1),j=(ty*tw+tx)*4;
      const albedo=.2126*texture[j]+.7152*texture[j+1]+.0722*texture[j+2];
      data[i]=u;data[i+1]=z;data[i+2]=clamp((albedo-28)*1.33+35,25,245);data[i+3]=clamp((1-Math.sqrt(r2))*size/2,0,1);
    }
    sphereCache.set(size,data);if(sphereCache.size>5)sphereCache.delete(sphereCache.keys().next().value);return data;
  }
  function moon(m,size,theme='sea'){
    const key=`${m.instant}|${size}|${theme}`;
    if(moonCache.has(key))return moonCache.get(key);
    const base=sphere(size),dark=makeCanvas(size,size),light=makeCanvas(size,size);
    const dx=dark.getContext('2d'),lx=light.getContext('2d'),dd=dx.createImageData(size,size),ld=lx.createImageData(size,size);
    for(let i=0;i<base.length;i+=4){
      if(!base[i+3])continue;
      const incidence=base[i]*m.sunX+base[i+1]*m.sunZ;
      const alpha=base[i+3],paper=theme==='letter';
      const d=paper?20:12;
      dd.data[i]=d+base[i+2]*.025;dd.data[i+1]=d+(paper?0:8)+base[i+2]*.03;dd.data[i+2]=d+(paper?-1:14)+base[i+2]*.035;dd.data[i+3]=255*alpha;
      // No artificial light in the shadow mask. A small terminator antialias lies on the lit side only.
      if(incidence<=0)continue;
      const value=base[i+2]*(.34+.66*Math.pow(incidence,.28));
      ld.data[i]=value*(paper?1:.96);ld.data[i+1]=value*(paper?.98:1);ld.data[i+2]=value*(paper?.93:1.015);ld.data[i+3]=255*alpha*clamp(incidence*size*1.8,0,1);
    }
    dx.putImageData(dd,0,0);lx.putImageData(ld,0,0);
    const result={dark,light};moonCache.set(key,result);
    renderAudit.push({size,textureWidth:tw,textureHeight:th,textureMode});if(renderAudit.length>80)renderAudit.shift();
    if(moonCache.size>10)moonCache.delete(moonCache.keys().next().value);
    return result;
  }
  // Lighten is max(channel), never additive/screen. Layers share a transparent buffer
  // so the paper background cannot suppress silver highlights.
  function drawPair(ctx,a,b,theme,cx,cy,r,separation,outline=true){
    const scale=scaleOf(ctx),size=Math.ceil(r*2*scale),gap=Math.round(separation*scale),A=moon(a,size,theme),B=moon(b,size,theme);
    const left=cx-separation/2-r,right=cx+separation/2-r,top=cy-r;
    const buffer=makeCanvas(size+gap+4,size+4),bx=buffer.getContext('2d');
    bx.drawImage(A.dark,1,1);bx.drawImage(B.dark,gap+1,1);
    bx.globalCompositeOperation='lighten';bx.drawImage(A.light,1,1);bx.drawImage(B.light,gap+1,1);
    ctx.drawImage(buffer,left-1/scale,top-1/scale,buffer.width/scale,buffer.height/scale);
    if(outline){ctx.save();ctx.lineWidth=.8;ctx.strokeStyle=theme==='letter'?'#78716766':'#8aa8b833';
      [left,right].forEach(x=>{ctx.beginPath();ctx.arc(x+r,top+r,r+.6,0,Math.PI*2);ctx.stroke();});ctx.restore();}
  }
  function single(ctx,m,theme,x,y,r){const s=moon(m,Math.ceil(r*2*scaleOf(ctx)),theme);ctx.drawImage(s.dark,x-r,y-r,r*2,r*2);ctx.drawImage(s.light,x-r,y-r,r*2,r*2);}
  function tracked(ctx,text,x,y,size,spacing,color,align='center',family=SERIF){
    ctx.save();ctx.font=`${size}px ${family}`;ctx.textBaseline='middle';ctx.fillStyle=color;
    const chars=Array.from(text),width=chars.reduce((s,c)=>s+ctx.measureText(c).width,0)+Math.max(0,chars.length-1)*spacing;
    let xx=align==='center'?x-width/2:align==='right'?x-width:x;
    for(const ch of chars){ctx.fillText(ch,xx,y);xx+=ctx.measureText(ch).width+spacing;}ctx.restore();
  }
  function fitText(ctx,text,x,y,maxWidth,size,color,align='center',family=SERIF){
    ctx.save();ctx.font=`${size}px ${family}`;
    while(size>16&&ctx.measureText(text).width>maxWidth){size-=1;ctx.font=`${size}px ${family}`;}
    ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(text,x,y);ctx.restore();
  }
  function wrap(ctx,text,x,y,maxWidth,size,lineHeight,color,maxLines=4){
    ctx.save();ctx.font=`${size}px ${SERIF}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;
    const chars=Array.from(text),lines=[];let line='';
    for(const ch of chars){if(ch==='\n'){lines.push(line);line='';continue;}if(ctx.measureText(line+ch).width>maxWidth&&line){lines.push(line);line=ch;}else line+=ch;}
    if(line)lines.push(line);
    lines.slice(0,maxLines).forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));ctx.restore();return lines.length;
  }
  function sea(ctx,w,h,horizon,reflection=1){
    const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#080f22');g.addColorStop(horizon/h,'#193440');g.addColorStop(1,'#071a25');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    // Original, seeded sky decoration; it is not a reconstruction of a birth sky.
    ctx.save();ctx.beginPath();ctx.rect(0,0,w,horizon);ctx.clip();
    const nebula=ctx.createRadialGradient(w*.76,horizon*.18,0,w*.76,horizon*.18,w*.58);
    nebula.addColorStop(0,'#6d6da021');nebula.addColorStop(.42,'#34527c15');nebula.addColorStop(1,'#16334b00');
    ctx.fillStyle=nebula;ctx.fillRect(0,0,w,horizon);
    const starlight=random(825),starCount=Math.min(220,Math.max(48,Math.round(w*horizon/4200)));
    for(let i=0;i<starCount;i++){
      const x=starlight()*w,y=starlight()*horizon*.92,r=.45+Math.pow(starlight(),3)*1.1;
      const opacity=(.15+starlight()*.48)*(1-y/horizon*.7);
      ctx.fillStyle=`rgba(205,222,240,${opacity})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      if(i%37===0){ctx.strokeStyle=`rgba(208,228,244,${opacity*.36})`;ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();}
    }
    ctx.restore();
    const haze=ctx.createRadialGradient(w*.5,horizon,0,w*.5,horizon,w*.66);haze.addColorStop(0,'#668c9729');haze.addColorStop(.5,'#355b6810');haze.addColorStop(1,'#11273700');ctx.fillStyle=haze;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#b8d5df22';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(0,horizon);ctx.bezierCurveTo(w*.3,horizon-1,w*.7,horizon+2,w,horizon);ctx.stroke();
    const rnd=random(101);
    for(let i=0;i<220;i++){
      const p=rnd(),yy=horizon+4+p*p*(h-horizon),xx=rnd()*w,l=6+rnd()*50*p,dist=Math.abs(xx-w/2)/(w*(.025+.15*p));
      const glow=Math.exp(-dist*dist)*(.06+.29*reflection)*(1-p*.75);
      ctx.strokeStyle=`rgba(159,193,204,${.006+rnd()*.015+glow})`;ctx.lineWidth=.45+p*1.4;
      ctx.beginPath();ctx.moveTo(xx-l/2,yy);ctx.lineTo(xx+l/2,yy);ctx.stroke();
    }
  }
  function paper(ctx,w,h){
    ctx.fillStyle='#f4f0e8';ctx.fillRect(0,0,w,h);
    const light=ctx.createRadialGradient(w*.4,h*.1,0,w*.5,h*.4,h*.85);light.addColorStop(0,'#ffffff77');light.addColorStop(1,'#c4bfb30c');ctx.fillStyle=light;ctx.fillRect(0,0,w,h);
    const rnd=random(13);for(let i=0;i<11000;i++){const x=rnd()*w,y=rnd()*h;ctx.fillStyle=`rgba(92,79,57,${.012+rnd()*.02})`;ctx.fillRect(x,y,rnd()*1.4+.3,rnd()*1.2+.3);}
  }
  function stage(canvas,a,b,theme,progress){
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    const backdropKey=`${theme}|${w}|${h}|${Math.max(a.fraction,b.fraction).toFixed(3)}`;
    if(!backdropCache.has(backdropKey)){
      const bg=makeCanvas(w,h),bgx=bg.getContext('2d');
      if(theme==='letter')paper(bgx,w,h);else sea(bgx,w,h,h*.70,Math.max(a.fraction,b.fraction));
      backdropCache.set(backdropKey,bg);if(backdropCache.size>6)backdropCache.delete(backdropCache.keys().next().value);
    }
    ctx.drawImage(backdropCache.get(backdropKey),0,0);
    const r=w*.177,sep=w*.40*(1-progress),cy=h*.43;
    drawPair(ctx,a,b,theme,w/2,cy,r,sep);
    if(theme==='letter'){ctx.strokeStyle='#98887633';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w*.15,h*.73);ctx.lineTo(w*.85,h*.73);ctx.stroke();}
    const color=theme==='letter'?'#8b7e6b':'#8aa9b5';
    tracked(ctx,progress>.995?'两个月相 · 同一视向':'I',progress>.995?w/2:w*.30,h*.79,progress>.995?17:21,2,color,'center',progress>.995?SERIF:'Georgia');
    if(progress<.995)tracked(ctx,'II',w*.70,h*.79,21,2,color,'center','Georgia');
  }
  function welcome(canvas,a,b){
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    sea(ctx,w,h,h*.64,.55);drawPair(ctx,a,b,'sea',w/2,h*.34,w*.124,w*.30);
    const fade=ctx.createLinearGradient(0,0,0,h);fade.addColorStop(0,'#09192300');fade.addColorStop(.8,'#09192300');fade.addColorStop(1,'#091923');ctx.fillStyle=fade;ctx.fillRect(0,0,w,h);
  }
  function formatDate(d,hide){const [y,m,day]=d.split('-');return hide?`${m} . ${day}`:`${y} . ${m} . ${day}`;}
  function nameDate(ctx,m,name,x,y,maxWidth,color,sub,hide){
    fitText(ctx,name,x,y,maxWidth,29,color);tracked(ctx,formatDate(m.date,hide),x,y+48,18,2,sub,'center',SANS);
    tracked(ctx,m.name,x,y+83,17,2,sub);
  }
  function renderCard(canvas,state){
    const {a,b,nameA,nameB,message,hideYear,theme,reading}=state; const timeNote=(state.timeA||state.timeB||state.offsetA!==undefined)?"按所选日期与参考时刻绘制 · 标准视向":"按当天中午估算 · UTC+08:00 · 标准视向";
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    ctx.save();ctx.scale(w/1080,h/1440);
    if(theme==='sea'){
      sea(ctx,1080,1440,705,Math.max(a.fraction,b.fraction));
      tracked(ctx,'生 明 月',540,96,24,5,'#c4d4d8');
      tracked(ctx,'海上生明月',540,210,60,8,'#ebece5');
      tracked(ctx,'天 涯 共 此 时',540,292,23,5,'#a1bac4');
      drawPair(ctx,a,b,'sea',540,521,159,0);
      // The source moons remain visible below the union, with the same phase orientation.
      single(ctx,a,'sea',292,836,47);single(ctx,b,'sea',788,836,47);
      ctx.strokeStyle='#c1d3d744';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(430,838);ctx.lineTo(650,838);ctx.stroke();
      tracked(ctx,'共此月色',540,810,14,3,'#97b2bc');
      nameDate(ctx,a,nameA,292,937,355,'#e5e7df','#94adb8',hideYear);nameDate(ctx,b,nameB,788,937,355,'#e5e7df','#94adb8',hideYear);
      const msg=message.trim()||reading.verse.join('\n');
      wrap(ctx,msg,540,1121,810,message.trim()?27:30,49,'#c7d5d8',4);
      tracked(ctx,reading.label+' · 月相意象',540,1320,17,3,'#819da9');
      tracked(ctx,timeNote,540,1367,14,1,'#809ba6','center',SANS);
      tracked(ctx,'月面纹理 / NASA SVS  ·  意象仅供娱乐',540,1395,11,1,'#708a96','center',SANS);
    }else{
      paper(ctx,1080,1440);
      ctx.strokeStyle='#98867455';ctx.lineWidth=1;ctx.strokeRect(48.5,48.5,983,1343);
      tracked(ctx,'生明月 / A LETTER IN MOONLIGHT',110,102,17,2,'#867b6a','left',SANS);
      tracked(ctx,'月色来信',110,224,66,6,'#3b494a','left');
      tracked(ctx,'写给此刻，也写给我们。',114,312,22,3,'#817362','left');
      // The paper theme deliberately keeps the two source moons as its main motif.
      drawPair(ctx,a,b,'letter',540,536,130,476);
      nameDate(ctx,a,nameA,302,745,370,'#3d4b4b','#8a7b66',hideYear);nameDate(ctx,b,nameB,778,745,370,'#3d4b4b','#8a7b66',hideYear);
      ctx.strokeStyle='#98867444';ctx.beginPath();ctx.moveTo(112,899);ctx.lineTo(968,899);ctx.stroke();
      const msg=message.trim()||reading.verse.join('\n');
      wrap(ctx,msg,540,985,830,message.trim()?29:32,51,'#5f5c50',4);
      drawPair(ctx,a,b,'letter',172,1240,43,0);
      tracked(ctx,'合月 · '+reading.label,245,1220,20,2,'#776d5a','left');
      tracked(ctx,'两个月相，留下一个相逢的纪念。',245,1263,16,1,'#8b816f','left');
      ctx.strokeStyle='#a7907988';ctx.lineWidth=1;ctx.strokeRect(890.5,1210.5,61,69);tracked(ctx,'共',921,1231,21,0,'#a07e64');tracked(ctx,'此',921,1259,21,0,'#a07e64');
      tracked(ctx,timeNote,540,1335,14,1,'#968975','center',SANS);
      tracked(ctx,'月面纹理 / NASA SVS  ·  意象仅供娱乐',540,1363,11,1,'#a09481','center',SANS);
    }
    ctx.restore();return canvas;
  }
  root.MoonArt={ready,highReady,stage,welcome,renderCard,formatDate,single,drawPair,makeCanvas,tracked,fitText,wrap,sea,paper,
    audit:()=>({textureMode,textureWidth:tw,textureHeight:th,rasters:renderAudit.slice()}),
    releaseTransient:()=>{sphereCache.clear();moonCache.clear();renderAudit.length=0;}};
})(window);
