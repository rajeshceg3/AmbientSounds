module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    'jest/globals': true,
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['prettier', 'jest'],
  rules: {
    'prettier/prettier': 'error',
    // Add any project-specific ESLint rules here
  },
  ignorePatterns: ['dist', 'node_modules', 'cypress/reports', 'cypress/screenshots', 'cypress/videos'],
};
