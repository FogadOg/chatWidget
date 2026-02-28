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
    '^lib/(.*)$': '<rootDir>/lib/$1',
    '^types/(.*)$': '<rootDir>/types/$1',
    '^components/(.*)$': '<rootDir>/components/$1',
    '^hooks/(.*)$': '<rootDir>/hooks/$1',
  },

  // Ignore specific files from test runs
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
  ],

  // Ignore specific files from coverage reports
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // you can add per-folder thresholds if needed
    './components/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
}

export default createJestConfig(config)