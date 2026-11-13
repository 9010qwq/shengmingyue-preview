(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const wallpaperNames = {
    'wall-sea': '海上生明月',
    'wall-celadon': '月下青笺',
    'wall-letter': '月色来信'
  };
  const downloadUrls = new Map();
  const offsets = [-720,-660,-600,-570,-540,-480,-420,-360,-300,-240,-210,-180,-120,-60,0,60,120,180,210,240,270,300,330,345,360,390,420,480,525,540,570,600,630,660,720,765,780,840];
  let model = null;
  let busy = false;
  let toastTimer;

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function tell(text) {
    clearTimeout(toastTimer);
    $('status').textContent = text;
    toastTimer = setTimeout(() => $('status').textContent = '', 5000);
  }

  for (const id of ['offset-a', 'offset-b']) {
    for (const value of offsets) {
      const abs = Math.abs(value);
      const hours = String(Math.floor(abs / 60)).padStart(2, '0');
      const minutes = String(abs % 60).padStart(2, '0');
      const option = node('option', `UTC${value >= 0 ? '+' : '−'}${hours}:${minutes}${value === 480 ? ' · 北京时间' : ''}`);
      option.value = String(value);
      option.defaultSelected = value === 480;
      $(id).append(option);
    }
  }

  function read() {
    return {
      dateA: $('date-a').value, dateB: $('date-b').value,
      nameA: $('name-a').value, nameB: $('name-b').value,
      message: $('message').value, hideYear: $('hide-year').checked,
      timeA: $('time-a').value, timeB: $('time-b').value,
      offsetA: Number($('offset-a').value), offsetB: Number($('offset-b').value)
    };
  }

  async function build() {
    if (busy) return;
    busy = true;
    $('generate-report').disabled = true;
    $('form-error').textContent = '';
    try {
      const next = MoonReportContent.build(read());
      await MoonArt.ready;
      await document.fonts.load('24px "Moon Serif"');
      model = next;
      render();
      $('report-result').hidden = false;
      $('birth-details').open = false;
      $('birth-details').querySelector('summary').textContent = '修改生日、昵称与出生时间';
      $('report-intro').hidden = true;
      $('report-result').scrollIntoView({ behavior: 'instant' });
    } catch (error) {
      $('form-error').textContent = error.message;
    } finally {
      busy = false;
      $('generate-report').disabled = false;
    }
  }

  function render() {
    $('report-title').textContent = model.title;
    $('report-subtitle').textContent = model.subtitle;
    $('chapters').replaceChildren();
    for (const chapter of model.chapters) {
      const number = chapter.id === 3 ? 4 : chapter.id;
      const article = node('article', '', 'report-chapter');
      article.id = 'chapter-' + chapter.id;
      article.append(node('div', String(number).padStart(2, '0'), 'eyebrow'), node('h2', chapter.title), node('div', chapter.kicker, 'kicker'));
      if (chapter.id < 3) {
        const canvas = MoonArt.makeCanvas(960, 420);
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', chapter.title + '：按输入日期计算的月相图');
        MoonReportRender.figure(canvas, model, chapter.figure);
        const copy = node('div', '', chapter.id === 1 ? 'birth-facts' : 'moon-reading');
        for (const paragraph of chapter.paragraphs) copy.append(node('p', paragraph));
        article.append(canvas, copy);
      } else {
        renderRhythm(article);
      }
      $('chapters').append(article);
    }
    MoonScienceUI.render(model);
    renderSigns();
    refreshPreviews();
  }

  function renderRhythm(article) {
    const profiles = node('div', '', 'profile-grid');
    for (const person of model.people) {
      const card = node('section', '', 'phase-profile');
      card.append(node('span', person.name, 'person-name'), node('h3', person.profile.name), node('p', person.profile.tag, 'profile-tags'), node('p', person.profile.text), node('p', '靠近的暗号 · ' + person.profile.need, 'profile-need'));
      if (person.phaseOptions.length > 1) card.append(node('p', '这一天经过原型分界，补充出生时刻后可确认。', 'boundary-note'));
      profiles.append(card);
    }
    article.append(profiles, node('h3', model.pair.title, 'pair-heading'));
    for (const [title, text] of [['心动的地方', model.pair.spark], ['容易错拍', model.pair.tension], ['相处的节奏', model.pair.tip]]) {
      const row = node('div', '', 'pair-row');
      row.append(node('h4', title), node('p', text));
      article.append(row);
    }
  }

  function signLabel(person) {
    return person.moonSigns.map(sign => '月亮' + sign.name).join(' 或 ');
  }

  function renderSigns() {
    $('moon-sign-preview').replaceChildren(...model.people.map(person => node('span', person.name + ' · ' + signLabel(person))));
    $('moon-sign-cards').replaceChildren();
    $('moon-sign-pair').replaceChildren();
    for (const person of model.people) {
      const card = node('section', '', 'moon-sign-card');
      card.append(node('span', person.name, 'person-name'), node('h3', signLabel(person)));
      const basis = person.time ? '按填写的出生时刻计算' : person.signCertain ? '当天月亮始终在这个星座' : '当天月亮换座，出生时刻决定是哪一个';
      card.append(node('p', basis, 'sign-time'));
      for (const sign of person.moonSigns) {
        const block = node('div', '', 'sign-reading');
        block.append(node('h4', sign.name + ' · ' + sign.title), node('p', sign.text));
        card.append(block);
      }
      $('moon-sign-cards').append(card);
    }
    if (model.lunarPair) {
      $('moon-sign-pair').append(node('h3', model.lunarPair.title), node('p', model.lunarPair.text));
    } else {
      $('moon-sign-pair').append(node('p', '补充换座当天的出生时间后，可以确定你们的月亮星座组合。'));
    }
  }

  function giftState() {
    return { ...model.input, a: model.a, b: model.b, reading: model.reading, hideYear: $('hide-year').checked };
  }

  function clearDownloadUrl(id) {
    const previous = downloadUrls.get(id);
    if (previous) URL.revokeObjectURL(previous);
    downloadUrls.delete(id);
  }

  function preview(id, kind) {
    const canvas = MoonGift.render(kind, giftState(), { preview: true });
    const image = $(id);
    image.src = canvas.toDataURL('image/png');
    clearDownloadUrl(id);
    canvas.width = 1;
    canvas.height = 1;
  }

  function refreshWallPreview() {
    if (!model) return;
    preview('wallpaper-preview', $('wallpaper-style').value);
  }

  function refreshPreviews() {
    if (!model) return;
    preview('report-poster', 'sea');
    refreshWallPreview();
  }

  async function save(kind, imageId, label) {
    if (!model || busy) return;
    busy = true;
    const controls = ['generate-report', 'save-poster', 'save-wallpaper', 'wallpaper-style', 'hide-year'];
    controls.forEach(id => $(id).disabled = true);
    tell('正在制作高清图片…');
    let canvas;
    try {
      await MoonArt.highReady();
      MoonArt.releaseTransient();
      canvas = MoonGift.render(kind, giftState());
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('图片没有生成，请重试。');
      const url = URL.createObjectURL(blob);
      $(imageId).src = url;
      clearDownloadUrl(imageId);
      downloadUrls.set(imageId, url);
      const link = node('a');
      link.href = url;
      link.download = '生明月-' + label + '.png';
      document.body.append(link);
      link.click();
      link.remove();
      tell('高清图片已生成，也可以长按图片保存。');
    } catch (error) {
      tell(error.message || '图片没有生成，请重试。');
    } finally {
      if (canvas) {
        canvas.width = 1;
        canvas.height = 1;
      }
      MoonArt.releaseTransient();
      controls.forEach(id => $(id).disabled = false);
      busy = false;
    }
  }

  $('report-form').addEventListener('submit', event => {
    event.preventDefault();
    build();
  });
  $('hide-year').addEventListener('change', refreshPreviews);
  $('wallpaper-style').addEventListener('change', refreshWallPreview);
  $('save-poster').addEventListener('click', () => save('sea', 'report-poster', '海上生明月'));
  $('save-wallpaper').addEventListener('click', () => {
    const kind = $('wallpaper-style').value;
    save(kind, 'wallpaper-preview', wallpaperNames[kind] + '锁屏');
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    model = null;
    $('report-result').hidden = true;
    $('report-intro').hidden = false;
    $('report-form').reset();
    $('message').value = '';
    $('hide-year').checked = true;
    $('wallpaper-style').selectedIndex = 0;
    $('chapters').replaceChildren();
    $('moon-sign-preview').replaceChildren();
    $('moon-sign-cards').replaceChildren();
    $('moon-sign-pair').replaceChildren();
    for (const id of ['report-poster', 'wallpaper-preview']) {
      $(id).removeAttribute('src');
      clearDownloadUrl(id);
    }
    $('birth-details').open = true;
    $('birth-details').querySelector('summary').textContent = '生日、昵称与出生时间';
    window.MoonDateFields?.refresh();
  });
})();
