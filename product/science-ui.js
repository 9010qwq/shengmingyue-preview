(function (root) {
  'use strict';
  const S = root.MoonScience;
  const byId = id => document.getElementById(id);

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function svgNode(tag, attrs = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, String(value));
    return element;
  }

  const fmt = number => Math.round(number).toLocaleString('zh-CN');
  const pct = number => (number * 100).toFixed(1) + '%';

  function panel(title, kicker) {
    const section = node('section', '', 'science-panel');
    section.append(node('div', kicker, 'science-kicker'), node('h3', title));
    return section;
  }

  function metric(label, value, note) {
    const item = node('div', '', 'science-metric');
    item.append(node('span', label), node('strong', value));
    if (note) item.append(node('span', note));
    return item;
  }

  function personCard(snapshot) {
    const card = node('div', '', 'science-person');
    const time = S.localDate(snapshot.at, snapshot.offset) + ' · ' + S.zone(snapshot.offset);
    card.append(
      node('h4', snapshot.name + '的月亮'),
      node('p', time + (snapshot.timeKnown ? ' · 所填时刻' : ' · 中午参考值'), 'science-note')
    );
    const metrics = node('div', '', 'science-metrics');
    metrics.append(
      metric('地心到月心', fmt(snapshot.km) + ' km'),
      metric('天文月龄', snapshot.age.toFixed(1) + ' 天', '距上一次新月'),
      metric('月面受光', pct(snapshot.fraction), snapshot.phaseName),
      metric('单程光行时', snapshot.lightSeconds.toFixed(2) + ' 秒', '地心到月心')
    );
    card.append(metrics);
    return card;
  }

  function svgDiagram(){
    const svg=svgNode('svg',{viewBox:'0 0 560 310',class:'tide-diagram',role:'img','aria-label':'日月引潮方向与理想海洋形变示意，大小和形变均非实际比例'});
    const title=svgNode('title');title.textContent='拖动月相，观察理想海洋中两组引潮效应的叠加';svg.append(title);
    for(let i=0;i<24;i++)svg.append(svgNode('circle',{cx:18+(i*83)%530,cy:12+(i*47)%284,r:i%3===0?1.1:.6,fill:'#9db6ce',opacity:.45}));
    svg.append(svgNode('circle',{cx:210,cy:155,r:115,fill:'none',stroke:'#7d9aa3','stroke-dasharray':'3 8',opacity:.4}));
    const line=svgNode('line',{x1:210,y1:155,x2:325,y2:155,stroke:'#8ed0dc','stroke-dasharray':'5 5',opacity:.7});
    const solar=svgNode('line',{x1:210,y1:155,x2:475,y2:155,stroke:'#d8c187','stroke-dasharray':'5 5',opacity:.7});svg.append(solar,line);
    const water=svgNode('path',{fill:'#70b9ce66',stroke:'#96dae0','stroke-width':2});svg.append(water,svgNode('circle',{cx:210,cy:155,r:36,fill:'#38666c',stroke:'#91b6b3'}));
    const earthLabel=svgNode('text',{x:210,y:160,'text-anchor':'middle',fill:'#e2e7d5','font-size':13});earthLabel.textContent='地球';svg.append(earthLabel);
    const sun=svgNode('circle',{cx:485,cy:155,r:23,fill:'#d8c187'}),sunText=svgNode('text',{x:485,y:197,'text-anchor':'middle',fill:'#d8c187','font-size':13});sunText.textContent='太阳';svg.append(sun,sunText);
    const moon=svgNode('circle',{cx:325,cy:155,r:10,fill:'#dce5dd',stroke:'#eef3e1'}),moonLabel=svgNode('text',{'text-anchor':'middle',fill:'#d6e7ea','font-size':12});moonLabel.textContent='月亮';svg.append(moon,moonLabel);
    return {svg,update(angle){const a=angle*Math.PI/180,x=210+115*Math.cos(a),y=155-115*Math.sin(a);line.setAttribute('x2',x);line.setAttribute('y2',y);moon.setAttribute('cx',x);moon.setAttribute('cy',y);moonLabel.setAttribute('x',x);moonLabel.setAttribute('y',y+25);water.setAttribute('d',S.tideShape(angle).map((p,i)=>(i?'L':'M')+(210+p.x).toFixed(2)+','+(155+p.y).toFixed(2)).join(' ')+' Z');}};
  }

  function tidePanel(initialAngle) {
    const box = node('section', '', 'science-panel tide-panel');
    box.id = 'tide-lab';
    box.append(
      node('div', '03 / 月亮与海 · 科普', 'science-kicker'),
      node('h2', '月亮怎样牵动潮汐'),
      node('p', '月亮和太阳都对海水产生引潮作用。拖动滑轨，看看日月排列改变时，理想海洋的形状怎么变。')
    );

    const diagram = svgDiagram();
    const legend = node('div', '', 'tide-legend');
    legend.append(node('span', '浅蓝 · 理想海洋'), node('span', '金色 · 太阳方向'));
    const label = node('label', '拖动月相');
    label.htmlFor = 'tide-phase';
    const slider = node('input');
    Object.assign(slider, {type:'range', id:'tide-phase', min:'0', max:'360', step:'1', value:String(Math.round(initialAngle))});
    const output = node('output');
    output.setAttribute('for', slider.id);
    const heading = node('h4');
    const reading = node('p');
    const result = node('div', '', 'tide-reading');
    result.append(heading, reading);

    function update() {
      const angle = Number(slider.value) % 360;
      const info = S.alignment(angle);
      diagram.update(angle);
      heading.textContent = info.title;
      reading.textContent = info.text;
      output.textContent = '日月黄经差 ' + angle + '°';
      slider.setAttribute('aria-valuetext', output.textContent + ' · ' + info.title);
    }

    slider.addEventListener('input', update);
    box.append(diagram.svg, legend, label, slider, output, result);
    box.append(
      node('p', '新月和满月附近，日月的引潮方向接近同轴，潮差通常更大。上下弦时，两种作用部分抵消。', 'science-note'),
      node('p', '图中采用固定日月平均距离，形变经过放大。实际潮位和潮时还与海岸形状、水深及天气有关。', 'science-note')
    );
    update();
    return box;
  }

  function render(model) {
    const snapshots = model.people.map(S.snapshot);
    const [a, b] = snapshots;
    const archive = panel('两个日子的天文数据', '月亮档案');
    archive.id = 'lunar-archive';
    archive.append(...snapshots.map(personCard));
    byId('chapter-1').append(archive);

    const comp = S.compare(a, b);
    const comparison = panel('两天的月相与距离', '天文对照');
    const grid = node('div', '', 'science-comparison');
    grid.append(
      metric('月相角的最短差', comp.phaseGap.toFixed(1) + '°'),
      metric('地月距离差', fmt(comp.distanceGap) + ' km')
    );
    const note = comp.distanceGap < 1 ? '两个参考时刻的地月距离几乎相同。' : comp.nearer + '的那一天，月亮离地球更近。';
    comparison.append(grid, node('p', note));
    byId('chapter-2').append(comparison);
    byId('chapter-3').before(tidePanel(a.phase));
  }

  root.MoonScienceUI = { render };
})(window);
