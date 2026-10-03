# charlie-www
Charlie Hinojosa Official Site

## Music (current `index.html`)

- The hero's flying images are now **record sleeves**: Charlie's albums *Scored, Vol. 1* and *COMING HOME (Odyssey)*, plus RAÍZ and two Sightbox Records singles. On hover a sleeve sharpens and slides its disc out; clicking drops that record onto the deck.
- **On the deck** is the Sightbox Records picture-disc turntable, ported from `sightbox/records-www` to plain JS (`assets/deck.js`):
  - `TurntableEngine` ← `lib/playback/turntable.ts`, with `assets/turntable-worklet.js` copied verbatim. Dragging the record scratches the real track (100°/s = 1×; still = silent; backwards plays in reverse).
  - `ElementEngine` ← `lib/playback/audio.ts` is the fallback where AudioWorklet is missing.
  - Record spin, pointer/keyboard scratching and the pink-noise hiss ← `components/Record.tsx`; waveform bars ← `components/Waveform.tsx`.
- Audio: the six RAÍZ "radio" samples, encoded to 160 kbps MP3 in `assets/audio/` from the WAVs in records-www. Charlie's own albums have no audio files there yet, so they load onto the platter with a Spotify link. Drop MP3s in `assets/audio/` and add a `src` in `TRACKS` (top of `assets/deck.js`) to make them playable.
- Covers in `assets/covers/` come from records-www.
- The deck needs to be served over http(s) (the worklet and MP3s are fetched); opening `index.html` from disk won't load audio.

## Concept v3

Builds on v2 with interaction and real biography:

- Hero wordmark now reads **CHARLIE** (the footer carries *hinojosa.*).
- The blurred flying posters snap into focus on hover.
- A white capture LED blinks on the corner of the Ray-Ban Meta glasses. Clicking it zooms into the lens and opens a POV dialog (`assets/pov-meta.jpg`) with a "Hey Meta, record" voice prompt and a live REC timer.
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
