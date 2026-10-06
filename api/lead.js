// POST /api/lead: emails a Tastemaster intake lead to Charlie through Resend.
// Serverless function (Vercel Node runtime). Environment variables:
//   RESEND_API_KEY  (required) Resend API key
//   LEAD_TO         (required) where leads are delivered, e.g. you@yourdomain.com
//   LEAD_FROM       (required) a sender on a domain verified in Resend, e.g. "Tastemaster <leads@yourdomain.com>"
//   LEAD_AUTOREPLY  (optional) "1" to also send the lead a short confirmation

const SERVICES = ['Taste Audit', 'Slop → Art', 'Tastemaster on retainer', 'Not sure yet'];
const LIMITS = { name: 120, email: 200, company: 160, link: 500, budget: 40, timeline: 40, message: 5000 };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

  const rows = [['Service', lead.service], ['Name', lead.name], ['Email', lead.email], ['Company', lead.company],
    ['Link', lead.link], ['Budget', lead.budget], ['Timeline', lead.timeline]].filter(([, v]) => v);
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;color:#0f0f0e;max-width:560px">
    <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#f2541b;margin:0 0 8px">New Tastemaster lead</p>
    <h1 style="font-size:24px;margin:0 0 16px">${esc(lead.name)} · ${esc(lead.service)}</h1>
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">${rows.map(([k, v]) =>
      `<tr><td style="padding:4px 16px 4px 0;color:#8d8b86">${k}</td><td style="padding:4px 0">${k === 'Link' ? `<a href="${esc(v)}">${esc(v)}</a>` : esc(v)}</td></tr>`).join('')}</table>
    <p style="font-size:15px;line-height:1.6;white-space:pre-wrap;margin:0">${esc(lead.message)}</p></div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\n${lead.message}`;

  try {
    await send({ from: LEAD_FROM, to: [LEAD_TO], reply_to: lead.email,
      subject: `Lead: ${lead.service} — ${lead.name}${lead.company ? ` (${lead.company})` : ''}`, html, text });
    if (process.env.LEAD_AUTOREPLY === '1') {
      await send({ from: LEAD_FROM, to: [lead.email], reply_to: LEAD_TO, subject: 'Got it. Your note is in.',
        text: `Hi ${lead.name},\n\nThanks for sending this over. I read every one and will come back to you within two business days.\n\nCharlie Hinojosa\nTastemaster` })
        .catch(() => {}); // the lead itself already went through
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'Could not send right now' });
  }
};
