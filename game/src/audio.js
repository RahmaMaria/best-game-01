// Emberfall — all sound is synthesised with WebAudio: no audio files, nothing
// fetched. Short oscillators and filtered noise for effects, and a quiet bass
// arpeggio that loops under play. Audio only starts after a user gesture.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let musicTimer = null;
  let muted = false;
  let musicOn = false;

  /** Build the graph lazily, on the first gesture, so autoplay rules never block it. */
  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo, delay = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, filterFreq, delay = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  /** A minor-key bass walk, one note every beat, with a soft fifth above it. */
  const BASS_LINE = [55, 0, 65.41, 0, 49, 0, 58.27, 0, 55, 0, 65.41, 0, 73.42, 65.41, 58.27, 49];
  let bassStep = 0;
  function startMusic() {
    if (!ctx || musicOn) return;
    musicOn = true;
    const beat = () => {
      if (!musicOn || !ctx) return;
      const freq = BASS_LINE[bassStep % BASS_LINE.length];
      bassStep += 1;
      if (freq > 0) {
        tone(freq, 0.42, 'triangle', 0.5, null);
        tone(freq * 1.5, 0.3, 'sine', 0.18, null, 0.02);
      }
      musicTimer = setTimeout(beat, 340);
    };
    beat();
  }

  function stopMusic() {
    musicOn = false;
    if (musicTimer) clearTimeout(musicTimer);
    musicTimer = null;
  }

  return {
    unlock() {
      if (ensure()) startMusic();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
    shoot() {
      tone(880, 0.09, 'square', 0.1, 320);
    },
    enemyDie() {
      noise(0.22, 0.35, 1400);
      tone(220, 0.22, 'sawtooth', 0.16, 55);
    },
    bruteDie() {
      noise(0.5, 0.5, 900);
      tone(160, 0.45, 'sawtooth', 0.25, 40);
      tone(80, 0.5, 'sine', 0.3, 30, 0.05);
    },
    hurt() {
      tone(140, 0.3, 'sawtooth', 0.3, 60);
      noise(0.18, 0.3, 700);
    },
    ember() {
      tone(1320, 0.12, 'sine', 0.14, 1760);
    },
    powerup() {
      tone(523, 0.12, 'sine', 0.18);
      tone(659, 0.12, 'sine', 0.18, null, 0.09);
      tone(784, 0.2, 'sine', 0.2, null, 0.18);
    },
    dash() {
      noise(0.16, 0.22, 3200);
    },
    waveHorn() {
      tone(196, 0.5, 'triangle', 0.25, 392);
      tone(294, 0.5, 'triangle', 0.15, 392, 0.08);
    },
    bossRoar() {
      tone(98, 0.8, 'sawtooth', 0.3, 49);
      noise(0.7, 0.35, 500);
    },
    victory() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.2, null, i * 0.14));
    },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, 'triangle', 0.2, null, i * 0.16));
    },
    click() {
      tone(660, 0.06, 'sine', 0.15);
    },
    stopMusic,
  };
}
