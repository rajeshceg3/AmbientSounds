// src/UIController.test.js
import UIController from './UIController';

// Mock matchMedia
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

const mockSoundSources = [
  { name: 'Rain', url: '/audio/rain.mp3' },
  { name: 'Ocean', url: '/audio/ocean.mp3' },
];

describe('UIController', () => {
  let uiController;
  let mockAppContext;
  let playPauseBtn, customSelectContainer, customSelectTrigger, customSelectOptionsList, controlsElement, reducedMotionToggle;
  let originalConsoleError;

  beforeEach(() => {
    // Setup mock DOM
    document.body.innerHTML = `
      <div class="controls">
        <button id="play-pause-btn" aria-label="Play audio">
            <span class="material-symbols-rounded">play_arrow</span>
            <div class="play-ripple"></div>
        </button>
        <div class="sound-selector-custom" id="sound-selector-custom">
            <button class="custom-select-trigger" aria-haspopup="listbox" aria-expanded="false">
                <span class="selected-value">Select Sound</span>
                <span class="material-symbols-rounded dropdown-arrow">expand_more</span>
            </button>
            <ul class="custom-select-options" role="listbox" id="sound-options-list"></ul>
        </div>
        <input type="range" id="volume-slider">
        <input type="checkbox" id="reduced-motion-toggle">
      </div>
    `;
    playPauseBtn = document.getElementById('play-pause-btn');
    customSelectContainer = document.getElementById('sound-selector-custom');
    customSelectTrigger = customSelectContainer.querySelector('.custom-select-trigger');
    customSelectOptionsList = document.getElementById('sound-options-list');
    controlsElement = document.querySelector('.controls');
    reducedMotionToggle = document.getElementById('reduced-motion-toggle');

    playPauseBtn.focus = jest.fn();
    playPauseBtn.blur = jest.fn();

    mockAppContext = {};
    originalConsoleError = console.error;
    console.error = jest.fn();

    uiController = new UIController(mockAppContext);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    document.body.innerHTML = '';
    console.error = originalConsoleError;
  });

  test('constructor should query DOM elements', () => {
    expect(uiController.playPauseBtn).toBe(playPauseBtn);
    expect(uiController.customSelectTrigger).toBe(customSelectTrigger);
    expect(uiController.controlsElement).toBe(controlsElement);
    expect(uiController.reducedMotionToggle).toBe(reducedMotionToggle);
  });

  test('populateSoundOptions should create list items in custom dropdown', () => {
    uiController.populateSoundOptions(mockSoundSources);
    expect(customSelectOptionsList.children.length).toBe(mockSoundSources.length);
    expect(customSelectOptionsList.children[0].textContent).toBe(mockSoundSources[0].name);
    expect(customSelectOptionsList.children[0].getAttribute('data-value')).toBe(mockSoundSources[0].name);
  });

  test('updatePlayButtonState should update icon and aria-pressed', () => {
    uiController.updatePlayButtonState(true); // Playing
    expect(playPauseBtn.querySelector('.material-symbols-rounded').textContent).toBe('pause');
    expect(playPauseBtn.getAttribute('aria-label')).toBe('Pause audio');
    expect(playPauseBtn.getAttribute('aria-pressed')).toBe('true');

    uiController.updatePlayButtonState(false); // Paused
    expect(playPauseBtn.querySelector('.material-symbols-rounded').textContent).toBe('play_arrow');
    expect(playPauseBtn.getAttribute('aria-label')).toBe('Play audio');
    expect(playPauseBtn.getAttribute('aria-pressed')).toBe('false');
  });

  test('updateVolumeSlider should update value and aria-valuenow', () => {
    uiController.updateVolumeSlider(0.5);
    const volumeSlider = document.getElementById('volume-slider');
    expect(volumeSlider.value).toBe('0.5');
    expect(volumeSlider.getAttribute('aria-valuenow')).toBe('0.5');
  });

  test('bindVolumeSlider should add event listener', () => {
    const callback = jest.fn();
    uiController.bindVolumeSlider(callback);
    const volumeSlider = document.getElementById('volume-slider');
    volumeSlider.dispatchEvent(new Event('input'));
    expect(callback).toHaveBeenCalled();
  });

  test('updateReducedMotionToggle should update checked state and aria-checked', () => {
    uiController.updateReducedMotionToggle(true);
    expect(reducedMotionToggle.checked).toBe(true);
    expect(reducedMotionToggle.getAttribute('aria-checked')).toBe('true');

    uiController.updateReducedMotionToggle(false);
    expect(reducedMotionToggle.checked).toBe(false);
    expect(reducedMotionToggle.getAttribute('aria-checked')).toBe('false');
  });

  test('updateSoundSelection should update the visual selection', () => {
    uiController.populateSoundOptions(mockSoundSources);
    uiController.updateSoundSelection(mockSoundSources[1].name);

    const selectedOption = customSelectOptionsList.querySelector('.selected');
    expect(selectedOption).not.toBeNull();
    expect(selectedOption.getAttribute('data-value')).toBe(mockSoundSources[1].name);
    expect(customSelectTrigger.querySelector('.selected-value').textContent).toBe(mockSoundSources[1].name);
  });

  test('displayError should show and then hide error message', () => {
    uiController.displayError('Test error');
    let errorElement = document.querySelector('.error-message');
    expect(errorElement).not.toBeNull();
    expect(errorElement.textContent).toBe('Test error');
    expect(errorElement.style.opacity).toBe('1');

    jest.advanceTimersByTime(4000);
    expect(errorElement.style.opacity).toBe('0');
  });

  describe('Control Visibility', () => {
    beforeEach(() => {
        uiController.initControlHiding(1000);
    });

    test('showControls should remove .hidden and reset timer', () => {
        controlsElement.classList.add('hidden');
        uiController.showControls();
        expect(controlsElement.classList.contains('hidden')).toBe(false);
    });

    test('hideControls should add .hidden', () => {
        uiController.hideControls();
        expect(controlsElement.classList.contains('hidden')).toBe(true);
    });

    test('initControlHiding should hide controls after inactivity', () => {
        expect(controlsElement.classList.contains('hidden')).toBe(false);
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

  test('bindSoundSelect should store callback and be called on option click', () => {
    const callback = jest.fn();
    uiController.bindSoundSelect(callback);
    uiController.populateSoundOptions(mockSoundSources);

    // Simulate clicking an option
    const option = customSelectOptionsList.querySelector('li');
    option.click();

    expect(callback).toHaveBeenCalled();
  });
});
