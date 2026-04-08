/** @type {import('@stryker-mutator/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  plugins: ['@stryker-mutator/vitest-runner', '@stryker-mutator/typescript-checker'],
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  mutate: [
    'src/commands/compliance.ts',
    'src/commands/create.ts',
    'src/lib/browsers.ts',
    'src/lib/claude.ts',
    'src/lib/compliance.ts',
    'src/lib/config.ts',
    'src/lib/profile-store.ts',
    'src/lib/profiles.ts',
  ],
  ignorePatterns: ['dist', 'coverage', '.stryker-tmp'],
  reporters: ['progress', 'html', 'clear-text', 'dashboard'],
  htmlReporter: {
    fileName: 'mutation-report/index.html',
  },
  thresholds: {
    high: 80,
    low: 60,
    break: 60,
  },
  concurrency: 2,
  timeoutMS: 10000,
  timeoutFactor: 1.5,
  disableTypeChecks: '{tests,node_modules}/**/*.{ts,js}',
}
