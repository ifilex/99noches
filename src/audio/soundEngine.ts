// NES 2A03 Chiptune Synthesizer Engine & Spanish Arcade Voice System

import { MusicMood } from '../types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundVolume: number = 0.8;
  private musicVolume: number = 0.5;
  private voiceVolume: number = 0.9;
  private spanishVoiceEnabled: boolean = true;
  private isMusicPlaying: boolean = false;
  private musicTimer: number | null = null;
  private lowHealthTimer: number | null = null;
  private currentMood: MusicMood = 'day';
  private stepCount: number = 0;
  private voiceThrottle: Map<string, number> = new Map();

  constructor() {
    // Lazy audio context on first click/key
  }

  public initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolumes(sound: number, music: number, voice: number, spanishVoice: boolean) {
    this.soundVolume = Math.max(0, Math.min(1, sound));
    this.musicVolume = Math.max(0, Math.min(1, music));
    this.voiceVolume = Math.max(0, Math.min(1, voice));
    this.spanishVoiceEnabled = spanishVoice;
  }

  // 1. NES Pulse / Square Wave Channel (Duty Cycle Emulation)
  public playPulse(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'square',
    volScale = 1.0,
    duty = 0.5
  ) {
    this.initCtx();
    if (!this.ctx || this.soundVolume <= 0) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(Math.max(20, freq), now);
      if (endFreq !== freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      }

      const peakVol = 0.18 * this.soundVolume * volScale;
      gain.gain.setValueAtTime(peakVol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignore audio error
    }
  }

  // 2. NES Triangle Channel (Pure low stepped bass)
  public playTriangle(freq: number, duration: number, volScale = 1.0) {
    this.initCtx();
    if (!this.ctx || this.soundVolume <= 0) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(freq, now);

      const peakVol = 0.22 * this.soundVolume * volScale;
      gain.gain.setValueAtTime(peakVol, now);
      gain.gain.setValueAtTime(peakVol * 0.8, now + duration * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }

  // 3. NES Noise Channel (Periodic pseudo-random noise)
  public playNoise(duration: number, volScale = 1.0, isLowPitch = false) {
    this.initCtx();
    if (!this.ctx || this.soundVolume <= 0) return;

    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = isLowPitch ? 'lowpass' : 'bandpass';
      filter.frequency.setValueAtTime(isLowPitch ? 350 : 1200, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(isLowPitch ? 60 : 200, this.ctx.currentTime + duration);

      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(0.18 * this.soundVolume * volScale, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      source.start(now);
    } catch {}
  }

  // ================= Authentic 8-bit NES Sound Effects ================= //

  // Zelda 1 Sword Slash SFX
  public playSwordSlash() {
    this.playNoise(0.09, 1.1, false);
    this.playPulse(740, 220, 0.08, 'square', 0.8);
  }

  public playAttack() {
    this.playSwordSlash();
  }

  public playSlash() {
    this.playSwordSlash();
  }

  // Zelda 1 Arrow / Slingshot whoosh
  public playBowShot() {
    this.playPulse(300, 880, 0.09, 'triangle', 0.9);
    this.playNoise(0.05, 0.6);
  }

  public playGunshot() {
    this.playNoise(0.28, 1.5, true);
    this.playPulse(140, 35, 0.2, 'square', 1.3);
  }

  // Monster Hit (Zelda / Castlevania crunch)
  public playHitMonster() {
    this.playPulse(180, 65, 0.11, 'square', 0.9);
    this.playNoise(0.07, 0.8);
  }

  // Monster Death Puff (Zelda 1 4-puff pop!)
  public playMonsterDeath() {
    this.playNoise(0.16, 1.2, true);
    this.playPulse(240, 80, 0.14, 'square', 1.0);
  }

  // Player Hurt (Classic low buzz)
  public playHitPlayer() {
    this.playPulse(120, 30, 0.25, 'square', 1.4);
    this.playNoise(0.18, 1.2, true);
  }

  // Tree Chop (Thud + noise)
  public playChop() {
    this.playPulse(200, 80, 0.07, 'triangle', 1.0);
    this.playNoise(0.06, 0.8, true);
  }

  // Mining Tink (High metallic square)
  public playMine() {
    this.playPulse(920, 480, 0.06, 'square', 0.8);
    this.playPulse(1200, 600, 0.04, 'square', 0.5);
  }

  // Item Pickup (Zelda Rupee chime)
  public playPickup() {
    this.playPulse(987.77, 987.77, 0.05, 'square', 0.8);
    setTimeout(() => this.playPulse(1318.51, 1318.51, 0.09, 'square', 0.9), 50);
  }

  // Eat Food / Drink
  public playEat() {
    this.playPulse(330, 440, 0.07, 'triangle', 0.8);
    setTimeout(() => this.playPulse(440, 580, 0.08, 'triangle', 0.9), 70);
  }

  // Crafting Completed (Classic NES jingle)
  public playCraft() {
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playPulse(freq, freq, 0.09, 'square', 0.85), idx * 70);
    });
  }

  // Dodge Roll (Whoosh)
  public playRoll() {
    this.playNoise(0.14, 0.7, false);
    this.playPulse(280, 120, 0.12, 'sine', 0.6);
  }

  // Zelda 1 Item Discovery Fanfare (Da-da-da-DAAA!)
  public playSecretFanfare() {
    const fanfare = [
      { f: 587.33, d: 0.1 },  // D5
      { f: 659.25, d: 0.1 },  // E5
      { f: 739.99, d: 0.1 },  // F#5
      { f: 880.00, d: 0.28 }, // A5
    ];
    fanfare.forEach((n, idx) => {
      setTimeout(() => this.playPulse(n.f, n.f, n.d, 'square', 0.9), idx * 110);
    });
  }

  // Level Up Fanfare
  public playLevelUp() {
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playPulse(freq, freq, 0.11, 'square', 0.9), idx * 60);
    });
  }

  // Night Warning Siren (Castlevania horror chime)
  public playNightWarning() {
    this.playPulse(146.83, 73.42, 0.45, 'sawtooth', 1.3);
    setTimeout(() => this.playPulse(110.00, 55.00, 0.6, 'sawtooth', 1.5), 450);
  }

  // Dawn Chime (Zelda morning chime)
  public playDawnChime() {
    const dawn = [523.25, 659.25, 783.99, 1046.50];
    dawn.forEach((note, idx) => {
      setTimeout(() => this.playPulse(note, note * 1.02, 0.2, 'sine', 0.85), idx * 100);
    });
  }

  // Monster Growl & Boss Roar
  public playMonsterGrowl() {
    this.playPulse(90, 45, 0.35, 'sawtooth', 0.85);
  }

  public playBossRoar() {
    this.playNoise(0.55, 1.4, true);
    this.playPulse(85, 30, 0.6, 'sawtooth', 1.5);
  }

  public playFireFeed() {
    this.playNoise(0.18, 0.9, true);
    this.playPulse(180, 520, 0.14, 'triangle', 0.9);
  }

  public playTrapSpring() {
    this.playPulse(520, 120, 0.15, 'square', 1.1);
    this.playNoise(0.12, 1.0, true);
  }

  // Low Health Warning Beep (Iconic Zelda 1 Heart Beep)
  public triggerLowHealthBeep() {
    this.playPulse(440, 440, 0.08, 'square', 0.7);
    setTimeout(() => this.playPulse(330, 330, 0.08, 'square', 0.7), 90);
  }

  // Menu Cursor & Select SFX
  public playMenuMove() {
    this.playPulse(330, 440, 0.04, 'square', 0.6);
  }

  public playMenuSelect() {
    this.playPulse(440, 880, 0.08, 'square', 0.9);
  }

  // Typewriter text dialogue blip
  public playBlip() {
    this.playPulse(587.33, 587.33, 0.03, 'square', 0.4);
  }

  public playDialogueBeep() {
    this.playPulse(440, 660, 0.06, 'square', 0.7);
  }

  // Zelda stairs / entrance door sound
  public playStairs() {
    const notes = [220, 293.66, 369.99, 440];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playPulse(freq, freq, 0.05, 'triangle', 0.9), idx * 45);
    });
  }

  public playBushRustle() {
    this.playNoise(0.08, 0.6, false);
  }

  public playChest() {
    this.playSecretFanfare();
  }

  // ================= Authentic 1985 NES Chiptune Music Engine ================= //

  public startMusic(mood: 'title' | 'day' | 'night' | 'boss' | 'cabin' = 'title') {
    this.currentMood = mood as any;
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.initCtx();

    // 16/32-Step Classic NES Chiptune Patterns
    // TITLE SCREEN THEME (Iconic 1980s Famicom Adventure Overture)
    const TITLE_LEAD = [
      261.63, 0, 329.63, 0, 392.00, 0, 523.25, 0,
      493.88, 392.00, 440.00, 329.63, 392.00, 0, 0, 0,
      220.00, 0, 261.63, 0, 329.63, 0, 440.00, 0,
      392.00, 329.63, 349.23, 261.63, 293.66, 0, 329.63, 0
    ];
    const TITLE_BASS = [
      130.81, 130.81, 164.81, 130.81, 196.00, 196.00, 130.81, 196.00,
      164.81, 164.81, 146.83, 146.83, 130.81, 130.81, 196.00, 130.81,
      110.00, 110.00, 130.81, 110.00, 146.83, 146.83, 110.00, 146.83,
      196.00, 196.00, 164.81, 164.81, 146.83, 146.83, 130.81, 196.00
    ];

    // DAY EXPLORATION (Peaceful 8-bit Zelda Overworld)
    const DAY_LEAD = [
      329.63, 329.63, 0, 329.63, 0, 261.63, 329.63, 0,
      392.00, 0, 0, 0, 196.00, 0, 0, 0,
      261.63, 0, 0, 196.00, 0, 0, 164.81, 0,
      220.00, 0, 246.94, 0, 233.08, 220.00, 0, 196.00
    ];
    const DAY_BASS = [
      164.81, 164.81, 196.00, 164.81, 146.83, 146.83, 164.81, 130.81,
      196.00, 196.00, 220.00, 196.00, 164.81, 164.81, 146.83, 196.00,
      130.81, 130.81, 164.81, 130.81, 110.00, 110.00, 130.81, 98.00,
      146.83, 146.83, 164.81, 146.83, 130.81, 130.81, 110.00, 98.00
    ];

    // NIGHT TENSION (Creepy Castlevania/Metroid minor arpeggios)
    const NIGHT_LEAD = [
      130.81, 155.56, 174.61, 196.00, 174.61, 155.56, 130.81, 116.54,
      130.81, 174.61, 207.65, 233.08, 207.65, 174.61, 155.56, 130.81,
      116.54, 138.59, 155.56, 174.61, 155.56, 138.59, 116.54, 103.83,
      130.81, 0, 155.56, 0, 196.00, 0, 233.08, 0
    ];
    const NIGHT_BASS = [
      65.41, 65.41, 77.78, 65.41, 58.27, 58.27, 65.41, 77.78,
      65.41, 65.41, 87.31, 65.41, 58.27, 58.27, 65.41, 51.91,
      58.27, 58.27, 69.30, 58.27, 51.91, 51.91, 58.27, 65.41,
      65.41, 0, 77.78, 0, 98.00, 0, 65.41, 0
    ];

    // BOSS & BLOOD MOON (High adrenaline pounding battle beat)
    const BOSS_LEAD = [
      164.81, 164.81, 220.00, 196.00, 246.94, 220.00, 329.63, 293.66,
      329.63, 392.00, 370.00, 329.63, 293.66, 246.94, 220.00, 196.00,
      164.81, 220.00, 246.94, 293.66, 329.63, 370.00, 392.00, 440.00,
      440.00, 392.00, 329.63, 293.66, 246.94, 220.00, 196.00, 164.81
    ];
    const BOSS_BASS = [
      82.41, 82.41, 110.00, 98.00, 82.41, 123.47, 110.00, 73.42,
      82.41, 82.41, 110.00, 98.00, 73.42, 82.41, 98.00, 110.00,
      82.41, 110.00, 123.47, 146.83, 82.41, 110.00, 123.47, 146.83,
      110.00, 98.00, 82.41, 73.42, 82.41, 110.00, 98.00, 82.41
    ];

    // CABIN / CAVE INTERIOR (Warm, cozy nostalgic melody)
    const CABIN_LEAD = [
      392.00, 0, 329.63, 0, 261.63, 0, 293.66, 0,
      329.63, 349.23, 392.00, 0, 329.63, 0, 261.63, 0,
      220.00, 0, 261.63, 0, 293.66, 0, 329.63, 0,
      261.63, 0, 196.00, 0, 261.63, 0, 0, 0
    ];
    const CABIN_BASS = [
      130.81, 130.81, 164.81, 130.81, 130.81, 130.81, 146.83, 146.83,
      164.81, 164.81, 196.00, 164.81, 164.81, 164.81, 130.81, 130.81,
      110.00, 110.00, 130.81, 110.00, 146.83, 146.83, 164.81, 164.81,
      130.81, 130.81, 196.00, 196.00, 130.81, 130.81, 130.81, 130.81
    ];

    const tempoMs = 145; // Retro 8-bit tempo

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.musicVolume <= 0 || !this.isMusicPlaying) return;

      const idx = this.stepCount % 32;
      this.stepCount++;

      let leadFreq = DAY_LEAD[idx];
      let bassFreq = DAY_BASS[idx];

      if (this.currentMood === 'title') {
        leadFreq = TITLE_LEAD[idx];
        bassFreq = TITLE_BASS[idx];
      } else if (this.currentMood === 'night') {
        leadFreq = NIGHT_LEAD[idx];
        bassFreq = NIGHT_BASS[idx];
      } else if (this.currentMood === 'boss') {
        leadFreq = BOSS_LEAD[idx];
        bassFreq = BOSS_BASS[idx];
      } else if (this.currentMood === 'cabin') {
        leadFreq = CABIN_LEAD[idx];
        bassFreq = CABIN_BASS[idx];
      }

      // Channel 1: Pulse 1 Lead (Square wave melody)
      if (leadFreq > 0) {
        this.playPulse(leadFreq, leadFreq, 0.12, 'square', this.musicVolume * 0.45);
      }

      // Channel 2: Triangle Bass
      if (bassFreq > 0) {
        this.playTriangle(bassFreq, 0.14, this.musicVolume * 0.5);
      }

      // Channel 3: Noise Percussion (Snare & Hi-Hat)
      if (this.currentMood === 'boss') {
        // Fast intense beat
        if (idx % 2 === 1) this.playNoise(0.06, this.musicVolume * 0.35, true);
        else this.playNoise(0.02, this.musicVolume * 0.2, false);
      } else if (this.currentMood === 'night') {
        // Subtle eerie heartbeat
        if (idx % 8 === 0) this.playNoise(0.08, this.musicVolume * 0.25, true);
      } else {
        // Cheerful standard beat
        if (idx % 4 === 2) {
          this.playNoise(0.06, this.musicVolume * 0.28, true);
        } else if (idx % 2 === 0) {
          this.playNoise(0.02, this.musicVolume * 0.12, false);
        }
      }
    }, tempoMs);
  }

  public setMusicMood(mood: 'title' | 'day' | 'night' | 'boss' | 'cabin') {
    this.currentMood = mood as any;
    if (!this.isMusicPlaying) {
      this.startMusic(mood);
    }
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  // ================= Spanish 8-Bit Arcade Voice Announcer ================= //
  public speakSpanish(text: string, throttleKey?: string, throttleMs: number = 7000) {
    if (!this.spanishVoiceEnabled || this.voiceVolume <= 0) return;
    if (!('speechSynthesis' in window)) return;

    if (throttleKey) {
      const now = Date.now();
      const last = this.voiceThrottle.get(throttleKey) || 0;
      if (now - last < throttleMs) return;
      this.voiceThrottle.set(throttleKey, now);
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.pitch = 0.8;
      utterance.rate = 1.05;
      utterance.volume = this.voiceVolume;

      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find(v => v.lang.startsWith('es'));
      if (esVoice) utterance.voice = esVoice;

      window.speechSynthesis.speak(utterance);
    } catch {}
  }
}

export const soundEngine = new SoundEngine();
