/** Classroom wheel sounds. Generated in-browser so we need no audio files. */

let ctx: AudioContext | null = null;

async function audio(): Promise<AudioContext | null> {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  gain: number,
) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export async function playWhoosh() {
  const ac = await audio();
  if (!ac) return;
  const t = ac.currentTime;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(400, t);
  filter.frequency.exponentialRampToValueAtTime(2400, t + 0.35);
  const noise = ac.createBufferSource();
  const buffer = ac.createBuffer(1, ac.sampleRate * 0.45, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.35;
  noise.buffer = buffer;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  noise.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  noise.start(t);
  noise.stop(t + 0.45);
}

export async function playTick(speed = 1) {
  const ac = await audio();
  if (!ac) return;
  const t = ac.currentTime;
  const freq = 1400 + Math.random() * 280;
  tone(ac, freq, t, 0.045 * Math.min(1.4, 0.5 + speed), "square", 0.07);
}

/** Peg “tok” — bandpassed noise, louder/shorter when the rim is faster. */
export async function playPegTick(speedRad = 1, whenOffset = 0) {
  const ac = await audio();
  if (!ac) return;
  const I = Math.min(1, Math.max(0, speedRad) / 18);
  const intensity = 0.4 + 0.6 * I ** 0.6;
  const t0 = ac.currentTime + Math.max(0, whenOffset);
  const dur = 0.061 - 0.048 * intensity;
  const samples = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, samples, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    const x = i / samples;
    data[i] = (Math.random() * 2 - 1) * (1 - x) * (1 - x);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = (1500 + 550 * intensity) * (1 + (Math.random() - 0.5) * 0.16);
  bp.Q.value = 3;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3300 + 2200 * intensity;
  lp.Q.value = 0.7;
  const g = ac.createGain();
  const peak = 0.07 + 0.06 * intensity;
  const attack = 0.0024 - 0.0013 * intensity;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(bp).connect(lp).connect(g).connect(ac.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
  src.onended = () => {
    src.disconnect();
    bp.disconnect();
    lp.disconnect();
    g.disconnect();
  };
}

export async function playWin() {
  const ac = await audio();
  if (!ac) return;
  const t = ac.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    tone(ac, freq, t + i * 0.09, 0.28, "triangle", 0.12);
  });
}

export async function playCorrect() {
  const ac = await audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 523.25, t, 0.12, "triangle", 0.14);
  tone(ac, 783.99, t + 0.08, 0.18, "triangle", 0.14);
  tone(ac, 1046.5, t + 0.16, 0.32, "sine", 0.16);
}

export async function playMiss() {
  const ac = await audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 220, t, 0.18, "sine", 0.1);
  tone(ac, 164.81, t + 0.1, 0.28, "triangle", 0.08);
}

export async function playTimeout() {
  const ac = await audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 392, t, 0.12, "square", 0.06);
  tone(ac, 311, t + 0.14, 0.22, "square", 0.07);
}

export async function playFanfare() {
  const ac = await audio();
  if (!ac) return;
  const t = ac.currentTime;
  const notes = [392, 523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    tone(ac, freq, t + i * 0.11, i === notes.length - 1 ? 0.55 : 0.22, "triangle", 0.13);
  });
  // Soft sparkle trail after the chord
  [1318.5, 1568, 2093].forEach((freq, i) => {
    tone(ac, freq, t + 0.72 + i * 0.08, 0.35, "sine", 0.06);
  });
}

/** Crackles + rising whistle for the winner fireworks screen. */
export async function playFireworks() {
  const ac = await audio();
  if (!ac) return;
  const t0 = ac.currentTime;

  const crackle = (at: number, bright: number) => {
    const dur = 0.12 + Math.random() * 0.1;
    const samples = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, samples, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      const x = i / samples;
      data[i] = (Math.random() * 2 - 1) * (1 - x) * (1 - x);
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800 + bright * 2200;
    bp.Q.value = 1.4;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.05 + bright * 0.04, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(bp).connect(g).connect(ac.destination);
    src.start(at);
    src.stop(at + dur + 0.02);
  };

  const whistle = (at: number) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, at);
    osc.frequency.exponentialRampToValueAtTime(1400, at + 0.28);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.045, at + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(at);
    osc.stop(at + 0.34);
  };

  for (let i = 0; i < 7; i++) {
    const at = t0 + 0.12 + i * 0.28 + Math.random() * 0.08;
    whistle(at);
    crackle(at + 0.26, 0.4 + Math.random() * 0.6);
    if (Math.random() > 0.4) crackle(at + 0.34, Math.random());
  }
}

export async function playUrgentTick() {
  const ac = await audio();
  if (!ac) return;
  tone(ac, 880, ac.currentTime, 0.05, "square", 0.05);
}

export async function playDrumroll(ms = 2400) {
  const ac = await audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  const end = t0 + ms / 1000;
  let t = t0;
  let gap = 0.1;
  while (t < end) {
    tone(ac, 170 + Math.random() * 50, t, 0.038, "square", 0.055);
    t += gap;
    gap = Math.max(0.038, gap * 0.93);
  }
}

export async function playTossReveal() {
  const ac = await audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 196, t, 0.18, "triangle", 0.1);
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    tone(ac, freq, t + 0.08 + i * 0.07, i === 3 ? 0.45 : 0.2, "sine", 0.13);
  });
}

export async function playNameLock() {
  const ac = await audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 98, t, 0.22, "sine", 0.14);
  tone(ac, 196, t, 0.18, "triangle", 0.08);
  const sparkle = [783.99, 987.77, 1174.66, 1567.98];
  sparkle.forEach((freq, i) => {
    tone(ac, freq, t + 0.06 + i * 0.055, 0.22, "sine", 0.09);
  });
  tone(ac, 523.25, t + 0.28, 0.4, "triangle", 0.12);
}
