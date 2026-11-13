(() => {
  'use strict';

  const form = document.querySelector('#review-form');
  const note = document.querySelector('#review-note');
  const controls = [...document.querySelectorAll('[data-preset]')];
  const names = { default: '两弯留白', thin: '微光', full: '合成满圆', custom: '手填日期' };
  const fields = {
    dateA: document.querySelector('#review-date-a'),
    dateB: document.querySelector('#review-date-b'),
    nameA: document.querySelector('#review-name-a'),
    nameB: document.querySelector('#review-name-b')
  };

  function readForm() {
    return MoonReview.normalize(Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value])));
  }

  function reflect(data) {
    for (const control of controls) control.setAttribute('aria-pressed', String(control.dataset.preset === data?.preset));
    note.textContent = data ? `${names[data.preset]} · ${data.dateA} / ${data.dateB}` : '请填写 1900—2100 年之间的两个有效公历生日。';
  }

  function populate(data) {
    for (const [key, input] of Object.entries(fields)) input.value = data[key];
    reflect(data);
  }

  function save() {
    const data = readForm();
    reflect(data);
    if (!data) return false;
    if (MoonReview.write(data)) return true;
    note.textContent = '这个浏览器限制了页面之间的数据接续，请用 Edge 或 Chrome 打开试玩。';
    return false;
  }

  for (const button of controls) button.addEventListener('click', () => {
    populate(MoonReview.presets[button.dataset.preset]);
    save();
  });
  form.addEventListener('input', () => {
    const data = readForm();
    reflect(data);
    if (data) MoonReview.write(data);
  });
  form.addEventListener('submit', event => { event.preventDefault(); save(); });
  for (const link of document.querySelectorAll('[data-review-page]')) {
    link.addEventListener('click', event => {
      if (save()) return;
      event.preventDefault();
      form.reportValidity();
    });
  }

  populate(MoonReview.read());
  window.addEventListener('pageshow', event => { if (event.persisted) populate(MoonReview.read()); });
})();
