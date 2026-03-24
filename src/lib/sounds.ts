/**
 * Archo Sound Design System
 * Programmatic audio generation using Web Audio API
 */

let audioCtx: AudioContext | null = null;
let dragOscillator: OscillatorNode | null = null;
let dragGain: GainNode | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

const isMuted = () => {
  const enabled = localStorage.getItem('archo_sounds_enabled');
  return enabled === 'false';
};

export const toggleMute = () => {
  const current = isMuted();
  localStorage.setItem('archo_sounds_enabled', String(current));
  return !current;
};

export const getMuteStatus = () => {
  return !isMuted();
};

const createOscillator = (freq: number, type: OscillatorType = 'sine') => {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  return { osc, gain, ctx };
};

export const playHoverSound = () => {
  if (isMuted()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  } catch (e) {
    console.warn('Audio playback failed', e);
  }
};

export const playClickSound = () => {
  if (isMuted()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Layer 1: The "Thock" (Triangle wave for body)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.1);

    // Layer 2: The "Crisp" (Subtle high frequency transient)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1800, now);
    gain2.gain.setValueAtTime(0.025, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.02);
  } catch (e) {
    console.warn('Audio playback failed', e);
  }
};

export const playModalOpenSound = () => {
  if (isMuted()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Mechanical thock for opening
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    console.warn('Audio playback failed', e);
  }
};

export const playModalCloseSound = () => {
  if (isMuted()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Mechanical thock for closing
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    console.warn('Audio playback failed', e);
  }
};

export const playSuccessSound = () => {
  if (isMuted()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // A warm, rising sequence of thocks
    [0, 0.08, 0.16].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220 + (i * 110), now + delay);
      gain.gain.setValueAtTime(0.07, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    });
  } catch (e) {
    console.warn('Audio playback failed', e);
  }
};

export const playCelebrationSound = () => {
  if (isMuted()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // A more elaborate, bright celebratory sequence
    const notes = [440, 554.37, 659.25, 880]; // A major chord (A4, C#5, E5, A5)
    notes.forEach((freq, i) => {
      const delay = i * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, now + delay + 0.1);
      
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.08, now + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.4);
    });

    // Add a low thock at the end for grounding
    const thockOsc = ctx.createOscillator();
    const thockGain = ctx.createGain();
    thockOsc.type = 'triangle';
    thockOsc.frequency.setValueAtTime(110, now + 0.4);
    thockGain.gain.setValueAtTime(0.1, now + 0.4);
    thockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    thockOsc.connect(thockGain);
    thockGain.connect(ctx.destination);
    thockOsc.start(now + 0.4);
    thockOsc.stop(now + 0.6);
    
  } catch (e) {
    console.warn('Audio playback failed', e);
  }
};

export const playTypeSound = () => {
  if (isMuted()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Layer 1: The "Click" (High frequency transient)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(2400 + (Math.random() * 400), now);
    clickGain.gain.setValueAtTime(0.01, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.01);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.01);

    // Layer 2: The "Thock" (Low frequency body)
    const thockOsc = ctx.createOscillator();
    const thockGain = ctx.createGain();
    const pitch = 120 + (Math.random() * 15);
    thockOsc.type = 'triangle';
    thockOsc.frequency.setValueAtTime(pitch, now);
    thockOsc.frequency.exponentialRampToValueAtTime(pitch * 0.7, now + 0.04);
    thockGain.gain.setValueAtTime(0.035, now);
    thockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    thockOsc.connect(thockGain);
    thockGain.connect(ctx.destination);
    thockOsc.start(now);
    thockOsc.stop(now + 0.04);
  } catch (e) {
    console.warn('Audio playback failed', e);
  }
};

export const playErrorSound = () => {
  if (isMuted()) return;
  try {
    const { osc, gain, ctx } = createOscillator(320);
    const now = ctx.currentTime;
    
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.1);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    console.warn('Audio playback failed', e);
  }
};

export const startDragSound = () => {
  if (isMuted()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    if (dragOscillator) stopDragSound();
    
    dragOscillator = ctx.createOscillator();
    dragGain = ctx.createGain();
    
    dragOscillator.frequency.setValueAtTime(80, now);
    dragGain.gain.setValueAtTime(0, now);
    dragGain.gain.linearRampToValueAtTime(0.05, now + 0.1);
    
    dragOscillator.connect(dragGain);
    dragGain.connect(ctx.destination);
    dragOscillator.start(now);
  } catch (e) {
    console.warn('Audio playback failed', e);
  }
};

export const stopDragSound = () => {
  try {
    if (dragOscillator && dragGain) {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      dragGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      dragOscillator.stop(now + 0.05);
      dragOscillator = null;
      dragGain = null;
    }
  } catch (e) {
    console.warn('Audio playback failed', e);
  }
};

export const playDropSound = () => {
  if (isMuted()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Thud
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.setValueAtTime(200, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.06);

    // Shimmer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.frequency.setValueAtTime(2400, now + 0.06);
    gain2.gain.setValueAtTime(0.05, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.1);
  } catch (e) {
    console.warn('Audio playback failed', e);
  }
};
