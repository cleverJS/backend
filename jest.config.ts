import type { Config } from '@jest/types'

export default async (): Promise<Config.InitialOptions> => {
  return {
    // extensionsToTreatAsEsm: ['.ts'],
    globals: {
      'ts-jest': {
        tsconfig: 'tsconfig.json',
      },
    },
    // transform: {},
    preset: 'ts-jest',
    // preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    // testEnvironment: 'jest-environment-node',
    verbose: true,
    testMatch: ['**/*.spec.ts'],
    testPathIgnorePatterns: [
      '<rootDir>/node_modules/',
      '<rootDir>/build/',
      '<rootDir>/tmp/',
      '<rootDir>/core/',
      '<rootDir>/app/',
      '<rootDir>/runtime/',
    ],
    setupFiles: ['dotenv/config'],
    moduleDirectories: ['node_modules', 'core'],
    moduleFileExtensions: ['js', 'ts', 'json'],
    coverageDirectory: './runtime/coverage',
    setupFilesAfterEnv: ['<rootDir>/tests/setup/GlobalSetup.ts'],
  }
}
