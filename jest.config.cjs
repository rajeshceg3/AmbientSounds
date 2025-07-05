// jest.config.cjs
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'], // For DOM matchers
  // If main.js or other files use CSS imports that Jest can't handle:
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mocks CSS imports
  },
  resetModules: true, // Ensure modules are reset between tests, good for main.js testing
};
