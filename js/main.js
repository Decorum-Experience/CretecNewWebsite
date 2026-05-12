import './i18n.js';

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

  ctx.fillText(line1, W / 2, 280, maxW);
  ctx.fillText(line2, W / 2, 500, maxW);

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
  const section = tabsEl.closest('.map-section');
  const lists = section ? section.querySelectorAll('.locations-list[data-region]') : [];
  const regions = section ? section.querySelectorAll('.map-region[data-region]') : [];
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      const region = tab.dataset.region;
      if (!region) return;
      lists.forEach((list) => {
        list.classList.toggle('is-active', list.dataset.region === region);
      });
      regions.forEach((r) => {
        r.classList.toggle('is-active', r.dataset.region === region);
      });
    });
  });
});

// Per-card photo carousel — auto-rotate with cross-fade, pause on hover/focus
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('[data-pic-carousel]').forEach((media) => {
  const imgs = media.querySelectorAll('.ref-card__bg');
  const dots = media.querySelectorAll('.ref-card__pic-dot');
  if (imgs.length <= 1) return;
  let idx = 0;
  let timer = null;
  const go = (i) => {
    idx = (i + imgs.length) % imgs.length;
    imgs.forEach((img, n) => img.classList.toggle('is-active', n === idx));
    dots.forEach((d, n) => {
      d.classList.toggle('is-active', n === idx);
      d.setAttribute('aria-selected', n === idx ? 'true' : 'false');
    });
  };
  const stop = () => {
    if (timer) { clearInterval(timer); timer = null; }
  };
  const start = () => {
    if (prefersReducedMotion) return;
    stop();
    timer = setInterval(() => go(idx + 1), 6000);
  };
  dots.forEach((d, n) => d.addEventListener('click', () => { go(n); start(); }));
  const card = media.closest('.ref-card');
  if (card) {
    card.addEventListener('mouseenter', stop);
    card.addEventListener('mouseleave', start);
    card.addEventListener('focusin', stop);
    card.addEventListener('focusout', start);
  }
  start();
});

// References carousel — horizontal scroll-snap card grid
document.querySelectorAll('[data-carousel]').forEach((carousel) => {
  const track = carousel.querySelector('.references__track');
  const cards = carousel.querySelectorAll('.ref-card');
  const prevBtn = carousel.querySelector('[data-prev]');
  const nextBtn = carousel.querySelector('[data-next]');
  if (!track || cards.length === 0) return;

  const step = () => {
    const card = cards[0];
    const rect = card.getBoundingClientRect();
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
    return rect.width + gap;
  };

  const updateArrows = () => {
    if (!prevBtn || !nextBtn) return;
    const max = track.scrollWidth - track.clientWidth - 1;
    prevBtn.disabled = track.scrollLeft <= 1;
    nextBtn.disabled = track.scrollLeft >= max;
  };

  prevBtn && prevBtn.addEventListener('click', () => {
    track.scrollBy({ left: -step(), behavior: 'smooth' });
  });
  nextBtn && nextBtn.addEventListener('click', () => {
    track.scrollBy({ left: step(), behavior: 'smooth' });
  });
  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();
});

// Contact form — POSTs JSON to /api/contact (Node/Resend backend).
const contactForm = document.querySelector('.contact__form');
if (contactForm) {
  const status   = contactForm.querySelector('.contact__status');
  const submit   = contactForm.querySelector('[type="submit"]');
  const nameEl    = contactForm.querySelector('#contact-name');
  const emailEl   = contactForm.querySelector('#contact-email');
  const messageEl = contactForm.querySelector('#contact-message');
  const consentEl = contactForm.querySelector('#contact-consent');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const t = (de, en) => (window.i18n ? window.i18n.t(de, en) : de);

  function showStatus(msg, isError) {
    status.textContent = msg;
    status.classList.toggle('is-error', !!isError);
  }

  function validate() {
    if (!nameEl.value.trim() || !emailEl.value.trim() || !messageEl.value.trim()) {
      showStatus(t('Bitte füllen Sie alle Felder aus.', 'Please fill in all fields.'), true);
      return false;
    }
    if (!EMAIL_RE.test(emailEl.value.trim())) {
      showStatus(t('Bitte geben Sie eine gültige E-Mail-Adresse ein.', 'Please enter a valid email address.'), true);
      return false;
    }
    if (consentEl && !consentEl.checked) {
      showStatus(t('Bitte stimmen Sie der Datenschutzerklärung zu.', 'Please agree to the privacy policy.'), true);
      return false;
    }
    return true;
  }

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showStatus('', false);
    if (!validate()) return;

    const originalLabel = submit.textContent;
    submit.disabled = true;
    submit.style.opacity = '0.8';
    submit.textContent = t('Wird gesendet…', 'Sending…');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    nameEl.value.trim(),
          email:   emailEl.value.trim(),
          message: messageEl.value.trim(),
          consent: consentEl?.checked ? 'true' : 'false',
        }),
      });

      if (!res.ok) throw new Error('server');
      showStatus(t('Vielen Dank! Ihre Nachricht wurde gesendet.', 'Thank you! Your message has been sent.'), false);
      contactForm.reset();
    } catch {
      showStatus(t('Fehler beim Senden. Bitte später erneut versuchen.', 'Sending failed. Please try again later.'), true);
    } finally {
      submit.disabled = false;
      submit.style.opacity = '';
      submit.textContent = originalLabel;
    }
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
