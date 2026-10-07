# charlie-www
Charlie Hinojosa Official Site

## Current site: v6, "Tastemaster" (`index.html`)

*Webmaster, 1999. Tastemaster, now.* The site sells Charlie's taste as a service:

- **Hero**: "Tastemaster." over the seated cutout, with the hazmat morph, fire trails, Meta-glasses POV and record sleeves described below.
- **Taste** (`#taste`): the manifesto, with peek cards on the inline graphics.
- **The work** (`#companies`): a logo wall for the companies that carry the work: Sightbox (primary, black tile) → sightbox.co, Flux Intelligence Group → fluxgp.com, Sightbox Records → sightboxrecords.com (plus a link to the deck) and Beacon, a Sightbox product → sightbox.co/beacon. The logos in `assets/logos/` are the SVGs from each company's own site, recoloured to `currentColor` (Flux keeps its gold) and inlined so they take the tile's text colour. The Records lockup is the Sightbox mark plus "Records" set in the display face, as on sightboxrecords.com.
- **Work with me** (`#services`): three offers (Taste Audit, Slop → Art, Tastemaster on retainer). Each button opens the intake with that service preselected.
- **Music**, **Timeline**, and the footer from v5, retitled *The making of a tastemaster*.
- **Intake**: see *Lead intake* below. Its timeline is a Time Circuits "Destination time" picker (ASAP, This month, This quarter, "Where we're going…") that stamps a MM.DD.YY date.

`tastemaster.html` redirects to `/` for old links. The previous homepage is kept as `v5.html`.

### Deploy

Host on Vercel (no build step; output is the repo root) so `api/lead.js` runs. Then set the Resend variables below and verify the sending domain in Resend. On GitHub Pages or any static host the page works but the form shows its "didn't go through" message.

## BTTF nods

Subtle Back to the Future touches, all built on the film's numbers and mechanics, not its logos:

- **Time circuits** beside *The Timeline*: DESTINATION TIME 2026, PRESENT TIME (live: the year in view as you scroll), LAST TIME DEPARTED 1997, in a seven-segment face (DSEG7, SIL OFL, `assets/fonts`).
- **88 mph**: a speedometer next to the timeline hint reads scroll speed. Hit 88 and twin fire trails streak across the timeline. Typing `8` `8` anywhere jumps to the timeline at 88.
- **Timeline photos**: every entry on *The making of a tastemaster* (the career bars and each life moment, including *2024 · James born*) has a hover card, the same card as the manifesto peeks, with a striped photo slot. Each slot names its file in `data-photo`, e.g. `assets/timeline/2024-james-born.jpg`. To add a photo, save it at that path and swap the slot's `<span class="ph mono" …>Photo · 2024</span>` for `<img src="assets/timeline/2024-james-born.jpg" alt="…">` (the card already sizes images to 150 px tall, cover-cropped). On phones and tablets, where there's no hover, a tap opens a card (the timeline's and the manifesto peeks'), a second tap or a tap elsewhere closes it, and the card is nudged/scrolled fully into view.
- **10.21.15**: a marker on the timeline axis at Oct 21, 2015 (hover: "Where we're going, we don't need roads.").
- **Footer**: that line, quietly, in the legal row.
- **Hero**: Charlie sits on the plutonium case in Marty's Nike Bruins (white leather, red swoosh, white sole), in full colour, wearing a white low-cut tee, Marty's two-tone denim jacket (sleeves rolled to show the paisley lining) and a matte black cross chain (`assets/charlie-cutout.webp`, trail `charlie-trail-v2.webp`).
- **Suit up**: hover the figure (the silhouette itself, alpha hit-tested; tap on touch) and he morphs into the *COMING HOME (Odyssey)* avatar: yellow radiation suit, Sony Walkman held up, the same white Nikes, same pose on the same case (`assets/charlie-hazmat-cutout.webp`, same crop so the two overlay exactly). The suit drops over him head-to-toe like a costume (a soft wipe on a registered `@property` and a small settle) and lifts back off on hover-out. The avatar is registered to Charlie: hood warped onto his head (thin-plate spline), and the shoes and case below the knees are his own pixels, so nothing but the suit moves. Hovering the glasses LED keeps Charlie, so the Meta POV still works; the LED (on the frame's corner rivet) is hidden on the avatar, who has no glasses.
- **Fire trails**: the hero's BUILDER tunnel is gone. In its place, on the same tilted floor plane, are the DeLorean's twin fire trails right after it jumps: quiet burning lines with low 3D sheets of flame (SVG-noise masks) flickering up off them. They only ignite (from under him toward the horizon) while the hazmat avatar is showing, and go out when he changes back. No animation under reduced motion.

## Music

- The hero's flying images are now **record sleeves**: Charlie's albums *Scored, Vol. 1* and *COMING HOME (Odyssey)*, plus RAÍZ. On hover a sleeve sharpens and slides its disc out; clicking drops that record onto the deck.
- **On the deck** is the Sightbox Records picture-disc turntable, ported from `sightbox/records-www` to plain JS (`assets/deck.js`):
  - `TurntableEngine` ← `lib/playback/turntable.ts`, with `assets/turntable-worklet.js` copied verbatim. Dragging the record scratches the real track (100°/s = 1×; still = silent; backwards plays in reverse).
  - `ElementEngine` ← `lib/playback/audio.ts` is the fallback where AudioWorklet is missing.
  - Record spin, pointer/keyboard scratching and the pink-noise hiss ← `components/Record.tsx`; waveform bars ← `components/Waveform.tsx`.
- Playlist: *Severance* and *Bonsai* from *Scored, Vol. 1* (the hero's Scored sleeve drops *Severance* on the deck), and the *COMING HOME (Odyssey)* single, and the six RAÍZ samples. Every row has a Spotify icon link, and the "Listen on Spotify" pill follows the selected track. Every row links to its own song on Spotify. To add a track, add an entry to `TRACKS` with a `spotify` URL (and a `src` MP3 if it should play and scratch).
- Audio: 160 kbps MP3 samples in `assets/audio/`: the six RAÍZ "radio" samples (from the WAVs in records-www) and Charlie's *Severance*, *Bonsai* and *COMING HOME (Odyssey)* (`charlie-*.mp3`, from WAVs Charlie supplied). The deck opens on *Severance*. A release without audio loads onto the platter with just its Spotify link. Drop MP3s in `assets/audio/` and add a `src` in `TRACKS` (top of `assets/deck.js`) to make them playable.
- Covers in `assets/covers/` come from records-www.
- The deck needs to be served over http(s) (the worklet and MP3s are fetched); opening `index.html` from disk won't load audio.

## Concept v3

Builds on v2 with interaction and real biography:

- Hero wordmark now reads **CHARLIE** (the footer carries *hinojosa.*).
- The blurred flying posters snap into focus on hover.
- A white capture LED blinks on the corner of the Ray-Ban Meta glasses. Clicking it zooms into the lens and opens a POV dialog (`assets/pov-meta.jpg`) with a "Hey Meta, record" voice prompt and a live REC timer. The POV shot is Doc's lab: Doc Brown behind the camera, Einstein the sheepdog, and the DeLorean in the back.
- The inline graphics in the Meet Charlie paragraph open detail cards on hover / keyboard focus.
- *The Work* is now a horizontal **timeline** (1997 to now): career above the line (Cisco 1999, Intel 2008, Sightbox Studios 2011 to present), life and passion below. On desktop it pins and scrolls sideways with the page; on phones and with reduced motion it's a native swipe.
- Socials point to @charliehinojosa.

Previous versions: `v2.html`, `v1.html`.

## Concept v2 (`v2.html`)

Pushes v1 further with three new references:

- **Wobble poster**: a perspective tunnel of repeated BUILDER type, halftone texture, blurred flying copies of the other Higgsfield posters, and the low-angle sneaker pose.
- **Kinetic**: a motion-blur ghost and ember streak behind the figure, an ember-orange accent (taken from the "11" poster), staggered discipline cards with motion-blurred photos, a statement that fades to grey, and a black footer card with a giant lowercase `hinojosa.` cropped at the bottom.
- **Onmark**: pill nav with a Let's talk button, a two-tone headline with inline image pills and a barcode, stat callouts, social circles, and a rotating scroll badge.

## Concept v1 (`v1.html`): "Hinojosa / Builder"

A static, single-page concept (`index.html`) that combines two of the Higgsfield poster studies:

- **Poster 1** (stone-grey studio): the warm-grey seamless backdrop, the tall tone-on-tone `HINOJOSA` wordmark partly hidden behind the figure, and the tiny corner type (`CHARLIE HINOJOSA` · `BUILDER / CREATIVE` · `EST. 2011`).
- **Poster 4** (website hero): the `CH` mark and `WORK / VENTURES / MUSIC / ABOUT / CONTACT` nav, the figure overlapping the wordmark, and the "Builder. Creative. Founder of Sightbox Studios." intro with the **See the work** button.

The hero photo is the latest black-and-white Higgsfield portrait (the *BUILDER* cover), cut out with its wooden block (`assets/charlie-bw-cutout.webp`). The full cover sits in the About section (`assets/builder-cover-bw.jpg`).

Type: Anton (display) and Archivo (text), self-hosted in `assets/fonts` (SIL OFL).

Copy in `[BRACKETS]` is placeholder content that still needs filling in. Open `index.html` in a browser to view it; there's no build step.

## Lead intake

"Start a project" and the offer buttons open an intake card that rises out from behind the footer's top edge. It posts JSON to `/api/lead`, a serverless function (`api/lead.js`, Vercel Node runtime) that emails the lead through [Resend](https://resend.com) with the lead's address as reply-to.

Setup on Vercel (Project → Settings → Environment Variables):

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | your Resend API key |
| `LEAD_TO` | where leads are delivered |
| `LEAD_FROM` | a sender on a domain verified in Resend, e.g. `Tastemaster <leads@yourdomain.com>` |
| `LEAD_AUTOREPLY` | optional, `1` to send the lead the "Got it." confirmation email |
| `LEAD_TZ` | optional, IANA time zone for the timestamp on lead emails (e.g. `America/Los_Angeles`); default UTC |

Both emails are designed templates (the canvas's *Intake emails* board), built as table-based HTML with plain-text versions in `api/_emails.js`: the lead email to you (service, name, a "Destination time" strip, budget/link, their note, a Reply button) and the auto-reply to them (the share-card image, "Got it.", a recap of what they sent, links back to the site). They live in this site's code, not in Resend's template library, so nothing else on the Resend account changes.

The function rejects non-POSTs, validates name/email/message, length-limits and HTML-escapes every field, and silently drops submissions that fill the hidden honeypot field. GitHub Pages can't run the function, so the site needs to be hosted on Vercel (or the function ported to Netlify/Cloudflare) for the form to deliver.
