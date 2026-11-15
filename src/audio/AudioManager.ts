export type SfxEvent =
  | 'click'
  | 'attack_light'
  | 'attack_heavy'
  | 'skill'
  | 'ultimate'
  | 'hit_light'
  | 'hit_heavy'
  | 'block'
  | 'jump'
  | 'land'
  | 'countdown'
  | 'fight_start'
  | 'ko'
  | 'victory'
  | 'defeat';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private musicVolume = 0.45;
  private sfxVolume = 0.72;
  private muted = false;
  private currentTrack: 'none' | 'menu' | 'battle' = 'none';
  private musicTimer: number | null = null;
  private stepIdx = 0;

  configure(musicVolume: number, sfxVolume: number, muted: boolean): void {
    this.musicVolume = musicVolume;
    this.sfxVolume = sfxVolume;
    this.muted = muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || !this.unlocked) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  unlock(): void {
    this.unlocked = true;
    this.ensureContext();
  }

  startMusic(track: 'menu' | 'battle'): void {
    if (this.currentTrack === track && this.musicTimer !== null) return;
    this.stopMusic();
    this.currentTrack = track;
    this.stepIdx = 0;
    if (typeof window === 'undefined') return;

    const intervalMs = track === 'battle' ? 185 : 320;
    this.musicTimer = window.setInterval(() => {
      if (this.muted || this.musicVolume <= 0.01) return;
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;
      this.playMusicStep(ctx, track);
    }, intervalMs);
  }

  stopMusic(): void {
    if (this.musicTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.currentTrack = 'none';
  }

  private playMusicStep(ctx: AudioContext, track: 'menu' | 'battle'): void {
    const now = ctx.currentTime;
    const vol = this.musicVolume * (track === 'battle' ? 0.14 : 0.11);

    if (track === 'menu') {
      // Atmospheric dark eclipse arpeggio (D minor / Phrygian)
      const notes = [146.83, 174.61, 220.0, 261.63, 293.66, 220.0, 174.61, 155.56];
      const freq = notes[this.stepIdx % notes.length];
      this.tone(ctx, freq, 'triangle', now, 0.28, vol);
      if (this.stepIdx % 4 === 0) {
        this.tone(ctx, 73.42, 'sine', now, 0.55, vol * 1.15);
      }
    } else {
      // Energetic anime battle bassline + lead ostinato
      const bass = [110, 110, 130.81, 110, 146.83, 130.81, 98.0, 103.83];
      const lead = [440, 0, 523.25, 493.88, 587.33, 0, 659.25, 523.25];
      const bFreq = bass[this.stepIdx % bass.length];
      const lFreq = lead[this.stepIdx % lead.length];
      this.tone(ctx, bFreq, 'sawtooth', now, 0.14, vol * 0.75, 420);
      if (lFreq > 0) {
        this.tone(ctx, lFreq, 'triangle', now, 0.12, vol * 0.65);
      }
    }
    this.stepIdx = (this.stepIdx + 1) % 16;
  }

  playSfx(event: SfxEvent): void {
    if (this.muted || this.sfxVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const v = this.sfxVolume * 0.32;
    const jitter = 0.94 + Math.random() * 0.12;

    switch (event) {
      case 'click':
        this.tone(ctx, 640 * jitter, 'sine', now, 0.06, v * 0.65);
        break;
      case 'jump':
        this.sweep(ctx, 220 * jitter, 480 * jitter, 'triangle', now, 0.12, v * 0.7);
        break;
      case 'land':
        this.sweep(ctx, 130, 58, 'sine', now, 0.09, v * 0.75);
        break;
      case 'attack_light':
        this.noiseBurst(ctx, now, 0.07, v * 0.45, 1800);
        this.sweep(ctx, 420 * jitter, 180, 'triangle', now, 0.08, v * 0.5);
        break;
      case 'attack_heavy':
        this.noiseBurst(ctx, now, 0.13, v * 0.6, 1100);
        this.sweep(ctx, 320 * jitter, 110, 'sawtooth', now, 0.14, v * 0.65);
        break;
      case 'skill':
        this.sweep(ctx, 280, 760, 'sawtooth', now, 0.18, v * 0.75, 2200);
        this.tone(ctx, 523.25, 'triangle', now + 0.04, 0.16, v * 0.5);
        break;
      case 'ultimate':
        this.sweep(ctx, 140, 880, 'sawtooth', now, 0.32, v * 0.95, 2600);
        this.tone(ctx, 220, 'square', now, 0.3, v * 0.5);
        this.tone(ctx, 440, 'triangle', now + 0.08, 0.28, v * 0.6);
        break;
      case 'hit_light':
        this.noiseBurst(ctx, now, 0.08, v * 0.85, 900);
        this.sweep(ctx, 240 * jitter, 75, 'triangle', now, 0.09, v * 0.9);
        break;
      case 'hit_heavy':
        this.noiseBurst(ctx, now, 0.16, v * 1.1, 650);
        this.sweep(ctx, 190 * jitter, 48, 'sawtooth', now, 0.18, v * 1.1);
        break;
      case 'block':
        this.tone(ctx, 880 * jitter, 'square', now, 0.08, v * 0.55, 1600);
        this.tone(ctx, 590, 'triangle', now, 0.09, v * 0.5);
        break;
      case 'countdown':
        this.tone(ctx, 440, 'triangle', now, 0.14, v * 0.7);
        break;
      case 'fight_start':
        this.tone(ctx, 587.33, 'sawtooth', now, 0.14, v * 0.75, 1800);
        this.tone(ctx, 880, 'triangle', now + 0.09, 0.24, v * 0.85);
        break;
      case 'ko':
        this.noiseBurst(ctx, now, 0.35, v * 1.2, 520);
        this.sweep(ctx, 210, 40, 'sawtooth', now, 0.42, v * 1.2);
        break;
      case 'victory':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.tone(ctx, f, 'triangle', now + i * 0.09, 0.26, v * 0.75);
        });
        break;
      case 'defeat':
        [392, 349.23, 311.13, 261.63].forEach((f, i) => {
          this.tone(ctx, f, 'sawtooth', now + i * 0.13, 0.25, v * 0.55, 900);
        });
        break;
    }
  }

  private tone(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    gainVal: number,
    filterHz?: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    if (filterHz) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterHz, startTime);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private sweep(
    ctx: AudioContext,
    f0: number,
    f1: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    gainVal: number,
    filterHz?: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), startTime + duration);

    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    if (filterHz) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterHz, startTime);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private noiseBurst(ctx: AudioContext, startTime: number, duration: number, gainVal: number, cutoffHz: number): void {
    const sampleRate = ctx.sampleRate;
    const len = Math.max(1, Math.floor(sampleRate * duration));
    const buf = ctx.createBuffer(1, len, sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffHz, startTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(startTime);
  }
}

export const audioManager = new AudioManager();
