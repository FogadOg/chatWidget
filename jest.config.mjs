import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Ignore specific files from test runs
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
  ],

  // Ignore specific files from coverage reports
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
  ],
}

export default createJestConfig(config)