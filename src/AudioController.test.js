// src/AudioController.test.js
import AudioController, { soundSources } from './AudioController';

// Mock Web Audio API
global.AudioContext = jest.fn(() => ({
  decodeAudioData: jest.fn((arrayBuffer, successCallback) => {
    const mockAudioBuffer = { name: 'mockBuffer', duration: 180 }; // Simulate an AudioBuffer
    if (typeof successCallback === 'function') { // decodeAudioData old spec
        successCallback(mockAudioBuffer);
        return Promise.resolve(mockAudioBuffer); // also return promise for new spec
    }
    return Promise.resolve(mockAudioBuffer); // For Promise-based decodeAudioData
  }),
  createBufferSource: jest.fn(() => ({
    buffer: null,
    loop: false,
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    disconnect: jest.fn(),
    onended: null,
  })),
  destination: { type: 'mockDestination' },
  resume: jest.fn(() => Promise.resolve()), // For autoplay policy handling
  state: 'running' // Assume it's running after user gesture
}));

// Mock fetch
global.fetch = jest.fn((url) =>
  Promise.resolve({
    ok: true,
    statusText: 'OK',
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)), // Mock ArrayBuffer
  })
);

describe('AudioController', () => {
  let audioController;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    audioController = new AudioController();
    // Mock HTMLMediaElement play for browsers that might require it for AudioContext resume
    HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
    HTMLMediaElement.prototype.pause = jest.fn();
  });

  test('constructor initializes properties correctly', () => {
    expect(audioController.audioContext).toBeNull();
    expect(audioController.soundBuffers).toBeInstanceOf(Map);
    expect(audioController.currentSourceNode).toBeNull();
    expect(audioController.isPlaying).toBe(false);
    expect(audioController.isLoading).toBe(false);
  });

  describe('init', () => {
    test('should initialize AudioContext and call preloadAllSounds', async () => {
      const preloadSpy = jest.spyOn(audioController, 'preloadAllSounds').mockResolvedValue();
      await audioController.init();
      expect(global.AudioContext).toHaveBeenCalledTimes(1);
      expect(audioController.audioContext).not.toBeNull();
      expect(preloadSpy).toHaveBeenCalledTimes(1);
      preloadSpy.mockRestore();
    });

    test('should not re-initialize if AudioContext already exists', async () => {
      await audioController.init(); // First init
      const initialContext = audioController.audioContext;
      await audioController.init(); // Second init
      expect(global.AudioContext).toHaveBeenCalledTimes(1); // Still 1
      expect(audioController.audioContext).toBe(initialContext);
    });

    test('should throw error if AudioContext cannot be created', async () => {
        global.AudioContext.mockImplementationOnce(() => { throw new Error("Test AC error")});
        await expect(audioController.init()).rejects.toThrow('Audio system could not be initialized.');
    });
  });

  describe('loadSound', () => {
    test('should load and decode a sound, then store it in soundBuffers', async () => {
      await audioController.init(); // Initialize context
      const soundName = soundSources[0].name;
      const soundUrl = soundSources[0].url;

      const buffer = await audioController.loadSound(soundName, soundUrl);
      expect(global.fetch).toHaveBeenCalledWith(soundUrl);
      expect(audioController.audioContext.decodeAudioData).toHaveBeenCalled();
      expect(audioController.soundBuffers.get(soundName)).toEqual(buffer);
      expect(buffer).toHaveProperty('name', 'mockBuffer'); // Check if it's our mock buffer
    });

    test('should return existing buffer if sound is already loaded', async () => {
      await audioController.init();
      const soundName = soundSources[0].name;
      const soundUrl = soundSources[0].url;
      const firstBuffer = await audioController.loadSound(soundName, soundUrl);

      // Reset mocks for fetch and decodeAudioData to check they aren't called again
      global.fetch.mockClear();
      audioController.audioContext.decodeAudioData.mockClear();

      const secondBuffer = await audioController.loadSound(soundName, soundUrl);
      expect(secondBuffer).toBe(firstBuffer);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(audioController.audioContext.decodeAudioData).not.toHaveBeenCalled();
    });

    test('should throw if fetch fails', async () => {
      await audioController.init();
      global.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, statusText: 'Not Found' }));
      await expect(audioController.loadSound('FailSound', '/audio/fail.mp3')).rejects.toThrow('Failed to fetch sound FailSound: Not Found');
    });
  });

  describe('preloadAllSounds', () => {
    test('should attempt to load all sounds from soundSources', async () => {
      await audioController.init(); // init calls preloadAllSounds, so spy before that
      const loadSoundSpy = jest.spyOn(audioController, 'loadSound');
      loadSoundSpy.mockClear(); // Clear calls from init's preload

      await audioController.preloadAllSounds(); // Call it directly

      expect(loadSoundSpy).toHaveBeenCalledTimes(soundSources.length);
      for (const source of soundSources) {
        expect(loadSoundSpy).toHaveBeenCalledWith(source.name, source.url);
      }
      loadSoundSpy.mockRestore();
    });
  });

  describe('play', () => {
    beforeEach(async () => {
      // Ensure context is initialized and sounds are "loaded" for play tests
      await audioController.init();
      // Manually put mock buffers for all sounds
      for (const source of soundSources) {
        audioController.soundBuffers.set(source.name, { name: 'mockBuffer', duration: 180 });
      }
    });

    test('should play the specified sound', async () => {
      const soundName = soundSources[0].name;
      await audioController.play(soundName);

      expect(audioController.currentSourceNode).not.toBeNull();
      expect(audioController.currentSourceNode.buffer).toEqual(audioController.soundBuffers.get(soundName));
      expect(audioController.currentSourceNode.loop).toBe(true);
      expect(audioController.currentSourceNode.connect).toHaveBeenCalledWith(audioController.audioContext.destination);
      expect(audioController.currentSourceNode.start).toHaveBeenCalledWith(0);
      expect(audioController.isPlaying).toBe(true);
      expect(audioController.selectedSound).toBe(soundName);
    });

    test('should stop currently playing sound before playing a new one', async () => {
      await audioController.play(soundSources[0].name);
      const firstSourceNode = audioController.currentSourceNode;
      const stopSpy = jest.spyOn(firstSourceNode, 'stop');

      await audioController.play(soundSources[1].name);
      expect(stopSpy).toHaveBeenCalledTimes(1);
      expect(audioController.isPlaying).toBe(true);
      expect(audioController.selectedSound).toBe(soundSources[1].name);
    });

    test('should load sound on demand if not preloaded', async () => {
        const soundName = 'OnDemandSound';
        const soundUrl = '/audio/ondemand.mp3';
        soundSources.push({ name: soundName, url: soundUrl }); // Temporarily add to sources for the test

        audioController.soundBuffers.delete(soundName); // Ensure it's not "preloaded"
        const loadSoundSpy = jest.spyOn(audioController, 'loadSound');

        await audioController.play(soundName);

        expect(loadSoundSpy).toHaveBeenCalledWith(soundName, soundUrl);
        expect(audioController.isPlaying).toBe(true);

        loadSoundSpy.mockRestore();
        soundSources.pop(); // Clean up
    });
  });

  describe('pause/stop', () => {
    beforeEach(async () => {
      await audioController.init();
      for (const source of soundSources) {
        audioController.soundBuffers.set(source.name, { name: 'mockBuffer', duration: 180 });
      }
      await audioController.play(soundSources[0].name); // Start a sound playing
    });

    test('pause should stop the current sound node and set isPlaying to false', () => {
      const sourceNode = audioController.currentSourceNode;
      audioController.pause();

      expect(sourceNode.stop).toHaveBeenCalledWith(0);
      expect(sourceNode.disconnect).toHaveBeenCalled();
      expect(audioController.currentSourceNode).toBeNull();
      expect(audioController.isPlaying).toBe(false);
    });

    test('stop should call pause', () => {
      const pauseSpy = jest.spyOn(audioController, 'pause');
      audioController.stop();
      expect(pauseSpy).toHaveBeenCalledTimes(1);
      pauseSpy.mockRestore();
    });
  });

  describe('resume', () => {
    beforeEach(async () => {
      await audioController.init();
      for (const source of soundSources) {
        audioController.soundBuffers.set(source.name, { name: 'mockBuffer', duration: 180 });
      }
      // Start and then pause a sound
      await audioController.play(soundSources[0].name);
      audioController.pause();
    });

    test('resume should play the selectedSound if not currently playing', async () => {
      expect(audioController.isPlaying).toBe(false);
      const playSpy = jest.spyOn(audioController, 'play');

      await audioController.resume(); // await because play is async

      expect(playSpy).toHaveBeenCalledWith(audioController.selectedSound);
      // isPlaying state will be set by the play method, can re-verify if needed
      // expect(audioController.isPlaying).toBe(true); // This depends on play mock succeeding
    });
  });

  test('getSoundNames should return an array of sound names', () => {
    const names = audioController.getSoundNames();
    expect(names).toEqual(soundSources.map(s => s.name));
  });
});
