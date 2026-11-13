(() => {
  'use strict';

  const stage = document.getElementById('stage');
  const canvas = document.getElementById('sky');
  const burstButton = document.getElementById('burst');
  const resetButton = document.getElementById('reset');
  const status = document.getElementById('status');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 690px)');
  const turn = Math.PI * 2;
  const initial = { yaw: .19, pitch: -.16 };
  const aim = { ...initial };
  const view = { ...initial };
  const mouse = { x: 0, y: 0 };
  const parallax = { x: 0, y: 0 };
  const globe = new Float32Array(9);
  let frame = 0, last = 0, clock = 0, burstAt = -Infinity;
  let density = 1, burstCount = 0;
  let pointer, resources;
  let layout = { x: 0, y: 0, radius: 0 };
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false });

  function fail(error) {
    cancelAnimationFrame(frame);
    frame = 0;
    resources = null;
    burstButton.disabled = true;
    resetButton.disabled = true;
    document.getElementById('fallback').hidden = false;
    console.error(error);
  }

  function program(vertex, fragment, names) {
    const shaders = [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]].map(([kind, source]) => {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
      return shader;
    });
    const handle = gl.createProgram();
    for (const shader of shaders) gl.attachShader(handle, shader);
    gl.linkProgram(handle);
    if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(handle));
    for (const shader of shaders) gl.deleteShader(shader);
    const uniforms = Object.fromEntries(names.map(name => [name, gl.getUniformLocation(handle, name)]));
    return { handle, uniforms };
  }

  function starCloud() {
    let seed = 1731935;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const stars = [];
    const distant = narrow.matches ? 730 : 1300;
    for (let i = 0; i < distant; i++) {
      const x = random(), y = random(), depth = random(), tone = random();
      const large = tone > .984;
      const size = large ? 7 + random() * 10 : 1.45 + depth * 2.6 + tone ** 6 * 2.0;
      const alpha = large ? .61 : .12 + tone ** 2 * .49;
      stars.push(x, y, depth, size, alpha, random() * turn, 0, 0, 0, 0);
    }

    const ringCount = narrow.matches ? 1100 : 1850;
    for (let i = 0; i < ringCount; i++) {
      const angle = random() * turn;
      const burst = i < ringCount * .51;
      const breadth = random();
      const density = .57 + .43 * Math.sin(angle * 2.5 + .8) ** 2;
      const distance = burst ? .99 + breadth * .19 : 1.06 + breadth ** 2 * .76;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance * (.92 + breadth * .11);
      const z = (random() - .5) * (burst ? .92 : 1.6);
      const size = 1.5 + 4.3 * random() ** 3 + (random() > .975 ? 6 : 0);
      const brightness = (.25 + random() * .50) * density;
      const wave = .23 + 1.32 * random() ** 1.65;
      stars.push(x, y, z, size, brightness, random() * turn, burst ? 2 : 1,
        Math.cos(angle) * wave, Math.sin(angle) * wave, (random() - .5) * 1.35);
    }
    const points = gl.createVertexArray();
    gl.bindVertexArray(points);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(stars), gl.STATIC_DRAW);
    [[0, 3, 0], [1, 4, 12], [2, 3, 28]].forEach(([index, size, offset]) => {
      gl.enableVertexAttribArray(index);
      gl.vertexAttribPointer(index, size, gl.FLOAT, false, 40, offset);
    });
    return { points, count: stars.length / 10 };
  }

  function setup(image) {
    const common = ['resolution', 'center', 'mouse', 'radius', 'opening', 'elapsed'];
    const backdrop = program(lunarShaders.backdropVertex, lunarShaders.backdropFragment, [...common, 'globe', 'lunarMap']);
    const stars = program(lunarShaders.starVertex, lunarShaders.starFragment, [...common, 'clock', 'density']);
    const lunarMap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, lunarMap);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    resources = { backdrop, stars, lunarMap, quad: gl.createVertexArray(), ...starCloud() };
    burstButton.disabled = false;
    resetButton.disabled = false;
    resize();
    stage.dataset.ready = 'true';
    requestFrame();
  }

  function resize() {
    const bounds = stage.getBoundingClientRect();
    density = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1900000 / (bounds.width * bounds.height)));
    canvas.width = Math.round(bounds.width * density);
    canvas.height = Math.round(bounds.height * density);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const radius = narrow.matches ? Math.min(bounds.width * .347, bounds.height * .22)
      : Math.min(bounds.height * .275, bounds.width * .222);
    layout = { x: bounds.width * (narrow.matches ? .5 : .696),
      y: bounds.height * (narrow.matches ? .523 : .499), radius };
    requestFrame();
  }

  function sceneUniforms(pass, open, elapsed) {
    gl.useProgram(pass.handle);
    const u = pass.uniforms;
    gl.uniform2f(u.resolution, canvas.width, canvas.height);
    gl.uniform2f(u.center, (layout.x - parallax.x * 6) * density,
      canvas.height - (layout.y + parallax.y * 5) * density);
    gl.uniform2f(u.mouse, parallax.x, -parallax.y);
    gl.uniform1f(u.radius, layout.radius * density * (1 - open * .135));
    gl.uniform1f(u.opening, open);
    gl.uniform1f(u.elapsed, elapsed);
    return u;
  }

  function draw(now) {
    frame = 0;
    const dt = last ? Math.min(48, now - last) : 16;
    last = now;
    const reduced = motion.matches;
    if (!reduced) clock += dt / 1000;
    const ease = reduced ? 1 : 1 - Math.exp(-dt / 82);
    view.yaw += (aim.yaw - view.yaw) * ease;
    view.pitch += (aim.pitch - view.pitch) * ease;
    parallax.x += ((reduced ? 0 : mouse.x) - parallax.x) * ease;
    parallax.y += ((reduced ? 0 : mouse.y) - parallax.y) * ease;

    const elapsed = Math.min(6, (now - burstAt) / 1000);
    const open = reduced ? 0 : (1 - Math.exp(-elapsed * 7)) * Math.exp(-elapsed * 1.65);
    const cy = Math.cos(view.yaw), sy = Math.sin(view.yaw);
    const cx = Math.cos(view.pitch), sx = Math.sin(view.pitch);
    globe.set([cy, 0, -sy, sy*sx, cx, cy*sx, sy*cx, -sx, cy*cx]);
    stage.dataset.yaw = view.yaw.toFixed(3);
    stage.dataset.pitch = view.pitch.toFixed(3);

    const { backdrop, stars, lunarMap, quad, points, count } = resources;
    gl.disable(gl.BLEND);
    const base = sceneUniforms(backdrop, open, reduced ? Math.min(6, elapsed * 3) : elapsed);
    gl.uniformMatrix3fv(base.globe, false, globe);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, lunarMap);
    gl.uniform1i(base.lunarMap, 0);
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    const light = sceneUniforms(stars, open, reduced ? 6 : elapsed);
    gl.uniform1f(light.clock, clock);
    gl.uniform1f(light.density, density);
    gl.bindVertexArray(points);
    gl.drawArrays(gl.POINTS, 0, count);
    if (!reduced || elapsed < .35) requestFrame();
  }

  function requestFrame() {
    if (resources && !frame && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function scatter() {
    if (!resources) return;
    burstAt = performance.now();
    stage.dataset.bursts = String(++burstCount);
    status.textContent = motion.matches ? '月缘亮起。' : '星光从月缘散开。';
    requestFrame();
  }

  function rotate(dx, dy) {
    aim.yaw += dx;
    aim.pitch = Math.max(-1.48, Math.min(1.48, aim.pitch + dy));
    requestFrame();
  }

  stage.addEventListener('pointerdown', event => {
    if (!resources || pointer || event.button !== 0) return;
    const bounds = stage.getBoundingClientRect();
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    if (Math.hypot(x-layout.x, y-layout.y) > layout.radius * 1.23) return;
    pointer = { id: event.pointerId, startX: x, startY: y, x, y, moved: false };
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener('pointermove', event => {
    const bounds = stage.getBoundingClientRect();
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    if (event.pointerType === 'mouse') {
      mouse.x = 2*x/bounds.width - 1;
      mouse.y = 2*y/bounds.height - 1;
    }
    if (pointer?.id !== event.pointerId) return;
    if (!pointer.moved && Math.hypot(x-pointer.startX, y-pointer.startY) < 6) return;
    pointer.moved = true;
    stage.dataset.dragging = 'true';
    const speed = 1.52 / layout.radius;
    rotate(-(x-pointer.x)*speed, -(y-pointer.y)*speed);
    pointer.x = x;
    pointer.y = y;
  });

  function endPointer(event) {
    if (pointer?.id !== event.pointerId) return;
    const click = event.type === 'pointerup' && !pointer.moved;
    pointer = null;
    delete stage.dataset.dragging;
    if (click) scatter();
  }

  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
  stage.addEventListener('lostpointercapture', endPointer);
  stage.addEventListener('pointerleave', () => { mouse.x = mouse.y = 0; });
  const keys = { ArrowLeft: [.26, 0], ArrowRight: [-.26, 0], ArrowUp: [0, .20], ArrowDown: [0, -.20] };
  stage.addEventListener('keydown', event => {
    if (!resources) return;
    if (event.key in keys) { event.preventDefault(); rotate(...keys[event.key]); }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat) scatter();
    }
  });
  burstButton.addEventListener('click', scatter);
  resetButton.addEventListener('click', () => {
    Object.assign(aim, initial);
    view.yaw -= turn * Math.round((view.yaw - initial.yaw) / turn);
    status.textContent = '已回到初始视角。';
    requestFrame();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = last = 0;
      burstAt = -Infinity;
    } else requestFrame();
  });
  motion.addEventListener('change', requestFrame);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    delete stage.dataset.ready;
    fail(Error('WebGL context lost'));
  });
  const image = new Image();
  canvas.addEventListener('webglcontextrestored', () => {
    try { setup(image); document.getElementById('fallback').hidden = true; } catch (error) { fail(error); }
  });

  if (!gl) { fail(Error('WebGL 2 unavailable')); return; }
  image.src = window.MOON_TEXTURE;
  image.decode().then(() => {
    setup(image);
    new ResizeObserver(() => { if (resources) resize(); }).observe(stage);
  }).catch(fail);
})();

