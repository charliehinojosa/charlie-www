// Intake email templates (the canvas "Intake emails" board), as table-based, inline-styled HTML
// that holds up in Gmail, Outlook and Apple Mail. Anton/Archivo load where the client allows
// web fonts (Apple Mail, iOS); everywhere else falls back to Impact and Helvetica.
// Files in api/ that start with "_" are helpers, not routes.

const SITE = 'https://charliehinojosa.com';
const INK = '#0f0f0e', PAPER = '#f6f5f2', MUTE = '#8d8b86', INK2 = '#4a4945', EMBER = '#f2541b', RULE = '#dcdbd7';
const DISPLAY = "Anton,Impact,'Arial Narrow Bold','Helvetica Neue',sans-serif";
const TEXT = "Archivo,'Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,'Courier New',monospace";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const para = (s) => esc(s).replace(/\n/g, '<br>');
const first = (name) => name.split(' ')[0];
const excerpt = (s, n = 140) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; };

function stamp(date = new Date(), timeZone = process.env.LEAD_TZ || 'UTC') {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, month: '2-digit', day: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' }).formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.month}.${p.day}.${p.year} ${p.hour === '24' ? '00' : p.hour}:${p.minute} ${p.timeZoneName}`;
}

// Shared shell: 600px card on the page grey, hidden preheader, fonts for clients that take them.
const shell = (title, preheader, inner) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wdth,wght@100..125,400..800&display=swap" rel="stylesheet">
<style>body{margin:0;padding:0}a{color:${INK}}@media (max-width:620px){.px{padding-left:24px!important;padding-right:24px!important}.mx{margin-left:24px!important;margin-right:24px!important}.h1{font-size:48px!important}}</style>
</head><body style="margin:0;padding:0;background:#ecebe8">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#ecebe8">${esc(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ecebe8" style="background:#ecebe8"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAPER}" style="width:100%;max-width:600px;background:${PAPER};border-radius:6px;overflow:hidden">
${inner}
</table></td></tr></table></body></html>`;

const pill = (href, label, { bg = INK, fg = PAPER, outline = false, size = 12 } = {}) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;vertical-align:middle"><tr><td bgcolor="${outline ? PAPER : bg}" style="border-radius:999px;${outline ? `border:1px solid ${INK};` : ''}background:${outline ? PAPER : bg}">
<a href="${esc(href)}" style="display:inline-block;padding:14px 24px;font-family:${TEXT};font-size:${size}px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${outline ? INK : fg};text-decoration:none;border-radius:999px">${label}</a></td></tr></table>`;

const label = (s) => `<div style="font-family:${MONO};font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${MUTE};margin:0 0 10px">${s}</div>`;

const rowsTable = (rows) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.map(([k, v], i) =>
  `<tr><td style="padding:12px 0;border-top:1px solid ${RULE};${i === rows.length - 1 ? `border-bottom:1px solid ${RULE};` : ''}font-family:${TEXT};font-size:15px;color:${MUTE}">${k}</td>
<td align="right" style="padding:12px 0;border-top:1px solid ${RULE};${i === rows.length - 1 ? `border-bottom:1px solid ${RULE};` : ''}font-family:${TEXT};font-size:15px;font-weight:600;color:${INK}">${v}</td></tr>`).join('')}</table>`;

function leadEmail(lead, now = new Date()) {
  const subject = `Lead: ${lead.service} — ${lead.name}${lead.company ? ` (${lead.company})` : ''}`;
  const reply = `mailto:${lead.email}?subject=${encodeURIComponent(`Re: ${lead.service}`)}`;
  const linkText = lead.link.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const rows = [
    lead.budget && ['Budget', esc(lead.budget)],
    lead.link && ['Link', `<a href="${esc(lead.link)}" style="color:${INK};font-weight:600">${esc(linkText)}</a>`],
    ['Service', esc(lead.service)],
  ].filter(Boolean);
  const pre = [lead.timeline, lead.budget, excerpt(lead.message, 80)].filter(Boolean).join(' · ');

  const html = shell(subject, pre, `
<tr><td bgcolor="${INK}" class="px" style="background:${INK};padding:22px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font-family:${TEXT};font-size:24px;font-weight:800;font-stretch:112%;letter-spacing:-.01em;line-height:1;color:${PAPER}">CH<span style="color:${EMBER}">©</span></td>
<td align="right" style="font-family:${MONO};font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${EMBER}">&#9679; New lead</td>
</tr></table></td></tr>
<tr><td class="px" style="padding:36px 32px 0">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${INK}" style="background:${INK};border-radius:999px;padding:7px 14px;font-family:${TEXT};font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:${PAPER}">${esc(lead.service)}</td></tr></table>
<h1 class="h1" style="margin:14px 0 10px;font-family:${DISPLAY};font-weight:400;font-size:64px;line-height:.95;letter-spacing:.005em;text-transform:uppercase;color:${INK}">${esc(lead.name)}</h1>
<p style="margin:0;font-family:${TEXT};font-size:16px;line-height:1.5;color:${INK2}">${lead.company ? `${esc(lead.company)} · ` : ''}<a href="mailto:${esc(lead.email)}" style="color:${INK}">${esc(lead.email)}</a></p>
</td></tr>
${lead.timeline ? `<tr><td class="px" style="padding:24px 32px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${INK}" style="background:${INK};border-radius:12px"><tr>
<td style="padding:16px 20px;font-family:${MONO};font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${MUTE}">Destination time</td>
<td align="right" style="padding:16px 20px;font-family:${MONO};font-size:18px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${EMBER}">${esc(lead.timeline)}</td>
</tr></table></td></tr>` : ''}
<tr><td class="px" style="padding:24px 32px 0">${rowsTable(rows)}</td></tr>
<tr><td class="px" style="padding:28px 32px 0">${label('Their note')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border-radius:12px"><tr>
<td style="padding:20px 22px;font-family:${TEXT};font-size:16px;line-height:1.6;color:${INK}">${para(lead.message)}</td></tr></table></td></tr>
<tr><td class="px" style="padding:32px 32px 36px">${pill(reply, `Reply to ${esc(first(lead.name))} &rarr;`, { bg: EMBER, fg: INK, size: 13 })}
<span style="font-family:${TEXT};font-size:13px;color:${INK2};padding-left:10px;vertical-align:middle">or just hit Reply. It goes to them.</span></td></tr>
<tr><td class="px" style="padding:18px 32px;border-top:1px solid ${RULE};font-family:${MONO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${MUTE}">Intake · charliehinojosa.com · ${esc(stamp(now))}</td></tr>`);

  const text = [`NEW LEAD: ${lead.service}`, '', `${lead.name}${lead.company ? ` · ${lead.company}` : ''}`, lead.email,
    lead.timeline ? `Destination time: ${lead.timeline}` : null, lead.budget ? `Budget: ${lead.budget}` : null, lead.link ? `Link: ${lead.link}` : null,
    '', 'Their note:', lead.message, '', 'Hit Reply to answer them.', `Intake · charliehinojosa.com · ${stamp(now)}`]
    .filter((l) => l !== null).join('\n');
  return { subject, html, text };
}

function autoReply(lead) {
  const subject = 'Got it. Your note is in.';
  const hi = first(lead.name);
  const html = shell(subject, `Hi ${hi}, thanks for sending this over. I read every one and will come back to you within two business days.`, `
<tr><td style="padding:0;line-height:0"><a href="${SITE}"><img src="${SITE}/assets/og.jpg" width="600" alt="CHARLIE in tall black type, with Charlie Hinojosa seated in front on a yellow plutonium case" style="display:block;width:100%;max-width:600px;height:auto;border:0"></a></td></tr>
<tr><td class="px" style="padding:40px 40px 0;font-family:${TEXT};font-size:17px;line-height:1.6;color:${INK}">
<h1 class="h1" style="margin:0 0 22px;font-family:${DISPLAY};font-weight:400;font-size:80px;line-height:.9;text-transform:uppercase;color:${INK}">Got it<span style="color:${EMBER}">.</span></h1>
<p style="margin:0 0 18px">Hi ${esc(hi)},</p>
<p style="margin:0 0 18px">Thanks for sending this over. Your note is in, I read every one, and I'll come back to you within two business days, with taste.</p>
<p style="margin:0">If there's anything you forgot to attach, reply here and it lands straight with me.</p>
</td></tr>
<tr><td class="px" style="padding:28px 40px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border-radius:12px"><tr><td style="padding:20px 22px">
${label('What you sent')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:0 0 8px;font-family:${TEXT};font-size:15px;color:${MUTE}">Service</td><td align="right" style="padding:0 0 8px;font-family:${TEXT};font-size:15px;font-weight:600;color:${INK}">${esc(lead.service)}</td></tr>
${lead.timeline ? `<tr><td style="padding:0 0 8px;font-family:${TEXT};font-size:15px;color:${MUTE}">Destination time</td><td align="right" style="padding:0 0 8px;font-family:${MONO};font-size:14px;font-weight:700;text-transform:uppercase;color:${INK}">${esc(lead.timeline)}</td></tr>` : ''}
</table>
<p style="margin:6px 0 0;font-family:${TEXT};font-size:14px;line-height:1.55;color:${INK2}">&ldquo;${esc(excerpt(lead.message))}&rdquo;</p>
</td></tr></table></td></tr>
<tr><td class="px" style="padding:32px 40px 0">
<div style="font-family:${DISPLAY};font-size:28px;line-height:1;text-transform:uppercase;color:${INK}">Charlie Hinojosa</div>
<div style="margin-top:6px;font-family:${TEXT};font-size:14px;color:${INK2}">Webmaster, 1999. Tastemaster, now.</div>
</td></tr>
<tr><td class="px" style="padding:28px 40px 36px">${pill(`${SITE}/#slop`, 'See slop become art')}&nbsp;&nbsp;${pill(`${SITE}/#music`, 'Put a record on', { outline: true })}</td></tr>
<tr><td bgcolor="${INK}" class="px" style="background:${INK};padding:24px 40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font-family:${TEXT};font-size:20px;font-weight:800;font-stretch:112%;letter-spacing:-.01em;color:${PAPER}">CH<span style="color:${EMBER}">©</span></td>
<td align="right"><a href="${SITE}" style="font-family:${MONO};font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${PAPER};text-decoration:none">charliehinojosa.com</a></td>
</tr></table>
<p style="margin:10px 0 0;font-family:${TEXT};font-size:12px;line-height:1.5;color:${MUTE}">Where we're going, we don't need roads. You're getting this because you used the intake on charliehinojosa.com; there's nothing to unsubscribe from.</p>
</td></tr>`);

  const text = `Got it.\n\nHi ${hi},\n\nThanks for sending this over. Your note is in, I read every one, and I'll come back to you within two business days, with taste.\n\nIf there's anything you forgot to attach, reply here and it lands straight with me.\n\nWhat you sent\nService: ${lead.service}${lead.timeline ? `\nDestination time: ${lead.timeline}` : ''}\n"${excerpt(lead.message)}"\n\nCharlie Hinojosa\nWebmaster, 1999. Tastemaster, now.\n${SITE}\n\nWhere we're going, we don't need roads.`;
  return { subject, html, text };
}

module.exports = { leadEmail, autoReply, stamp };
