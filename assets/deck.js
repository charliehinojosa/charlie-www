/*
 * The deck: the Sightbox Records picture-disc turntable, ported from
 * sightbox/records-www to plain JS for this static page.
 *
 *   TurntableEngine  ← lib/playback/turntable.ts (+ assets/turntable-worklet.js, copied verbatim)
 *   ElementEngine    ← lib/playback/audio.ts (fallback when AudioWorklet is missing; can't scratch)
 *   record handlers  ← components/Record.tsx (spin, real scratch, hiss fallback, keyboard)
 *   barLevels        ← components/Waveform.tsx
 *
 * Dragging the record scratches the real track: 100°/s of platter is 1×,
 * holding it still is silent, backwards plays in reverse, letting go hands
 * it back to the motor. Releases without an audio file show on the platter
 * with a Spotify link and scratch the synthesized hiss instead.
 */
(() => {
  const RECORD_DEG_PER_SEC = 100;
  const WORKLET_URL = 'assets/turntable-worklet.js';

  const TRACKS = [
    { id: 'scored', group: 'by', title: 'Scored, Vol. 1', artist: 'Charlie Hinojosa', release: 'LP', cover: 'assets/covers/scored-vol-1.jpg', spotify: 'https://open.spotify.com/album/2M6IxJFfhFzBNcOWFb7OBa' },
    { id: 'severance', group: 'by', title: 'Severance', artist: 'Charlie Hinojosa', release: 'Scored, Vol. 1', kind: 'Track', cover: 'assets/covers/scored-vol-1.jpg', spotify: 'https://open.spotify.com/track/2V227pEduiElekgPuE15Bu' },
    { id: 'bonsai', group: 'by', title: 'Bonsai', artist: 'Charlie Hinojosa', release: 'Scored, Vol. 1', kind: 'Track', cover: 'assets/covers/scored-vol-1.jpg', spotify: 'https://open.spotify.com/track/6E3EIlCVg7MGhcC5oA4wmg' },
    { id: 'coming-home', group: 'by', title: 'COMING HOME (Odyssey)', artist: 'Charlie Hinojosa', release: 'LP', cover: 'assets/covers/coming-home-odyssey.jpg', spotify: 'https://open.spotify.com/album/0CLIK7VrYwqFsamlTW4KoW' },
    { id: 't1', group: 'raiz', title: 'Vivo', artist: 'RAÍZ', release: 'RAÍZ', cover: 'assets/covers/raiz.jpg', length: '0:29', src: 'assets/audio/raiz-vivo-radio.mp3', spotify: 'https://open.spotify.com/album/6lm4CHNWQsehPuMMojewMa' },
    { id: 't2', group: 'raiz', title: 'Ama', artist: 'RAÍZ', release: 'RAÍZ', cover: 'assets/covers/raiz.jpg', length: '0:30', src: 'assets/audio/raiz-ama-radio.mp3', spotify: 'https://open.spotify.com/album/6lm4CHNWQsehPuMMojewMa' },
    { id: 't3', group: 'raiz', title: 'Montaña', artist: 'RAÍZ', release: 'RAÍZ', cover: 'assets/covers/raiz.jpg', length: '0:25', src: 'assets/audio/raiz-montana-radio.mp3', spotify: 'https://open.spotify.com/album/6lm4CHNWQsehPuMMojewMa' },
    { id: 't4', group: 'raiz', title: 'I Speak Jesus', artist: 'RAÍZ', release: 'RAÍZ', cover: 'assets/covers/raiz.jpg', length: '0:18', src: 'assets/audio/raiz-i-speak-jesus-radio.mp3', spotify: 'https://open.spotify.com/album/6lm4CHNWQsehPuMMojewMa' },
    { id: 't5', group: 'raiz', title: 'So Low', artist: 'RAÍZ', release: 'RAÍZ', cover: 'assets/covers/raiz.jpg', length: '0:16', src: 'assets/audio/raiz-so-low-radio.mp3', spotify: 'https://open.spotify.com/album/6lm4CHNWQsehPuMMojewMa' },
    { id: 't6', group: 'raiz', title: '3:33', artist: 'RAÍZ', release: 'RAÍZ', cover: 'assets/covers/raiz.jpg', length: '0:32', src: 'assets/audio/raiz-333-radio.mp3', spotify: 'https://open.spotify.com/album/6lm4CHNWQsehPuMMojewMa' },
  ];
  const GROUPS = { by: 'By Charlie · on Spotify', raiz: 'RAÍZ · new album samples' };
  const PLAYABLE = TRACKS.map((t, i) => (t.src ? i : -1)).filter((i) => i >= 0);

  const $ = (id) => document.getElementById(id);
  const root = $('music');
  if (!root) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AC = window.AudioContext || window.webkitAudioContext;

  /* ---------- engines ---------- */

  /*
   * Main-thread copy of turntable-worklet.js's processor, for a ScriptProcessorNode.
   * Used only when AudioWorklet can't load (old browsers, sandboxed frames), so
   * scratching still moves the real track. Same playhead maths, line for line.
   */
  class TurntableCore {
    constructor(outRate, post) {
      Object.assign(this, { outRate, post, ch: null, len: 0, srcRate: outRate, pos: 0, rate: 0, motor: 0, hand: null, ended: false, snap: false, dc: [0, 0, 0, 0], sinceReport: 0 });
    }
    handle(m) {
      if (m.type === 'buffer') { this.ch = m.channels; this.len = m.channels[0].length; this.srcRate = m.sampleRate; this.pos = 0; this.rate = 0; this.ended = false; }
      else if (m.type === 'motor') { this.motor = m.on ? 1 : 0; if (m.on) { this.ended = false; this.snap = false; } }
      else if (m.type === 'seek') { this.pos = Math.max(0, Math.min(this.len - 1, m.seconds * this.srcRate)); this.ended = false; }
      else if (m.type === 'scratch') { if (m.rate === null && this.hand !== null && !this.motor) this.snap = true; this.hand = m.rate; }
    }
    render(outL, outR) {
      const frames = outL.length;
      if (!this.ch) { outL.fill(0); outR.fill(0); return; }
      const sr = this.outRate, ratio = this.srcRate / sr;
      const target = this.hand !== null ? this.hand : this.motor;
      const tau = this.hand !== null || this.snap ? 0.01 : this.motor ? 0.12 : 0.06;
      const k = 1 - Math.exp(-1 / (tau * sr));
      const dc = this.dc, last = this.len - 1, L = this.ch[0], R = this.ch[1] || this.ch[0];
      const herm = (d, i, f) => {
        const n = d.length, x0 = d[i > 0 ? i - 1 : 0], x1 = d[i], x2 = d[i + 1 < n ? i + 1 : n - 1], x3 = d[i + 2 < n ? i + 2 : n - 1];
        const c1 = 0.5 * (x2 - x0), c2 = x0 - 2.5 * x1 + 2 * x2 - 0.5 * x3, c3 = 0.5 * (x3 - x0) + 1.5 * (x1 - x2);
        return ((c3 * f + c2) * f + c1) * f + x1;
      };
      for (let f = 0; f < frames; f++) {
        this.rate += (target - this.rate) * k;
        if (target === 0 && Math.abs(this.rate) < 0.02) this.rate = 0;
        let p = this.pos + this.rate * ratio;
        if (p < 0) p = 0;
        if (p >= last) { p = last; if (this.hand === null && this.motor && !this.ended) { this.ended = true; this.motor = 0; this.post({ type: 'ended' }); } }
        this.pos = p;
        const i = p | 0, fr = p - i;
        const l = herm(L, i, fr), r = R === L ? l : herm(R, i, fr);
        const yl = l - dc[0] + 0.999 * dc[1]; dc[0] = l; dc[1] = yl;
        const yr = r - dc[2] + 0.999 * dc[3]; dc[2] = r; dc[3] = yr;
        outL[f] = yl; outR[f] = yr;
      }
      if (this.snap && Math.abs(this.rate) < 1e-4) this.snap = false;
      this.sinceReport += frames;
      if (this.sinceReport >= sr / 30) { this.sinceReport = 0; this.post({ type: 'pos', seconds: this.pos / this.srcRate, rate: this.rate }); }
    }
  }

  class TurntableEngine {
    static supported() { return !!AC; }
    constructor(ev) { Object.assign(this, { ev, ctx: null, node: null, ready: null, loadedUrl: null, token: 0, motor: false, duration: 0, pos: 0, rate: 0, posAt: 0, loaded: false, mode: null }); }
    get canScratch() { return this.loaded; }
    onMessage(m) {
      if (m.type === 'pos') { this.pos = m.seconds; this.rate = m.rate; this.posAt = this.ctx.currentTime; }
      else if (m.type === 'ended') { this.motor = false; this.ev.onState('ended'); this.ev.onEnded(); }
    }
    /* AudioWorklet from its URL; else the same file through a blob: URL (frames that refuse
       cross-origin module loads); else the ScriptProcessor copy above. */
    loadWorklet() {
      const wk = this.ctx.audioWorklet;
      if (!wk || typeof AudioWorkletNode === 'undefined' || window.__deckForceScript) return Promise.reject(new Error('no worklet'));
      return wk.addModule(WORKLET_URL).catch(() =>
        fetch(WORKLET_URL).then((r) => r.text()).then((code) => wk.addModule(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })))));
    }
    ensure() {
      if (!this.ctx) {
        this.ctx = new AC({ latencyHint: 'interactive' });
        this.ready = this.loadWorklet().then(() => {
          const node = new AudioWorkletNode(this.ctx, 'turntable', { numberOfInputs: 0, outputChannelCount: [2] });
          node.connect(this.ctx.destination);
          node.port.onmessage = ({ data }) => this.onMessage(data);
          this.node = { post: (msg, transfer) => node.port.postMessage(msg, transfer) };
          this.mode = 'worklet';
        }).catch(() => {
          const core = new TurntableCore(this.ctx.sampleRate, (m) => this.onMessage(m));
          const sp = this.ctx.createScriptProcessor(2048, 0, 2);
          sp.onaudioprocess = (e) => core.render(e.outputBuffer.getChannelData(0), e.outputBuffer.getChannelData(1));
          sp.connect(this.ctx.destination);
          this.node = { post: (msg) => core.handle(msg), keep: sp };
          this.mode = 'script';
        });
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ready;
    }
    send(msg, transfer = []) { if (this.node) this.node.post(msg, transfer); }
    load(url, autoplay) {
      const ready = this.ensure();
      this.motor = autoplay;
      if (url === this.loadedUrl && this.loaded) {
        this.send({ type: 'seek', seconds: 0 }); this.pos = 0;
        autoplay ? this.play() : this.pause();
        return;
      }
      const token = ++this.token;
      this.loaded = false;
      this.send({ type: 'motor', on: false });
      this.ev.onState(autoplay ? 'loading' : 'paused');
      Promise.all([ready, fetch(url).then((r) => { if (!r.ok) throw r.status; return r.arrayBuffer(); })])
        .then(([, bytes]) => this.ctx.decodeAudioData(bytes))
        .then((buf) => {
          if (token !== this.token) return;
          const channels = Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, c) => buf.getChannelData(c).slice());
          this.send({ type: 'buffer', channels, sampleRate: buf.sampleRate }, channels.map((c) => c.buffer));
          this.loadedUrl = url; this.loaded = true; this.duration = buf.duration;
          this.pos = 0; this.posAt = this.ctx.currentTime;
          this.motor ? this.play() : this.ev.onState('paused');
        })
        .catch((e) => { if (token === this.token) this.ev.onError(typeof e === 'number' ? e : 'decode'); });
    }
    play() { this.motor = true; this.ensure(); if (!this.loaded) return; this.send({ type: 'motor', on: true }); this.ev.onState('playing'); }
    pause() { this.motor = false; this.send({ type: 'motor', on: false }); this.ev.onState('paused'); }
    seek(f) { if (!this.loaded) return; this.pos = f * this.duration; this.posAt = this.ctx.currentTime; this.send({ type: 'seek', seconds: this.pos }); }
    scratch(rate) { if (this.loaded) this.send({ type: 'scratch', rate }); }
    time() { if (!this.ctx || !this.loaded) return 0; return Math.max(0, Math.min(this.duration, this.pos + this.rate * (this.ctx.currentTime - this.posAt))); }
    length() { return this.loaded ? this.duration : 0; }
  }

  class ElementEngine {
    constructor(ev) {
      this.ev = ev; this.canScratch = false;
      const el = (this.el = new Audio());
      el.preload = 'none';
      el.addEventListener('playing', () => ev.onState('playing'));
      el.addEventListener('pause', () => ev.onState('paused'));
      el.addEventListener('waiting', () => ev.onState('buffering'));
      el.addEventListener('ended', () => { ev.onState('ended'); ev.onEnded(); });
      el.addEventListener('error', () => ev.onError((el.error && el.error.code) || 'media'));
    }
    load(url, autoplay) { if (this.el.getAttribute('src') !== url) this.el.src = url; autoplay ? this.play() : this.ev.onState('paused'); }
    play() { this.ev.onState('loading'); this.el.play().catch(() => this.ev.onState('paused')); }
    pause() { this.el.pause(); }
    seek(f) { const d = this.length(); if (d > 0) this.el.currentTime = f * d; }
    scratch() {}
    time() { return this.el.currentTime || 0; }
    length() { return Number.isFinite(this.el.duration) ? this.el.duration : 0; }
  }

  /* ---------- player state ---------- */

  const S = { index: PLAYABLE[0], status: 'idle', progress: 0, elapsed: 0, durations: {}, scratching: false };
  let engine = null;
  const ev = {
    onState: (status) => { S.status = status; render(); },
    onEnded: () => advance(1, true),
    onError: () => { S.status = 'paused'; render(); },
  };
  const getEngine = () => engine || (engine = TurntableEngine.supported() ? new TurntableEngine(ev) : new ElementEngine(ev));
  const track = () => TRACKS[S.index];
  const playing = () => S.status === 'playing';
  const engaged = () => ['playing', 'loading', 'buffering'].includes(S.status);
  const fmt = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const lengthOf = (t) => (S.durations[t.id] ? fmt(S.durations[t.id]) : t.length || '');

  function select(i, autoplay) {
    const t = TRACKS[i];
    const changed = i !== S.index;
    S.index = i; S.progress = 0; S.elapsed = 0;
    if (t.src) getEngine().load(t.src, autoplay);
    else { if (engine && engaged()) engine.pause(); S.status = 'idle'; }
    if (changed) recImg.src = t.cover;
    render();
  }
  function toggle() {
    const t = track();
    if (!t.src) return;
    const e = getEngine();
    if (engaged()) e.pause();
    else if (e.loadedUrl === t.src || e.el) e.play();
    else e.load(t.src, true);
  }
  function advance(dir, auto) {
    const at = PLAYABLE.indexOf(S.index);
    const from = at < 0 ? (dir > 0 ? -1 : 0) : at;
    const n = (from + dir + PLAYABLE.length) % PLAYABLE.length;
    if (auto && at === PLAYABLE.length - 1) { S.status = 'paused'; render(); return; }
    select(PLAYABLE[n], true);
  }

  /* ---------- DOM ---------- */

  const recEl = $('record'), recImg = $('rec-img');
  const wave = $('wave'), titleEl = $('deck-title-now'), bylineEl = $('deck-byline'), artEl = $('deck-art');
  const posEl = $('deck-pos'), timeEl = $('deck-time'), playBtn = $('deck-play'), spotifyEl = $('deck-spotify');
  const queueEl = $('deck-queue');

  // P-7 bar levels, ported from Waveform.tsx
  const BARS = 120;
  const barLevels = (count, k0) => Array.from({ length: count }, (_, k) => {
    const env = 0.5 + 0.5 * Math.sin(k * 0.1 * (120 / count) + k0 * 1.3);
    return env * (0.55 + 0.45 * Math.abs(Math.sin(k * 1.7 + 0.4)));
  });
  let waveFor = -1;
  function drawWave() {
    if (waveFor === S.index) return;
    waveFor = S.index;
    wave.innerHTML = '';
    barLevels(BARS, S.index).forEach((v) => {
      const b = document.createElement('span');
      b.style.setProperty('--v', v.toFixed(3));
      wave.appendChild(b);
    });
  }

  // Spotify mark, drawn as three arcs in a circle (stroke, currentColor)
  const SPOTIFY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10.2"/><path d="M7 9.4c3.4-1 7.2-.7 10.2.9M7.6 12.6c2.8-.8 5.8-.5 8.2.8M8.2 15.6c2.2-.6 4.4-.4 6.3.6"/></svg>';
  const rows = [];
  let lastGroup = '';
  TRACKS.forEach((t, i) => {
    if (t.group !== lastGroup) {
      lastGroup = t.group;
      const h = document.createElement('li');
      h.className = 'q-group mono';
      h.textContent = GROUPS[t.group];
      queueEl.appendChild(h);
    }
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'q-row';
    b.innerHTML = '<img alt="" width="40" height="40" loading="lazy"><span class="q-text"><span class="q-title"></span><span class="q-artist"></span></span><span class="q-len mono"></span>';
    b.querySelector('img').src = t.cover;
    b.querySelector('.q-title').textContent = t.title;
    b.querySelector('.q-artist').textContent = t.artist + (t.release && t.release !== t.artist ? ' · ' + t.release : '');
    b.addEventListener('click', () => select(i, !!t.src));
    li.appendChild(b);
    if (t.spotify) {
      const a = document.createElement('a');
      a.className = 'q-spot';
      a.href = t.spotify;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', 'Listen to ' + t.title + ' on Spotify');
      a.title = 'Listen on Spotify';
      a.innerHTML = SPOTIFY;
      li.appendChild(a);
    }
    queueEl.appendChild(li);
    rows.push(b);
  });

  const PLAY = '<svg width="14" height="16" viewBox="0 0 16 18" fill="currentColor" aria-hidden="true"><path d="M0 0l16 9-16 9z"/></svg>';
  const PAUSE = '<svg width="14" height="16" viewBox="0 0 16 18" fill="currentColor" aria-hidden="true"><path d="M0 0h5v18H0zM11 0h5v18h-5z"/></svg>';

  function render() {
    const t = track();
    drawWave();
    root.dataset.status = S.status;
    titleEl.textContent = t.title;
    bylineEl.textContent = t.artist + ' — ' + t.release;
    artEl.style.backgroundImage = 'url(' + t.cover + ')';
    const at = PLAYABLE.indexOf(S.index);
    posEl.textContent = t.src ? t.release + ' · ' + String(at + 1).padStart(2, '0') + ' / ' + String(PLAYABLE.length).padStart(2, '0') : t.artist;
    timeEl.textContent = t.src ? fmt(S.elapsed) + ' / ' + lengthOf(t) : 'stream it on Spotify';
    playBtn.hidden = !t.src;
    playBtn.innerHTML = engaged() ? PAUSE : PLAY;
    playBtn.setAttribute('aria-label', engaged() ? 'Pause' : 'Play');
    spotifyEl.hidden = !t.spotify;
    if (t.spotify) spotifyEl.href = t.spotify;
    wave.classList.toggle('off', !t.src);
    wave.setAttribute('aria-valuenow', String(Math.round(S.progress)));
    wave.setAttribute('aria-valuetext', fmt(S.elapsed) + ' of ' + lengthOf(t));
    [...wave.children].forEach((b, k) => b.classList.toggle('on', (k / BARS) * 100 < S.progress));
    rows.forEach((b, i) => {
      const r = TRACKS[i];
      const active = i === S.index;
      b.classList.toggle('active', active);
      if (active) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      b.querySelector('.q-len').textContent = r.src ? lengthOf(r) : r.kind || r.release;
    });
    spin();
  }

  // progress sampling while playing or held
  (function sample() {
    if (engine && (playing() || S.scratching)) {
      const d = engine.length();
      if (d > 0) {
        const t = engine.time();
        S.progress = Math.min(100, (t / d) * 100); S.elapsed = t;
        if (S.durations[track().id] !== d) S.durations[track().id] = d;
        timeEl.textContent = fmt(t) + ' / ' + lengthOf(track());
        const on = Math.floor((S.progress / 100) * BARS);
        [...wave.children].forEach((b, k) => b.classList.toggle('on', k < on));
      }
    }
    requestAnimationFrame(sample);
  })();

  playBtn.addEventListener('click', toggle);
  $('deck-prev').addEventListener('click', () => advance(-1));
  $('deck-next').addEventListener('click', () => advance(1));
  wave.addEventListener('click', (e) => {
    if (!track().src || !engine) return;
    const r = wave.getBoundingClientRect();
    engine.seek((e.clientX - r.left) / r.width);
  });
  wave.addEventListener('keydown', (e) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 5 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -5 : 0;
    if (!step || !engine) return;
    e.preventDefault();
    engine.seek(Math.max(0, Math.min(1, (S.progress + step) / 100)));
  });

  /* ---------- the record (Record.tsx) ---------- */

  let angle = 0, drag = null, live = false, hiss = null, raf = 0;
  const norm360 = (a) => ((Math.round(a) % 360) + 360) % 360;
  const write = (aria) => { recEl.style.transform = 'rotate(' + angle + 'deg)'; if (aria) recEl.setAttribute('aria-valuenow', String(norm360(angle))); };

  function spin() {
    const go = (playing() && !reduce) || S.scratching;
    if (!go) { cancelAnimationFrame(raf); raf = 0; write(true); return; }
    if (raf) return;
    let last = 0, lastAngle = angle;
    const tick = (t) => {
      const dt = last ? (t - last) / 1000 : 0;
      last = t;
      if (drag) { if (live && dt > 0) engine.scratch((angle - lastAngle) / dt / RECORD_DEG_PER_SEC); }
      else if (playing() && !reduce) angle += RECORD_DEG_PER_SEC * dt;
      lastAngle = angle;
      write();
      if ((playing() && !reduce) || S.scratching) raf = requestAnimationFrame(tick);
      else { raf = 0; write(true); }
    };
    raf = requestAnimationFrame(tick);
  }

  // P-14 hiss: 2s looping pink noise → bandpass → gain(0), for releases with no file
  function ensureHiss() {
    if (!AC) return null;
    if (!hiss) {
      const ctx = new AC();
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.value = 900;
      const gain = ctx.createGain(); gain.gain.value = 0;
      src.connect(bp); bp.connect(gain); gain.connect(ctx.destination); src.start();
      hiss = { ctx, src, bp, gain };
    }
    if (hiss.ctx.state === 'suspended') hiss.ctx.resume();
    return hiss;
  }

  const pointerAngle = (e) => {
    const r = recEl.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  recEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    try { recEl.setPointerCapture(e.pointerId); } catch (_) {}
    drag = { a: pointerAngle(e), t: performance.now() };
    live = !!(engine && engine.canScratch && track().src);
    if (live) engine.scratch(0); else ensureHiss();
    S.scratching = true;
    recEl.dataset.scratching = '';
    spin();
  });
  recEl.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const a = pointerAngle(e);
    let da = a - drag.a;
    if (da > 180) da -= 360;
    if (da < -180) da += 360;
    const now = performance.now(), dt = Math.max(1, now - drag.t) / 1000;
    angle += da; drag = { a, t: now };
    write(true);
    if (live || !hiss) return;
    const v = Math.abs(da / dt), t = hiss.ctx.currentTime;
    hiss.gain.gain.setTargetAtTime(Math.min(0.9, v / 700), t, 0.02);
    hiss.bp.frequency.setTargetAtTime(500 + Math.min(3500, v * 3), t, 0.03);
    hiss.src.playbackRate.setTargetAtTime(0.6 + Math.min(1.6, v / 900), t, 0.03);
  });
  const release = () => {
    if (!drag) return;
    drag = null;
    if (live) engine.scratch(null);
    else if (hiss) hiss.gain.gain.setTargetAtTime(0, hiss.ctx.currentTime, 0.05);
    live = false;
    S.scratching = false;
    delete recEl.dataset.scratching;
    spin();
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) => recEl.addEventListener(n, release));
  recEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      angle += 15 * dir; write(true);
      if (engine && engine.canScratch && track().src) {
        const NUDGE_S = 0.08;
        engine.scratch((dir * 15) / NUDGE_S / RECORD_DEG_PER_SEC);
        setTimeout(() => engine.scratch(null), NUDGE_S * 1000);
        return;
      }
      const au = ensureHiss();
      if (au) {
        const t = au.ctx.currentTime;
        au.bp.frequency.setTargetAtTime(1800, t, 0.01); au.src.playbackRate.setTargetAtTime(1.4, t, 0.01);
        au.gain.gain.setTargetAtTime(0.5, t, 0.01); au.gain.gain.setTargetAtTime(0, t + 0.08, 0.03);
      }
    } else if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); toggle(); }
  });

  /* ---------- hero sleeves drop their record on the deck ---------- */
  document.querySelectorAll('[data-deck]').forEach((el) => {
    el.addEventListener('click', () => {
      const i = TRACKS.findIndex((t) => t.id === el.dataset.deck);
      if (i < 0) return;
      select(i, !!TRACKS[i].src);
      root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });

  render();
})();
