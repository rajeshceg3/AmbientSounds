// src/main.test.js
import '@testing-library/jest-dom'; // For DOM matchers, ensure it's installed

// Mock parts of main.js dependencies if they are complex or cause side effects
// Mock BackgroundController
jest.mock('./BackgroundController', () => {
  return jest.fn().mockImplementation(() => {
    return {
      start: jest.fn(),
      stop: jest.fn(),
      setReducedMotion: jest.fn(),
    };
  });
});

// Mock AudioController
const mockPlay = jest.fn(() => Promise.resolve());
const mockPause = jest.fn();
const mockAudioControllerInit = jest.fn(() => Promise.resolve());

jest.mock('./AudioController', () => {
  // Mock soundSources export as well
  const actualAudioController = jest.requireActual('./AudioController');
  return {
    __esModule: true, // This is important for ES6 modules
    default: jest.fn().mockImplementation(() => {
      return {
        init: mockAudioControllerInit,
        play: mockPlay,
        pause: mockPause,
        isPlaying: false, // Controllable for tests
        selectedSound: null,
        soundBuffers: new Map(),
        getSoundNames: jest.fn(()_ => actualAudioController.soundSources.map(s => s.name)),
        preloadAllSounds: jest.fn(() => Promise.resolve()),
      };
    }),
    soundSources: actualAudioController.soundSources,
  };
});

// Function to load main.js logic within the test environment
const loadMainJs = () => {
  // It's tricky to re-run main.js in same test file due to DOMContentLoaded and event listeners.
  // Best to isolate what you're testing or use a setup that cleans and re-runs.
  // For this example, we'll assume a fresh run for each relevant describe block or test.
  // This might involve resetting the DOM and re-requiring main.js or parts of it.
  // Simplification: Assume main.js can be imported and its effects tested.
  // Full DOM script testing is complex, consider Cypress for this.

  // Dynamically import main.js AFTER mocks are set up
  return import('./main.js');
};


describe('main.js UI Logic', () => {
  let playPauseBtn, soundSelect, controlsElement;

  beforeEach(() => {
    // Set up DOM elements for each test
    document.body.innerHTML = `
      <div id="app">
        <div class="background-shifter"></div>
        <div class="controls">
          <button id="play-pause-btn" aria-label="Play or pause audio">Play</button>
          <select id="sound-select" aria-label="Select ambient sound"></select>
        </div>
      </div>
    `;
    playPauseBtn = document.getElementById('play-pause-btn');
    soundSelect = document.getElementById('sound-select');
    controlsElement = document.querySelector('.controls');

    // Reset AudioController's internal state for tests
    const AudioController = require('./AudioController').default;
    const mockAudioInstance = AudioController.mock.instances[0];
    if (mockAudioInstance) {
        mockAudioInstance.isPlaying = false;
        mockAudioInstance.selectedSound = null;
    }
    mockPlay.mockClear();
    mockPause.mockClear();
    mockAudioControllerInit.mockClear();

    jest.useFakeTimers(); // Use fake timers for auto-hide logic
  });

  afterEach(() => {
    jest.clearAllTimers();
    document.body.innerHTML = ''; // Clean up DOM
    jest.resetModules(); // Important to reset modules if main.js is re-imported
  });

  describe('Audio Controls Interaction', () => {
    test('Play/Pause button click should toggle audio', async () => {
      await loadMainJs(); // Load main.js to attach event listeners

      // Simulate first click to play
      playPauseBtn.click();
      await Promise.resolve(); // Allow async operations in togglePlayPause to complete

      expect(mockAudioControllerInit).toHaveBeenCalled();
      expect(mockPlay).toHaveBeenCalled();
      expect(playPauseBtn.textContent).toBe('Pause'); // Assuming play was successful

      // Simulate second click to pause
      const mockAudioInstance = require('./AudioController').default.mock.instances[0];
      mockAudioInstance.isPlaying = true; // Simulate that audio is now playing

      playPauseBtn.click();
      await Promise.resolve();
      expect(mockPause).toHaveBeenCalled();
      expect(playPauseBtn.textContent).toBe('Play');
    });

    test('Sound select change should play new sound', async () => {
      await loadMainJs();
      const mockAudioInstance = require('./AudioController').default.mock.instances[0];
      const { soundSources } = require('./AudioController');


      soundSelect.value = soundSources[1].name;
      soundSelect.dispatchEvent(new Event('change'));
      await Promise.resolve();

      expect(mockAudioControllerInit).toHaveBeenCalled();
      expect(mockPlay).toHaveBeenCalledWith(soundSources[1].name);
      mockAudioInstance.isPlaying = true; // Assume play succeeded
      expect(playPauseBtn.textContent).toBe('Pause');
    });

    test('Spacebar press should toggle play/pause', async () => {
        await loadMainJs();

        // Simulate spacebar press
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        await Promise.resolve(); // for async operations

        expect(mockAudioControllerInit).toHaveBeenCalled();
        expect(mockPlay).toHaveBeenCalled();
        // Further checks as in button click...
    });
  });

  describe('Controls Auto-Hide (US-005)', () => {
    test('Controls should become hidden after 10 seconds of inactivity', async () => {
      await loadMainJs(); // main.js initializes the timer
      expect(controlsElement).not.toHaveClass('hidden');

      jest.advanceTimersByTime(10000); // Advance timer by 10 seconds
      expect(controlsElement).toHaveClass('hidden');
    });

    test('Controls should reappear on mousemove and timer reset', async () => {
      await loadMainJs();
      jest.advanceTimersByTime(10000); // Hide controls
      expect(controlsElement).toHaveClass('hidden');

      // Simulate mouse move
      document.dispatchEvent(new Event('mousemove'));
      expect(controlsElement).not.toHaveClass('hidden');

      // Check if timer is reset (controls don't hide immediately)
      jest.advanceTimersByTime(5000); // Advance by 5s
      expect(controlsElement).not.toHaveClass('hidden');
      jest.advanceTimersByTime(5000); // Advance by another 5s (total 10s since activity)
      expect(controlsElement).toHaveClass('hidden');
    });
  });
});
