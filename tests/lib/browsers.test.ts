import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { ensureBrowserWrapper, resolveBrowser } from '../../src/lib/browsers.js'
import { cleanupTempDir, createTempCcmHome, type TempCcmHome } from '../helpers.js'

let tmp: TempCcmHome
let browsersDir: string

beforeEach(() => {
  tmp = createTempCcmHome()
  browsersDir = join(tmp.ccmHome, 'browsers')
})
afterEach(() => {
  cleanupTempDir(tmp.ccmHome)
})

describe('ensureBrowserWrapper', () => {
  test('returns simple path as-is when no spaces', () => {
    const result = ensureBrowserWrapper('work', '/usr/bin/firefox', browsersDir)
    expect(result).toBe('/usr/bin/firefox')
    expect(existsSync(browsersDir)).toBe(false)
  })

  test('creates wrapper script when command has spaces', () => {
    const result = ensureBrowserWrapper('work', '/usr/bin/firefox --profile x', browsersDir)
    expect(result).toBe(join(browsersDir, 'work.sh'))
    expect(existsSync(result)).toBe(true)
  })

  test('script has correct shebang and exec content', () => {
    ensureBrowserWrapper('dev', 'open -a "Google Chrome"', browsersDir)
    const content = readFileSync(join(browsersDir, 'dev.sh'), 'utf-8')
    expect(content).toBe('#!/bin/sh\nexec open -a "Google Chrome" "$@"\n')
  })

  test('script is executable', () => {
    ensureBrowserWrapper('dev', 'open -a Chrome', browsersDir)
    const mode = statSync(join(browsersDir, 'dev.sh')).mode
    // 0o755 = owner rwx, group rx, others rx
    expect(mode & 0o755).toBe(0o755)
  })

  test('creates browsers directory if missing', () => {
    expect(existsSync(browsersDir)).toBe(false)
    ensureBrowserWrapper('p', 'cmd --flag', browsersDir)
    expect(existsSync(browsersDir)).toBe(true)
  })

  test('overwrites existing wrapper for same profile', () => {
    ensureBrowserWrapper('work', 'cmd --old', browsersDir)
    ensureBrowserWrapper('work', 'cmd --new', browsersDir)
    const content = readFileSync(join(browsersDir, 'work.sh'), 'utf-8')
    expect(content).toContain('cmd --new')
    expect(content).not.toContain('cmd --old')
  })
})

describe('resolveBrowser', () => {
  test('returns cliOverride when provided', () => {
    expect(resolveBrowser('firefox')).toBe('firefox')
  })

  test('returns meta.browser when no cliOverride', () => {
    const meta = { name: 'work', browser: 'chrome', createdAt: '2026-01-01' }
    expect(resolveBrowser(undefined, meta)).toBe('chrome')
  })

  test('cliOverride takes precedence over meta.browser', () => {
    const meta = { name: 'work', browser: 'chrome', createdAt: '2026-01-01' }
    expect(resolveBrowser('firefox', meta)).toBe('firefox')
  })

  test('returns undefined when neither is provided', () => {
    expect(resolveBrowser()).toBeUndefined()
  })

  test('returns undefined when meta has no browser field', () => {
    const meta = { name: 'work', createdAt: '2026-01-01' }
    expect(resolveBrowser(undefined, meta)).toBeUndefined()
  })
})
