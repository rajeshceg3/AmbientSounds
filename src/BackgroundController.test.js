// src/BackgroundController.test.js
import BackgroundController from './BackgroundController';

// Mocking setTimeout and clearTimeout for precise timer control in tests
jest.useFakeTimers();

describe('BackgroundController', () => {
  let mockElement;
  let controller;

  beforeEach(() => {
    // Create a mock DOM element for the controller to manipulate
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement); // Mock element needs to be in DOM for some style checks
    controller = new BackgroundController(mockElement);
  });

  afterEach(() => {
    controller.stop(); // Ensure any running timers are stopped
    document.body.removeChild(mockElement); // Clean up mock element
    jest.clearAllTimers(); // Clear all Jest timers
  });

  test('should initialize with a target element and palettes', () => {
    expect(controller.element).toBe(mockElement);
    expect(controller.palettes.length).toBeGreaterThan(0);
    expect(controller.transitionDuration).toBe(45000); // Default as set in controller
  });

  test('should throw an error if no element is provided', () => {
    expect(() => new BackgroundController(null)).toThrow('BackgroundController: Target element not provided.');
  });

  test('getRandomPalette should return a palette from the predefined list', () => {
    const palette = controller.getRandomPalette();
    expect(controller.palettes).toContain(palette);
  });

  test('applyColor should set the background color of the element', () => {
    const testPalette = { name: 'Test Color', color: 'rgb(0, 0, 255)' }; // Use rgb for easier comparison
    controller.applyColor(testPalette);
    expect(mockElement.style.backgroundColor).toBe(testPalette.color);
  });

  test('start should initiate color cycling and apply a color immediately', () => {
    const initialColor = mockElement.style.backgroundColor;
    controller.start();
    // The first color change happens synchronously within start() via cycleColor()
    expect(mockElement.style.backgroundColor).not.toBe(initialColor); // Color should have changed
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), controller.transitionDuration);
  });

  test('cycleColor should apply a new color and set a timeout for the next cycle', () => {
    const initialColor = mockElement.style.backgroundColor;
    controller.cycleColor(); // Call directly to test its isolated behavior

    expect(mockElement.style.backgroundColor).not.toBe(initialColor);
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), controller.transitionDuration);
  });

  test('stop should clear the timeout and stop color cycling', () => {
    controller.start(); // Start to set up a timeout
    expect(setTimeout).toHaveBeenCalledTimes(1);

    controller.stop();
    expect(clearTimeout).toHaveBeenCalledTimes(1);
    expect(controller.timeoutId).toBeNull();

    // Fast-forward time to see if cycleColor is called again (it shouldn't be)
    const currentColor = mockElement.style.backgroundColor;
    jest.advanceTimersByTime(controller.transitionDuration + 1000);
    expect(mockElement.style.backgroundColor).toBe(currentColor); // Color should not change
  });

  test('setReducedMotion(true) should stop cycling and apply a static color', () => {
    controller.start(); // Start cycling
    const initialColor = mockElement.style.backgroundColor;

    controller.setReducedMotion(true);
    expect(controller.timeoutId).toBeNull(); // Cycle should be stopped
    expect(clearTimeout).toHaveBeenCalled();
    // It should apply the first palette color or a default
    expect(mockElement.style.backgroundColor).toBe(controller.palettes[0].color);

    // Ensure no further changes
    jest.advanceTimersByTime(controller.transitionDuration + 1000);
    expect(mockElement.style.backgroundColor).toBe(controller.palettes[0].color);
  });

  test('setReducedMotion(false) should restart cycling if it was stopped', () => {
    controller.setReducedMotion(true); // Stop it first
    const staticColor = mockElement.style.backgroundColor;

    controller.setReducedMotion(false); // Restart
    // Should apply a new color immediately and set a timer
    expect(mockElement.style.backgroundColor).not.toBe(staticColor);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), controller.transitionDuration);
  });

  test('changing color should happen after transitionDuration', () => {
    controller.start();
    const firstColor = mockElement.style.backgroundColor;

    // Fast-forward time by less than the transition duration
    jest.advanceTimersByTime(controller.transitionDuration - 1000);
    expect(mockElement.style.backgroundColor).toBe(firstColor); // Color should not have changed yet

    // Fast-forward time past the transition duration
    jest.advanceTimersByTime(2000); // Advance slightly more to trigger the timeout
    expect(mockElement.style.backgroundColor).not.toBe(firstColor); // Color should have changed
    expect(setTimeout).toHaveBeenCalledTimes(2); // Initial + one cycle
  });
});
