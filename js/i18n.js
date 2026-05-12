// Language toggle (DE/EN). Elements with `data-en="..."` swap innerHTML.
// Attribute swaps via `data-en-<attr>` (title, placeholder, aria-label, alt, content).
// Selection persists in localStorage so it survives navigation.

const STORAGE_KEY = 'cretecLang';
const SUPPORTED = ['de', 'en'];
const ATTR_TARGETS = ['title', 'aria-label', 'placeholder', 'alt', 'content'];

function getLang() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return SUPPORTED.includes(stored) ? stored : 'de';
}

function cacheKeyFor(attr) {
  return 'de-' + attr;
}

function applyLang(lang) {
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-en]').forEach((el) => {
    if (el.dataset.de === undefined) el.dataset.de = el.innerHTML;
    el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.de;
  });

  ATTR_TARGETS.forEach((attr) => {
    const sel = `[data-en-${attr}]`;
    document.querySelectorAll(sel).forEach((el) => {
      const cache = cacheKeyFor(attr);
      if (el.getAttribute('data-' + cache) === null) {
        el.setAttribute('data-' + cache, el.getAttribute(attr) || '');
      }
      const enVal = el.getAttribute(`data-en-${attr}`);
      const deVal = el.getAttribute('data-' + cache);
      el.setAttribute(attr, lang === 'en' ? enVal : deVal);
    });
  });

  document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
    btn.dataset.currentLang = lang;
    btn.setAttribute(
      'aria-label',
      lang === 'en' ? 'Sprache wechseln zu Deutsch' : 'Switch language to English'
    );
  });
}

function setLang(lang) {
  if (!SUPPORTED.includes(lang)) return;
  localStorage.setItem(STORAGE_KEY, lang);
  applyLang(lang);
}

window.i18n = {
  get: getLang,
  set: setLang,
  t: (de, en) => (getLang() === 'en' ? en : de),
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLang(getLang() === 'en' ? 'de' : 'en');
    });
  });
  applyLang(getLang());
});
