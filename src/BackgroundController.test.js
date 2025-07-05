// src/BackgroundController.test.js
import BackgroundController from './BackgroundController';

describe('BackgroundController', () => {
  let backgroundController;
  let mockElement;
  let originalConsoleWarn;

  beforeEach(() => {
    mockElement = {
      style: {
        backgroundColor: '',
      },
    };
    backgroundController = new BackgroundController(mockElement);
    jest.useFakeTimers(); // Use Jest's fake timers

    originalConsoleWarn = console.warn;
    console.warn = jest.fn(); // Suppress console.warn
  });

  afterEach(() => {
    jest.clearAllTimers(); // Clear all timers
    console.warn = originalConsoleWarn; // Restore console.warn
  });

  test('constructor initializes properties correctly', () => {
    expect(backgroundController.element).toBe(mockElement);
    expect(backgroundController.palettes).toBeInstanceOf(Array);
    expect(backgroundController.baseTransitionDuration).toBe(45000);
    expect(backgroundController.transitionDuration).toBe(45000);
    expect(backgroundController.timeoutId).toBeNull();
  });

  test('start should initiate color cycling', () => {
    backgroundController.cycleColor = jest.fn(); // Mock cycleColor
    backgroundController.start();
    expect(backgroundController.cycleColor).toHaveBeenCalledTimes(1);
  });

  test('stop should clear the timeout', () => {
    backgroundController.timeoutId = setTimeout(() => {}, 1000); // Set a dummy timeout
    backgroundController.stop();
    expect(clearTimeout).toHaveBeenCalledWith(backgroundController.timeoutId);
    expect(backgroundController.timeoutId).toBeNull();
  });

  test('cycleColor should apply a new color and set a timeout for the next cycle', () => {
    backgroundController.applyColor = jest.fn();
    backgroundController.getRandomPalette = jest.fn().mockReturnValue({ name: 'Test', color: '#FFFFFF' });

    backgroundController.cycleColor();

    expect(backgroundController.getRandomPalette).toHaveBeenCalledTimes(1);
    expect(backgroundController.applyColor).toHaveBeenCalledWith({ name: 'Test', color: '#FFFFFF' });
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), backgroundController.transitionDuration);
  });

  test('applyColor should set the background color of the element', () => {
    const palette = { name: 'Test Blue', color: 'rgb(0, 0, 255)' };
    backgroundController.applyColor(palette);
    expect(mockElement.style.backgroundColor).toBe('rgb(0, 0, 255)');
  });

  describe('setReducedMotion', () => {
    beforeEach(() => {
      backgroundController.stop = jest.fn();
      backgroundController.start = jest.fn();
      backgroundController.applyColor = jest.fn();
    });

    test('should stop animation and apply static color when enabled is true', () => {
      backgroundController.setReducedMotion(true);
      expect(backgroundController.stop).toHaveBeenCalled();
      expect(backgroundController.applyColor).toHaveBeenCalledWith(
        backgroundController.palettes[0] || { name: 'Static Blue', color: '#2E4057' }
      );
      expect(backgroundController.start).not.toHaveBeenCalled();
    });

    test('should start animation when enabled is false', () => {
      backgroundController.setReducedMotion(false);
      expect(backgroundController.start).toHaveBeenCalled();
      expect(backgroundController.stop).not.toHaveBeenCalled(); // Stop is not called directly here
    });
  });

  describe('setSpeed', () => {
    beforeEach(() => {
      // Ensure start/stop can be spied on for setSpeed's restart logic
      backgroundController.stop = jest.fn();
      backgroundController.start = jest.fn();
    });

    test('should update transitionDuration based on speedFactor', () => {
      backgroundController.setSpeed(2); // Double speed
      expect(backgroundController.transitionDuration).toBe(backgroundController.baseTransitionDuration / 2);
    });

    test('should not accept non-positive speedFactor and warn', () => {
      backgroundController.setSpeed(0);
      expect(console.warn).toHaveBeenCalledWith('BackgroundController: Speed factor must be positive.');
      expect(backgroundController.transitionDuration).toBe(backgroundController.baseTransitionDuration); // Should not change

      backgroundController.setSpeed(-1);
      expect(console.warn).toHaveBeenCalledWith('BackgroundController: Speed factor must be positive.');
      expect(backgroundController.transitionDuration).toBe(backgroundController.baseTransitionDuration);
    });

    test('should restart cycling if already in progress', () => {
      backgroundController.timeoutId = 123; // Simulate active timeout
      backgroundController.setSpeed(1.5);
      expect(backgroundController.stop).toHaveBeenCalled();
      expect(backgroundController.start).toHaveBeenCalled();
    });

    test('should not restart cycling if not in progress', () => {
      backgroundController.timeoutId = null; // Simulate no active timeout
      backgroundController.setSpeed(1.5);
      expect(backgroundController.stop).not.toHaveBeenCalled();
      expect(backgroundController.start).not.toHaveBeenCalled();
    });
  });

  describe('getRandomPalette', () => {
    test('should return a different palette than the last one if possible', () => {
        const initialPalette = backgroundController.getRandomPalette();
        backgroundController.lastPaletteIndex = backgroundController.palettes.findIndex(p => p.color === initialPalette.color);

        let differentFound = false;
        // Try a few times to ensure it's not just luck with a small palette
        for (let i = 0; i < 20; i++) {
            const nextPalette = backgroundController.getRandomPalette();
            expect(nextPalette).toBeDefined();
            if (nextPalette.color !== initialPalette.color) {
                differentFound = true;
                break;
            }
        }
        if (backgroundController.palettes.length > 1) {
            expect(differentFound).toBe(true);
        } else {
            // If only one palette, it should always return that one
            const nextPalette = backgroundController.getRandomPalette();
            expect(nextPalette.color).toBe(initialPalette.color);
        }
    });

    test('should handle palette with only one color', () => {
        backgroundController.palettes = [{ name: 'Single', color: '#111111'}];
        backgroundController.lastPaletteIndex = -1;
        const palette = backgroundController.getRandomPalette();
        expect(palette.color).toBe('#111111');
        const nextPalette = backgroundController.getRandomPalette(); // Call again
        expect(nextPalette.color).toBe('#111111'); // Should still be the same
    });
  });

  describe('getCurrentColors', () => {
    test('should return current applied color from lastPaletteIndex if set', () => {
      // Simulate a color has been applied
      backgroundController.lastPaletteIndex = 0;
      const expectedColor = backgroundController.palettes[0].color;
      expect(backgroundController.getCurrentColors()).toEqual([expectedColor]);
    });

    test('should return element style backgroundColor if lastPaletteIndex is -1 but style is set', () => {
      backgroundController.lastPaletteIndex = -1;
      mockElement.style.backgroundColor = 'rgb(10, 20, 30)';
      expect(backgroundController.getCurrentColors()).toEqual(['rgb(10, 20, 30)']);
    });

    test('should return default if no color is set and element style is also not set', () => {
      backgroundController.lastPaletteIndex = -1;
      mockElement.style.backgroundColor = ''; // No direct style
      const defaultExpectedColor = backgroundController.palettes.length > 0 ? backgroundController.palettes[0].color : '#2E4057';
      expect(backgroundController.getCurrentColors()).toEqual([defaultExpectedColor]);
    });

    test('should return default fallback if palettes array is empty', () => {
        backgroundController.palettes = [];
        backgroundController.lastPaletteIndex = -1;
        mockElement.style.backgroundColor = '';
        expect(backgroundController.getCurrentColors()).toEqual(['#2E4057']);
    });
  });
});
