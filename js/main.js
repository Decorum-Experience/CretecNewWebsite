// Hero panel cutout — build a canvas-based mask at runtime so the text uses
// the page's fonts (SVG data-URI masks render outside the document font ctx
// and would fall back to a generic sans-serif).
function buildHeroPanelMask() {
  const panel = document.querySelector('.hero__panel');
  if (!panel) return;
  const line1 = 'MARITIME';
  const line2 = 'TRUSTED';

  const W = 960, H = 1156;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Opaque white rect = panel visible. destination-out text below punches
  // transparent holes so the forest behind shows through the letters.
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Auto-shrink so the longer line never overflows
  const maxW = 880;
  let fs = 220;
  const fontAt = (px) => `900 ${px}px "Arial Black", "Roboto", Arial, sans-serif`;
  ctx.font = fontAt(fs);
  const longer = line1.length >= line2.length ? line1 : line2;
  while (ctx.measureText(longer).width > maxW && fs > 60) {
    fs -= 2;
    ctx.font = fontAt(fs);
  }

  ctx.fillText(line1, W / 2, 400, maxW);
  ctx.fillText(line2, W / 2, 620, maxW);

  ctx.globalCompositeOperation = 'source-over';

  const url = `url("${canvas.toDataURL()}")`;
  panel.style.setProperty('--hero-panel-mask', url);
}

// Webfonts may load after first paint; rebuild once they're ready so the
// cutout uses the real Inter/Roboto metrics rather than the fallback.
buildHeroPanelMask();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(buildHeroPanelMask);
}

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

// Contact form — no backend yet, just validate and show a confirmation
const contactForm = document.querySelector('.contact__form');
if (contactForm) {
  const status = contactForm.querySelector('.contact__status');
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    status.classList.remove('is-error');
    if (!contactForm.checkValidity()) {
      status.textContent = 'Bitte füllen Sie alle Felder aus.';
      status.classList.add('is-error');
      return;
    }
    status.textContent = 'Vielen Dank! Ihre Nachricht wurde erfasst.';
    contactForm.reset();
  });
}

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
