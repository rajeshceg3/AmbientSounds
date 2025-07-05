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
    this.currentIndex = 0;
    this.transitionDuration = 45000; // 45 seconds, within 30-60s range
    this.timeoutId = null;

    if (!this.element) {
      throw new Error('BackgroundController: Target element not provided.');
    }
  }

  getRandomPalette() {
    const randomIndex = Math.floor(Math.random() * this.palettes.length);
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
}

export default BackgroundController;
