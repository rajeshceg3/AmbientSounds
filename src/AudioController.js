// src/AudioController.js

const soundSources = [
  { name: 'Rain', url: '/audio/rain.mp3' }, // Replace with actual URLs
  { name: 'Ocean Waves', url: '/audio/ocean_waves.mp3' },
  { name: 'Forest', url: '/audio/forest_sounds.mp3' },
  { name: 'White Noise', url: '/audio/white_noise.mp3' },
];

class AudioController {
  constructor() {
    this.audioContext = null;
    this.soundBuffers = new Map(); // To store decoded AudioBuffers
    this.currentSourceNode = null; // To keep track of the currently playing sound source
    this.isPlaying = false;
    this.selectedSound = null; // Name of the currently selected sound
    this.isLoading = false;
    this.preloadPromise = null; // For preloading all sounds
    this.gainNode = null;
    this.volume = 0.75; // Default volume, will be overridden by settings

    // US-003: Volume is normalized across all sound options (handled by consistent mastering of audio files)
    // We can also add a gain node for overall volume control later if needed.

    // US-006 / PRD 2.3.3: REVIEW_NOTE: For mobile performance, especially on slower networks or
    // battery-sensitive devices:
    // 1. Ensure audio files are well-compressed without sacrificing quality below 192kbps.
    // 2. Monitor network requests and CPU usage during audio playback and background transitions.
    // 3. The current preloading strategy helps, but for very constrained environments,
    //    might consider allowing users to opt-out of preload or only preload selected sound.
    //    (This is beyond current MVP scope but good for future thought).
  }

  // Initialize the AudioContext (must be called after a user interaction)
  async init() {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('AudioContext initialized.');

      // Setup GainNode for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;
      this.gainNode.connect(this.audioContext.destination);

      // Preload all sounds once context is ready
      await this.preloadAllSounds();
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      throw new Error('Audio system could not be initialized. User interaction might be required.');
    }
  }

  async loadSound(soundName, soundUrl) {
    if (!this.audioContext) {
      console.warn('AudioContext not initialized. Call init() first.');
      // Attempt to initialize, though ideally init is called on user gesture
      await this.init();
      if(!this.audioContext) throw new Error('AudioContext not available for loading sound.');
    }
    if (this.soundBuffers.has(soundName)) {
      return this.soundBuffers.get(soundName);
    }

    this.isLoading = true;
    console.log(`Loading sound: ${soundName} from ${soundUrl}`);
    try {
      const response = await fetch(soundUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch sound ${soundName}: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.soundBuffers.set(soundName, audioBuffer);
      console.log(`Sound loaded and decoded: ${soundName}`);
      this.isLoading = false;
      return audioBuffer;
    } catch (error) {
      console.error(`Error loading sound ${soundName}:`, error);
      this.isLoading = false;
      throw error;
    }
  }

  async preloadAllSounds() {
    if (!this.audioContext) await this.init();
    if (!this.audioContext) {
        console.error("Cannot preload sounds, AudioContext not available.");
        return;
    }

    console.log('Preloading all sounds...');
    const loadPromises = soundSources.map(sound =>
      this.loadSound(sound.name, sound.url).catch(err => {
        // Log individual errors but don't let one failure stop others if desired
        console.error(`Failed to preload ${sound.name}: ${err.message}`);
        return null; // Or rethrow if all must succeed
      })
    );
    this.preloadPromise = Promise.all(loadPromises);
    await this.preloadPromise;
    console.log('All sounds preloading process completed.');
  }

  async play(soundName) {
    if (!this.audioContext) {
      // Try to initialize if not already (e.g., first play click)
      await this.init();
      if (!this.audioContext) {
        console.error('AudioContext not available. Cannot play sound.');
        return;
      }
    }

    // Wait for preloading to complete if it's in progress
    if (this.preloadPromise) {
        await this.preloadPromise;
    }

    let buffer = this.soundBuffers.get(soundName);
    if (!buffer) {
      // If not preloaded or failed, try to load on demand
      const sourceInfo = soundSources.find(s => s.name === soundName);
      if (!sourceInfo) {
        console.error(`Sound ${soundName} not found in sources.`);
        return;
      }
      try {
        console.log(`Buffer for ${soundName} not found, loading on demand.`);
        buffer = await this.loadSound(soundName, sourceInfo.url);
      } catch (error) {
        console.error(`Could not play ${soundName}: failed to load.`);
        return;
      }
    }

    if (this.currentSourceNode) {
      this.stop(); // Stop any currently playing sound
    }

    this.currentSourceNode = this.audioContext.createBufferSource();
    this.currentSourceNode.buffer = buffer;
    this.currentSourceNode.loop = true; // US-003: Sounds loop seamlessly
    this.currentSourceNode.connect(this.gainNode); // Connect to gain node instead of destination

    // US-003: Sounds begin playing within 2 seconds of selection (Web Audio API is fast)
    this.currentSourceNode.start(0); // Start immediately
    this.isPlaying = true;
    this.selectedSound = soundName;
    console.log(`Playing: ${soundName}`);
  }

  pause() {
    if (this.currentSourceNode && this.isPlaying) {
      // Web Audio API doesn't have a true 'pause' for BufferSourceNode that can be resumed.
      // To pause, we stop the source and record the playback time to resume later.
      // For simple looping ambient sounds, just stopping is often enough.
      // If precise resume is needed, it's more complex (track offset, create new source).
      // For this PRD, seamless looping and play/pause suggest stopping and restarting is acceptable.
      this.currentSourceNode.stop(0);
      this.currentSourceNode.disconnect(); // Disconnect
      this.currentSourceNode = null;
      this.isPlaying = false;
      console.log(`Paused: ${this.selectedSound}`);
    }
  }

  // This method will effectively restart the sound or play the new one.
  // True resume at exact spot is more complex.
  resume() {
    if (!this.isPlaying && this.selectedSound) {
      console.log(`Resuming: ${this.selectedSound}`);
      this.play(this.selectedSound);
    }
  }

  stop() { // Alias for pause in this context
    this.pause();
  }

  getSoundNames() {
    return soundSources.map(s => s.name);
  }

  // Volume Control
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    if (this.gainNode) {
      // Using setValueAtTime for smoother transitions if called rapidly, though for typical UI slider not critical
      this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    }
    console.log(`AudioController: Volume set to ${this.volume}`);
  }

  getVolume() {
    return this.volume;
  }

  // Get Current State
  // type AudioState = { isPlaying: boolean, currentSound: string | null, volume: number, isLoading: boolean };
  getState() {
    return {
      isPlaying: this.isPlaying,
      currentSound: this.selectedSound,
      volume: this.getVolume(),
      isLoading: this.isLoading,
    };
  }
}

export default AudioController;
export { soundSources }; // Export for populating select options
