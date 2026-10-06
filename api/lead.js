// POST /api/lead: emails a Tastemaster intake lead to Charlie through Resend.
// Serverless function (Vercel Node runtime). Environment variables:
//   RESEND_API_KEY  (required) Resend API key
//   LEAD_TO         (required) where leads are delivered, e.g. you@yourdomain.com
//   LEAD_FROM       (required) a sender on a domain verified in Resend, e.g. "Tastemaster <leads@yourdomain.com>"
//   LEAD_AUTOREPLY  (optional) "1" to also send the lead the "Got it." confirmation
//   LEAD_TZ         (optional) IANA time zone for the lead email's timestamp, default UTC
// Email templates live in ./_emails.js.

const SERVICES = ['Taste Audit', 'Slop → Art', 'Tastemaster on retainer', 'Not sure yet'];
const LIMITS = { name: 120, email: 200, company: 160, link: 500, budget: 40, timeline: 40, message: 5000 };

const { leadEmail, autoReply } = require('./_emails');
const clean = (v, max) => (typeof v === 'string' ? v.replace(/\r/g, '').trim().slice(0, max) : '');

async function send(body) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return r.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const { RESEND_API_KEY, LEAD_TO, LEAD_FROM } = process.env;
  if (!RESEND_API_KEY || !LEAD_TO || !LEAD_FROM) return res.status(500).json({ error: 'Lead delivery is not configured' });

  let raw = req.body;
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = {}; } }
  raw = raw || {};

  // Honeypot: bots fill the hidden "website" field. Pretend success, send nothing.
  if (clean(raw.website, 200)) return res.status(200).json({ ok: true });

  const lead = Object.fromEntries(Object.entries(LIMITS).map(([k, max]) => [k, clean(raw[k], max)]));
  for (const k of ['name', 'email', 'company', 'link', 'budget', 'timeline']) lead[k] = lead[k].replace(/\s+/g, ' ');
  lead.service = SERVICES.includes(raw.service) ? raw.service : 'Not sure yet';
  if (!lead.name || !lead.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return res.status(400).json({ error: 'Name, a valid email and a message are required' });
  }
  if (lead.link && !/^https?:\/\//i.test(lead.link)) lead.link = 'https://' + lead.link;

  const notice = leadEmail(lead);

  try {
    await send({ from: LEAD_FROM, to: [LEAD_TO], reply_to: lead.email, ...notice });
    if (process.env.LEAD_AUTOREPLY === '1') {
      await send({ from: LEAD_FROM, to: [lead.email], reply_to: LEAD_TO, ...autoReply(lead) })
        .catch(() => {}); // the lead itself already went through
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'Could not send right now' });
  }
};
