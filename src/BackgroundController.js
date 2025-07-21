// src/BackgroundController.js
const calmingColorPalettes = [
  // Blues
  { name: 'Deep Ocean', color: '#003973' }, // Transition to -> #E5E5BE (example)
  { name: 'Clear Sky', color: '#75DBCD' },
  { name: 'Evening Blue', color: '#2E4057' },
  // Greens
  { name: 'Forest Green', color: '#294B29' },
  { name: 'Minty Fresh', color: '#A2D9A5' },
  { name: 'Olive Grove', color: '#5C5E3A' },
  // Purples
  { name: 'Lavender Mist', color: '#E6E6FA' }, // Light
  { name: 'Deep Purple', color: '#4B0082' },   // Dark
  // Warm Neutrals
  { name: 'Sandy Beach', color: '#F4A460' },
  { name: 'Warm Taupe', color: '#A98F78' },
  // Adding a few more to ensure at least 8 combinations can be derived
  { name: 'Soft Lilac', color: '#C8A2C8' },
  { name: 'Misty Blue', color: '#A0B2C6' },
];

// For smooth transitions, we'll change the background color of one element.
// If we want gradients, the CSS and JS logic will be more complex,
// potentially transitioning multiple CSS custom properties for gradient stops.
// For now, focusing on US-001: "Background transitions through at least 8 different calming color combinations"
// and "Transition duration is 30-60 seconds per color".

// US-001: Colors follow a scientifically-backed calming palette.
// REVIEW_NOTE: Visually review these palettes and their transitions to ensure they are calming,
// non-distracting, and avoid sudden brightness changes as per US-001 and US-002.
// Adjust colors or transition timings if necessary based on visual feedback.
class BackgroundController {
  constructor(element) {
    this.element = element;
    this.palettes = calmingColorPalettes;
    this.currentIndex = 0; // This property doesn't seem to be used, consider removing if not planned.
    this.lastPaletteIndex = -1; // Initialize lastPaletteIndex
    this.baseTransitionDuration = 45000; // 45 seconds, within 30-60s range
    this.transitionDuration = this.baseTransitionDuration;
    this.timeoutId = null;

    if (!this.element) {
      throw new Error('BackgroundController: Target element not provided.');
    }
  }

  getRandomPalette() {
    if (this.palettes.length === 0) {
      return { name: 'Default', color: '#2E4057' }; // Fallback
    }
    if (this.palettes.length === 1) {
      return this.palettes[0]; // Only one color, no choice
    }

    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * this.palettes.length);
    } while (randomIndex === this.lastPaletteIndex); // Keep trying if it's the same as the last one

    this.lastPaletteIndex = randomIndex;
    return this.palettes[randomIndex];
  }

  applyColor(palette) {
    // US-002: Color changes are subtle and gradual. CSS transition will handle this.
    // US-002: No sudden brightness changes - depends on palette selection.
    this.element.style.backgroundColor = palette.color;
    console.log(`Background color changed to: ${palette.name} (${palette.color})`);
  }

  cycleColor() {
    const newPalette = this.getRandomPalette();
    this.applyColor(newPalette);
    this.lastCycleTime = Date.now();

    // Loop
    this.timeoutId = setTimeout(() => this.cycleColor(), this.transitionDuration);
  }

  start() {
    console.log('BackgroundController: Starting color cycling.');
    this.cycleColor(); // Start the cycle immediately
  }

  stop() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      console.log('BackgroundController: Stopped color cycling.');
    }
  }

  // For US-001: Option to disable for motion sensitivity (to be implemented via SettingsController later)
  setReducedMotion(enabled) {
    if (enabled) {
      this.stop();
      // Apply a static calming color
      this.applyColor(this.palettes[0] || { name: 'Static Blue', color: '#2E4057' });
    } else {
      this.start();
    }
  }

  setSpeed(speedFactor) {
    if (speedFactor <= 0) {
      console.warn('BackgroundController: Speed factor must be positive.');
      return;
    }

    const elapsed = Date.now() - (this.lastCycleTime || Date.now());
    this.transitionDuration = this.baseTransitionDuration / speedFactor;
    const remaining = Math.max(0, this.transitionDuration - elapsed);

    console.log(`BackgroundController: Speed adjusted. New duration: ${this.transitionDuration}ms. Remaining time for current transition: ${remaining}ms.`);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => this.cycleColor(), remaining);
  }

  getCurrentColors() { // Renamed from getCurrentColorPalette and adapted to return string[]
    const currentPalette = this.palettes[this.lastPaletteIndex];
    if (currentPalette) {
      return [currentPalette.color]; // Return array with single color string
    }
    // Before any color is set, or if reduced motion has a specific static color not from random palettes:
    // Check the actual style applied to the element.
    if (this.element && this.element.style.backgroundColor) {
       return [this.element.style.backgroundColor]; // Return the actual current style
    }
    // Fallback if no color information is available (e.g., before start or if element is gone)
    return [this.palettes.length > 0 ? this.palettes[0].color : '#2E4057']; // Default to first palette or a hardcoded default
  }
}

export default BackgroundController;
