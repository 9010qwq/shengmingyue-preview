(function(root){
  'use strict';
  const A=root.MoonArt,serif='"Moon Serif",serif',sans='"Segoe UI","Microsoft YaHei",sans-serif';
  function split(ctx,text,width){
    const lines=[],closing=/^[，。；：！？、）】》」』”’…％%]/,opening=/[（【《「『“‘]$/;
    for(const p of String(text).split('\n')){const chars=Array.from(p);if(!chars.length){lines.push('');continue;}let start=0;while(start<chars.length){let end=start+1;while(end<chars.length&&ctx.measureText(chars.slice(start,end+1).join('')).width<=width)end++;const fitted=end;while(end>start+1&&end<chars.length&&(closing.test(chars[end])||opening.test(chars[end-1])))end--;if(end<=start)end=fitted;lines.push(chars.slice(start,end).join(''));start=end;}}
    return lines;
  }
  function figure(canvas,model,kind){
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/960,canvas.height/420);const {a,b}=model;
    if(kind==='births'){
      A.single(ctx,a,'letter',260,170,113);A.single(ctx,b,'letter',700,170,113);A.fitText(ctx,model.input.nameA,260,320,330,24,'#314e48');A.fitText(ctx,model.input.nameB,700,320,330,24,'#314e48');A.tracked(ctx,a.name+' · '+(a.fraction*100).toFixed(1)+'%',260,367,18,0,'#536d66');A.tracked(ctx,b.name+' · '+(b.fraction*100).toFixed(1)+'%',700,367,18,0,'#536d66');
    }else if(kind==='union'){
      A.single(ctx,a,'letter',157,180,72);A.single(ctx,b,'letter',803,180,72);A.drawPair(ctx,a,b,'letter',480,182,132,0);ctx.strokeStyle='#80968c60';ctx.lineWidth=1;for(const [x1,x2] of [[250,315],[645,710]]){ctx.beginPath();ctx.moveTo(x1,182);ctx.lineTo(x2,182);ctx.stroke();}A.tracked(ctx,'原月相',157,302,17,2,'#536d66');A.tracked(ctx,'原月相',803,302,17,2,'#536d66');A.tracked(ctx,model.reading.label+' · 合月',480,359,23,3,'#314e48');
    }else if(kind==='anniversary'){
      A.single(ctx,a,'letter',170,178,68);A.single(ctx,model.anniversaryMoon,'letter',480,178,120);A.single(ctx,b,'letter',790,178,68);A.fitText(ctx,model.input.nameA,170,308,250,20,'#536d66');A.tracked(ctx,'共同记住的日子',480,340,22,2,'#314e48');A.fitText(ctx,model.input.nameB,790,308,250,20,'#536d66');A.tracked(ctx,model.input.anniversary.replace(/-/g,' . '),480,383,18,2,'#536d66');
    }ctx.restore();return canvas;
  }
  function page(model,chapter,options={}){
    const measure=A.makeCanvas(1080,1).getContext('2d');measure.font='30px '+serif;
    const blocks=chapter.paragraphs.map(text=>({text,lines:split(measure,text,900)})),hasFigure=['births','union','anniversary'].includes(chapter.figure);
    const height=Math.max(850,Math.ceil(270+(hasFigure?430:0)+blocks.reduce((n,b)=>n+b.lines.length*49+29,0)+120));
    const c=A.makeCanvas(1080,height),ctx=c.getContext('2d');ctx.fillStyle='#f4f1e9';ctx.fillRect(0,0,1080,height);const tint=ctx.createLinearGradient(0,0,1080,height);tint.addColorStop(0,'#dce8e245');tint.addColorStop(1,'#fffdfa00');ctx.fillStyle=tint;ctx.fillRect(0,0,1080,height);
    A.tracked(ctx,'生明月 / 双人月亮故事',88,67,17,2,'#64776e','left',sans);A.tracked(ctx,options.number||String(chapter.id).padStart(2,'0'),992,67,19,2,'#64776e','right',sans);A.fitText(ctx,chapter.title,88,145,904,43,'#294b42','left');A.fitText(ctx,chapter.kicker||'',88,210,904,20,'#687c70','left');let y=255;
    if(hasFigure){const fc=A.makeCanvas(960,420);figure(fc,model,chapter.figure);ctx.drawImage(fc,60,y);fc.width=1;fc.height=1;y+=430;}
    ctx.font='30px '+serif;ctx.fillStyle='#354e46';ctx.textBaseline='top';for(const block of blocks){for(const line of block.lines){ctx.fillText(line,90,y);y+=49;}y+=29;}
    ctx.strokeStyle='#7f988b40';ctx.beginPath();ctx.moveTo(88,height-82);ctx.lineTo(992,height-82);ctx.stroke();
    const note=chapter.id===3||options.entertainment?'月相人格与星座趣味解读 · 仅供娱乐':'按所选日期与参考时刻绘制 · 月面纹理 / NASA SVS';
    A.tracked(ctx,note,88,height-46,15,0,'#697e73','left',sans);A.tracked(ctx,options.number?'生明月':'生明月 · '+chapter.id+' / '+model.chapters.length,992,height-46,15,1,'#697e73','right',sans);return c;
  }
  function longImage(model){const pages=model.chapters.map(ch=>page(model,ch)),height=pages.reduce((n,p)=>n+p.height,0);if(height>14000)throw new Error('图片较长，请分别保存各章。');const c=A.makeCanvas(1080,height),ctx=c.getContext('2d');let y=0;for(const p of pages){ctx.drawImage(p,0,y);y+=p.height;p.width=1;p.height=1;}return c;}
  function signCard(model){
    const paragraphs=[];for(const person of model.people){paragraphs.push(person.name+' · '+person.moonSigns.map(s=>'月亮'+s.name).join(' / '));if(!person.signCertain)paragraphs.push('当天月亮换座，以下两种解读为候选；填写出生时刻可确认。');for(const sign of person.moonSigns)paragraphs.push(sign.name+' · '+sign.title+'\n'+sign.text);}
    if(model.lunarPair)paragraphs.push(model.lunarPair.title+'\n'+model.lunarPair.text);
    return page(model,{id:0,title:'你们的月亮星座',kicker:model.input.nameA+' × '+model.input.nameB,paragraphs,figure:'none'},{number:'MOON',entertainment:true});
  }
  function anniversaryCard(model){return page(model,{id:0,title:'那一天，也有一轮月亮',kicker:model.anniversaryMoon.name+' · 受光 '+(model.anniversaryMoon.fraction*100).toFixed(1)+'%',paragraphs:[model.input.message||'把这一天的月色，留给共同记得它的人。'],figure:'anniversary'},{number:'A DAY'});}
  root.MoonReportRender={figure,page,longImage,split,signCard,anniversaryCard};
})(window);
