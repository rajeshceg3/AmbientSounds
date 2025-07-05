// src/UIController.test.js
import UIController from './UIController';
// import { soundSources } from './AudioController'; // Using mock below

// Mock soundSources
const mockSoundSources = [
  { name: 'Rain', url: '/audio/rain.mp3' },
  { name: 'Ocean', url: '/audio/ocean.mp3' },
];

describe('UIController', () => {
  let uiController;
  let mockAppContext;
  let playPauseBtn, soundSelect, controlsElement, reducedMotionToggle;
  let originalConsoleError;

  beforeEach(() => {
    // Setup mock DOM
    document.body.innerHTML = \`
      <div class="controls">
        <button id="play-pause-btn" aria-label="Play audio"></button>
        <select id="sound-select"></select>
        <input type="checkbox" id="reduced-motion-toggle">
      </div>
    \`;
    playPauseBtn = document.getElementById('play-pause-btn');
    soundSelect = document.getElementById('sound-select');
    controlsElement = document.querySelector('.controls');
    reducedMotionToggle = document.getElementById('reduced-motion-toggle');

    // Mock playPauseBtn.focus as it's called in bindGlobalSpacebar
    playPauseBtn.focus = jest.fn();
    playPauseBtn.blur = jest.fn();


    mockAppContext = {}; // Populate if methods rely on it

    originalConsoleError = console.error;
    console.error = jest.fn(); // Suppress console.error for missing elements if any during tests

    uiController = new UIController(mockAppContext);
    jest.useFakeTimers(); // For testing timeouts like in displayError and initControlHiding
  });

  afterEach(() => {
    jest.clearAllTimers();
    document.body.innerHTML = ''; // Clean up DOM
    console.error = originalConsoleError; // Restore console.error
  });

  test('constructor should query DOM elements', () => {
    expect(uiController.playPauseBtn).toBe(playPauseBtn);
    expect(uiController.soundSelect).toBe(soundSelect);
    expect(uiController.controlsElement).toBe(controlsElement);
    expect(uiController.reducedMotionToggle).toBe(reducedMotionToggle);
  });

  test('populateSoundOptions should create option elements', () => {
    uiController.populateSoundOptions(mockSoundSources);
    expect(soundSelect.options.length).toBe(mockSoundSources.length);
    expect(soundSelect.options[0].value).toBe(mockSoundSources[0].name);
    expect(soundSelect.options[0].textContent).toBe(mockSoundSources[0].name);
  });

  test('updatePlayButtonState should update text and aria-pressed', () => {
    uiController.updatePlayButtonState(true); // Playing
    expect(playPauseBtn.textContent).toBe('Pause');
    expect(playPauseBtn.getAttribute('aria-label')).toBe('Pause audio');
    expect(playPauseBtn.getAttribute('aria-pressed')).toBe('true');

    uiController.updatePlayButtonState(false); // Paused
    expect(playPauseBtn.textContent).toBe('Play');
    expect(playPauseBtn.getAttribute('aria-label')).toBe('Play audio');
    expect(playPauseBtn.getAttribute('aria-pressed')).toBe('false');
  });

  test('updateReducedMotionToggle should update checked state and aria-checked', () => {
    uiController.updateReducedMotionToggle(true);
    expect(reducedMotionToggle.checked).toBe(true);
    expect(reducedMotionToggle.getAttribute('aria-checked')).toBe('true');

    uiController.updateReducedMotionToggle(false);
    expect(reducedMotionToggle.checked).toBe(false);
    expect(reducedMotionToggle.getAttribute('aria-checked')).toBe('false');
  });

  test('updateSoundSelection should set the value of the sound select dropdown', () => {
    uiController.populateSoundOptions(mockSoundSources); // Ensure options exist
    uiController.updateSoundSelection(mockSoundSources[1].name);
    expect(soundSelect.value).toBe(mockSoundSources[1].name);
  });

  test('displayError should show and then hide error message', () => {
    uiController.displayError('Test error');
    let errorElement = document.querySelector('.error-message');
    expect(errorElement).not.toBeNull();
    expect(errorElement.textContent).toBe('Test error');
    expect(errorElement.style.opacity).toBe('1');

    jest.advanceTimersByTime(5000);
    expect(errorElement.style.opacity).toBe('0');
  });

  describe('Control Visibility', () => {
    beforeEach(() => {
        uiController.initControlHiding(1000); // 1 second for testing
    });

    test('showControls should remove .hidden and reset timer', () => {
        controlsElement.classList.add('hidden'); // Start hidden
        uiController.showControls();
        expect(controlsElement.classList.contains('hidden')).toBe(false);
        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    test('hideControls should add .hidden', () => {
        uiController.hideControls();
        expect(controlsElement.classList.contains('hidden')).toBe(true);
    });

    test('initControlHiding should hide controls after inactivity', () => {
        expect(controlsElement.classList.contains('hidden')).toBe(false); // Starts visible
        jest.advanceTimersByTime(1000);
        expect(controlsElement.classList.contains('hidden')).toBe(true);
    });

    test('activity events (mousemove) should show controls', () => {
        jest.advanceTimersByTime(1000); // Hide them first
        expect(controlsElement.classList.contains('hidden')).toBe(true);

        document.dispatchEvent(new MouseEvent('mousemove'));
        expect(controlsElement.classList.contains('hidden')).toBe(false);
        jest.advanceTimersByTime(1000); // Should hide again
        expect(controlsElement.classList.contains('hidden')).toBe(true);
    });

    test('focusin on controls should show them and prevent hiding', () => {
        controlsElement.classList.add('hidden'); // Start hidden
        controlsElement.dispatchEvent(new FocusEvent('focusin'));
        expect(controlsElement.classList.contains('hidden')).toBe(false);
        // Check if clearTimeout was called on the specific timer from _resetActivityTimer
        // This requires more specific timer management or inspection if many timers are used.
        // For now, assume the logic inside _resetActivityTimer clears the correct one.
        expect(clearTimeout).toHaveBeenCalled();

        jest.advanceTimersByTime(2000); // Pass original timeout duration
        expect(controlsElement.classList.contains('hidden')).toBe(false); // Should remain visible
    });

    test('focusout from controls should restart hide timer', () => {
        controlsElement.dispatchEvent(new FocusEvent('focusin')); // Keep it open
        controlsElement.dispatchEvent(new FocusEvent('focusout'));
        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000); // Timer restarted
        jest.advanceTimersByTime(1000);
        expect(controlsElement.classList.contains('hidden')).toBe(true);
    });
  });

  test('bindPlayPauseButton should add event listener', () => {
    const callback = jest.fn();
    uiController.bindPlayPauseButton(callback);
    playPauseBtn.click();
    expect(callback).toHaveBeenCalled();
  });

  test('bindSoundSelect should add event listener', () => {
    const callback = jest.fn();
    uiController.bindSoundSelect(callback);
    soundSelect.dispatchEvent(new Event('change'));
    expect(callback).toHaveBeenCalled();
  });

  test('bindReducedMotionToggle should add event listener', () => {
    const callback = jest.fn();
    uiController.bindReducedMotionToggle(callback);
    reducedMotionToggle.click(); // Click simulates change for checkbox
    expect(callback).toHaveBeenCalled();
  });

  test('bindGlobalSpacebar should call callback on spacebar if target is not input/select/textarea', () => {
    const callback = jest.fn();
    uiController.bindGlobalSpacebar(callback);

    // Test on document body
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(callback).toHaveBeenCalledTimes(1);
    expect(playPauseBtn.focus).toHaveBeenCalled();

    // Test on an input (should not call callback)
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus(); // Target the input
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); // Dispatch globally but target is input
    expect(callback).toHaveBeenCalledTimes(1); // Still 1, not 2

    document.body.removeChild(input);
  });
});
