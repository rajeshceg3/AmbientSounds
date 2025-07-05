// src/AudioController.test.js
import AudioController, { soundSources } from './AudioController';

// Mock Web Audio API
const mockAudioContext = {
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    gain: {
      value: 0.75, // Initial default
      setValueAtTime: jest.fn(),
    },
  }),
  createBufferSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    buffer: null,
    loop: false,
  }),
  decodeAudioData: jest.fn().mockImplementation((arrayBuffer, successCallback) => {
    // Simulate successful decoding
    const mockAudioBuffer = { name: 'mockBuffer', duration: 120 };
    if (successCallback) successCallback(mockAudioBuffer);
    return Promise.resolve(mockAudioBuffer); // Also return promise for modern usage
  }),
  destination: { name: 'mockDestinationNode' },
  currentTime: 0,
};

global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
global.window.webkitAudioContext = jest.fn().mockImplementation(() => mockAudioContext);

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)), // Mock ArrayBuffer
  })
);

describe('AudioController', () => {
  let audioController;
  let originalConsoleError;
  let originalConsoleWarn;

  beforeEach(() => {
    jest.clearAllMocks(); // Clear all mocks before each test

    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    console.error = jest.fn();
    console.warn = jest.fn();

    audioController = new AudioController();
    // We need to call init for gainNode to be created
    // For most tests, we'll assume init is called successfully.
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    if (audioController.audioContext && audioController.audioContext.close) {
        // audioController.audioContext.close(); // Clean up AudioContext if possible
    }
  });

  test('constructor initializes properties correctly', () => {
    expect(audioController.audioContext).toBeNull();
    expect(audioController.gainNode).toBeNull(); // Not created until init
    expect(audioController.volume).toBe(0.75); // Default initial volume
    expect(audioController.isPlaying).toBe(false);
    expect(audioController.soundBuffers).toBeInstanceOf(Map);
  });

  describe('init', () => {
    test('should create AudioContext and GainNode', async () => {
      await audioController.init();
      expect(global.AudioContext).toHaveBeenCalledTimes(1);
      expect(audioController.audioContext).toBe(mockAudioContext);
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(1);
      expect(audioController.gainNode).toBeDefined();
      expect(audioController.gainNode.gain.value).toBe(audioController.volume);
      expect(audioController.gainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
    });

    test('init should call preloadAllSounds', async () => {
      audioController.preloadAllSounds = jest.fn(); // Mock it
      await audioController.init();
      expect(audioController.preloadAllSounds).toHaveBeenCalled();
    });

    test('init should handle AudioContext creation failure', async () => {
        global.AudioContext.mockImplementationOnce(() => { throw new Error('Failed to create AudioContext'); });
        await expect(audioController.init()).rejects.toThrow('Audio system could not be initialized.');
        expect(console.error).toHaveBeenCalledWith('Failed to initialize AudioContext:', expect.any(Error));
    });
  });

  describe('Volume Control', () => {
    beforeEach(async () => {
      // Ensure AudioContext and GainNode are initialized for volume tests
      await audioController.init();
    });

    test('setVolume should update volume and gainNode value', () => {
      audioController.setVolume(0.5);
      expect(audioController.volume).toBe(0.5);
      expect(audioController.gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.5, mockAudioContext.currentTime);
    });

    test('setVolume should clamp volume between 0 and 1', () => {
      audioController.setVolume(1.5);
      expect(audioController.volume).toBe(1);
      expect(audioController.gainNode.gain.setValueAtTime).toHaveBeenCalledWith(1, mockAudioContext.currentTime);

      audioController.setVolume(-0.5);
      expect(audioController.volume).toBe(0);
      expect(audioController.gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, mockAudioContext.currentTime);
    });

    test('getVolume should return the current volume', () => {
      audioController.volume = 0.65;
      expect(audioController.getVolume()).toBe(0.65);
    });
  });

  describe('play', () => {
    const soundName = soundSources[0].name;
    beforeEach(async () => {
      await audioController.init(); // Ensure initialized
      // Pre-load a sound for play tests
      await audioController.loadSound(soundName, soundSources[0].url);
    });

    test('play should connect source to gainNode', async () => {
      await audioController.play(soundName);
      expect(audioController.currentSourceNode.connect).toHaveBeenCalledWith(audioController.gainNode);
    });
  });


  describe('getState', () => {
    beforeEach(async () => {
      await audioController.init(); // Ensure initialized for volume
    });

    test('getState should return current audio state', () => {
      audioController.isPlaying = true;
      audioController.selectedSound = 'Rain';
      audioController.volume = 0.8;
      audioController.isLoading = false;

      const state = audioController.getState();
      expect(state).toEqual({
        isPlaying: true,
        currentSound: 'Rain',
        volume: 0.8,
        isLoading: false,
      });
    });
  });

  // Test for loadSound to ensure it still works (simplified)
  test('loadSound should decode and store audio buffer', async () => {
    await audioController.init(); // Needed for AudioContext
    const soundName = soundSources[0].name;
    const soundUrl = soundSources[0].url;
    const buffer = await audioController.loadSound(soundName, soundUrl);

    expect(fetch).toHaveBeenCalledWith(soundUrl);
    expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    expect(audioController.soundBuffers.has(soundName)).toBe(true);
    expect(buffer).toBeDefined();
  });

});
