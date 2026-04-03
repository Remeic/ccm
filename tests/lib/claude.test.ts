import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
  spawn: vi.fn(),
}))

import { execFileSync, spawn } from 'node:child_process'
import { findClaudeBinary, getAuthStatus, spawnClaude } from '../../src/lib/claude.js'

const mockExecFileSync = vi.mocked(execFileSync)
const mockSpawn = vi.mocked(spawn)

function createFakeChild(): ChildProcess & { stdout: Readable } {
  const emitter = new EventEmitter()
  const stdout = new Readable({ read() {} })
  return Object.assign(emitter, {
    stdout,
    stderr: null,
    stdin: null,
    stdio: [null, stdout, null] as const,
    pid: 1234,
    connected: false,
    exitCode: null,
    signalCode: null,
    spawnargs: [],
    spawnfile: '',
    killed: false,
    kill: vi.fn(() => true),
    send: vi.fn(),
    disconnect: vi.fn(),
    unref: vi.fn(),
    ref: vi.fn(),
    [Symbol.dispose]: vi.fn(),
  }) as unknown as ChildProcess & { stdout: Readable }
}

beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(() => {
  delete process.env.CLAUDE_BIN
})

describe('findClaudeBinary', () => {
  test('returns path when claude binary is found in PATH', () => {
    mockExecFileSync.mockReturnValue('  /usr/local/bin/claude  \n')
    expect(findClaudeBinary()).toBe('/usr/local/bin/claude')
    expect(mockExecFileSync).toHaveBeenCalledWith('which', ['claude'], expect.anything())
  })

  test('throws when claude binary is not found', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('not found')
    })
    expect(() => findClaudeBinary()).toThrow(
      'Claude Code not found. Install: npm i -g @anthropic-ai/claude-code',
    )
  })

  test('throws when execFileSync returns empty string', () => {
    mockExecFileSync.mockReturnValue('  \n')
    expect(() => findClaudeBinary()).toThrow('Claude Code not found')
  })

  test('returns custom path when CLAUDE_BIN env is set', () => {
    process.env.CLAUDE_BIN = '/custom/claude'
    expect(findClaudeBinary()).toBe('/custom/claude')
    expect(mockExecFileSync).not.toHaveBeenCalled()
  })

  test('uses "where" command on win32 platform', () => {
    // biome-ignore lint/style/noNonNullAssertion: platform always exists on process
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!
    Object.defineProperty(process, 'platform', { value: 'win32' })
    mockExecFileSync.mockReturnValue('C:\\Program Files\\claude.exe\n')

    expect(findClaudeBinary()).toBe('C:\\Program Files\\claude.exe')
    expect(mockExecFileSync).toHaveBeenCalledWith('where', ['claude'], expect.anything())

    Object.defineProperty(process, 'platform', originalPlatform)
  })
})

describe('spawnClaude', () => {
  test('spawns claude with correct CLAUDE_CONFIG_DIR env var', () => {
    mockExecFileSync.mockReturnValue('/usr/local/bin/claude\n')
    const fakeChild = createFakeChild()
    mockSpawn.mockReturnValue(fakeChild)

    spawnClaude('/tmp/profile', ['--model', 'opus'])

    expect(mockSpawn).toHaveBeenCalledWith(
      '/usr/local/bin/claude',
      ['--model', 'opus'],
      expect.objectContaining({
        env: expect.objectContaining({ CLAUDE_CONFIG_DIR: '/tmp/profile' }),
        stdio: 'inherit',
      }),
    )
  })

  test('passes through additional arguments', () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    mockSpawn.mockReturnValue(createFakeChild())

    spawnClaude('/dir', ['auth', 'login', '--console'])

    expect(mockSpawn).toHaveBeenCalledWith(
      '/bin/claude',
      ['auth', 'login', '--console'],
      expect.anything(),
    )
  })

  test('inherits stdio by default', () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    mockSpawn.mockReturnValue(createFakeChild())

    spawnClaude('/dir', [])

    expect(mockSpawn).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ stdio: 'inherit' }),
    )
  })

  test('does not override other env vars', () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    mockSpawn.mockReturnValue(createFakeChild())
    process.env.MY_VAR = 'keep'

    spawnClaude('/dir', [])

    const envArg = mockSpawn.mock.calls[0]?.[2] as { env: Record<string, string> }
    expect(envArg.env.MY_VAR).toBe('keep')
    expect(envArg.env.CLAUDE_CONFIG_DIR).toBe('/dir')
    delete process.env.MY_VAR
  })

  test('returns child process reference', () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    const fakeChild = createFakeChild()
    mockSpawn.mockReturnValue(fakeChild)

    const result = spawnClaude('/dir', [])
    expect(result).toBe(fakeChild)
  })

  test('handles spawn ENOENT error (binary not found)', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('not found')
    })
    expect(() => spawnClaude('/dir', [])).toThrow('Claude Code not found')
  })

  test('sets BROWSER env var when opts.browser is provided', () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    mockSpawn.mockReturnValue(createFakeChild())

    spawnClaude('/dir', ['auth', 'login'], { browser: '/usr/bin/firefox' })

    const envArg = mockSpawn.mock.calls[0]?.[2] as { env: Record<string, string> }
    expect(envArg.env.BROWSER).toBe('/usr/bin/firefox')
  })

  test('does not set BROWSER when opts is undefined', () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    mockSpawn.mockReturnValue(createFakeChild())

    spawnClaude('/dir', ['auth', 'login'])

    const envArg = mockSpawn.mock.calls[0]?.[2] as { env: Record<string, string | undefined> }
    expect(envArg.env.BROWSER).toBeUndefined()
  })

  test('does not set BROWSER when opts.browser is undefined', () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    mockSpawn.mockReturnValue(createFakeChild())

    spawnClaude('/dir', ['auth', 'login'], { browser: undefined })

    const envArg = mockSpawn.mock.calls[0]?.[2] as { env: Record<string, string | undefined> }
    expect(envArg.env.BROWSER).toBeUndefined()
  })
})

describe('getAuthStatus', () => {
  test('returns authenticated status when claude reports logged in', async () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    const fakeChild = createFakeChild()
    mockSpawn.mockReturnValue(fakeChild)

    const promise = getAuthStatus('/tmp/profile')

    expect(mockSpawn).toHaveBeenCalledWith(
      '/bin/claude',
      ['auth', 'status', '--json'],
      expect.objectContaining({
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
    )

    fakeChild.stdout.push(
      JSON.stringify({ loggedIn: true, authMethod: 'claude.ai', email: 'user@test.com' }),
    )
    fakeChild.stdout.push(null)
    await new Promise(r => setTimeout(r, 10))
    fakeChild.emit('close', 0)

    const result = await promise
    expect(result.loggedIn).toBe(true)
    expect(result.authMethod).toBe('claude.ai')
    expect(result.email).toBe('user@test.com')
  })

  test('returns unauthenticated status when claude reports not logged in', async () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    const fakeChild = createFakeChild()
    mockSpawn.mockReturnValue(fakeChild)

    const promise = getAuthStatus('/tmp/profile')

    fakeChild.stdout.push(JSON.stringify({ loggedIn: false, authMethod: 'none' }))
    fakeChild.stdout.push(null)
    await new Promise(r => setTimeout(r, 10))
    fakeChild.emit('close', 0)

    const result = await promise
    expect(result.loggedIn).toBe(false)
  })

  test('parses JSON output from claude auth status command', async () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    const fakeChild = createFakeChild()
    mockSpawn.mockReturnValue(fakeChild)

    const promise = getAuthStatus('/dir')

    expect(mockSpawn).toHaveBeenCalledWith(
      '/bin/claude',
      ['auth', 'status', '--json'],
      expect.objectContaining({
        env: expect.objectContaining({ CLAUDE_CONFIG_DIR: '/dir' }),
      }),
    )

    fakeChild.stdout.push('{"loggedIn":true,"authMethod":"api_key"}')
    fakeChild.stdout.push(null)
    await new Promise(r => setTimeout(r, 10))
    fakeChild.emit('close', 0)

    const result = await promise
    expect(result.authMethod).toBe('api_key')
  })

  test('handles invalid JSON output gracefully', async () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    const fakeChild = createFakeChild()
    mockSpawn.mockReturnValue(fakeChild)

    const promise = getAuthStatus('/dir')

    fakeChild.stdout.push('not json')
    fakeChild.stdout.push(null)
    await new Promise(r => setTimeout(r, 10))
    fakeChild.emit('close', 1)

    const result = await promise
    expect(result).toEqual({ loggedIn: false, authMethod: 'unknown' })
  })

  test('handles process error during auth check', async () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    const fakeChild = createFakeChild()
    mockSpawn.mockReturnValue(fakeChild)

    const promise = getAuthStatus('/dir')
    fakeChild.emit('error', new Error('spawn failed'))

    const result = await promise
    expect(result).toEqual({ loggedIn: false, authMethod: 'unknown' })
  })

  test('resolves with fallback on timeout', async () => {
    vi.useFakeTimers()
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    const fakeChild = createFakeChild()
    mockSpawn.mockReturnValue(fakeChild)

    const promise = getAuthStatus('/dir')

    vi.advanceTimersByTime(10_000)

    const result = await promise
    expect(fakeChild.kill).toHaveBeenCalled()
    expect(result).toEqual({ loggedIn: false, authMethod: 'unknown' })
    vi.useRealTimers()
  })

  test('resolves with fallback when child.stdout is null', async () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    const fakeChild = createFakeChild()
    ;(fakeChild as any).stdout = null
    mockSpawn.mockReturnValue(fakeChild)

    const result = await getAuthStatus('/dir')
    expect(result).toEqual({ loggedIn: false, authMethod: 'unknown' })
  })

  test('resolves with fallback when JSON has invalid structure', async () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    const fakeChild = createFakeChild()
    mockSpawn.mockReturnValue(fakeChild)

    const promise = getAuthStatus('/dir')

    fakeChild.stdout.push(JSON.stringify({ loggedIn: 'not-boolean', authMethod: 'api_key' }))
    fakeChild.stdout.push(null)
    await new Promise(r => setTimeout(r, 10))
    fakeChild.emit('close', 0)

    const result = await promise
    expect(result.loggedIn).toBe(false)
    expect(result.authMethod).toBe('unknown')
  })

  test('resolves with fallback when JSON is missing required fields', async () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    const fakeChild = createFakeChild()
    mockSpawn.mockReturnValue(fakeChild)

    const promise = getAuthStatus('/dir')

    fakeChild.stdout.push(JSON.stringify({ other: 'data' }))
    fakeChild.stdout.push(null)
    await new Promise(r => setTimeout(r, 10))
    fakeChild.emit('close', 0)

    const result = await promise
    expect(result).toEqual({ loggedIn: false, authMethod: 'unknown' })
  })

  test('resolves with fallback when loggedIn is boolean but authMethod is not string', async () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    const fakeChild = createFakeChild()
    mockSpawn.mockReturnValue(fakeChild)

    const promise = getAuthStatus('/dir')

    fakeChild.stdout.push(JSON.stringify({ loggedIn: true, authMethod: 42 }))
    fakeChild.stdout.push(null)
    await new Promise(r => setTimeout(r, 10))
    fakeChild.emit('close', 0)

    const result = await promise
    expect(result).toEqual({ loggedIn: false, authMethod: 'unknown' })
  })

  test('resolves with fallback when parsed is a primitive string', async () => {
    mockExecFileSync.mockReturnValue('/bin/claude\n')
    const fakeChild = createFakeChild()
    mockSpawn.mockReturnValue(fakeChild)

    const promise = getAuthStatus('/dir')

    fakeChild.stdout.push('"just a string"')
    fakeChild.stdout.push(null)
    await new Promise(r => setTimeout(r, 10))
    fakeChild.emit('close', 0)

    const result = await promise
    expect(result).toEqual({ loggedIn: false, authMethod: 'unknown' })
  })
})
