// src/SettingsController.js

const DEFAULTS = {
  soundEnabled: true,
  selectedSound: 'Rain', // Default to 'Rain'
  volume: 0.75, // Default volume (0 to 1)
  visualEnabled: true, // If background visuals can be turned off entirely
  reducedMotion: false, // For background animations
  lastUsed: null,
  sessionCount: 0,
};

const STORAGE_KEY = 'ambientMoodSettings';

class SettingsController {
  constructor() {
    this.settings = this.loadSettings();
    // Ensure default sound is one of the available ones if possible
    // This might require access to soundSources from AudioController,
    // for now, 'Rain' is a placeholder.
  }

  loadSettings() {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        // Merge with defaults to ensure all keys are present if new settings are added
        return { ...DEFAULTS, ...parsed };
      }
    } catch (error) {
      console.error('SettingsController: Error loading settings from localStorage:', error);
      // Fallback to defaults if loading or parsing fails
    }
    return { ...DEFAULTS };
  }

  saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('SettingsController: Error saving settings to localStorage:', error);
    }
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    if (key === 'volume' && (typeof value !== 'number' || value < 0 || value > 1)) {
      console.warn(`SettingsController: Invalid volume value "${value}". Must be between 0 and 1.`);
      return;
    }
    if (key === 'selectedSound' && (!value || typeof value !== 'string')) {
      console.warn(`SettingsController: Invalid selectedSound value "${value}".`);
      return;
    }

    if (key in this.settings) {
      this.settings[key] = value;
      this.saveSettings();
    } else {
      console.warn(`SettingsController: Attempted to set unknown setting "${key}".`);
    }
  }

  getAll() {
    return { ...this.settings };
  }

  // Specific helper methods as needed
  isSoundEnabled() {
    return this.get('soundEnabled');
  }

  getSelectedSound() {
    return this.get('selectedSound');
  }

  getVolume() {
    return this.get('volume');
  }

  isVisualEnabled() {
    return this.get('visualEnabled');
  }

  isReducedMotion() {
    return this.get('reducedMotion');
  }

  incrementSessionCount() {
    const currentCount = this.get('sessionCount') || 0;
    this.set('sessionCount', currentCount + 1);
    this.set('lastUsed', new Date().toISOString());
  }
}

export default SettingsController;
