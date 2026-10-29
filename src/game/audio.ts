/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural Web Audio API sound synthesizer & music engine for Turbo Horizon
// 100% self-contained, no external asset files needed, completely offline capable.

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.65;
  private masterGain: GainNode | null = null;

  // Engine synth
  private engineGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning: boolean = false;
  private screechCooldown: number = 0;

  // Procedural BGM Engine
  private isBgmPlaying: boolean = false;
  private bgmGain: GainNode | null = null;
  private bgmStep: number = 0;
  private bgmTimer: number | null = null;
  private bpm: number = 132;

  constructor() {
    const savedMute = localStorage.getItem('turbo_horizon_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
  }

  public initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('turbo_horizon_muted', String(this.isMuted));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem('turbo_horizon_muted', String(this.isMuted));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  // --- ENGINE AUDIO ---
  public startEngine() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isEngineRunning) return;

    try {
      const t = this.ctx.currentTime;
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(45, t);

      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(90, t);

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(340, t);
      this.engineFilter.Q.setValueAtTime(2.5, t);

      this.engineGain.gain.setValueAtTime(0.08, t);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.isEngineRunning = true;
    } catch {}
  }

  public updateEngine(speedRatio: number, isBoosting: boolean) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;

    const t = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(speedRatio, 1.8));
    const baseFreq = 42 + clamped * 125 + (isBoosting ? 38 : 0);
    const filterFreq = 300 + clamped * 950 + (isBoosting ? 700 : 0);
    const targetGain = 0.05 + clamped * 0.06 + (isBoosting ? 0.04 : 0);

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.06);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.04, t, 0.06);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);
    this.engineGain.gain.setTargetAtTime(targetGain, t, 0.08);
  }

  public stopEngine() {
    if (!this.ctx || !this.isEngineRunning) return;
    try {
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
      setTimeout(() => {
        try {
          this.engineOsc1?.stop();
          this.engineOsc2?.stop();
          this.engineOsc1?.disconnect();
          this.engineOsc2?.disconnect();
        } catch {}
        this.isEngineRunning = false;
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineGain = null;
        this.engineFilter = null;
      }, 70);
    } catch {
      this.isEngineRunning = false;
    }
  }

  // --- PROCEDURAL SYNTH BGM TRACK ---
  // Energetic arcade racing electro bass & lead groove
  public startBgm() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isBgmPlaying) return;

    this.isBgmPlaying = true;
    this.bgmStep = 0;
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    const stepIntervalMs = (60 / this.bpm / 4) * 1000; // 16th note timing

    // Bass notes progression: D2 -> F2 -> G2 -> A#1
    const bassline = [
      73.42, 73.42, 146.83, 73.42, 73.42, 73.42, 146.83, 73.42, // D2, D3
      87.31, 87.31, 174.61, 87.31, 87.31, 87.31, 174.61, 87.31, // F2, F3
      98.00, 98.00, 196.00, 98.00, 98.00, 98.00, 196.00, 98.00, // G2, G3
      58.27, 58.27, 116.54, 58.27, 65.41, 65.41, 130.81, 65.41, // A#1, C2
    ];

    // Lead melodies
    const leadNotes = [
      293.66, 0, 349.23, 0, 440.00, 0, 523.25, 0,
      440.00, 349.23, 0, 293.66, 0, 0, 440.00, 0,
      392.00, 0, 440.00, 0, 523.25, 0, 587.33, 0,
      523.25, 440.00, 392.00, 0, 349.23, 0, 293.66, 0,
    ];

    this.bgmTimer = window.setInterval(() => {
      if (!this.ctx || !this.isBgmPlaying || !this.bgmGain) return;
      const t = this.ctx.currentTime;
      const step = this.bgmStep % 32;

      // 1. Kick / Bass drum on beats (step 0, 4, 8, 12, 16, 20, 24, 28)
      if (step % 4 === 0) {
        this.playKick(t);
      }

      // 2. Hi-hat noise on 16th off-beats
      if (step % 2 === 1) {
        this.playHiHat(t);
      }

      // 3. Snare / clap on beats 2 and 4 (step 4, 12, 20, 28)
      if (step % 8 === 4) {
        this.playSnare(t);
      }

      // 4. Bass synth pulse
      const bassFreq = bassline[step];
      if (bassFreq) {
        this.playBassNote(t, bassFreq);
      }

      // 5. Melodic lead synth
      const leadFreq = leadNotes[step];
      if (leadFreq && leadFreq > 0) {
        this.playLeadNote(t, leadFreq);
      }

      this.bgmStep++;
    }, stepIntervalMs);
  }

  private playKick(t: number) {
    if (!this.ctx || !this.bgmGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.1);

      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch {}
  }

  private playHiHat(t: number) {
    if (!this.ctx || !this.bgmGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.04;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.2;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);
      noise.start(t);
    } catch {}
  }

  private playSnare(t: number) {
    if (!this.ctx || !this.bgmGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);
      noise.start(t);
    } catch {}
  }

  private playBassNote(t: number, freq: number) {
    if (!this.ctx || !this.bgmGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, t);
      filter.frequency.exponentialRampToValueAtTime(220, t + 0.1);
      filter.Q.setValueAtTime(4, t);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(t);
      osc.stop(t + 0.12);
    } catch {}
  }

  private playLeadNote(t: number, freq: number) {
    if (!this.ctx || !this.bgmGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(t);
      osc.stop(t + 0.18);
    } catch {}
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmGain && this.ctx) {
      try {
        this.bgmGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      } catch {}
    }
  }

  // --- SOUND EFFECTS ---
  public playSpeedBoost() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.35);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.45);
    } catch {}
  }

  public playShieldUp() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.linearRampToValueAtTime(880, t + 0.15);
      osc.frequency.linearRampToValueAtTime(1200, t + 0.35);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.45);
    } catch {}
  }

  public playShieldHit() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      // High-energy laser shield deflection clang
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.25);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.25);
    } catch {}
  }

  public playWhoosh() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.28;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(280, t);
      filter.frequency.exponentialRampToValueAtTime(1500, t + 0.12);
      filter.frequency.exponentialRampToValueAtTime(320, t + 0.28);
      filter.Q.setValueAtTime(3, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(t);
    } catch {}
  }

  public playScreech() {
    const now = performance.now();
    if (now - this.screechCooldown < 250) return;
    this.screechCooldown = now;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(950 + Math.random() * 200, t);
      osc.frequency.linearRampToValueAtTime(780, t + 0.16);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.Q.setValueAtTime(4, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.16);
    } catch {}
  }

  public playCoin() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, t);
      osc.frequency.setValueAtTime(1318.51, t + 0.08);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.32);
    } catch {}
  }

  public playNitro() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(720, t + 0.3);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.35);
    } catch {}
  }

  public playCrash() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.55;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.14));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, t);
      filter.frequency.linearRampToValueAtTime(90, t + 0.55);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(t);

      // Low frequency sub-boom
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(110, t);
      sub.frequency.exponentialRampToValueAtTime(30, t + 0.45);

      subGain.gain.setValueAtTime(0.4, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      sub.connect(subGain);
      subGain.connect(this.masterGain);
      sub.start(t);
      sub.stop(t + 0.45);
    } catch {}
  }

  public playRepair() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(554.37, t + 0.08);
      osc.frequency.setValueAtTime(659.25, t + 0.16);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.35);
    } catch {}
  }

  public playBlip() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.07);
    } catch {}
  }
}

export const sound = new SoundManager();
