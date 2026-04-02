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

import { spawnClaude } from '../../src/lib/claude.js'
import { profileExists } from '../../src/lib/profiles.js'

const mockSpawnClaude = vi.mocked(spawnClaude)
const mockProfileExists = vi.mocked(profileExists)

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
  test('spawns claude login with correct profile config dir', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'login', 'work'])

    expect(mockSpawnClaude).toHaveBeenCalledWith('/tmp/profiles/work', ['auth', 'login'])
  })

  test('passes --console flag to claude', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'login', 'work', '--console'])

    expect(mockSpawnClaude).toHaveBeenCalledWith('/tmp/profiles/work', [
      'auth',
      'login',
      '--console',
    ])
  })

  test('fails if profile does not exist', () => {
    mockProfileExists.mockReturnValue(false)
    const program = createProgram()
    expect(() => program.parse(['node', 'ccm', 'login', 'ghost'])).toThrow('exit:1')
  })

  test('passes through claude login exit code', () => {
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
})
