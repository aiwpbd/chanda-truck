'use strict';
// ============================================================
// সবজির ট্রাক — Sound System
// All sounds synthesized via Web Audio API (zero external files)
// ============================================================

const Audio = (() => {
  let ctx = null;
  let master = null;

  // Engine nodes
  let engOsc1 = null, engOsc2 = null, engGain = null, engFilter = null;

  // Rain nodes
  let rainSrc = null, rainGain = null;

  let muted = false;
  let ready = false;

  // ----------------------------------------------------------
  // INIT — call once on first user interaction
  // ----------------------------------------------------------
  function init() {
    if (ready) {
      // Resume if suspended (mobile browsers)
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.65;
      master.connect(ctx.destination);
      _startEngine();
      ready = true;
    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  }

  // ----------------------------------------------------------
  // NOISE BUFFER helper
  // ----------------------------------------------------------
  function _noise(dur) {
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.ceil(sr * dur), sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ----------------------------------------------------------
  // ENGINE — continuous, speed-responsive rumble
  // ----------------------------------------------------------
  function _startEngine() {
    // Primary sawtooth oscillator
    engOsc1 = ctx.createOscillator();
    engOsc1.type = 'sawtooth';
    engOsc1.frequency.value = 82;

    // Secondary harmonic (square, one octave up)
    engOsc2 = ctx.createOscillator();
    engOsc2.type = 'square';
    engOsc2.frequency.value = 165;

    // Subtle idle LFO wobble
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 6.5;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 7;
    lfo.connect(lfoG);
    lfoG.connect(engOsc1.frequency);
    lfo.start();

    const osc2G = ctx.createGain();
    osc2G.gain.value = 0.26;

    // Low-pass to muffle harshness
    engFilter = ctx.createBiquadFilter();
    engFilter.type = 'lowpass';
    engFilter.frequency.value = 400;
    engFilter.Q.value = 1.2;

    engGain = ctx.createGain();
    engGain.gain.value = 0.07; // soft idle

    engOsc1.connect(engFilter);
    engOsc2.connect(osc2G);
    osc2G.connect(engFilter);
    engFilter.connect(engGain);
    engGain.connect(master);

    engOsc1.start();
    engOsc2.start();
  }

  // Call every frame from game loop while driving
  function updateEngine(speed, accelerating) {
    if (!ready || !engOsc1) return;
    const t = ctx.currentTime;
    const freq1 = 82 + speed * 17;
    engOsc1.frequency.setTargetAtTime(freq1, t, 0.08);
    engOsc2.frequency.setTargetAtTime(freq1 * 2, t, 0.08);
    const vol = speed > 0.15 ? Math.min(0.30, 0.07 + speed * 0.038) : 0.07;
    engGain.gain.setTargetAtTime(vol, t, 0.12);
    engFilter.frequency.setTargetAtTime(360 + speed * 62, t, 0.10);
  }

  // ----------------------------------------------------------
  // HORN — two-tone Bangladeshi truck horn
  // ----------------------------------------------------------
  function honk() {
    if (!ready || muted) return;
    const now = ctx.currentTime;
    const tones = [[375, 0.00, 0.13], [480, 0.10, 0.17], [375, 0.24, 0.11]];
    for (const [freq, off, dur] of tones) {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now + off);
      g.gain.linearRampToValueAtTime(0.36, now + off + 0.018);
      g.gain.setValueAtTime(0.36, now + off + dur - 0.02);
      g.gain.linearRampToValueAtTime(0, now + off + dur);
      osc.connect(g); g.connect(master);
      osc.start(now + off);
      osc.stop(now + off + dur + 0.04);
    }
  }

  // ----------------------------------------------------------
  // BRAKE SQUEAL
  // ----------------------------------------------------------
  function brakeSqueal() {
    if (!ready || muted) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = _noise(0.32);
    const bp  = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2300; bp.Q.value = 3.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.linearRampToValueAtTime(0, now + 0.32);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(now); src.stop(now + 0.35);
  }

  // ----------------------------------------------------------
  // RAIN — filtered noise loop
  // ----------------------------------------------------------
  function startRain() {
    if (!ready || rainSrc || muted) return;
    rainSrc = ctx.createBufferSource();
    rainSrc.buffer = _noise(3.0);
    rainSrc.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2800; bp.Q.value = 0.55;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 650;
    rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rainSrc.connect(bp); bp.connect(hp); hp.connect(rainGain);
    rainGain.connect(master);
    rainSrc.start();
    rainGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 1.8);
  }

  function stopRain() {
    if (!ready || !rainGain) return;
    rainGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.8);
    const _src = rainSrc, _g = rainGain;
    rainSrc = null; rainGain = null;
    setTimeout(() => { try { _src.stop(); } catch(e){} }, 2000);
  }

  // ----------------------------------------------------------
  // OBSTACLE ALERT — repeating siren
  // ----------------------------------------------------------
  function obstacleAlert() {
    if (!ready || muted) return;
    const now = ctx.currentTime;
    const seq = [[680, 0.00], [530, 0.20], [680, 0.38], [530, 0.56]];
    for (const [freq, t] of seq) {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now + t);
      g.gain.linearRampToValueAtTime(0.20, now + t + 0.025);
      g.gain.setValueAtTime(0.20, now + t + 0.15);
      g.gain.linearRampToValueAtTime(0, now + t + 0.19);
      osc.connect(g); g.connect(master);
      osc.start(now + t); osc.stop(now + t + 0.22);
    }
  }

  // ----------------------------------------------------------
  // PAY COIN — ascending cash-register ding
  // ----------------------------------------------------------
  function payCoin() {
    if (!ready || muted) return;
    const now = ctx.currentTime;
    const notes = [[880, 0], [1109, 0.07], [1319, 0.14], [1760, 0.21]];
    for (const [freq, t] of notes) {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.26, now + t);
      g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.26);
      osc.connect(g); g.connect(master);
      osc.start(now + t); osc.stop(now + t + 0.30);
    }
  }

  // ----------------------------------------------------------
  // CRASH / BREAK THROUGH — bass thud + noise burst
  // ----------------------------------------------------------
  function crashBreak() {
    if (!ready || muted) return;
    const now = ctx.currentTime;
    // Bass thud
    const thud = ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(190, now);
    thud.frequency.exponentialRampToValueAtTime(35, now + 0.38);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.78, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    thud.connect(tg); tg.connect(master);
    thud.start(now); thud.stop(now + 0.46);
    // Wood/bamboo crack
    const src = ctx.createBufferSource();
    src.buffer = _noise(0.18);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.58, now);
    ng.gain.linearRampToValueAtTime(0, now + 0.18);
    src.connect(ng); ng.connect(master);
    src.start(now); src.stop(now + 0.20);
  }

  // ----------------------------------------------------------
  // TRAIN HORN — deep multi-harmonic + clickety-clack
  // ----------------------------------------------------------
  function trainHorn() {
    if (!ready || muted) return;
    const now = ctx.currentTime;
    // Deep horn harmonics
    const harmonics = [[220, 0.46], [330, 0.22], [440, 0.14], [550, 0.07]];
    for (const [freq, gain] of harmonics) {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain, now + 0.12);
      g.gain.setValueAtTime(gain, now + 0.80);
      g.gain.linearRampToValueAtTime(0, now + 1.10);
      osc.connect(g); g.connect(master);
      osc.start(now); osc.stop(now + 1.15);
    }
    // Rhythmic clickety-clack
    for (let i = 0; i < 7; i++) {
      const src = ctx.createBufferSource();
      src.buffer = _noise(0.04);
      const g = ctx.createGain();
      const t = now + 0.35 + i * 0.14;
      g.gain.setValueAtTime(0.20, t);
      g.gain.linearRampToValueAtTime(0, t + 0.07);
      src.connect(g); g.connect(master);
      src.start(t); src.stop(t + 0.08);
    }
  }

  // ----------------------------------------------------------
  // DAMAGE SOUND — grinding mechanical crunch
  // ----------------------------------------------------------
  function damage() {
    if (!ready || muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.linearRampToValueAtTime(72, now + 0.52);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.58, now);
    g.gain.linearRampToValueAtTime(0, now + 0.54);
    osc.connect(g); g.connect(master);
    osc.start(now); osc.stop(now + 0.58);
    // Crunch noise
    const src = ctx.createBufferSource();
    src.buffer = _noise(0.12);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.42, now);
    ng.gain.linearRampToValueAtTime(0, now + 0.12);
    src.connect(ng); ng.connect(master);
    src.start(now); src.stop(now + 0.14);
  }

  // ----------------------------------------------------------
  // WIN JINGLE — ascending happy melody
  // ----------------------------------------------------------
  function winJingle() {
    if (!ready || muted) return;
    const now = ctx.currentTime;
    // C4 E4 G4 C5 E5 G5 C6
    const melody = [
      [261.63, 0.00], [329.63, 0.18], [392.00, 0.36],
      [523.25, 0.54], [659.25, 0.72], [783.99, 0.90],
      [1046.5, 1.08], [783.99, 1.30], [1046.5, 1.50],
    ];
    for (const [freq, t] of melody) {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now + t);
      g.gain.linearRampToValueAtTime(0.30, now + t + 0.04);
      g.gain.setValueAtTime(0.30, now + t + 0.12);
      g.gain.linearRampToValueAtTime(0, now + t + 0.18);
      osc.connect(g); g.connect(master);
      osc.start(now + t); osc.stop(now + t + 0.22);
    }
  }

  // ----------------------------------------------------------
  // GAME OVER — sad descending trombone
  // ----------------------------------------------------------
  function gameOver() {
    if (!ready || muted) return;
    const now = ctx.currentTime;
    const notes = [[392, 0.00], [349, 0.26], [311, 0.52], [196, 0.78]];
    for (const [freq, t] of notes) {
      const osc  = ctx.createOscillator();
      const g    = ctx.createGain();
      const vLfo = ctx.createOscillator();
      const vG   = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      vLfo.frequency.value = 5;
      vG.gain.value = 5;
      vLfo.connect(vG); vG.connect(osc.frequency);
      vLfo.start(now + t);
      g.gain.setValueAtTime(0, now + t);
      g.gain.linearRampToValueAtTime(0.30, now + t + 0.06);
      g.gain.setValueAtTime(0.30, now + t + 0.19);
      g.gain.linearRampToValueAtTime(0, now + t + 0.25);
      osc.connect(g); g.connect(master);
      osc.start(now + t); osc.stop(now + t + 0.30);
      vLfo.stop(now + t + 0.30);
    }
  }

  // ----------------------------------------------------------
  // UI CLICK — short sine blip
  // ----------------------------------------------------------
  function click() {
    if (!ready || muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 640;
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g); g.connect(master);
    osc.start(now); osc.stop(now + 0.10);
  }

  // ----------------------------------------------------------
  // MUTE TOGGLE
  // ----------------------------------------------------------
  function toggleMute() {
    if (!ready) return false;
    muted = !muted;
    master.gain.setTargetAtTime(muted ? 0 : 0.65, ctx.currentTime, 0.08);
    return muted;
  }

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------
  return {
    init,
    updateEngine,
    honk,
    brakeSqueal,
    startRain,
    stopRain,
    obstacleAlert,
    payCoin,
    crashBreak,
    trainHorn,
    damage,
    winJingle,
    gameOver,
    click,
    toggleMute,
    isReady: () => ready,
    isMuted: () => muted,
  };
})();
