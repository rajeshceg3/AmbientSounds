// src/UIController.js
class UIController {
  constructor(appContext) {
    this.appContext = appContext;

    // DOM Elements
    this.playPauseBtn = document.getElementById('play-pause-btn');
    this.volumeSlider = document.getElementById('volume-slider');
    this.controlsElement = document.querySelector('.controls');
    this.reducedMotionToggle = document.getElementById('reduced-motion-toggle');

    // Custom Dropdown Elements
    this.customSelectContainer = document.getElementById('sound-selector-custom');
    this.customSelectTrigger = this.customSelectContainer ? this.customSelectContainer.querySelector('.custom-select-trigger') : null;
    this.customSelectOptionsList = document.getElementById('sound-options-list');

    this.errorDisplayElement = null;

    if (!this.controlsElement) console.error("UIController: Controls element not found!");
    if (!this.playPauseBtn) console.error("UIController: Play/Pause button not found!");

    this._setupCustomDropdown();
    this._setupDesktopTilt();
  }

  // --- Initialization & Setup ---

  _setupCustomDropdown() {
    if (!this.customSelectTrigger || !this.customSelectOptionsList) return;

    // Toggle dropdown
    this.customSelectTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleDropdown();
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (this.customSelectContainer && !this.customSelectContainer.contains(e.target)) {
        this._closeDropdown();
      }
    });

    // Keyboard navigation
    this.customSelectContainer.addEventListener('keydown', (e) => {
      const isExpanded = this.customSelectTrigger.getAttribute('aria-expanded') === 'true';

      if (e.key === 'Escape') {
        this._closeDropdown();
        this.customSelectTrigger.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (!isExpanded) {
            e.preventDefault();
            this._openDropdown();
        } else {
             // If open and focused on an option, select it (handled by click listener on option usually, but let's be robust)
             // If just focused on trigger, close? Or select first?
             // Standard behavior: Enter selects focused option.
             // We need to manage focus on options for this.
        }
      } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (!isExpanded) {
              this._openDropdown();
          }
          this._focusNextOption();
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (!isExpanded) {
              this._openDropdown();
          }
          this._focusPrevOption();
      }
    });
  }

  _focusNextOption() {
      const options = Array.from(this.customSelectOptionsList.querySelectorAll('li'));
      const currentIndex = options.findIndex(opt => opt.classList.contains('focused'));
      let nextIndex = currentIndex + 1;
      if (nextIndex >= options.length) nextIndex = 0;

      this._setFocusedOption(options[nextIndex]);
  }

  _focusPrevOption() {
      const options = Array.from(this.customSelectOptionsList.querySelectorAll('li'));
      const currentIndex = options.findIndex(opt => opt.classList.contains('focused'));
      let nextIndex = currentIndex - 1;
      if (nextIndex < 0) nextIndex = options.length - 1;

      this._setFocusedOption(options[nextIndex]);
  }

  _setFocusedOption(option) {
      const options = Array.from(this.customSelectOptionsList.querySelectorAll('li'));
      options.forEach(opt => opt.classList.remove('focused'));
      if (option) {
          option.classList.add('focused');
          option.scrollIntoView({ block: 'nearest' });
          // Ensure visual focus style in CSS matches .focused
      }
  }

  _toggleDropdown() {
    const isExpanded = this.customSelectTrigger.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      this._closeDropdown();
    } else {
      this._openDropdown();
    }
  }

  _openDropdown() {
    this.customSelectTrigger.setAttribute('aria-expanded', 'true');
    this.customSelectOptionsList.classList.add('open');
    this.triggerHapticFeedback([10]);

    // Highlight currently selected option
    const selected = this.customSelectOptionsList.querySelector('.selected');
    if (selected) this._setFocusedOption(selected);
    else {
        const first = this.customSelectOptionsList.querySelector('li');
        if (first) this._setFocusedOption(first);
    }
  }

  _closeDropdown() {
    this.customSelectTrigger.setAttribute('aria-expanded', 'false');
    this.customSelectOptionsList.classList.remove('open');
    // Clear focus state
    const options = Array.from(this.customSelectOptionsList.querySelectorAll('li'));
    options.forEach(opt => opt.classList.remove('focused'));
  }

  _setupDesktopTilt() {
    if (!this.controlsElement) return;

    // Only apply on non-touch devices primarily
    if (window.matchMedia('(hover: hover)').matches) {
      this.controlsElement.addEventListener('mousemove', (e) => {
        const rect = this.controlsElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate percentages -0.5 to 0.5
        const xPct = (x / rect.width) - 0.5;
        const yPct = (y / rect.height) - 0.5;

        // Tilt amount (max degrees)
        const tiltX = -yPct * 8; // Rotate X based on Y position
        const tiltY = xPct * 8;  // Rotate Y based on X position

        this.controlsElement.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(0)`;
      });

      this.controlsElement.addEventListener('mouseleave', () => {
        // Reset
        this.controlsElement.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
      });
    }
  }

  // --- Public API ---

  populateSoundOptions(soundSources) {
    if (!this.customSelectOptionsList) return;
    this.customSelectOptionsList.innerHTML = '';

    soundSources.forEach(sound => {
      const li = document.createElement('li');
      li.textContent = sound.name; // assuming sound.name is Display Name
      li.setAttribute('data-value', sound.name);
      li.setAttribute('role', 'option');
      li.tabIndex = -1; // make programmable focusable if needed, but we manage visually

      li.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent bubbling to document (close) immediately
        this._selectOption(sound.name, li);
        this._closeDropdown();
      });

      // Allow keyboard selection via Enter/Space when focused
      // Since the container handles keys, we check for focused item there.
      // But we can add specific handling here if we wanted listeners on LIs.

      this.customSelectOptionsList.appendChild(li);
    });
  }

  _selectOption(value, optionElement) {
    // Update visual selection
    const allOptions = this.customSelectOptionsList.querySelectorAll('li');
    allOptions.forEach(opt => opt.classList.remove('selected'));

    if (optionElement) {
        optionElement.classList.add('selected');
    }

    // Update trigger text
    const valueSpan = this.customSelectTrigger.querySelector('.selected-value');
    if (valueSpan) valueSpan.textContent = value;

    // Trigger callback if registered
    if (this.onSoundChangeCallback) {
        this.onSoundChangeCallback({ target: { value } }); // Mock event object
    }

    this.triggerHapticFeedback([15]);
  }

  updateSoundSelection(soundName) {
    // Programmatic update
    const allOptions = this.customSelectOptionsList.querySelectorAll('li');
    let targetOption = null;

    allOptions.forEach(opt => {
        if (opt.getAttribute('data-value') === soundName) {
            targetOption = opt;
        }
    });

    if (targetOption) {
        // Just update visual state, don't trigger callback to avoid loops if needed
        allOptions.forEach(opt => opt.classList.remove('selected'));
        targetOption.classList.add('selected');
        const valueSpan = this.customSelectTrigger.querySelector('.selected-value');
        if (valueSpan) valueSpan.textContent = soundName;
    }
  }

  updatePlayButtonState(isPlaying) {
    if (!this.playPauseBtn) return;
    const iconSpan = this.playPauseBtn.querySelector('.material-symbols-rounded');
    if (iconSpan) {
        iconSpan.textContent = isPlaying ? 'pause' : 'play_arrow';
    }
    this.playPauseBtn.classList.toggle('is-playing', isPlaying);
    this.playPauseBtn.setAttribute('aria-label', isPlaying ? 'Pause audio' : 'Play audio');
    this.playPauseBtn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
  }

  updateVolumeSlider(volume) {
    if (!this.volumeSlider) return;
    this.volumeSlider.value = volume;
    this.volumeSlider.setAttribute('aria-valuenow', volume);
    const percentage = volume * 100;
    this.volumeSlider.style.backgroundSize = `${percentage}% 100%`;
  }

  updateReducedMotionToggle(isChecked) {
    if (!this.reducedMotionToggle) return;
    this.reducedMotionToggle.checked = isChecked;
    this.reducedMotionToggle.setAttribute('aria-checked', isChecked ? 'true' : 'false');
  }

  displayError(message) {
    if (!this.errorDisplayElement) {
        this.errorDisplayElement = document.createElement('div');
        this.errorDisplayElement.className = 'error-message';
        this.errorDisplayElement.style.position = 'fixed';
        this.errorDisplayElement.style.bottom = '20px';
        this.errorDisplayElement.style.left = '50%';
        this.errorDisplayElement.style.transform = 'translateX(-50%)';
        this.errorDisplayElement.style.zIndex = '1000';
        document.body.appendChild(this.errorDisplayElement);
    }
    this.errorDisplayElement.textContent = message;
    this.errorDisplayElement.style.opacity = '1';
    setTimeout(() => {
        this.errorDisplayElement.style.opacity = '0';
    }, 4000);
  }

  // --- Control Visibility ---
  showControls() {
    if (!this.controlsElement) return;
    this.controlsElement.classList.remove('hidden');
    this._resetActivityTimer();
  }

  hideControls() {
    if (!this.controlsElement) return;
    this.controlsElement.classList.add('hidden');
  }

  _resetActivityTimer() {
    if (this.activityTimer) clearTimeout(this.activityTimer);
    if (this.inactivityDuration > 0) {
        this.activityTimer = setTimeout(() => this.hideControls(), this.inactivityDuration);
    }
  }

  initControlHiding(inactivityDuration = 8000) {
    this.inactivityDuration = inactivityDuration;
    if (!this.controlsElement) return;

    ['mousemove', 'mousedown', 'touchstart', 'keydown'].forEach(evt => {
      document.addEventListener(evt, () => this.showControls(), { passive: true });
    });

    this.controlsElement.addEventListener('focusin', () => {
        this.showControls();
        if (this.activityTimer) clearTimeout(this.activityTimer);
    });
    this.controlsElement.addEventListener('focusout', () => this._resetActivityTimer());
    this.controlsElement.addEventListener('mouseenter', () => {
        if (this.activityTimer) clearTimeout(this.activityTimer);
    });
    this.controlsElement.addEventListener('mouseleave', () => this._resetActivityTimer());
    this._resetActivityTimer();
  }

  triggerHapticFeedback(pattern = [10]) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  // --- Event Binding ---
  bindPlayPauseButton(callback) {
    if (!this.playPauseBtn) return;
    this.playPauseBtn.addEventListener('click', (e) => {
        this.triggerHapticFeedback([20]); // Solid click

        // Add ripple effect
        const ripple = this.playPauseBtn.querySelector('.play-ripple');
        if (ripple) {
            ripple.style.animation = 'none';
            ripple.offsetHeight; // trigger reflow
            ripple.style.animation = 'ripple 0.6s linear';
        }

        callback(e);
    });
  }

  bindSoundSelect(callback) {
    // Store callback to use in _selectOption
    this.onSoundChangeCallback = callback;

    // Add enter key support on the container to trigger selection
    if (this.customSelectContainer) {
        this.customSelectContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const focused = this.customSelectOptionsList.querySelector('.focused');
                if (focused) {
                    e.preventDefault();
                    e.stopPropagation();
                    this._selectOption(focused.getAttribute('data-value'), focused);
                    this._closeDropdown();
                }
            }
        });
    }
  }

  bindReducedMotionToggle(callback) {
    if (!this.reducedMotionToggle) return;
    this.reducedMotionToggle.addEventListener('change', (e) => {
        this.triggerHapticFeedback([10]);
        callback(e);
    });
  }

  bindVolumeSlider(callback) {
    if (!this.volumeSlider) return;
    this.volumeSlider.addEventListener('input', (e) => {
        if (!this._lastVibration || Date.now() - this._lastVibration > 40) {
            this.triggerHapticFeedback([4]);
            this._lastVibration = Date.now();
        }
        callback(e);
    });
  }

  bindGlobalSpacebar(callback) {
    document.addEventListener('keydown', (event) => {
        const targetTagName = event.target.tagName ? event.target.tagName.toLowerCase() : '';
        // Don't trigger if focused on input/select/textarea OR our custom dropdown buttons
        if (['input', 'select', 'textarea', 'button'].includes(targetTagName)) return;

        if (event.code === 'Space') {
            event.preventDefault();
            callback();
            this.triggerHapticFeedback([20]);
            // Optional: visual feedback on play button
            if(this.playPauseBtn) {
                this.playPauseBtn.style.transform = 'scale(0.95)';
                setTimeout(() => this.playPauseBtn.style.transform = '', 150);
            }
        }
    });
  }
}
export default UIController;
