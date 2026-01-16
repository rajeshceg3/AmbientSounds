import './style.css';
import BackgroundController from './BackgroundController.js';
import AudioController, { soundSources } from './AudioController.js';
import SettingsController from './SettingsController.js';
import UIController from './UIController.js';

document.addEventListener('DOMContentLoaded', () => {
  const pageLoadStart = performance.now();
  console.log(`Performance: DOMContentLoaded event at ${(performance.now() - pageLoadStart).toFixed(2)} ms (relative to script start)`);

  window.addEventListener('load', () => {
    const now = performance.now();
    console.log(`Performance: Window 'load' event at ${(now - pageLoadStart).toFixed(2)} ms (relative to script start)`);

    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0 && navEntries[0] instanceof PerformanceNavigationTiming) {
      const timing = navEntries[0];
      console.log(`Performance (NavigationTiming):`);
      console.log(`  - Page Load Time (navigationStart to loadEventEnd): ${timing.loadEventEnd.toFixed(2)} ms`);
      console.log(`  - DOMContentLoaded Time (navigationStart to domContentLoadedEventEnd): ${timing.domContentLoadedEventEnd.toFixed(2)} ms`);
      console.log(`  - Time to First Byte (TTFB): ${timing.responseStart.toFixed(2)} ms`);
    }
  });

  let firstInteractionTime = null; // For TTFI approximation

  console.log('Ambient Mood app initialized.');

  // Initialize controllers
  const settingsController = new SettingsController();
  settingsController.incrementSessionCount(); // Increment session count early

  const audioController = new AudioController();
  let backgroundController; // Declare here, instantiate after DOM element check

  const backgroundShifterElement = document.querySelector('.background-shifter');
  if (backgroundShifterElement) {
    backgroundController = new BackgroundController(backgroundShifterElement);
    backgroundController.start(); // Start animations
  } else {
    console.error('Background shifter element not found. Visuals will not work.');
  }

  // AppContext holds all controllers. UIController is last as it might need others.
  // However, the current UIController queries its own DOM elements and doesn't strictly need appContext in constructor.
  window.appContext = {
    settingsController,
    audioController,
    backgroundController, // Might be undefined if element not found
    // uiController will be added below
  };

  const uiController = new UIController(window.appContext);
  window.appContext.uiController = uiController; // Add UIController to appContext

  // Set initial volume from settings
  const initialVolume = settingsController.getVolume();
  audioController.setVolume(initialVolume);
  uiController.updateVolumeSlider(initialVolume);

  // Initial UI setup
  uiController.populateSoundOptions(soundSources);
  const initialSound = settingsController.getSelectedSound() || (soundSources.length > 0 ? soundSources[0].name : null);
  if (initialSound) {
    uiController.updateSoundSelection(initialSound); // Set dropdown to stored or default sound
  }

  const initialReducedMotion = settingsController.isReducedMotion();
  uiController.updateReducedMotionToggle(initialReducedMotion);
  if (backgroundController) { // Apply initial setting if backgroundController exists
    backgroundController.setReducedMotion(initialReducedMotion);
  }

  uiController.updatePlayButtonState(audioController.isPlaying); // Initial button state

  // Audio System Initialization (requires user gesture)
  let audioInitialized = false;
  async function initializeAudio() {
    if (!audioInitialized) {
      try {
        await audioController.init();
        audioInitialized = true;
        console.log('Audio system initialized successfully on user gesture.');
        // If there's a selected sound, try to play it if settings say sound is enabled
        // This part is tricky, as play should ideally only happen on direct user action for play.
        // For now, init just prepares the audio system.
      } catch (error) {
        console.error('Error initializing audio system:', error.message);
        uiController.displayError('Audio system could not start. Please try interacting again.');
      }
    }
  }

  // Event Handlers (delegated through UIController bindings)
  async function handlePlayPause() {
    if (!firstInteractionTime) {
      firstInteractionTime = performance.now();
      console.log(`Performance: First user interaction (play/pause) at ${(firstInteractionTime - pageLoadStart).toFixed(2)} ms (relative to script start)`);
    }
    try {
      await initializeAudio(); // Ensure audio context is ready
    } catch (error) {
      // Error is already logged in initializeAudio, but we stop execution here.
      return;
    }
    if (!audioInitialized) return;

    const selectedSoundName = uiController.soundSelect.value || initialSound;
    if (!selectedSoundName) {
        console.warn("No sound selected to play.");
        uiController.displayError("Please select a sound first.");
        return;
    }

    if (audioController.isPlaying) {
      audioController.pause();
    } else {
      await audioController.play(selectedSoundName);
    }
    uiController.updatePlayButtonState(audioController.isPlaying);
  }

  async function handleSoundSelection(event) {
    if (!firstInteractionTime) {
      firstInteractionTime = performance.now();
      console.log(`Performance: First user interaction (sound select) at ${(firstInteractionTime - pageLoadStart).toFixed(2)} ms (relative to script start)`);
    }
    try {
      await initializeAudio();
    } catch (error) {
      return; // Stop if audio initialization fails
    }
    if (!audioInitialized) return;

    const newSoundName = event.target.value;
    settingsController.set('selectedSound', newSoundName); // Save selection
    console.log(`Sound selected via UI: ${newSoundName}`);
    await audioController.play(newSoundName); // Play the new sound
    uiController.updatePlayButtonState(audioController.isPlaying);
  }

  function handleReducedMotionToggle(event) {
    if (!firstInteractionTime) {
      firstInteractionTime = performance.now();
      console.log(`Performance: First user interaction (reduced motion toggle) at ${(firstInteractionTime - pageLoadStart).toFixed(2)} ms (relative to script start)`);
    }
    const isChecked = event.target.checked;
    settingsController.set('reducedMotion', isChecked);
    if (backgroundController) {
      backgroundController.setReducedMotion(isChecked);
    }
    // No need to call uiController.showControls() here as UIController's initControlHiding handles focus/interaction
  }

  function handleVolumeChange(event) {
    if (!firstInteractionTime) {
      firstInteractionTime = performance.now();
      console.log(`Performance: First user interaction (volume change) at ${(firstInteractionTime - pageLoadStart).toFixed(2)} ms (relative to script start)`);
    }
    const newVolume = parseFloat(event.target.value);
    audioController.setVolume(newVolume);
    settingsController.set('volume', newVolume);
    uiController.updateVolumeSlider(newVolume); // For styling updates if needed
  }

  // Bind events using UIController
  uiController.bindPlayPauseButton(handlePlayPause);
  uiController.bindSoundSelect(handleSoundSelection);
  uiController.bindVolumeSlider(handleVolumeChange);
  uiController.bindReducedMotionToggle(handleReducedMotionToggle);
  uiController.bindGlobalSpacebar(handlePlayPause); // Spacebar triggers play/pause

  // Initialize control auto-hiding
  uiController.initControlHiding();

});
