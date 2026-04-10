import { EventEmitter } from 'node:events'
import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { registerUse } from '../../src/commands/use.js'

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
  registerUse(program)
  return program
}

describe('command: use', () => {
  test('spawns claude with profile dir', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'use', 'work'])

    expect(mockSpawnClaude).toHaveBeenCalledWith('/tmp/profiles/work', [])
  })

  test('forwards Claude flags without requiring -- separator', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'use', 'work', '--resume', 'session-123'])

    expect(mockSpawnClaude).toHaveBeenCalledWith('/tmp/profiles/work', ['--resume', 'session-123'])
  })

  test('forwards Claude flags when using -- separator', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'use', 'work', '--', '--resume', 'session-123'])

    expect(mockSpawnClaude).toHaveBeenCalledWith('/tmp/profiles/work', ['--resume', 'session-123'])
  })

  test('fails if profile does not exist', () => {
    mockProfileExists.mockReturnValue(false)
    const program = createProgram()
    expect(() => program.parse(['node', 'ccm', 'use', 'ghost'])).toThrow('exit:1')
  })

  test('forwards exit code from child process', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'use', 'work'])

    expect(() => fakeChild.emit('close', 0)).toThrow('exit:0')
  })

  test('exits 1 on null exit code', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'use', 'work'])

    expect(() => fakeChild.emit('close', null)).toThrow('exit:0')
  })

  test('prints error if spawnClaude throws', () => {
    mockProfileExists.mockReturnValue(true)
    mockSpawnClaude.mockImplementation(() => {
      throw new Error('binary not found')
    })
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()
    expect(() => program.parse(['node', 'ccm', 'use', 'work'])).toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('binary not found'))
  })

  test('handles non-Error throw in catch block', () => {
    mockProfileExists.mockReturnValue(true)
    mockSpawnClaude.mockImplementation(() => {
      throw 'string error'
    })
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()
    expect(() => program.parse(['node', 'ccm', 'use', 'work'])).toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('string error'))
  })
})
