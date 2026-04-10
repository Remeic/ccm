import { EventEmitter } from 'node:events'
import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { registerLogin } from '../../src/commands/login.js'

vi.mock('../../src/lib/claude.js', () => ({
  spawnClaude: vi.fn(),
}))
vi.mock('../../src/lib/profiles.js', () => ({
  profileExists: vi.fn(),
  getProfileDir: vi.fn((name: string) => `/tmp/profiles/${name}`),
}))
vi.mock('../../src/lib/browsers.js', () => ({
  resolveBrowser: vi.fn(),
}))
vi.mock('../../src/lib/config.js', () => ({
  getProfile: vi.fn(),
}))

import { resolveBrowser } from '../../src/lib/browsers.js'
import { spawnClaude } from '../../src/lib/claude.js'
import { getProfile } from '../../src/lib/config.js'
import { profileExists } from '../../src/lib/profiles.js'

const mockSpawnClaude = vi.mocked(spawnClaude)
const mockProfileExists = vi.mocked(profileExists)
const mockResolveBrowser = vi.mocked(resolveBrowser)
const mockGetProfile = vi.mocked(getProfile)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(process, 'exit').mockImplementation(code => {
    throw new Error(`exit:${code}`)
  })
})

function createProgram() {
  const program = new Command()
  program.exitOverride()
  registerLogin(program)
  return program
}

describe('command: login', () => {
  test('spawns claude directly (TUI) for OAuth login', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'login', 'work'])

    expect(mockSpawnClaude).toHaveBeenCalledWith(
      '/tmp/profiles/work',
      [],
      expect.objectContaining({ browser: undefined }),
    )
  })

  test('uses claude auth login --console for API key auth', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'login', 'work', '--console'])

    expect(mockSpawnClaude).toHaveBeenCalledWith(
      '/tmp/profiles/work',
      ['auth', 'login', '--console'],
      expect.objectContaining({}),
    )
  })

  test('passes through claude close code in --console mode', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'login', 'work', '--console'])

    expect(() => fakeChild.emit('close', null)).toThrow('exit:0')
  })

  test('fails if profile does not exist', () => {
    mockProfileExists.mockReturnValue(false)
    const program = createProgram()
    expect(() => program.parse(['node', 'ccm', 'login', 'ghost'])).toThrow('exit:1')
  })

  test('passes through claude exit code', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'login', 'work'])

    expect(() => fakeChild.emit('close', 0)).toThrow('exit:0')
  })

  test('prints error if claude binary not found', () => {
    mockProfileExists.mockReturnValue(true)
    mockSpawnClaude.mockImplementation(() => {
      throw new Error('Claude Code not found')
    })
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()
    expect(() => program.parse(['node', 'ccm', 'login', 'work'])).toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('not found'))
  })

  test('exits with 0 when child close code is null', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'login', 'work'])

    expect(() => fakeChild.emit('close', null)).toThrow('exit:0')
  })

  test('handles non-Error throw in catch block', () => {
    mockProfileExists.mockReturnValue(true)
    mockSpawnClaude.mockImplementation(() => {
      throw 'string error'
    })
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()
    expect(() => program.parse(['node', 'ccm', 'login', 'work'])).toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('string error'))
  })

  test('passes --browser to resolveBrowser', () => {
    mockProfileExists.mockReturnValue(true)
    mockGetProfile.mockReturnValue({ name: 'work', createdAt: '' })
    mockResolveBrowser.mockReturnValue('/usr/bin/firefox')
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'login', 'work', '--browser', '/usr/bin/firefox'])

    expect(mockResolveBrowser).toHaveBeenCalledWith('/usr/bin/firefox', expect.anything())
    expect(mockSpawnClaude).toHaveBeenCalledWith('/tmp/profiles/work', [], {
      browser: '/usr/bin/firefox',
    })
  })

  test('resolves browser from profile metadata when no CLI override', () => {
    mockProfileExists.mockReturnValue(true)
    const meta = { name: 'work', browser: '/saved/chrome', createdAt: '' }
    mockGetProfile.mockReturnValue(meta)
    mockResolveBrowser.mockReturnValue('/saved/chrome')
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'login', 'work'])

    expect(mockResolveBrowser).toHaveBeenCalledWith(undefined, meta)
    expect(mockSpawnClaude).toHaveBeenCalledWith('/tmp/profiles/work', [], {
      browser: '/saved/chrome',
    })
  })

  test('--url-only sets browser to "true" to suppress opening', () => {
    mockProfileExists.mockReturnValue(true)
    mockGetProfile.mockReturnValue({ name: 'work', createdAt: '' })
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'login', 'work', '--url-only'])

    expect(mockResolveBrowser).not.toHaveBeenCalled()
    expect(mockSpawnClaude).toHaveBeenCalledWith('/tmp/profiles/work', [], { browser: 'true' })
  })

  test('--url-only takes precedence over --browser', () => {
    mockProfileExists.mockReturnValue(true)
    mockGetProfile.mockReturnValue({ name: 'work', createdAt: '' })
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'login', 'work', '--url-only', '--browser', '/usr/bin/firefox'])

    expect(mockResolveBrowser).not.toHaveBeenCalled()
    expect(mockSpawnClaude).toHaveBeenCalledWith('/tmp/profiles/work', [], { browser: 'true' })
  })

  test('--console with --url-only still uses auth login subcommand', () => {
    mockProfileExists.mockReturnValue(true)
    mockGetProfile.mockReturnValue({ name: 'work', createdAt: '' })
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'login', 'work', '--console', '--url-only'])

    expect(mockSpawnClaude).toHaveBeenCalledWith(
      '/tmp/profiles/work',
      ['auth', 'login', '--console'],
      { browser: 'true' },
    )
  })
})
