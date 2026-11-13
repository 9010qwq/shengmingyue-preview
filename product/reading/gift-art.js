/* 生明月 · 纪念海报与合月锁屏 */
(function (root) {
  'use strict';
  const A = root.MoonArt;
  const W = 720;
  const H = 1600;

  function seaBackground(ctx, reflection) {
    A.sea(ctx, W, H, 964, reflection);
  }

  function celadonBackground(ctx) {
    const glaze = ctx.createLinearGradient(0, 0, W * .55, H);
    glaze.addColorStop(0, '#f1f5ea');
    glaze.addColorStop(.56, '#e0ebe1');
    glaze.addColorStop(1, '#cadfd4');
    ctx.fillStyle = glaze;
    ctx.fillRect(0, 0, W, H);

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#62897836';
    ctx.beginPath();
    ctx.ellipse(360, 755, 263, 206, -.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#62897821';
    ctx.beginPath();
    ctx.ellipse(360, 755, 277, 219, -.22, 0, Math.PI * 2);
    ctx.stroke();
  }

  function letterBackground(ctx) {
    A.paper(ctx, W, H);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#9b7a604f';
    ctx.strokeRect(40.5, 50.5, W - 81, H - 101);
    ctx.strokeStyle = '#9b7a602a';
    ctx.strokeRect(48.5, 58.5, W - 97, H - 117);
  }

  const wallpapers = {
    'wall-sea': {
      title: '海上生明月', background: seaBackground, texture: 'sea',
      ink: '#e6eeeb', secondary: '#aec7cd', rule: '#aec7cd44'
    },
    'wall-celadon': {
      title: '月下青笺', background: celadonBackground, texture: 'letter',
      ink: '#284f46', secondary: '#45685c', rule: '#55796b50'
    },
    'wall-letter': {
      title: '月色来信', background: letterBackground, texture: 'letter',
      ink: '#524435', secondary: '#725e4c', rule: '#9b7a6066'
    }
  };

  function drawWallpaper(canvas, state, style) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(canvas.width / W, canvas.height / H);
    style.background(ctx, state.reading.geometry.union);

    // Keep the upper 28% clear of text and primary artwork for the device clock.
    A.tracked(ctx, style.title, 360, 484, 40, 6, style.ink);
    A.drawPair(ctx, state.a, state.b, style.texture, 360, 755, 163, 0);

    ctx.strokeStyle = style.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(92, 1004);
    ctx.lineTo(628, 1004);
    ctx.moveTo(360, 1050);
    ctx.lineTo(360, 1142);
    ctx.stroke();

    const people = [
      { moon: state.a, name: state.nameA, x: 208 },
      { moon: state.b, name: state.nameB, x: 512 }
    ];
    for (const person of people) {
      A.fitText(ctx, person.name, person.x, 1071, 268, 30, style.ink);
      A.tracked(ctx, A.formatDate(person.moon.date, state.hideYear), person.x, 1122, 18, 1.5, style.secondary);
    }

    const message = state.message.trim();
    if (message) A.wrap(ctx, message, 360, 1235, 502, 24, 37, style.ink, 3);
    A.tracked(ctx, '生明月', 360, 1421, 18, 4, style.secondary);
    A.tracked(ctx, '月面纹理 / NASA SVS', 360, 1486, 12, 1, style.secondary);
    ctx.restore();
    return canvas;
  }

  function render(kind, state, { preview = false } = {}) {
    if (kind === 'sea') {
      const poster = A.makeCanvas(preview ? 540 : 3240, preview ? 720 : 4320);
      return A.renderCard(poster, { ...state, theme: 'sea' });
    }
    if (!Object.hasOwn(wallpapers, kind)) throw new Error('请选择一种锁屏样式。');
    const wallpaper = A.makeCanvas(preview ? 360 : 1440, preview ? 800 : 3200);
    return drawWallpaper(wallpaper, state, wallpapers[kind]);
  }

  root.MoonGift = { render };
})(window);