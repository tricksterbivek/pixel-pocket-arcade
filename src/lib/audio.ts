export type SoundEffect = 'select' | 'score' | 'success' | 'error';

interface Tone {
  freq: number;
  type: OscillatorType;
  duration: number;
  /** Optional second frequency the tone glides toward. */
  toFreq?: number;
  gain?: number;
}

// Short, generated blips. No audio files. Each is a quick envelope so the
// arcade stays snappy and never drones.
const TONES: Record<SoundEffect, Tone[]> = {
  select: [{ freq: 440, type: 'square', duration: 0.07, gain: 0.12 }],
  score: [{ freq: 520, toFreq: 880, type: 'square', duration: 0.12, gain: 0.14 }],
  success: [
    { freq: 523, type: 'square', duration: 0.1, gain: 0.14 },
    { freq: 784, type: 'square', duration: 0.16, gain: 0.14 },
  ],
  error: [{ freq: 200, toFreq: 110, type: 'sawtooth', duration: 0.22, gain: 0.16 }],
};

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Tiny Web Audio service. The context is created lazily on the first user
 * gesture (browsers block autoplay). Everything no-ops safely when Web Audio
 * is unavailable so the app stays fully usable without sound.
 */
class AudioService {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private readonly Ctor = getAudioContextCtor();

  isSupported(): boolean {
    return this.Ctor !== null;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Create or resume the context. Must be called from a user gesture. */
  unlock(): void {
    if (!this.Ctor) return;
    try {
      if (!this.ctx) this.ctx = new this.Ctor();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  play(effect: SoundEffect): void {
    if (!this.enabled || !this.Ctor) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;

    try {
      let startAt = ctx.currentTime;
      for (const tone of TONES[effect]) {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const peak = tone.gain ?? 0.12;

        osc.type = tone.type;
        osc.frequency.setValueAtTime(tone.freq, startAt);
        if (tone.toFreq !== undefined) {
          osc.frequency.linearRampToValueAtTime(tone.toFreq, startAt + tone.duration);
        }

        gainNode.gain.setValueAtTime(0.0001, startAt);
        gainNode.gain.exponentialRampToValueAtTime(peak, startAt + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.duration);

        osc.connect(gainNode).connect(ctx.destination);
        osc.start(startAt);
        osc.stop(startAt + tone.duration);
        startAt += tone.duration;
      }
    } catch {
      // Never let a sound effect break gameplay.
    }
  }
}

export const audio = new AudioService();
