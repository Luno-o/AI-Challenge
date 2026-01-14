module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.{js,jsx}'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  testTimeout: 30000,
};
