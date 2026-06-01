import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  dim,
  errorLine,
  green,
  icons,
  printError,
  printSuccess,
  red,
  statusDot,
  successLine,
  warnLine,
  yellow,
} from '../../src/lib/ui.js'

describe('ui — color helpers (forced color)', () => {
  const prev = process.env.FORCE_COLOR
  beforeEach(() => {
    process.env.FORCE_COLOR = '1'
  })
  afterEach(() => {
    if (prev === undefined) delete process.env.FORCE_COLOR
    else process.env.FORCE_COLOR = prev
  })

  test('green/red/yellow/dim emit distinct ANSI styling', () => {
    expect(green('x')).toContain('x')
    expect(green('x')).not.toBe('x')
    expect(red('x')).not.toBe(green('x'))
    expect(yellow('x')).not.toBe(green('x'))
    expect(dim('x')).not.toBe('x')
  })

  test('statusDot uses green when logged in and red when not', () => {
    expect(statusDot(true)).toBe(green(icons.dot))
    expect(statusDot(false)).toBe(red(icons.dot))
    expect(statusDot(true)).not.toBe(statusDot(false))
  })
})

describe('ui — line builders', () => {
  test('successLine prefixes the success icon', () => {
    expect(successLine('done')).toBe(`${green(icons.success)} done`)
    expect(successLine('done')).toContain(icons.success)
    expect(successLine('done')).toContain('done')
  })

  test('errorLine prefixes the error icon', () => {
    expect(errorLine('nope')).toBe(`${red(icons.error)} nope`)
    expect(errorLine('nope')).toContain(icons.error)
  })

  test('warnLine prefixes the warn icon', () => {
    expect(warnLine('careful')).toBe(`${yellow(icons.warn)} careful`)
    expect(warnLine('careful')).toContain(icons.warn)
  })

  test('icons are the expected glyphs', () => {
    expect(icons).toEqual({ success: '✓', error: '✗', warn: '!', dot: '●' })
  })
})

describe('ui — print helpers', () => {
  test('printSuccess writes the success line to stdout', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    printSuccess('created')
    expect(log).toHaveBeenCalledWith(successLine('created'))
    log.mockRestore()
  })

  test('printError writes the error line to stderr', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    printError('boom')
    expect(err).toHaveBeenCalledWith(errorLine('boom'))
    err.mockRestore()
  })
})
