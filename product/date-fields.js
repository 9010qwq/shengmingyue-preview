(() => {
  const groups = [];
  for (const original of document.querySelectorAll('input[type="date"]')) {
    const title = original.id === 'date-a' ? '你的公历生日' : original.id === 'date-b' ? '对方的公历生日' : '纪念日';
    if (original.parentElement.tagName === 'LABEL') {
      const previous = original.parentElement, replacement = document.createElement('div');
      replacement.className = 'date-field';
      while (previous.firstChild) replacement.append(previous.firstChild);
      previous.replaceWith(replacement);
    }
    const group = document.createElement('div');
    group.className = 'date-parts';
    group.setAttribute('role', 'group'); group.setAttribute('aria-label', title);
    const parts = ['year', 'month', 'day'].map((part, index) => {
      const label = document.createElement('label'), caption = document.createElement('span'), input = document.createElement('input');
      const name = ['年', '月', '日'][index]; caption.textContent = name;
      input.id = original.id + '-' + part; input.type = 'text'; input.inputMode = 'numeric'; input.autocomplete = 'off';
      input.maxLength = index === 0 ? 4 : 2; input.placeholder = ['例如 1998', '06', '15'][index];
      input.setAttribute('aria-label', title + '·' + ['年份', '月份', '日期'][index]);
      input.setAttribute('aria-describedby', original.id + '-date-help');
      label.append(caption, input); group.append(label); return input;
    });
    const error = document.createElement('p'); error.id = original.id + '-date-help'; error.className = 'date-help'; error.setAttribute('aria-live', 'polite');
    original.type = 'hidden'; original.after(group, error);
    const externalLabel = document.querySelector(`label[for="${original.id}"]`);
    if (externalLabel) externalLabel.htmlFor = parts[0].id;
    function refresh() {
      const values = original.value.split('-');
      parts.forEach((input, index) => { input.value = values[index] || ''; input.removeAttribute('aria-invalid'); });
      error.textContent = '';
    }
    function sync() {
      parts.forEach((input, index) => { input.value = input.value.replace(/\D/g, '').slice(0, index === 0 ? 4 : 2); });
      const [year, month, day] = parts.map(input => Number(input.value));
      const complete = parts.every(input => input.value.length > 0);
      const min = Number((original.min || '1900').slice(0, 4)), max = Number((original.max || '2100').slice(0, 4));
      const days = month >= 1 && month <= 12 ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 0;
      const valid = complete && parts[0].value.length === 4 && year >= min && year <= max && day >= 1 && day <= days;
      original.value = valid ? `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
      error.textContent = complete && !valid ? `请填写 ${min}—${max} 年间的有效日期，并检查月份和天数。` : '';
      parts.forEach(input => { if (complete && !valid) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); });
      original.dispatchEvent(new Event('input', {bubbles: true}));
      original.dispatchEvent(new Event('change', {bubbles: true}));
    }
    for (const part of parts) part.addEventListener('input', sync);
    original.form?.addEventListener('reset', () => setTimeout(refresh, 0));
    groups.push(refresh); refresh();
  }
  const refresh = () => groups.forEach(update => update());
  window.MoonDateFields = {refresh};
  document.addEventListener('click', event => { if (event.target.closest('#edit-dates, #reset')) refresh(); });
  window.addEventListener('moon:reset', refresh);
})();
