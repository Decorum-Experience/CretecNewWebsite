// Tab switching for the locations card
document.querySelectorAll('.tabs').forEach((tabsEl) => {
  const tabs = tabsEl.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
    });
  });
});

// Hero pager dots (visual only — no actual slide change wired up)
document.querySelectorAll('.hero__pager').forEach((pager) => {
  const dots = pager.querySelectorAll('.pager-dot');
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      dots.forEach((d) => d.classList.remove('is-active'));
      dot.classList.add('is-active');
    });
  });
});

// News carousel arrows — placeholder behavior
const newsRow = document.querySelector('.news__row');
if (newsRow) {
  const cards = newsRow.querySelectorAll('.news-card');
  const prev = newsRow.querySelector('.news__nav--prev');
  const next = newsRow.querySelector('.news__nav--next');
  let pulse = (el) => { el.style.transition = 'transform .25s'; el.style.transform = 'scale(1.02)'; setTimeout(() => el.style.transform = '', 250); };
  prev?.addEventListener('click', () => cards.forEach(pulse));
  next?.addEventListener('click', () => cards.forEach(pulse));
}
