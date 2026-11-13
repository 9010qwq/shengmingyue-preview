/* 生明月 · astronomical date model and fixed-view light geometry. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./vendor/astronomy.cjs') : root.Astronomy);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Lunar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Astronomy) {
  'use strict';
  const DEG = Math.PI / 180;
  const MIN_YEAR = 1900, MAX_YEAR = 2100;
  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('请填写完整的公历日期，例如 2000-02-29。');
    const [y,m,d] = value.split('-').map(Number);
    if (y < MIN_YEAR || y > MAX_YEAR) throw new Error('首版支持 1900—2100 年的公历日期。');
    const date = new Date(Date.UTC(y,m-1,d,4,0,0));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m-1 || date.getUTCDate() !== d) throw new Error('这一天不存在，请检查月份、日期和闰年。');
    return date;
  }
  function phaseName(angle, fraction) {
    if (fraction < .012) return '近新月';
    if (fraction > .988) return '近满月';
    if (angle < 180) return fraction < .46 ? '娥眉月' : fraction <= .54 ? '上弦月' : '盈凸月';
    return fraction > .54 ? '亏凸月' : fraction >= .46 ? '下弦月' : '残月';
  }
  function atInstant(date) {
    const phase = Astronomy.MoonPhase(date);
    const light = Astronomy.Illumination(Astronomy.Body.Moon,date);
    const waxing = phase < 180;
    const a = light.phase_angle * DEG;
    return { instant:date.toISOString(), phase, fraction:light.phase_fraction, phaseAngle:light.phase_angle,
      waxing, side:waxing ? '右侧受光' : '左侧受光', name:phaseName(phase,light.phase_fraction),
      sunX:(waxing ? 1 : -1) * Math.sin(a), sunZ:Math.cos(a) };
  }
  function calculate(value) { return {...atInstant(parseDate(value)), date:value}; }
  // x points to screen right, y to north; z points towards the viewer.
  // Both dates share this fixed north-up, zero-libration, front-facing convention.
  function incidence(moon,x,y) {
    const r2=x*x+y*y;
    if (r2 > 1) return -1;
    return x*moon.sunX + Math.sqrt(Math.max(0,1-r2))*moon.sunZ;
  }
  function geometry(a,b,resolution=240) {
    let n=0,an=0,bn=0,intersection=0,union=0;
    for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++) {
      const u=2*(x+.5)/resolution-1,v=2*(y+.5)/resolution-1;
      if(u*u+v*v>1)continue;
      n++; const A=incidence(a,u,v)>0,B=incidence(b,u,v)>0;
      an+=+A;bn+=+B;intersection+=+(A&&B);union+=+(A||B);
    }
    return {a:an/n,b:bn/n,overlap:intersection/n,union:union/n,blank:1-union/n,difference:(union-intersection)/n};
  }
  function interpret(a,b) {
    const g=geometry(a,b);
    let key;
    if(a.fraction>.94 && b.fraction>.94) key='full';
    else if(a.fraction<.06 && b.fraction<.06) key='quiet';
    else if(g.difference<.10) key='similar';
    else if(a.waxing!==b.waxing && Math.min(a.fraction,b.fraction)>.13 && g.union>.84 && g.overlap<.38) key='cross';
    else if(g.blank>.26) key='space';
    else key='together';
    const lines={
      full:{label:'同辉',title:'两份明亮，在此相逢。',meeting:'两轮月亮都接近圆满，光落在相同的地方。把这份同辉，留给值得记住的一天。',action:'各写下一件最近的小确幸，交换着读。',verse:['明亮与明亮相逢','也是一种相伴']},
      quiet:{label:'待月',title:'微光之外，还有明天。',meeting:'两轮月亮都接近新月，留下大片安静。此刻不必填满，下一页可以慢慢写。',action:'约一个天晴的傍晚，一起找一找初生的月牙。',verse:['把未写完的话','留给下一次月升']},
      similar:{label:'同频',title:'月色相似，故事各自。',meeting:'两轮月亮的明暗轮廓很相近，像一句被轻轻应和的话。你们仍可以有不同的故事。',action:'各选一首今晚想听的歌，交换播放。',verse:['从不同的日子走来','遇见相似的月色']},
      cross:{label:'交映',title:'你的微光，与我交映。',meeting:'两轮月亮从不同的方向受光，叠合后照亮了彼此原有的暗面。记住这一刻的交映就好。',action:'各拍一张窗外的天空，拼在一起，留作今天的合照。',verse:['从两端走来的光','在同一片夜色相逢']},
      space:{label:'留白',title:'没有满圆，也很美。',meeting:'叠合后，月面仍有一片留白。像一封还没写完的信，容得下新的日常与想念。',action:'一起记下一件还没做的小事，留一个愿意出发的日期。',verse:['月色留白的地方','还放得下想念']},
      together:{label:'相映',title:'各有月色，共此一刻。',meeting:'一部分光相遇，一部分光各自延伸。将两个不同的日子，收进同一张月色合照。',action:'一起散一次不赶时间的步，拍下沿途最喜欢的一处光。',verse:['把两个日子的月色','收进同一段想念']}
    };
    return {key,geometry:g,...lines[key]};
  }
  function moonLine(moon) {
    if(moon.fraction<.012)return '近新月，光很轻，夜色有很大的留白。';
    if(moon.fraction>.988)return '近满月，几乎整个圆面都映着光。';
    const side=moon.waxing?'右':'左';
    if(moon.fraction<.25)return `${moon.name}，一弯细光留在${side}侧。`;
    if(moon.fraction<.55)return `${moon.name}，${side}侧的光与暗面相依。`;
    return `${moon.name}，明亮铺展开来，${side}侧迎着光。`;
  }
  return {parseDate,calculate,atInstant,phaseName,incidence,geometry,interpret,moonLine,MIN_YEAR,MAX_YEAR};
});
