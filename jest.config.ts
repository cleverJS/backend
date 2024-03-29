import type { Config } from '@jest/types'

export default async (): Promise<Config.InitialOptions> => {
  return {
    // extensionsToTreatAsEsm: ['.ts'],
    // globals: {
    //   'ts-jest': {
    //     tsconfig: 'tsconfig.json',
    //   },
    // },
    transform: {
      '^.+\\.(ts)$': ['ts-jest', { tsconfig: './tsconfig.json' }],
    },
    preset: 'ts-jest',
    // preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    // testEnvironment: 'jest-environment-node',
    verbose: true,
    testMatch: ['**/*.spec.ts'],
    // modulePathIgnorePatterns: ["directoryNameToIgnore"]
    testPathIgnorePatterns: [
      '<rootDir>/tests/db/elasticsearch/',
      '<rootDir>/tests/demo/modules/article/index/',
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
    setupFilesAfterEnv: ['jest-extended/all', '<rootDir>/tests/setup/GlobalSetup.ts'],
  }
}
