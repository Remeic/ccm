/** @type {import('@stryker-mutator/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  plugins: ['@stryker-mutator/vitest-runner', '@stryker-mutator/typescript-checker'],
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  mutate: ['src/lib/config.ts', 'src/lib/profiles.ts', 'src/lib/claude.ts'],
  ignorePatterns: ['dist', 'coverage', '.stryker-tmp'],
  reporters: ['progress', 'html', 'clear-text'],
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
