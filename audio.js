/**
 * Adaptive Audio Synthesis System using Web Audio API
 * Generates procedural ambient drone, evolving string pads, sub-bass, piano,
 * and environmental audio (rain, wind, night crickets, morning birds).
 */

import { store } from './store.js';

class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.initialized = false;

    // Audio node references
    this.masterGain = null;
    
    // Musical layers
    this.droneOscs = [];
    this.droneGain = null;
    
    this.stringsOscs = [];
    this.stringsGain = null;
    this.stringsFilter = null;
    
    this.bassOsc = null;
    this.bassGain = null;
    this.bassTimer = null;
    
    this.pianoNotes = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00]; // Pentatonic scale (C3 to A4)
    this.pianoTimer = null;

    // Environmental sound layers
    this.rainGain = null;
    this.rainNoise = null;
    this.rainFilter = null;

    this.cricketGain = null;
    this.cricketTimer = null;

    this.birdGain = null;
    this.birdTimer = null;
    
    // Wave visualizer callbacks
    this.analyser = null;
    this.visualizerBuffer = null;
  }

  /**
   * Initializes the Audio Context and builds the DSP graph.
   * Must be called after user interaction (Enter click).
   */
  async init() {
    if (this.initialized) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Master Node
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime); // Soft default
    this.masterGain.connect(this.ctx.destination);

    // Setup Analyser for visual feedback
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 32;
    this.masterGain.connect(this.analyser);
    this.visualizerBuffer = new Uint8Array(this.analyser.frequencyBinCount);

    // Build the DSP layers
    this.setupDrone();
    this.setupStrings();
    this.setupBass();
    this.setupRain();
    this.setupCrickets();
    this.setupBirds();

    this.initialized = true;
    
    // Start procedural scheduling
    this.startPianoScheduler();
    this.startBassScheduler();
    this.startCricketScheduler();
    this.startBirdScheduler();

    // Fade in master volume
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 3.0);
  }

  /**
   * Layer 1: Ambient Drone (Always active, deep base tone)
   */
  setupDrone() {
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    this.droneGain.connect(this.masterGain);

    const baseFrequencies = [65.41, 98.00, 130.81]; // C2, G2, C3
    
    baseFrequencies.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      // Detune slightly for lush warmth
      osc.detune.setValueAtTime((idx - 1) * 8, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      
      osc.connect(gain);
      gain.connect(this.droneGain);
      osc.start();
      
      // LFO for drone volume movement
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.05 + idx * 0.02, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();

      this.droneOscs.push({ osc, lfo });
    });
  }

  /**
   * Layer 2: Evolving strings (Unlocks after 1 minute)
   */
  setupStrings() {
    this.stringsGain = this.ctx.createGain();
    this.stringsGain.gain.setValueAtTime(0, this.ctx.currentTime); // Muted initially
    this.stringsGain.connect(this.masterGain);

    this.stringsFilter = this.ctx.createBiquadFilter();
    this.stringsFilter.type = 'lowpass';
    this.stringsFilter.Q.setValueAtTime(1, this.ctx.currentTime);
    this.stringsFilter.frequency.setValueAtTime(300, this.ctx.currentTime); // Dark tone
    this.stringsFilter.connect(this.stringsGain);

    const chord = [130.81, 164.81, 196.00, 246.94]; // C3, E3, G3, B3

    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.detune.setValueAtTime((idx - 1.5) * 12, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.025, this.ctx.currentTime);
      
      osc.connect(gain);
      gain.connect(this.stringsFilter);
      osc.start();

      // slow volume lfo
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.08 + idx * 0.03, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();

      this.stringsOscs.push({ osc, lfo });
    });
  }

  /**
   * Layer 3: Deep Sub Bass (Unlocks after 2 minutes)
   */
  setupBass() {
    this.bassGain = this.ctx.createGain();
    this.bassGain.gain.setValueAtTime(0, this.ctx.currentTime); // Muted initially
    this.bassGain.connect(this.masterGain);
  }

  startBassScheduler() {
    const playBassPulse = () => {
      if (!this.initialized || this.isMuted) {
        this.bassTimer = setTimeout(playBassPulse, 8000);
        return;
      }

      // Check current gain. If volume target is 0, don't play
      const targetGain = parseFloat(this.bassGain.gain.value);
      if (targetGain < 0.01) {
        this.bassTimer = setTimeout(playBassPulse, 6000);
        return;
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      // Low C or G
      const rootNotes = [32.70, 48.99]; // C1, G1
      const note = rootNotes[Math.floor(Math.random() * rootNotes.length)];
      osc.frequency.setValueAtTime(note, this.ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(80, this.ctx.currentTime);

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 6.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bassGain);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 6.0);

      // Schedule next pulse (between 8 to 14 seconds)
      const nextTime = 8000 + Math.random() * 6000;
      this.bassTimer = setTimeout(playBassPulse, nextTime);
    };

    playBassPulse();
  }

  /**
   * Single Piano Note Generation (Active from Act I, frequency decreases as timeline evolves)
   */
  startPianoScheduler() {
    const playPianoNote = () => {
      if (!this.initialized || this.isMuted) {
        this.pianoTimer = setTimeout(playPianoNote, 5000);
        return;
      }

      // Create FM piano-like sound
      const oscCarrier = this.ctx.createOscillator();
      const oscModulator = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const carrierGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      // Pentatonic pitch selection
      const note = this.pianoNotes[Math.floor(Math.random() * this.pianoNotes.length)];
      
      oscCarrier.type = 'sine';
      oscCarrier.frequency.setValueAtTime(note, this.ctx.currentTime);
      
      oscModulator.type = 'sine';
      oscModulator.frequency.setValueAtTime(note * 2, this.ctx.currentTime); // Harmonic ratio
      
      modGain.gain.setValueAtTime(note * 1.5, this.ctx.currentTime); // Modulation index
      modGain.gain.exponentialRampToValueAtTime(0.1, this.ctx.currentTime + 2.5);

      carrierGain.gain.setValueAtTime(0, this.ctx.currentTime);
      carrierGain.gain.linearRampToValueAtTime(0.07, this.ctx.currentTime + 0.02); // Sharp attack
      carrierGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 4.5); // Long decay

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 3.0);

      // Connect modulator to carrier frequency
      oscModulator.connect(modGain);
      modGain.connect(oscCarrier.frequency);
      
      // Connect carrier to output
      oscCarrier.connect(filter);
      filter.connect(carrierGain);
      carrierGain.connect(this.masterGain);

      // Start oscillators
      oscCarrier.start();
      oscModulator.start();
      
      // Stop oscillators
      oscCarrier.stop(this.ctx.currentTime + 5.0);
      oscModulator.stop(this.ctx.currentTime + 5.0);

      // Delay between notes: 3s to 8s (randomized patience)
      const delay = 4000 + Math.random() * 5000;
      this.pianoTimer = setTimeout(playPianoNote, delay);
    };

    playPianoNote();
  }

  /**
   * Environmental Layer: Rain Synthesis (White noise bandpassed)
   */
  setupRain() {
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime); // Initially off
    this.rainGain.connect(this.masterGain);

    // Create a 2-second white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // Source loop
    this.rainNoise = this.ctx.createBufferSource();
    this.rainNoise.buffer = noiseBuffer;
    this.rainNoise.loop = true;

    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = 'bandpass';
    this.rainFilter.frequency.setValueAtTime(900, this.ctx.currentTime);
    this.rainFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    this.rainNoise.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainNoise.start();

    // Soft LFO on rain filter frequency to simulate shifting wind gusting
    const windLfo = this.ctx.createOscillator();
    const windLfoGain = this.ctx.createGain();
    windLfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);
    windLfoGain.gain.setValueAtTime(250, this.ctx.currentTime);
    
    windLfo.connect(windLfoGain);
    windLfoGain.connect(this.rainFilter.frequency);
    windLfo.start();
  }

  /**
   * Crickets Synthesizer (Unlocks at Night)
   */
  setupCrickets() {
    this.cricketGain = this.ctx.createGain();
    this.cricketGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.cricketGain.connect(this.masterGain);
  }

  startCricketScheduler() {
    const playCricketChirp = () => {
      if (!this.initialized || this.isMuted) {
        this.cricketTimer = setTimeout(playCricketChirp, 3000);
        return;
      }

      const targetGain = parseFloat(this.cricketGain.gain.value);
      if (targetGain < 0.01) {
        this.cricketTimer = setTimeout(playCricketChirp, 3000);
        return;
      }

      const now = this.ctx.currentTime;
      
      // High frequency crickets (multiple rapid chirps)
      for (let i = 0; i < 4; i++) {
        const timeOffset = i * 0.08;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(3800, now + timeOffset);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(3830, now + timeOffset);

        gain.gain.setValueAtTime(0, now + timeOffset);
        gain.gain.linearRampToValueAtTime(0.008, now + timeOffset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + timeOffset + 0.05);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.cricketGain);

        osc.start(now + timeOffset);
        osc2.start(now + timeOffset);
        osc.stop(now + timeOffset + 0.06);
        osc2.stop(now + timeOffset + 0.06);
      }

      this.cricketTimer = setTimeout(playCricketChirp, 1500 + Math.random() * 1500);
    };

    playCricketChirp();
  }

  /**
   * Morning Birds Synthesizer (Unlocks in Morning)
   */
  setupBirds() {
    this.birdGain = this.ctx.createGain();
    this.birdGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.birdGain.connect(this.masterGain);
  }

  startBirdScheduler() {
    const playBirdChirp = () => {
      if (!this.initialized || this.isMuted) {
        this.birdTimer = setTimeout(playBirdChirp, 4000);
        return;
      }

      const targetGain = parseFloat(this.birdGain.gain.value);
      if (targetGain < 0.01) {
        this.birdTimer = setTimeout(playBirdChirp, 4000);
        return;
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Fast sweeping sine wave to mimic bird call
      const startFreq = 2200 + Math.random() * 600;
      const endFreq = startFreq + 800;
      
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.015, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.birdGain);

      osc.start(now);
      osc.stop(now + 0.18);

      // Repeat second chirp sometimes
      if (Math.random() > 0.4) {
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(startFreq + 100, now + 0.2);
        osc2.frequency.exponentialRampToValueAtTime(endFreq + 100, now + 0.32);

        gain2.gain.setValueAtTime(0, now + 0.2);
        gain2.gain.linearRampToValueAtTime(0.015, now + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        osc2.connect(gain2);
        gain2.connect(this.birdGain);
        osc2.start(now + 0.2);
        osc2.stop(now + 0.38);
      }

      this.birdTimer = setTimeout(playBirdChirp, 5000 + Math.random() * 8000);
    };

    playBirdChirp();
  }

  /**
   * Adapts layers volume based on session time and controls
   */
  update(state) {
    if (!this.initialized) return;

    const sessionTime = state.elapsedTime;
    const isRainy = state.weather === 'rain';
    const timeOfDay = state.timeOfDay;

    // Gradual fades of musical layers based on elapsed time (in seconds)
    
    // Strings fade in between 30s and 90s
    let stringVolume = 0;
    if (sessionTime > 30) {
      stringVolume = Math.min(0.2, (sessionTime - 30) / 60 * 0.2);
    }
    
    // Open filter cutoff of strings as time goes on (makes it brighter)
    let filterFreq = 300;
    if (sessionTime > 60) {
      filterFreq = Math.min(1800, 300 + (sessionTime - 60) * 8);
    }
    
    // Sub-bass fade in between 90s and 180s
    let bassVolume = 0;
    if (sessionTime > 90) {
      bassVolume = Math.min(0.35, (sessionTime - 90) / 90 * 0.35);
    }

    // Full ambient soundtrack (e.g. higher harmonics, extra chime/winds volume)
    // We adjust master volume slightly dynamically based on Acts
    let masterVolTarget = 0.35;
    if (sessionTime > 240) {
      masterVolTarget = 0.45; // slightly louder full track
    }

    // Apply values with scheduling curves
    this.stringsGain.gain.setTargetAtTime(stringVolume, this.ctx.currentTime, 1.5);
    this.stringsFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 2.0);
    this.bassGain.gain.setTargetAtTime(bassVolume, this.ctx.currentTime, 2.0);
    this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : masterVolTarget, this.ctx.currentTime, 0.8);

    // Weather audio adjustments
    let rainVolume = isRainy ? 0.08 : 0;
    this.rainGain.gain.setTargetAtTime(rainVolume, this.ctx.currentTime, 2.0);

    // Time-of-day audio adjustment
    let cricketVolume = (timeOfDay === 'night') ? 0.15 : 0;
    this.cricketGain.gain.setTargetAtTime(cricketVolume, this.ctx.currentTime, 1.5);

    let birdVolume = (timeOfDay === 'morning') ? 0.2 : 0;
    this.birdGain.gain.setTargetAtTime(birdVolume, this.ctx.currentTime, 2.0);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.initialized) {
      const vol = this.isMuted ? 0 : 0.35;
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.5);
    }
    return this.isMuted;
  }

  /**
   * Returns frequency data for UI wave representation
   */
  getAnalyserData() {
    if (!this.initialized || this.isMuted) return null;
    this.analyser.getByteFrequencyData(this.visualizerBuffer);
    return this.visualizerBuffer;
  }

  /**
   * Modulates synthesizer detuning and filtering dynamically based on mouse parallax and scroll speed
   */
  updateInteraction(mouse, scrollVelocity) {
    if (!this.initialized || this.isMuted) return;

    // A. Shimmer drone oscillators' detune based on mouse coordinate
    if (this.droneOscs.length > 0) {
      this.droneOscs.forEach((d, idx) => {
        const targetDetune = (idx - 1) * 8 + (mouse.x * 7) + (mouse.y * 7);
        d.osc.detune.setTargetAtTime(targetDetune, this.ctx.currentTime, 0.15);
      });
    }

    // B. Create a sliding filter 'whoosh' in the strings based on scroll speed
    if (this.stringsFilter) {
      const scrollImpact = Math.min(650, Math.abs(scrollVelocity) * 380);
      const currentCutoff = 300 + Math.min(1500, (store.elapsedTime > 60 ? (store.elapsedTime - 60) * 8 : 0));
      this.stringsFilter.frequency.setTargetAtTime(currentCutoff + scrollImpact, this.ctx.currentTime, 0.15);
    }
  }

  destroy() {
    if (this.pianoTimer) clearTimeout(this.pianoTimer);
    if (this.bassTimer) clearTimeout(this.bassTimer);
    if (this.cricketTimer) clearTimeout(this.cricketTimer);
    if (this.birdTimer) clearTimeout(this.birdTimer);
    
    if (this.ctx) {
      this.ctx.close();
    }
  }
}

export const audio = new AudioSynthesizer();
