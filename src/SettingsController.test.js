// src/SettingsController.test.js
import SettingsController from './SettingsController';

const STORAGE_KEY = 'ambientMoodSettings';
const DEFAULTS = {
  soundEnabled: true,
  selectedSound: 'Rain',
  volume: 0.75,
  visualEnabled: true,
  reducedMotion: false,
  lastUsed: null,
  sessionCount: 0,
};

describe('SettingsController', () => {
  let settingsController;
  let mockLocalStorage;
  let originalConsoleError;
  let originalConsoleWarn;

  beforeEach(() => {
    mockLocalStorage = {
      getItem: jest.fn(() => null), // Default to no stored settings
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Suppress console messages during tests, but store original
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    console.error = jest.fn();
    console.warn = jest.fn();

    settingsController = new SettingsController();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Restore original console functions
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  test('constructor should load defaults if localStorage is empty', () => {
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(settingsController.getAll()).toEqual(DEFAULTS);
  });

  test('constructor should load settings from localStorage if available', () => {
    const storedSettings = { ...DEFAULTS, volume: 0.5, sessionCount: 5 };
    mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(storedSettings));
    const sc = new SettingsController(); // Re-initialize to trigger load
    expect(sc.getAll()).toEqual(storedSettings);
  });

  test('constructor should use defaults if localStorage parsing fails', () => {
    mockLocalStorage.getItem.mockReturnValueOnce('invalid json');
    const sc = new SettingsController();
    expect(sc.getAll()).toEqual(DEFAULTS);
    expect(console.error).toHaveBeenCalledWith(
        'SettingsController: Error loading settings from localStorage:',
        expect.any(SyntaxError) // Or whatever error JSON.parse throws for invalid
    );
  });

  test('get should return the correct setting value', () => {
    expect(settingsController.get('volume')).toBe(DEFAULTS.volume);
  });

  test('set should update a setting and save to localStorage', () => {
    settingsController.set('volume', 0.9);
    expect(settingsController.get('volume')).toBe(0.9);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify({ ...DEFAULTS, volume: 0.9 })
    );
  });

  test('set should not update unknown setting and warn', () => {
    settingsController.set('unknownKey', 'testValue');
    expect(settingsController.getAll()).toEqual(DEFAULTS); // No change
    // setItem should not be called if key is unknown
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('SettingsController: Attempted to set unknown setting "unknownKey".');
  });

  test('saveSettings should handle localStorage write errors', () => {
    mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
    });
    settingsController.set('volume', 1); // This calls saveSettings
    expect(console.error).toHaveBeenCalledWith(
        'SettingsController: Error saving settings to localStorage:',
        expect.any(Error)
    );
  });

  test('incrementSessionCount should increase sessionCount and update lastUsed', () => {
    const initialDate = new Date().toISOString();
    settingsController.incrementSessionCount();
    const settings = settingsController.getAll();
    expect(settings.sessionCount).toBe(1);
    expect(settings.lastUsed).not.toBeNull();
    // Check if lastUsed is a valid ISO date string and roughly current
    expect(new Date(settings.lastUsed).toISOString()).toBe(settings.lastUsed);
    expect(new Date(settings.lastUsed) >= new Date(initialDate)).toBe(true);

    settingsController.incrementSessionCount();
    expect(settingsController.get('sessionCount')).toBe(2);
  });

  test('isSoundEnabled, getSelectedSound, getVolume, isVisualEnabled, isReducedMotion should return correct values', () => {
    expect(settingsController.isSoundEnabled()).toBe(DEFAULTS.soundEnabled);
    expect(settingsController.getSelectedSound()).toBe(DEFAULTS.selectedSound);
    expect(settingsController.getVolume()).toBe(DEFAULTS.volume);
    expect(settingsController.isVisualEnabled()).toBe(DEFAULTS.visualEnabled);
    expect(settingsController.isReducedMotion()).toBe(DEFAULTS.reducedMotion);
  });
});
