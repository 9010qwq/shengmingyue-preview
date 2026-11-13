(() => {
  'use strict';

  const key = 'smy-internal-review-v1';
  const presets = {
    default: { dateA: '2000-02-10', dateB: '2000-02-28', nameA: '听潮', nameB: '望舒', preset: 'default' },
    thin: { dateA: '2000-02-04', dateB: '2000-02-06', nameA: '听潮', nameB: '望舒', preset: 'thin' },
    full: { dateA: '2000-02-14', dateB: '2000-02-27', nameA: '听潮', nameB: '望舒', preset: 'full' }
  };

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    if (year < 1900 || year > 2100) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function cleanName(value) {
    return Array.from(String(value ?? '').trim()).slice(0, 16).join('');
  }

  function normalize(value) {
    if (!value || !validDate(value.dateA) || !validDate(value.dateB)) return null;
    const preset = Object.keys(presets).find(id => {
      const example = presets[id];
      return example.dateA === value.dateA && example.dateB === value.dateB;
    }) || 'custom';
    return { dateA: value.dateA, dateB: value.dateB, nameA: cleanName(value.nameA), nameB: cleanName(value.nameB), preset };
  }

  function read() {
    try {
      const saved = normalize(JSON.parse(sessionStorage.getItem(key)));
      if (saved) return saved;
    } catch {}
    return { ...presets.default };
  }

  function write(value) {
    const data = normalize(value);
    if (!data) return false;
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch { return false; }
  }

  window.MoonReview = { presets, validDate, normalize, read, write };
})();
