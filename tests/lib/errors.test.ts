import { describe, expect, test } from 'vitest'
import { formatError } from '../../src/lib/errors.js'

describe('formatError', () => {
  test('returns the message for Error instances', () => {
    expect(formatError(new Error('boom'))).toBe('boom')
  })

  test('stringifies non-Error values', () => {
    expect(formatError('plain string')).toBe('plain string')
    expect(formatError(42)).toBe('42')
    expect(formatError({ toString: () => 'obj' })).toBe('obj')
  })
})
