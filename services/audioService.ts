
// Procedural Audio Generation for UI Feedback
// No external assets required. Pure Web Audio API.

class AudioController {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private masterGain: GainNode | null = null;

  constructor() {
    try {
      // Initialize on first user interaction to bypass autoplay policy
      window.addEventListener('click', () => this.init(), { once: true });
      window.addEventListener('keydown', () => this.init(), { once: true });
    } catch (e) {
      console.error("Audio Context initialization failed", e);
    }
  }

  private init() {
    if (this.ctx) return;
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Default volume
    this.masterGain.connect(this.ctx.destination);
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(enabled ? 0.3 : 0, this.ctx?.currentTime || 0, 0.1);
    }
  }

  public isEnabled() {
    return this.enabled;
  }

  // --- SOUND EFFECTS ---

  public playHover() {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  public playClick() {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  public playSuccess() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    
    // Arpeggio
    [880, 1108, 1318].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.1);
      
      gain.gain.setValueAtTime(0.1, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.3);
    });
  }

  public playError() {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public playTyping() {
    if (!this.ctx || !this.enabled) return;
    // High frequency blip
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Variation
    const freq = 800 + Math.random() * 200;
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  // --- AUDIO DECODING HELPERS FOR GEMINI TTS ---
  
  public async playAudioBuffer(base64String: string) {
     if (!this.ctx) this.init();
     if (!this.ctx) return; // Should not happen if init worked

     try {
        const binaryString = atob(base64String);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Gemini returns raw PCM at 24000Hz (usually).
        // Check for alignment issues. Int16Array requires buffer byteLength to be a multiple of 2.
        let buffer = bytes.buffer;
        if (bytes.byteLength % 2 !== 0) {
            // Pad with one extra byte if odd
            const padded = new Uint8Array(bytes.byteLength + 1);
            padded.set(bytes);
            buffer = padded.buffer;
        }

        // 16-bit signed integer, Little Endian, 24kHz, 1 channel (usually)
        const int16 = new Int16Array(buffer);
        const sampleRate = 24000;
        const channels = 1;
        const frameCount = int16.length;

        const audioBuffer = this.ctx.createBuffer(channels, frameCount, sampleRate);
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < frameCount; i++) {
             // Convert Int16 to Float32 [-1.0, 1.0]
             channelData[i] = int16[i] / 32768.0;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.masterGain!);
        source.start();

     } catch (e) {
         console.error("Failed to decode/play audio", e);
         this.playError();
     }
  }
}

export const audio = new AudioController();