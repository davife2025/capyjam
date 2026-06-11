// SoundManager: generates all SFX procedurally via Web Audio API.
// No external audio files needed — keeps bundle tiny and avoids licensing issues.

type SfxType =
  | "engine"
  | "drift"
  | "boost"
  | "item-pickup"
  | "item-use"
  | "hit"
  | "lap"
  | "countdown-tick"
  | "countdown-go"
  | "finish"
  | "click";

export class SoundManager {
  private ctx:        AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain:  GainNode | null = null;
  private sfxGain:    GainNode | null = null;

  private engineOsc:    OscillatorNode | null = null;
  private engineGain:   GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private musicNodes:  { osc: OscillatorNode; gain: GainNode }[] = [];
  private musicPlaying = false;

  private muted = false;
  private initialized = false;

  init(): void {
    if (this.initialized || typeof window === "undefined") return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.18;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn("[SoundManager] Web Audio not available", e);
    }
  }

  resume(): void {
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 0.5;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  get isMuted(): boolean { return this.muted; }

  // ── One-shot SFX ────────────────────────────────────────────────────────
  play(type: SfxType): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    switch (type) {
      case "click": {
        this.beep(800, 0.04, "square", 0.15, now);
        break;
      }
      case "item-pickup": {
        // Ascending arpeggio
        [523, 659, 784, 1047].forEach((f, i) => {
          this.beep(f, 0.08, "sine", 0.15, now + i * 0.05);
        });
        break;
      }
      case "item-use": {
        this.beep(220, 0.1, "sawtooth", 0.2, now);
        this.beep(440, 0.1, "sawtooth", 0.15, now + 0.05);
        break;
      }
      case "boost": {
        this.sweep(150, 600, 0.35, "sawtooth", 0.25, now);
        break;
      }
      case "hit": {
        this.noiseburst(0.25, 0.3, now);
        this.beep(100, 0.2, "sawtooth", 0.2, now);
        break;
      }
      case "lap": {
        [659, 784, 988].forEach((f, i) => this.beep(f, 0.12, "triangle", 0.2, now + i * 0.08));
        break;
      }
      case "countdown-tick": {
        this.beep(440, 0.1, "square", 0.2, now);
        break;
      }
      case "countdown-go": {
        this.beep(880, 0.25, "square", 0.25, now);
        this.beep(1108, 0.2, "square", 0.18, now + 0.05);
        break;
      }
      case "finish": {
        [523, 659, 784, 1047, 1318].forEach((f, i) =>
          this.beep(f, 0.18, "triangle", 0.2, now + i * 0.1)
        );
        break;
      }
      case "drift": {
        this.noiseburst(0.05, 0.04, now);
        break;
      }
    }
  }

  private beep(freq: number, duration: number, type: OscillatorType, gain: number, startTime: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const g   = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    g.gain.setValueAtTime(gain, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private sweep(fromFreq: number, toFreq: number, duration: number, type: OscillatorType, gain: number, startTime: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const g   = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(fromFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(toFreq, startTime + duration);

    g.gain.setValueAtTime(gain, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private noiseburst(duration: number, gain: number, startTime: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer     = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data       = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise  = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(g);
    g.connect(this.sfxGain);
    noise.start(startTime);
  }

  // ── Continuous engine sound ──────────────────────────────────────────────
  startEngine(): void {
    if (!this.ctx || !this.sfxGain || this.engineOsc) return;

    this.engineOsc    = this.ctx.createOscillator();
    this.engineGain   = this.ctx.createGain();
    this.engineFilter = this.ctx.createBiquadFilter();

    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = 60;

    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.value = 400;

    this.engineGain.gain.value = 0;

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc.start();
  }

  // speed: 0–1 normalised
  updateEngine(speed: number, isBoosting: boolean): void {
    if (!this.engineOsc || !this.engineGain || !this.engineFilter || !this.ctx) return;
    const now = this.ctx.currentTime;

    const baseFreq = 50 + speed * 180 + (isBoosting ? 80 : 0);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);

    const filterFreq = 300 + speed * 1200;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.1);

    const targetGain = this.muted ? 0 : 0.06 + speed * 0.08;
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.1);
  }

  stopEngine(): void {
    if (!this.engineOsc) return;
    try {
      this.engineOsc.stop();
      this.engineOsc.disconnect();
      this.engineGain?.disconnect();
      this.engineFilter?.disconnect();
    } catch { /* already stopped */ }
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
  }

  // ── Background music (simple ambient loop) ───────────────────────────────
  startMusic(): void {
    if (!this.ctx || !this.musicGain || this.musicPlaying) return;
    this.musicPlaying = true;

    // Simple looping bassline using two detuned oscillators
    const notes = [130.81, 146.83, 164.81, 130.81, 174.61, 164.81]; // C D E C F E (low)
    let step = 0;

    const playNote = () => {
      if (!this.musicPlaying || !this.ctx || !this.musicGain) return;
      const now  = this.ctx.currentTime;
      const freq = notes[step % notes.length];

      const osc = this.ctx.createOscillator();
      const g   = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;

      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.5, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.8);

      step++;
      setTimeout(playNote, 450);
    };

    playNote();
  }

  stopMusic(): void {
    this.musicPlaying = false;
  }

  destroy(): void {
    this.stopEngine();
    this.stopMusic();
    this.ctx?.close();
    this.ctx = null;
    this.initialized = false;
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────────
let _instance: SoundManager | null = null;

export function getSoundManager(): SoundManager {
  if (!_instance) _instance = new SoundManager();
  return _instance;
}
