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
const resend = new Resend(process.env.RESEND_API_KEY);
const TO     = process.env.CONTACT_EMAIL ?? 'service@cretec-schiffstechnik.de';
// NOTE: must be a Resend-verified sender on a domain you control.
const FROM   = process.env.CONTACT_FROM   ?? 'CRETEC Kontaktformular <kontakt@mail.cretec-schiffstechnik.de>';

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
  const name    = sanitize(req.body.name,     200);
  const email   = sanitize(req.body.email,    200);
  const message = sanitize(req.body.message, 2000);

  if (!name || !email || !message) {
    return res.status(422).json({ error: 'Pflichtfelder fehlen.' });
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(422).json({ error: 'Ungültige E-Mail-Adresse.' });
  }

  if (req.body.consent !== true && req.body.consent !== 'true') {
    return res.status(422).json({ error: 'Zustimmung zur Datenschutzerklärung erforderlich.' });
  }

  try {
    await resend.emails.send({
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

    res.json({ ok: true });
  } catch (err) {
    console.error('[contact] Resend error:', err?.message ?? err);
    res.status(502).json({ error: 'E-Mail konnte nicht gesendet werden.' });
  }
});

app.listen(port, () => console.log(`API running on :${port}`));
