(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const isReport = Boolean(byId('report-form'));
  const form = byId(isReport ? 'report-form' : 'birthday-form');
  const submit = byId(isReport ? 'generate-report' : 'generate');

  function remember() {
    MoonReview.write({ dateA: byId('date-a').value, dateB: byId('date-b').value, nameA: byId('name-a').value, nameB: byId('name-b').value });
  }

  function showResult({ restored = false } = {}) {
    // The report may have already received the experience page's current fields.
    if (isReport) {
      const carried = byId('carried-birthdays');
      if (!restored && !carried.hidden) return;
      carried.hidden = true;
    }
    const data = MoonReview.read();
    for (const [id, key] of [['date-a', 'dateA'], ['date-b', 'dateB'], ['name-a', 'nameA'], ['name-b', 'nameB']]) {
      byId(id).value = data[key];
    }
    window.MoonDateFields?.refresh();
    submit.click();
  }

  form.addEventListener('submit', remember);
  for (const link of document.querySelectorAll('[data-review-return], [data-open-full]')) link.addEventListener('click', remember);
  showResult();
  window.addEventListener('pageshow', event => { if (event.persisted) showResult({ restored: true }); });
})();
