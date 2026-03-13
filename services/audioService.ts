/**
 * Tactical Audio Service
 * Generates synthesizer-based sound effects for the surveillance interface.
 */

class AudioService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  public playClick() {
    this.playTone(1200, 'sine', 0.05, 0.02);
  }

  public playHover() {
    this.playTone(800, 'sine', 0.03, 0.01);
  }

  public playNotification() {
    this.playTone(880, 'sine', 0.1, 0.05);
    setTimeout(() => this.playTone(1320, 'sine', 0.1, 0.05), 50);
  }

  public playAlert() {
    this.playTone(440, 'square', 0.2, 0.05);
    setTimeout(() => this.playTone(440, 'square', 0.2, 0.05), 200);
    setTimeout(() => this.playTone(440, 'square', 0.2, 0.05), 400);
  }

  public playSuccess() {
    this.playTone(660, 'sine', 0.1, 0.05);
    setTimeout(() => this.playTone(880, 'sine', 0.2, 0.05), 100);
  }

  public playError() {
    this.playTone(220, 'sawtooth', 0.3, 0.05);
    setTimeout(() => this.playTone(110, 'sawtooth', 0.4, 0.05), 100);
  }

  public playDataIngest() {
    this.playTone(1760, 'sine', 0.05, 0.02);
  }

  public playTyping() {
    this.playTone(Math.random() * 100 + 400, 'square', 0.02, 0.02);
  }

  public async playAudio(data: string | ArrayBuffer) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    try {
      let buffer: ArrayBuffer;
      if (typeof data === 'string') {
        const binaryString = window.atob(data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        buffer = bytes.buffer;
      } else {
        buffer = data;
      }

      const audioBuffer = await this.ctx.decodeAudioData(buffer);
      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.ctx.destination);
      source.start();
    } catch (e) {
      console.error('Failed to play audio', e);
    }
  }
}

export const audio = new AudioService();
