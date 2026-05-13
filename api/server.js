import express   from 'express';
import { Resend } from 'resend';
import rateLimit from 'express-rate-limit';

// ── Startup validation ────────────────────────────────────────
if (!process.env.RESEND_API_KEY) {
  console.error('FATAL: RESEND_API_KEY is not set');
  process.exit(1);
}

const app    = express();
const port   = process.env.PORT ?? 3001;

// Trust one proxy hop (Vite dev proxy locally, nginx in production).
// Required for express-rate-limit to use the real client IP from X-Forwarded-For.
app.set('trust proxy', 1);
const resend = new Resend(process.env.RESEND_API_KEY);
const TO     = process.env.CONTACT_EMAIL ?? 'aline.schaeller@decorum-experience.com';
// NOTE: must be a Resend-verified sender on a domain you control.
const FROM   = process.env.CONTACT_FROM   ?? 'CRETEC Kontaktformular TEST <kontakt@mail.cretec-schiffstechnik.de>';

// ── Startup config log (no secrets) ───────────────────────────
console.log('[boot] Cretec Contact API starting…');
console.log('[boot] PORT         :', port);
console.log('[boot] CONTACT_FROM :', FROM);
console.log('[boot] CONTACT_EMAIL:', TO);
console.log('[boot] RESEND_KEY   :', `${process.env.RESEND_API_KEY.slice(0, 10)}…(${process.env.RESEND_API_KEY.length} chars)`);

app.use(express.json({ limit: '16kb' }));

// ── Rate limiting — 5 submissions per IP per 15 min ──────────
const limiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
});

// ── Helpers ───────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitize(val, maxLen = 500) {
  return String(val ?? '').replace(/[<>]/g, '').trim().slice(0, maxLen);
}

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Contact form ──────────────────────────────────────────────
app.post('/contact', limiter, async (req, res) => {
  const reqId = Math.random().toString(36).slice(2, 8);
  const t0    = Date.now();
  console.log(`[contact ${reqId}] ▶ incoming POST from ip=${req.ip}`);

  const name    = sanitize(req.body.name,     200);
  const email   = sanitize(req.body.email,    200);
  const message = sanitize(req.body.message, 2000);

  console.log(`[contact ${reqId}] fields: name=${JSON.stringify(name)} email=${JSON.stringify(email)} message.length=${message.length} consent=${JSON.stringify(req.body.consent)}`);

  if (!name || !email || !message) {
    console.warn(`[contact ${reqId}] ✗ validation: missing required field`);
    return res.status(422).json({ error: 'Pflichtfelder fehlen.' });
  }

  if (!EMAIL_RE.test(email)) {
    console.warn(`[contact ${reqId}] ✗ validation: invalid email format`);
    return res.status(422).json({ error: 'Ungültige E-Mail-Adresse.' });
  }

  if (req.body.consent !== true && req.body.consent !== 'true') {
    console.warn(`[contact ${reqId}] ✗ validation: consent not given`);
    return res.status(422).json({ error: 'Zustimmung zur Datenschutzerklärung erforderlich.' });
  }

  console.log(`[contact ${reqId}] ✓ validation passed, calling Resend (from=${FROM}, to=${TO}, replyTo=${email})`);

  try {
    const result = await resend.emails.send({
      from:    FROM,
      to:      [TO],
      replyTo: email,
      subject: `Neue Anfrage von ${name}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>E-Mail:</strong> ${email}</p>
        <hr />
        <p>${message.replace(/\n/g, '<br />')}</p>
      `,
    });

    // Resend SDK v4 returns { data, error } — does NOT throw on API errors.
    if (result?.error) {
      console.error(`[contact ${reqId}] ✗ Resend returned error after ${Date.now() - t0}ms:`, JSON.stringify(result.error));
      return res.status(502).json({ error: 'E-Mail konnte nicht gesendet werden.', details: result.error });
    }

    console.log(`[contact ${reqId}] ✔ Resend accepted in ${Date.now() - t0}ms, id=${result?.data?.id}`);
    res.json({ ok: true, id: result?.data?.id });
  } catch (err) {
    console.error(`[contact ${reqId}] ✗ exception after ${Date.now() - t0}ms:`, err?.stack ?? err?.message ?? err);
    res.status(502).json({ error: 'E-Mail konnte nicht gesendet werden.' });
  }
});

app.listen(port, () => console.log(`API running on :${port}`));
