import { beforeEach, describe, expect, test, vi } from 'vitest'
import { runAction } from '../../src/lib/run-action.js'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(process, 'exit').mockImplementation(code => {
    throw new Error(`exit:${code}`)
  })
})

describe('runAction', () => {
  test('runs a synchronous action and returns undefined on success', () => {
    const fn = vi.fn()
    const wrapped = runAction(fn)
    expect(wrapped('a', 'b')).toBeUndefined()
    expect(fn).toHaveBeenCalledWith('a', 'b')
  })

  test('awaits an async action and resolves on success', async () => {
    const fn = vi.fn(async () => {})
    const wrapped = runAction(fn)
    await expect(wrapped()).resolves.toBeUndefined()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('handles a synchronous throw: prints error and exits 1', () => {
    const err = vi.spyOn(console, 'error')
    const wrapped = runAction(() => {
      throw new Error('sync boom')
    })
    expect(() => wrapped()).toThrow('exit:1')
    expect(err).toHaveBeenCalledWith(expect.stringContaining('sync boom'))
  })

  test('handles an async rejection: prints error and exits 1', async () => {
    const err = vi.spyOn(console, 'error')
    const wrapped = runAction(async () => {
      throw new Error('async boom')
    })
    await expect(wrapped()).rejects.toThrow('exit:1')
    expect(err).toHaveBeenCalledWith(expect.stringContaining('async boom'))
  })

  test('formats non-Error throws', () => {
    const err = vi.spyOn(console, 'error')
    const wrapped = runAction(() => {
      throw 'string failure'
    })
    expect(() => wrapped()).toThrow('exit:1')
    expect(err).toHaveBeenCalledWith(expect.stringContaining('string failure'))
  })

  test('exits with exactly code 1', () => {
    const exit = vi.spyOn(process, 'exit')
    const wrapped = runAction(() => {
      throw new Error('x')
    })
    expect(() => wrapped()).toThrow()
    expect(exit).toHaveBeenCalledWith(1)
  })
})
