import './style.css';
import BackgroundController from './BackgroundController.js';
import AudioController, { soundSources } from './AudioController.js'; // Import AudioController

document.addEventListener('DOMContentLoaded', () => {
  console.log('Ambient Mood app initialized.');

  const backgroundShifterElement = document.querySelector('.background-shifter');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const soundSelect = document.getElementById('sound-select');
  const controlsElement = document.querySelector('.controls'); // Get controls element

  const audioController = new AudioController();

  // Populate sound select options
  if (soundSelect) {
    soundSelect.innerHTML = ''; // Clear existing options if any
    soundSources.forEach(sound => {
      const option = document.createElement('option');
      option.value = sound.name;
      option.textContent = sound.name;
      soundSelect.appendChild(option);
    });
    // Set initial selected sound for the controller (optional)
    if (soundSources.length > 0) {
      // audioController.selectedSound = soundSources[0].name; // Let play() set this
    }
  }

  if (backgroundShifterElement) {
    const backgroundController = new BackgroundController(backgroundShifterElement);
    backgroundController.start();
    window.appContext = { // Initialize or extend appContext
        ...(window.appContext || {}),
        backgroundController,
        audioController
    };
  } else {
    console.error('Background shifter element not found.');
  }

  let audioInitialized = false;

  async function initializeAudio() {
    if (!audioInitialized) {
      try {
        await audioController.init(); // Initialize AudioContext and preload sounds
        audioInitialized = true;
        console.log('Audio system initialized successfully on user gesture.');
      } catch (error) {
        console.error('Error initializing audio system:', error.message);
        // Optionally, display a message to the user here
        alert('Could not initialize audio. Please try again or check browser permissions.');
      }
    }
  }

  // Combined function to handle play/pause logic
  async function togglePlayPause() {
    await initializeAudio();
    if (!audioInitialized) return;

    if (audioController.isPlaying) {
      audioController.pause();
      playPauseBtn.textContent = 'Play';
      playPauseBtn.setAttribute('aria-label', 'Play audio');
    } else {
      const selectedSoundName = soundSelect.value || (soundSources.length > 0 ? soundSources[0].name : null);
      if (selectedSoundName) {
        await audioController.play(selectedSoundName);
        if(audioController.isPlaying){
            playPauseBtn.textContent = 'Pause';
            playPauseBtn.setAttribute('aria-label', 'Pause audio');
        }
      } else {
        console.warn("No sound selected to play.");
      }
    }
  }

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', togglePlayPause);
  }

  if (soundSelect) {
    soundSelect.addEventListener('change', async (event) => {
      await initializeAudio(); // Ensure audio is initialized
      if (!audioInitialized) return;

      const newSoundName = event.target.value;
      console.log(`Sound selected via UI: ${newSoundName}`);
      await audioController.play(newSoundName); // Play the new sound
      // Ensure button state reflects playing status
      if (audioController.isPlaying) {
        playPauseBtn.textContent = 'Pause';
        playPauseBtn.setAttribute('aria-label', 'Pause audio');
      } else {
        playPauseBtn.textContent = 'Play';
        playPauseBtn.setAttribute('aria-label', 'Play audio');
      }
    });
  }

  // US-004: Keyboard accessibility (spacebar for play/pause)
  // Listen on the document body or a main application container.
  // Using document.body for broader capture, but ensure no unintended consequences.
  // If controls can receive focus, listening on them might be better.
  // For now, global spacebar is common for such media apps.
  document.addEventListener('keydown', (event) => {
    // Check if the event target is not an input, select, or textarea
    // to avoid interfering with text input or select dropdowns.
    const targetTagName = event.target.tagName.toLowerCase();
    if (targetTagName === 'input' || targetTagName === 'select' || targetTagName === 'textarea') {
      return; // Don't interfere with form elements
    }

    if (event.code === 'Space') {
      event.preventDefault(); // Prevent default spacebar action (e.g., scrolling or button click if focused)
      togglePlayPause(); // Call the same toggle function
      // Optional: visually indicate button press, e.g., brief active state
      if(playPauseBtn){
        playPauseBtn.focus(); // Give focus to the button for visual feedback
        setTimeout(() => playPauseBtn.blur(), 200); // Remove focus after a short period
      }
    }
  });

  // US-005: Auto-hide controls functionality
  if (controlsElement) {
    let activityTimer = null;
    const inactivityDuration = 10000; // 10 seconds

    function showControls() {
      controlsElement.classList.remove('hidden');
      resetActivityTimer();
    }

    function hideControls() {
      controlsElement.classList.add('hidden');
    }

    function resetActivityTimer() {
      clearTimeout(activityTimer);
      activityTimer = setTimeout(hideControls, inactivityDuration);
    }

    // Events that indicate user activity
    const activityEvents = ['mousemove', 'mousedown', 'touchstart', 'keydown'];
    activityEvents.forEach(eventType => {
      document.addEventListener(eventType, showControls, { passive: true });
    });

    // Initial setup: show controls and start timer
    // Controls start visible due to CSS, timer starts to hide them if no immediate activity
    resetActivityTimer();
  } else {
    console.error("Controls element not found for auto-hide functionality.");
  }
});
