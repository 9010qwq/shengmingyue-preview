/* Geocentric astronomy, plus an explicitly idealized equilibrium-tide illustration. */
(function(root){
  'use strict';
  const A=root.Astronomy,DAY=86400000,MEAN_DISTANCE=384400;
  const sources=[
    ['NASA · 月相怎样形成','https://science.nasa.gov/moon/moon-phases/'],
    ['NASA · 月球距离','https://science.nasa.gov/moon/facts/'],
    ['NOAA · 大潮、小潮与距离','https://oceanservice.noaa.gov/education/tutorial_tides/tides06_variations.html'],
    ['NOAA · 海岸怎样改变潮汐','https://oceanservice.noaa.gov/education/tutorial_tides/tides07_cycles.html'],
    ['英国国家潮汐与海平面机构 · 引潮力','https://ntslf.org/tides/about-tides/tides-faq'],
    ['Astronomy Engine · 计算方法','https://github.com/cosinekitty/astronomy/tree/master/source/js']
  ];
  const wrap=x=>((x%360)+360)%360;
  const distance=date=>A.GeoMoon(date).Length()*A.KM_PER_AU;
  const round=(n,p=1)=>Number(n.toFixed(p));
  function localDate(date,offset){return new Date(new Date(date).getTime()+offset*60000).toISOString().slice(0,16).replace('T',' ');}
  function zone(offset){return 'UTC'+(offset>=0?'+':'−')+String(Math.floor(Math.abs(offset)/60)).padStart(2,'0')+':'+String(Math.abs(offset)%60).padStart(2,'0');}
  function alignment(angle){
    const a=wrap(angle),axis=Math.min(a,Math.abs(a-180),360-a),quarter=Math.min(Math.abs(a-90),Math.abs(a-270));
    if(axis<=22.5)return {title:'接近日月同轴',text:'接近新月或满月的排列，太阳和月球的主要引潮方向相互加强，通常对应较大的潮差。'};
    if(quarter<=22.5)return {title:'接近日月直角',text:'接近上弦或下弦的排列，太阳和月球的引潮效应部分抵消，通常对应较小的潮差。'};
    return {title:'大潮与小潮之间',text:'日月方向处在同轴与直角之间，潮差也在大潮、小潮的周期中逐渐变化。'};
  }
  function snapshot(person){
    const at=new Date(person.moon.instant),offset=person.offset;
    const previous=A.SearchMoonPhase(0,at,-35),next=A.SearchMoonPhase(0,new Date(at.getTime()+1000),35);
    if(!previous||!next)throw new Error('这一天的月相节点暂未算出，请重试。');
    const start=new Date(at);const local=new Date(at.getTime()+offset*60000);start.setTime(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-offset*60000);
    const end=new Date(start.getTime()+DAY),km=distance(at),au=A.GeoMoon(at).Length();
    const first=new Date(previous.date.getTime()+60000);
    const events=[{name:'新月',at:previous.date},...[90,180,270].map((p,i)=>({name:['上弦','满月','下弦'][i],at:A.SearchMoonPhase(p,first,32).date})),{name:'下次新月',at:next.date}];
    const age=(at-previous.date)/DAY,cycle=(next.date-previous.date)/DAY;
    return {name:person.name,date:person.moon.date,at:at.toISOString(),offset,timeKnown:Boolean(person.time),phase:person.moon.phase,fraction:person.moon.fraction,
      phaseName:person.moon.name,waxing:person.moon.waxing,km,age,cycle,lightSeconds:au/A.C_AUDAY*86400,
      tideRatio:(MEAN_DISTANCE/km)**3,events:events.map(e=>({...e,at:e.at.toISOString()})),progress:age/cycle,
      dayStartFraction:A.Illumination(A.Body.Moon,start).phase_fraction,dayEndFraction:A.Illumination(A.Body.Moon,end).phase_fraction,
      dayStartKm:distance(start),dayEndKm:distance(end),alignment:alignment(person.moon.phase)};
  }
  function compare(a,b){const raw=Math.abs(a.phase-b.phase);return {phaseGap:Math.min(raw,360-raw),distanceGap:Math.abs(a.km-b.km),daysGap:Math.abs(new Date(a.at)-new Date(b.at))/DAY,nearer:a.km<b.km?a.name:b.name,sameDirection:a.waxing===b.waxing};}
  // The variable part of the quadrupole equilibrium potential in an equatorial section.
  // Fixed mean distances; solar contribution is 0.46 of lunar (NTSLF), display scale is arbitrary.
  function tideShape(phase,steps=120){const p=wrap(phase)*Math.PI/180,points=[];for(let i=0;i<=steps;i++){const t=2*Math.PI*i/steps;const radius=55+8*(Math.cos(2*(t-p))+.46*Math.cos(2*t));points.push({x:radius*Math.cos(t),y:-radius*Math.sin(t)});}return points;}
  root.MoonScience={snapshot,compare,alignment,tideShape,localDate,zone,round,sources,MEAN_DISTANCE};
})(window);
