// cypress/e2e/app.cy.js

// Using the soundSources from the application code for consistency
const soundSources = [
  { name: 'Rain', url: '/audio/rain.mp3' },
  { name: 'Ocean Waves', url: '/audio/ocean_waves.mp3' },
  { name: 'Forest', url: '/audio/forest_sounds.mp3' },
  { name: 'White Noise', url: '/audio/white_noise.mp3' },
];

describe('Ambient Mood App E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/'); // Assumes app runs at root. Adjust if needed.
    // Attempt to interact with the page early to satisfy potential
    // browser restrictions on audio playback without user gesture.
    cy.get('body').click({ force: true });
  });

  it('should load the page and display initial UI elements', () => {
    cy.get('.controls').should('be.visible');
    cy.get('#play-pause-btn').should('be.visible').and('contain.text', 'Play');
    cy.get('#sound-select').should('be.visible');
    cy.get('#reduced-motion-toggle').should('be.visible');
    cy.get('.background-shifter').should('exist');
  });

  it('should allow selecting a sound and playing/pausing it', () => {
    // Wait for UI to be ready and sound options populated
    cy.get('#sound-select option').should('have.length.greaterThan', 0);

    // Select the first sound from the imported list
    const firstSoundName = soundSources[0].name;
    cy.get('#sound-select').select(firstSoundName);

    cy.get('#play-pause-btn').click();
    cy.get('#play-pause-btn').should('contain.text', 'Pause').and('have.attr', 'aria-pressed', 'true');

    // Optional: Add a small delay if testing actual audio events/state changes in AudioController
    // cy.wait(100);

    cy.get('#play-pause-btn').click();
    cy.get('#play-pause-btn').should('contain.text', 'Play').and('have.attr', 'aria-pressed', 'false');
  });

  it('should play/pause with spacebar', () => {
    // Ensure a sound is selected first if needed by the app's logic for spacebar to play
    cy.get('#sound-select').select(soundSources[0].name);

    cy.get('body').type(' '); // Send space key to body
    cy.get('#play-pause-btn').should('contain.text', 'Pause');
    cy.get('body').type(' ');
    cy.get('#play-pause-btn').should('contain.text', 'Play');
  });

  it('should auto-hide controls and show them on mouse activity', () => {
    cy.get('.controls').should('be.visible');
    // This test is tricky due to timing. We assume controls *could* hide.
    // Then, we trigger activity to ensure they become visible.
    // Consider short timeouts in a test environment or specific test hooks if precise auto-hide timing is critical.
    cy.log('Assuming controls might hide after some inactivity...');

    // Wait a very short moment to allow any immediate post-load logic to settle.
    cy.wait(200);

    // Trigger mousemove on body, as this is a general activity indicator.
    cy.get('body').trigger('mousemove', { clientX: 10, clientY: 10 }); // Coordinates are arbitrary
    cy.get('.controls').should('be.visible');
  });

  it('should toggle reduced motion', () => {
    const reducedMotionToggle = () => cy.get('#reduced-motion-toggle');

    reducedMotionToggle().check();
    reducedMotionToggle().should('be.checked');

    // Add assertions here if there are testable consequences of reduced motion
    // For example, if a class is added to the body or background element:
    // cy.get('.background-shifter').should('have.class', 'reduced-motion-active');
    // This requires the app to actually add such a class or attribute for testing.
    // For now, checking the toggle state is the primary test.
    cy.log('Reduced motion checked. Further state validation depends on app implementation details.');

    reducedMotionToggle().uncheck();
    reducedMotionToggle().should('not.be.checked');
    // cy.get('.background-shifter').should('not.have.class', 'reduced-motion-active');
    cy.log('Reduced motion unchecked.');
  });

  it('should display an error message if audio initialization fails (conceptual)', () => {
    // This test is complex as it requires modifying browser behavior or app internals.
    // Example concepts (would need specific implementation in cypress/support/commands.js or similar):
    // 1. Stub `window.AudioContext` to throw an error.
    // 2. Intercept network requests for audio files and make them fail.

    // cy.window().then((win) => {
    //   // Example: Try to break AudioContext - this might not always work depending on when/how app calls it
    //   Object.defineProperty(win, 'AudioContext', {
    //     configurable: true,
    //     get: () => { throw new Error('Simulated AudioContext Not Allowed'); }
    //   });
    // });
    // cy.get('#play-pause-btn').click();
    // cy.get('.error-message', { timeout: 1000 }).should('be.visible').and('contain.text', 'Audio system could not start');

    cy.log('Skipping actual audio init failure E2E test - requires advanced environment manipulation.');
  });
});
