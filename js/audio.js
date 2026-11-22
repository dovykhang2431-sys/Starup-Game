window.STARUP_AUDIO = (() => {
  let ctx = null;
  let bgmTimer = null;
  let bgmEnabled = true;
  let sfxEnabled = true;
  let stepIdx = 0;
  let isNightMood = false;

  // Chill Lo-fi Electric Piano chord progressions (Hz)
  const DAY_CHORDS = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
    [220.00, 261.63, 329.63, 392.00], // Am7
    [174.61, 220.00, 261.63, 329.63], // Fmaj7
    [196.00, 246.94, 293.66, 349.23]  // G7
  ];
  const NIGHT_CHORDS = [
    [220.00, 261.63, 329.63, 392.00], // Am7
    [174.61, 220.00, 261.63, 329.63], // Fmaj7
    [146.83, 174.61, 220.00, 261.63], // Dm7
    [164.81, 196.00, 246.94, 293.66]  // Em7
  ];

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  function playNote(freq, dur, vol, type = 'sine', delay = 0) {
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  function tickBGM() {
    if (!bgmEnabled || !ctx || ctx.state !== 'running') return;
    const chords = isNightMood ? NIGHT_CHORDS : DAY_CHORDS;
    const chord = chords[stepIdx % chords.length];
    // Warm soft electric-piano arpeggio
    chord.forEach((f, i) => {
      playNote(f * (isNightMood ? 0.5 : 1), isNightMood ? 2.4 : 1.9, 0.022, 'triangle', i * 0.14);
    });
    // Gentle chill melody note
    const topNote = chord[chord.length - 1] * (stepIdx % 2 === 0 ? 1 : 2);
    playNote(topNote, 1.2, 0.015, 'sine', 0.65);
    stepIdx++;
  }

  function startBGM() {
    ensureCtx();
    if (bgmTimer) clearInterval(bgmTimer);
    tickBGM();
    bgmTimer = setInterval(tickBGM, 2600);
  }

  function stopBGM() {
    if (bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
  }

  function setNight(night) {
    isNightMood = !!night;
  }

  function setBGM(on) {
    bgmEnabled = !!on;
    if (bgmEnabled) startBGM();
    else stopBGM();
  }

  function setSFX(on) {
    sfxEnabled = !!on;
  }

  function playSFX(kind) {
    if (!sfxEnabled) return;
    ensureCtx();
    if (!ctx) return;
    if (kind === 'cash') {
      playNote(587.33, 0.14, 0.06, 'triangle', 0);
      playNote(880.00, 0.24, 0.07, 'triangle', 0.08);
    } else if (kind === 'click') {
      playNote(440, 0.07, 0.035, 'sine', 0);
    } else if (kind === 'unlock') {
      playNote(523.25, 0.15, 0.06, 'triangle', 0);
      playNote(659.25, 0.15, 0.06, 'triangle', 0.09);
      playNote(783.99, 0.28, 0.07, 'triangle', 0.18);
    } else if (kind === 'alert') {
      playNote(330, 0.12, 0.055, 'sawtooth', 0);
      playNote(277, 0.18, 0.05, 'sawtooth', 0.11);
    } else if (kind === 'bell') {
      playNote(659.25, 0.35, 0.05, 'sine', 0);
      playNote(987.77, 0.5, 0.04, 'sine', 0.12);
    }
  }

  return {
    startBGM,
    stopBGM,
    setNight,
    setBGM,
    setSFX,
    playSFX,
    isBGMEnabled: () => bgmEnabled,
    isSFXEnabled: () => sfxEnabled
  };
})();
