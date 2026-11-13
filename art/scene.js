(() => {
  'use strict';

  const scene = document.querySelector('#scene');
  const canvas = document.querySelector('#sea');
  const ctx = canvas.getContext('2d');
  const range = document.querySelector('#merge');
  const button = document.querySelector('#meet');
  const view = document.querySelector('#view');
  const announcement = document.querySelector('#announcement');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const circle = Math.PI * 2;
  const colors = ['244,196,156', '160,205,255'];
  const samples = {
    partial: ['2000-02-10', '2000-02-28'],
    thin: ['2000-02-04', '2000-02-06'],
    full: ['2000-02-14', '2000-02-27']
  };
  let phases, coverage, art = 'stars';
  const sampleButtons = [...document.querySelectorAll('[data-sample]')];
  const artButtons = [...document.querySelectorAll('[data-art]')];
  const form = document.querySelector('#birthday-form');
  const inputs = [document.querySelector('#birthday-a'), document.querySelector('#birthday-b')];
  const dateError = document.querySelector('#date-error');
  const artLabels = {
    sea: ['两轮月色','把两个日子的月亮，放在同一片海上。'],
    stars: ['星海合月','让两轮月亮在星光里相遇。']
  };

  function random(seed) {
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  }

  const skyRandom = random(7290);
  const stars = Array.from({ length: 1600 }, (_, i) => {
    const clustered = i % 4 !== 0;
    const x = skyRandom() * 2 - 1;
    const y = clustered ? .31 * x + (skyRandom()+skyRandom()-1)*.47 : skyRandom()*2-1;
    return {
      x, y, size: .30 + skyRandom() ** 4 * 1.9,
      z: .31 + skyRandom() * .69,
      phase: skyRandom() * circle,
      brightness: .12 + skyRandom() ** 2 * .69,
      tone: skyRandom() < .25 ? 0 : 1
    };
  });
  const waves = Array.from({ length: 380 }, () => ({
    x: skyRandom() * 2 - 1, y: skyRandom() ** 1.7, width: skyRandom(),
    phase: skyRandom() * circle, intensity: skyRandom()
  }));
  const dust = Array.from({ length: 156 }, (_, i) => ({
    angle: i * 2.39996323 + skyRandom() * .24, speed: .26 + skyRandom() ** 1.65 * 1.22,
    depth: skyRandom(), size: .35 + skyRandom() ** 2.6 * 1.64,
    delay: skyRandom() * .09, tone: skyRandom() < .51 ? 0 : 1, phase: skyRandom() * circle
  }));

  let width, height, ratio, x, y, radius, gap, horizon, background;
  let frame = 0, progress = 0, burstAt = -Infinity, meeting = false, animation;
  let layer, spriteSize, sprites, pairing;
  let ready = false, startedAt = 0;

  function paintSky() {
    background = MoonArt.makeCanvas(Math.round(width * ratio), Math.round(height * ratio));
    const sky = background.getContext('2d');
    sky.scale(ratio, ratio);
    const gradient = sky.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, art === 'stars' ? '#070b1a' : '#090e1e');
    gradient.addColorStop(horizon / height, art === 'stars' ? '#1a283f' : '#1e2c41');
    gradient.addColorStop(Math.min(.96, horizon / height + .08), '#141e31');
    gradient.addColorStop(1, '#080e1b');
    sky.fillStyle = gradient;
    sky.fillRect(0, 0, width, height);
    const palette = art === 'stars'
      ? [[.26,.54,'132,79,102'], [.72,.32,'71,130,205'], [.50,.44,'126,108,176']]
      : [[.32,.38,'157,101,96'], [.66,.43,'69,123,188'], [.5,.58,'130,132,173']];
    for (const [a, b, color] of palette) {
      const haze = sky.createRadialGradient(width*a,height*b,0,width*a,height*b,Math.min(width*.47,height*.54));
      haze.addColorStop(0, 'rgba(' + color + ',.26)');
      haze.addColorStop(.52, 'rgba(' + color + ',.057)');
      haze.addColorStop(1, 'rgba(' + color + ',0)');
      sky.fillStyle = haze;
      sky.fillRect(0,0,width,horizon);
    }
    const v = sky.createRadialGradient(x,y,radius*.7,x,y,Math.max(width,height)*.65);
    v.addColorStop(0,'#080a1500');
    v.addColorStop(1,'#0609139e');
    sky.fillStyle = v;
    sky.fillRect(0,0,width,height);
    sky.fillStyle = '#e4e3f020';
    sky.fillRect(0,horizon,width,.55);

    const grain = MoonArt.makeCanvas(96,96);
    const gc = grain.getContext('2d');
    const pixels = gc.createImageData(96,96);
    const next = random(557);
    for (let i=0; i<pixels.data.length; i+=4) {
      const value = next() > .48 ? 235 : 0;
      pixels.data.set([value,value,value,Math.round(next()*8)],i);
    }
    gc.putImageData(pixels,0,0);
    sky.fillStyle = sky.createPattern(grain,'repeat');
    sky.fillRect(0,0,width,height);
  }


  function chooseDates(dates, key) {
    phases = dates.map(Lunar.calculate);
    coverage = Lunar.geometry(...phases).union;
    for (const [i, label] of ['a','b'].entries()) {
      const phase = phases[i];
      const date = document.querySelector('#date-' + label);
      date.dateTime = phase.date;
      date.textContent = phase.date.slice(5).replace('-', '.');
      const percent = Math.round(phase.fraction * 100);
      document.querySelector('#phase-' + label).textContent = phase.name + ' · ' + (percent || phase.fraction === 0 ? percent + '%' : '<1%');
    }
    for (const control of sampleButtons) control.setAttribute('aria-pressed', String(control.dataset.sample === key));
    scene.dataset.sample = key;
    inputs.forEach((input, index) => { input.value = dates[index]; });
    const previous = MoonReview.read();
    MoonReview.write({ ...previous, dateA: dates[0], dateB: dates[1] });
    dateError.textContent = '';
    animation = null;
    burstAt = -Infinity;
    setProgress(0);
    if (ready) resize();
  }

  function chooseArt(key) {
    art = key;
    scene.dataset.art = key;
    const [title, description] = artLabels[key];
    document.querySelector('#title').textContent = title;
    document.querySelector('#subtitle').textContent = description;
    for (const control of artButtons) control.setAttribute('aria-pressed', String(control.dataset.art === key));
    if (ready) resize();
  }

  function resize() {
    const rect = scene.getBoundingClientRect();
    const controls = document.querySelector('.control').getBoundingClientRect();
    const heading = document.querySelector('.intro').getBoundingClientRect();
    width = Math.round(rect.width);
    height = Math.round(rect.height);
    ratio = Math.min(devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const room = controls.top - heading.bottom;
    x = width / 2;
    y = heading.bottom - rect.top + room * .42;
    radius = Math.min(width * .168, room * .299, 142);
    gap = Math.min(width * .47, radius * 3.26);
    horizon = heading.bottom - rect.top + room * .77;
    spriteSize = Math.round(radius * 2 * ratio);
    layer = MoonArt.makeCanvas(spriteSize,spriteSize);
    const layerCtx = layer.getContext('2d');
    MoonArt.drawPair(layerCtx,phases[0],phases[1],'sea',spriteSize/2,spriteSize/2,spriteSize/2,0,false);
    sprites = phases.map(phase => MoonArt.moon(phase,spriteSize,'sea'));
    const pairWidth = spriteSize + Math.ceil(gap*ratio) + 2;
    pairing = MoonArt.makeCanvas(pairWidth,spriteSize);
    paintSky();
    requestFrame();
  }

  function seaSky(time, reveal) {
    const count = width < 600 ? 175 : 405;
    for (let i=0; i<count; i++) {
      const star = stars[i];
      const nx = (Math.sin(star.phase*29)+1)*.5;
      const ny = (Math.cos(star.phase*73)+1)*.5;
      const px = nx*width + (nx-.5)*width*reveal*.065*star.z;
      const py = ny*horizon*.94 + Math.sin(time*.12 + star.phase)*1.7;
      const size = star.size*.75;
      const pulse = .80 + .20*Math.sin(time*.6 + star.phase);
      ctx.fillStyle = 'rgba(' + colors[star.tone] + ',' + star.brightness*pulse*.81 + ')';
      ctx.beginPath();
      ctx.arc(px,py,size,0,circle);
      ctx.fill();
    }
  }

  function skyPoints(time, reveal, arrival, front, left, right, r) {
    const count = width < 600 ? 960 : stars.length;
    const zoom = Math.min(width * .62, height * .74);
    for (let i=0; i<count; i++) {
      const star = stars[i];
      if ((star.z < .39) !== front) continue;
      const depth = star.z + arrival * .38 - reveal * .125;
      const px = x + star.x * zoom / depth + Math.cos(star.phase+time*.19) * (1-depth)*8;
      const py = y + star.y * zoom*.62 / depth + Math.sin(star.phase+time*.15) * (1-depth)*6;
      if (px < -8 || px > width+8 || py < -8 || py >= horizon) continue;
      if (front && Math.min((px-left)**2,(px-right)**2)+(py-y)**2 < (r+3)**2) continue;
      const pulse = .82 + .18 * Math.sin(time * (.7+star.z) + star.phase);
      const haze = Math.min(1, (horizon-py)/60);
      const size = star.size * (.48 + .31/depth);
      const alpha = star.brightness * pulse * haze * (front ? .81 : .74);
      if (size > 1.5) {
        ctx.fillStyle = 'rgba(' + colors[star.tone] + ',' + alpha * .16 + ')';
        ctx.beginPath();
        ctx.arc(px,py,size*2.45,0,circle);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(' + colors[star.tone] + ',' + alpha + ')';
      ctx.beginPath();
      ctx.arc(px,py,size,0,circle);
      ctx.fill();
    }
  }
  function reflections(left, right, now, reveal) {
    for (const [position, tone] of [[left,0],[right,1]]) {
      const glow = ctx.createRadialGradient(position,horizon,0,position,horizon,radius*1.58);
      glow.addColorStop(0,'rgba(' + colors[tone] + ',' + (.12 + .055*reveal) + ')');
      glow.addColorStop(.43,'rgba(' + colors[tone] + ',.034)');
      glow.addColorStop(1,'rgba(' + colors[tone] + ',0)');
      ctx.fillStyle = glow;
      ctx.fillRect(position-radius*1.6,horizon,radius*3.2,radius*1.56);
    }
    const reflectedLight = .25 + .75 * Math.sqrt(Math.max(phases[0].fraction,phases[1].fraction));
    ctx.lineCap = 'round';
    for (const wave of waves) {
      const yy = horizon + 4 + wave.y * (height-horizon) * .76;
      const xx = x + wave.x * width * .46;
      const band = radius * (.35 + wave.y * .67);
      const a = Math.exp(-(((xx-left)/band)**2));
      const b = Math.exp(-(((xx-right)/band)**2));
      const depth = (1-wave.y) * (.62 + .38 * Math.cos(now * 1.4 + wave.phase));
      const light = (.024 + wave.intensity * .06) * (1-wave.y) + Math.max(a,b) * depth * reflectedLight * (.28 + reveal * .22);
      const length = 2 + wave.width ** 2 * radius * (.105 + wave.y * .46);
      ctx.strokeStyle = 'rgba(' + colors[a>b ? 0 : 1] + ',' + light + ')';
      ctx.lineWidth = .37 + wave.y * .76;
      ctx.beginPath();
      ctx.moveTo(xx-length,yy);
      ctx.lineTo(xx+length,yy);
      ctx.stroke();
    }
  }

  function moonHalo(position, radius, color, strength) {
    const glow = ctx.createRadialGradient(position,y,radius*.85,position,y,radius*(1.7+.34*strength));
    glow.addColorStop(0,'rgba(' + color + ',.22)');
    glow.addColorStop(.28,'rgba(' + color + ',' + (.11+.17*strength) + ')');
    glow.addColorStop(1,'rgba(' + color + ',0)');
    ctx.fillStyle = glow;
    const edge = radius * 2.1;
    ctx.fillRect(position-edge,y-edge,edge*2,edge*2);
  }

  function scatter(age, r, front) {
    for (const item of dust) {
      if ((item.depth >= .42) !== front) continue;
      const t = age-item.delay;
      if (t < 0 || t > 1.8) continue;
      const travel = (1-Math.exp(-t*5)) * item.speed;
      const angle = item.angle + .085 * t * Math.sin(item.phase);
      const distance = r * (1.02 + travel * (.76+item.depth*.52));
      const xx = x + Math.cos(angle)*distance;
      const yy = y + Math.sin(angle)*distance*.76;
      const fade = Math.min(1,t*36)*(1-t/1.8)**2*(.36+item.depth*.58);
      const length = r * .13 * item.depth * Math.exp(-t*4.5);
      const color = colors[item.tone];
      if (length > 2 && item.size > 1.1) {
        ctx.strokeStyle = 'rgba(' + color + ',' + fade*.57 + ')';
        ctx.lineWidth = .78 + item.depth*.52;
        ctx.beginPath();
        ctx.moveTo(xx-Math.cos(angle)*length,yy-Math.sin(angle)*length*.76);
        ctx.lineTo(xx,yy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(' + color + ',' + fade + ')';
      ctx.beginPath();
      ctx.arc(xx,yy,item.size*(.7+item.depth*.48),0,circle);
      ctx.fill();
    }
  }

  function darkLimb(px, r, opacity) {
    ctx.strokeStyle = 'rgba(164,188,222,' + opacity + ')';
    ctx.lineWidth = Math.max(.65,r*.008);
    ctx.beginPath();
    ctx.arc(px,y,r-.12,0,circle);
    ctx.stroke();
  }

  function draw(now) {
    frame = 0;
    if (!background) return;
    if (animation) {
      const t = Math.min(1,(now-animation.start)/animation.length);
      const eased = t*t*(3-2*t);
      setProgress(animation.from + (animation.to-animation.from)*eased);
      if (t === 1) animation = null;
    }
    const age = (now-burstAt)/1000;
    const quiet = reduced.matches;
    const time = quiet ? 0 : now/1000;
    const reveal = age < 1.8 ? (1-Math.exp(-age*11))*Math.exp(-age*(quiet?5:2.35)) : 0;
    const r = radius * (1 - (quiet ? 0 : reveal*.072));
    const left = x-gap*(1-progress)/2, right = x+gap*(1-progress)/2;
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.drawImage(background,0,0,width,height);
    const arrival = quiet ? 0 : Math.max(0,1-(now-startedAt)/1550)**3;
    if (art === 'stars') skyPoints(time, quiet ? 0 : reveal, arrival, false);
    else seaSky(time, quiet ? 0 : reveal);
    reflections(left,right,time,reveal);
    moonHalo(left,r,colors[0],reveal * (.55 + coverage*.45));
    moonHalo(right,r,colors[1],reveal * (.55 + coverage*.45));
    if (!quiet && reveal) scatter(age,r,false);

    if (progress === 1) ctx.drawImage(layer,x-r,y-r,r*2,r*2);
    else {
      const offset = Math.round(gap*(1-progress)*ratio);
      const surface = pairing.getContext('2d');
      surface.clearRect(0,0,pairing.width,pairing.height);
      surface.drawImage(sprites[0].dark,0,0);
      surface.drawImage(sprites[1].dark,offset,0);
      surface.globalCompositeOperation = 'lighten';
      surface.drawImage(sprites[0].light,0,0);
      surface.drawImage(sprites[1].light,offset,0);
      surface.globalCompositeOperation = 'source-over';
      const used = spriteSize+offset;
      const displayWidth = used / spriteSize * r*2;
      ctx.drawImage(pairing,0,0,used,spriteSize,x-displayWidth/2,y-r,displayWidth,r*2);
    }
    if (coverage < .98 || progress < .94) {
      const outline = .24 + .17 * (1 - coverage);
      darkLimb(left,r,outline);
      if (right - left > 1) darkLimb(right,r,outline);
    }
    if (art === 'stars') skyPoints(time,quiet ? 0 : reveal,arrival,true,left,right,r);
    if (!quiet && reveal) scatter(age,r,true);
    if (!quiet || animation || age < .65) requestFrame();
  }

  function requestFrame() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function setProgress(value) {
    progress = value;
    range.value = String(value === 1 ? 100 : Math.min(99, Math.round(value*100)));
    const text = value === 1 ? '叠合受光约 ' + Math.round(coverage*100) + '%' : value === 0 ? '各自的月色' : '正在靠近';
    view.textContent = text;
    range.setAttribute('aria-valuetext',text);
    if (value === 1 && !meeting) {
      meeting = true;
      burstAt = performance.now();
      scene.dataset.meetings = String(Number(scene.dataset.meetings || 0) + 1);
      announcement.textContent = '两轮月亮已经叠合。';
      button.firstChild.textContent = '再看两轮月亮 ';
      button.lastElementChild.textContent = '↺';
    } else if (value < 1 && meeting) {
      meeting = false;
      burstAt = -Infinity;
      announcement.textContent = '';
      button.firstChild.textContent = '让月色相遇 ';
      button.lastElementChild.textContent = '→';
    }
    requestFrame();
  }

  range.addEventListener('input', () => {
    animation = null;
    setProgress(Number(range.value)/100);
  });
  button.addEventListener('click', () => {
    const to = animation ? 1-animation.to : 1-Number(progress===1);
    if (reduced.matches) setProgress(to);
    else {
      animation = { start: performance.now(), from: progress, to, length: to ? 880 : 600 };
      requestFrame();
    }
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches && animation) {
      const target = animation.to;
      animation = null;
      setProgress(target);
    }
    requestFrame();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else requestFrame();
  });
  for (const control of sampleButtons) {
    control.addEventListener('click', () => chooseDates(samples[control.dataset.sample], control.dataset.sample));
  }
  for (const control of artButtons) {
    control.addEventListener('click', () => chooseArt(control.dataset.art));
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      chooseDates(inputs.map(input => input.value), 'custom');
      form.closest('details').open = false;
      button.focus({preventScroll:true});
    } catch (error) {
      dateError.textContent = error.message;
    }
  });
  const selection = MoonReview.read();
  chooseArt(location.hash === '#two' ? 'sea' : 'stars');
  chooseDates([selection.dateA, selection.dateB], selection.preset === 'default' ? 'partial' : selection.preset);
  MoonArt.ready.then(() => {
    ready = true;
    startedAt = performance.now();
    resize();
    new ResizeObserver(resize).observe(scene);
    range.disabled = false;
    button.disabled = false;
  }).catch(() => { view.textContent = '月面素材加载失败'; });
})();





