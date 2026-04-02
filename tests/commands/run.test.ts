import { EventEmitter } from 'node:events'
import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { registerRun } from '../../src/commands/run.js'

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
  registerRun(program)
  return program
}

describe('command: run', () => {
  test('spawns claude with -p flag and prompt', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'run', 'work', '-p', 'hello world'])

    expect(mockSpawnClaude).toHaveBeenCalledWith('/tmp/profiles/work', ['-p', 'hello world'])
  })

  test('fails if profile does not exist', () => {
    mockProfileExists.mockReturnValue(false)
    const program = createProgram()
    expect(() => program.parse(['node', 'ccm', 'run', 'ghost', '-p', 'test'])).toThrow('exit:1')
  })

  test('forwards exit code from child process', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'run', 'work', '-p', 'test'])

    expect(() => fakeChild.emit('close', 0)).toThrow('exit:0')
  })

  test('requires --prompt flag', () => {
    mockProfileExists.mockReturnValue(true)
    const program = createProgram()
    expect(() => program.parse(['node', 'ccm', 'run', 'work'])).toThrow()
  })

  test('accepts long --prompt flag', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'run', 'work', '--prompt', 'long form'])

    expect(mockSpawnClaude).toHaveBeenCalledWith('/tmp/profiles/work', ['-p', 'long form'])
  })

  test('prints error if spawnClaude throws', () => {
    mockProfileExists.mockReturnValue(true)
    mockSpawnClaude.mockImplementation(() => {
      throw new Error('no binary')
    })
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()
    expect(() => program.parse(['node', 'ccm', 'run', 'work', '-p', 'x'])).toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('no binary'))
  })

  test('exits with 0 when child close code is null', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawnClaude.mockReturnValue(fakeChild as any)

    const program = createProgram()
    program.parse(['node', 'ccm', 'run', 'work', '-p', 'test'])

    expect(() => fakeChild.emit('close', null)).toThrow('exit:0')
  })

  test('handles non-Error throw in catch block', () => {
    mockProfileExists.mockReturnValue(true)
    mockSpawnClaude.mockImplementation(() => {
      throw 'string error'
    })
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()
    expect(() => program.parse(['node', 'ccm', 'run', 'work', '-p', 'x'])).toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('string error'))
  })
})
