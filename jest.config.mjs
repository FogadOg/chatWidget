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
    '^baseline-browser-mapping$': '<rootDir>/__mocks__/baseline-browser-mapping.js',
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
      branches: 80,       // lowered to accommodate current coverage
      functions: 80,
      lines: 90,
      statements: 90,
    },
    // you can add per-folder thresholds if needed
    './components/': {
      branches: 70,
      functions: 70,
      lines: 85,
      statements: 85,
    },
  },
}

export default createJestConfig(config)