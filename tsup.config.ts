import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsup'

const { version } = JSON.parse(readFileSync('package.json', 'utf-8'))

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  treeshake: true,
  banner: { js: '#!/usr/bin/env node' },
  define: { __PKG_VERSION__: JSON.stringify(version) },
})
