// src/UIController.js
class UIController {
  constructor(appContext) {
    this.appContext = appContext; // To access other controllers if needed

    // Query DOM elements
    this.playPauseBtn = document.getElementById('play-pause-btn');
    this.soundSelect = document.getElementById('sound-select');
    this.controlsElement = document.querySelector('.controls');
    this.reducedMotionToggle = document.getElementById('reduced-motion-toggle');
    this.errorDisplayElement = null; // For displaying errors

    if (!this.controlsElement) {
      console.error("UIController: Controls element not found!");
    }
    if (!this.playPauseBtn) {
        console.error("UIController: Play/Pause button not found!");
    }
    // ... add checks for other elements
  }

  populateSoundOptions(soundSources) {
    if (!this.soundSelect) return;
    this.soundSelect.innerHTML = ''; // Clear existing
    soundSources.forEach(sound => {
      const option = document.createElement('option');
      option.value = sound.name;
      option.textContent = sound.name;
      this.soundSelect.appendChild(option);
    });
  }

  updatePlayButtonState(isPlaying) {
    if (!this.playPauseBtn) return;
    this.playPauseBtn.textContent = isPlaying ? 'Pause' : 'Play';
    this.playPauseBtn.setAttribute('aria-label', isPlaying ? 'Pause audio' : 'Play audio');
    this.playPauseBtn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
  }

  updateReducedMotionToggle(isChecked) {
    if (!this.reducedMotionToggle) return;
    this.reducedMotionToggle.checked = isChecked;
    // For a standard checkbox, aria-checked is handled by the browser.
    // Explicitly setting it here is redundant but harmless, and good practice if role="switch".
    this.reducedMotionToggle.setAttribute('aria-checked', isChecked ? 'true' : 'false');
  }

  updateSoundSelection(soundName) {
    if (!this.soundSelect) return;
    this.soundSelect.value = soundName;
  }

  _createErrorDisplayElement() {
    if (!this.errorDisplayElement) {
        this.errorDisplayElement = document.createElement('div');
        this.errorDisplayElement.className = 'error-message';
        this.errorDisplayElement.style.position = 'fixed';
        this.errorDisplayElement.style.bottom = '10px';
        this.errorDisplayElement.style.left = '50%';
        this.errorDisplayElement.style.transform = 'translateX(-50%)';
        this.errorDisplayElement.style.padding = '10px';
        this.errorDisplayElement.style.backgroundColor = 'rgba(200, 0, 0, 0.8)';
        this.errorDisplayElement.style.color = 'white';
        this.errorDisplayElement.style.borderRadius = '5px';
        this.errorDisplayElement.style.zIndex = '1000';
        this.errorDisplayElement.style.opacity = '0';
        this.errorDisplayElement.style.transition = 'opacity 0.5s ease-in-out';
        document.body.appendChild(this.errorDisplayElement);
    }
  }

  displayError(message) {
    this._createErrorDisplayElement();
    if (!this.errorDisplayElement) return;

    this.errorDisplayElement.textContent = message;
    this.errorDisplayElement.style.opacity = '1';

    setTimeout(() => {
        if (this.errorDisplayElement) {
            this.errorDisplayElement.style.opacity = '0';
        }
    }, 5000); // Hide after 5 seconds
  }

  // --- Control Visibility ---
  showControls() {
    if (!this.controlsElement) return;
    this.controlsElement.classList.remove('hidden');
    this._resetActivityTimer(); // Reset timer when shown due to interaction
  }

  hideControls() {
    if (!this.controlsElement) return;
    this.controlsElement.classList.add('hidden');
  }

  _resetActivityTimer() {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }
    if (this.inactivityDuration > 0) {
        this.activityTimer = setTimeout(() => this.hideControls(), this.inactivityDuration);
    }
  }

  initControlHiding(inactivityDuration = 10000) {
    this.inactivityDuration = inactivityDuration;
    if (!this.controlsElement) return;

    const activityEvents = ['mousemove', 'mousedown', 'touchstart', 'keydown'];
    activityEvents.forEach(eventType => {
      // Add passive: true for scroll-blocking events if appropriate
      document.addEventListener(eventType, () => this.showControls(), { passive: true });
    });

    // Add focusin/focusout listeners to keep controls visible when an element within them is focused
    this.controlsElement.addEventListener('focusin', () => {
        this.showControls(); // Show and keep visible
        if (this.activityTimer) clearTimeout(this.activityTimer); // Prevent hiding while focused
    });

    this.controlsElement.addEventListener('focusout', () => {
        this._resetActivityTimer(); // Restart hide timer when focus leaves controls
    });

    this.controlsElement.addEventListener('mouseenter', () => {
        if (this.activityTimer) clearTimeout(this.activityTimer);
    });

    this.controlsElement.addEventListener('mouseleave', () => {
        this._resetActivityTimer();
    });

    this._resetActivityTimer(); // Initial timer setup
  }

  // --- Event Binding ---
  bindPlayPauseButton(callback) {
    if (!this.playPauseBtn) return;
    this.playPauseBtn.addEventListener('click', callback);
  }

  bindSoundSelect(callback) {
    if (!this.soundSelect) return;
    this.soundSelect.addEventListener('change', callback);
  }

  bindReducedMotionToggle(callback) {
    if (!this.reducedMotionToggle) return;
    this.reducedMotionToggle.addEventListener('change', callback);
  }

  bindGlobalSpacebar(callback) {
     // Listen on the document body or a main application container.
    document.addEventListener('keydown', (event) => {
        const targetTagName = event.target.tagName.toLowerCase();
        if (targetTagName === 'input' || targetTagName === 'select' || targetTagName === 'textarea') {
            return;
        }
        if (event.code === 'Space') {
            event.preventDefault();
            callback();
            if(this.playPauseBtn){ // Visual feedback
                this.playPauseBtn.focus();
                setTimeout(() => this.playPauseBtn.blur(), 200);
            }
        }
    });
  }
}
export default UIController;
