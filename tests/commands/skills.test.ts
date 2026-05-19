import { EventEmitter } from 'node:events'
import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { registerSkills } from '../../src/commands/skills.js'

vi.mock('node:child_process', () => ({ spawn: vi.fn() }))
vi.mock('../../src/lib/profiles.js', () => ({
  profileExists: vi.fn(),
  getProfileDir: vi.fn((name: string) => `/tmp/profiles/${name}`),
}))

import { spawn } from 'node:child_process'
import { profileExists } from '../../src/lib/profiles.js'

const mockSpawn = vi.mocked(spawn)
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
  registerSkills(program)
  return program
}

function findSub(name: string): Command {
  const program = createProgram()
  const skills = program.commands.find(c => c.name() === 'skills') as Command
  return skills.commands.find(c => c.name() === name) as Command
}

describe('command: skills', () => {
  test('registers exactly the four expected subcommands', () => {
    const program = createProgram()
    const skills = program.commands.find(c => c.name() === 'skills') as Command
    expect(skills.description()).toBe('Manage Claude Code skills scoped to a profile')
    expect(skills.commands.map(c => c.name()).sort()).toEqual(['add', 'list', 'remove', 'update'])
  })

  test('subcommands expose their exact descriptions', () => {
    expect(findSub('add').description()).toBe(
      'Install skills from GitHub into a profile (e.g. owner/repo)',
    )
    expect(findSub('list').description()).toBe('List skills installed in a profile')
    expect(findSub('remove').description()).toBe('Remove skills from a profile')
    expect(findSub('update').description()).toBe('Update skills in a profile')
  })

  test.each([
    'add',
    'list',
    'remove',
    'update',
  ])('%s: forwards --help to npx skills instead of printing local help', sub => {
    mockProfileExists.mockReturnValue(true)
    mockSpawn.mockReturnValue(new EventEmitter() as any)

    // With helpOption(true) commander would intercept --help and never spawn.
    expect(() =>
      createProgram().parse(['node', 'ccm', 'skills', sub, 'work', '--help']),
    ).not.toThrow()

    expect(mockSpawn).toHaveBeenCalledWith(
      'npx',
      ['-y', 'skills', sub, '--help', '-a', 'claude-code', '-g', '-y'],
      expect.anything(),
    )
  })

  test.each([
    'add',
    'list',
    'remove',
    'update',
  ])('%s: forwards an unknown option instead of rejecting it', sub => {
    mockProfileExists.mockReturnValue(true)
    mockSpawn.mockReturnValue(new EventEmitter() as any)

    // With allowUnknownOption(false) commander would throw "unknown option".
    expect(() =>
      createProgram().parse(['node', 'ccm', 'skills', sub, 'work', '--totally-unknown']),
    ).not.toThrow()

    expect(mockSpawn).toHaveBeenCalledWith(
      'npx',
      ['-y', 'skills', sub, '--totally-unknown', '-a', 'claude-code', '-g', '-y'],
      expect.anything(),
    )
  })

  test('add: spawns npx skills with profile config dir env', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawn.mockReturnValue(fakeChild as any)

    createProgram().parse(['node', 'ccm', 'skills', 'add', 'work', 'owner/repo'])

    expect(mockSpawn).toHaveBeenCalledWith(
      'npx',
      ['-y', 'skills', 'add', 'owner/repo', '-a', 'claude-code', '-g', '-y'],
      expect.objectContaining({
        env: expect.objectContaining({ CLAUDE_CONFIG_DIR: '/tmp/profiles/work' }),
        stdio: 'inherit',
      }),
    )
  })

  test('add: forwards multiple repos and extra flags', () => {
    mockProfileExists.mockReturnValue(true)
    mockSpawn.mockReturnValue(new EventEmitter() as any)

    createProgram().parse(['node', 'ccm', 'skills', 'add', 'work', 'a/b', 'c/d', '--copy'])

    expect(mockSpawn).toHaveBeenCalledWith(
      'npx',
      ['-y', 'skills', 'add', 'a/b', 'c/d', '--copy', '-a', 'claude-code', '-g', '-y'],
      expect.anything(),
    )
  })

  test('list: passes through to npx skills list', () => {
    mockProfileExists.mockReturnValue(true)
    mockSpawn.mockReturnValue(new EventEmitter() as any)

    createProgram().parse(['node', 'ccm', 'skills', 'list', 'work'])

    expect(mockSpawn).toHaveBeenCalledWith(
      'npx',
      ['-y', 'skills', 'list', '-a', 'claude-code', '-g', '-y'],
      expect.anything(),
    )
  })

  test('list: forwards passthrough args after the profile name', () => {
    mockProfileExists.mockReturnValue(true)
    mockSpawn.mockReturnValue(new EventEmitter() as any)

    createProgram().parse(['node', 'ccm', 'skills', 'list', 'work', '--json'])

    expect(mockSpawn).toHaveBeenCalledWith(
      'npx',
      ['-y', 'skills', 'list', '--json', '-a', 'claude-code', '-g', '-y'],
      expect.anything(),
    )
  })

  test('update: forwards skill names', () => {
    mockProfileExists.mockReturnValue(true)
    mockSpawn.mockReturnValue(new EventEmitter() as any)

    createProgram().parse(['node', 'ccm', 'skills', 'update', 'work', 'my-skill'])

    expect(mockSpawn).toHaveBeenCalledWith(
      'npx',
      ['-y', 'skills', 'update', 'my-skill', '-a', 'claude-code', '-g', '-y'],
      expect.anything(),
    )
  })

  test('remove: forwards skill names', () => {
    mockProfileExists.mockReturnValue(true)
    mockSpawn.mockReturnValue(new EventEmitter() as any)

    createProgram().parse(['node', 'ccm', 'skills', 'remove', 'work', 'my-skill'])

    expect(mockSpawn).toHaveBeenCalledWith(
      'npx',
      ['-y', 'skills', 'remove', 'my-skill', '-a', 'claude-code', '-g', '-y'],
      expect.anything(),
    )
  })

  test('fails if profile does not exist', () => {
    mockProfileExists.mockReturnValue(false)
    const errLog = vi.spyOn(console, 'error')
    expect(() => createProgram().parse(['node', 'ccm', 'skills', 'add', 'ghost', 'a/b'])).toThrow(
      'exit:1',
    )
    expect(errLog).toHaveBeenCalledWith(
      expect.stringContaining('Profile "ghost" does not exist. Create it first: ccm create ghost'),
    )
    expect(mockSpawn).not.toHaveBeenCalled()
  })

  test('forwards exit code from child process', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawn.mockReturnValue(fakeChild as any)

    createProgram().parse(['node', 'ccm', 'skills', 'add', 'work', 'a/b'])

    expect(() => fakeChild.emit('close', 0)).toThrow('exit:0')
  })

  test('exits 0 on null exit code', () => {
    mockProfileExists.mockReturnValue(true)
    const fakeChild = new EventEmitter()
    mockSpawn.mockReturnValue(fakeChild as any)

    createProgram().parse(['node', 'ccm', 'skills', 'add', 'work', 'a/b'])

    expect(() => fakeChild.emit('close', null)).toThrow('exit:0')
  })

  test('prints error if spawn throws', () => {
    mockProfileExists.mockReturnValue(true)
    mockSpawn.mockImplementation(() => {
      throw new Error('npx not found')
    })
    const errLog = vi.spyOn(console, 'error')

    expect(() => createProgram().parse(['node', 'ccm', 'skills', 'add', 'work', 'a/b'])).toThrow(
      'exit:1',
    )
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('npx not found'))
  })

  test('handles non-Error throw in catch block', () => {
    mockProfileExists.mockReturnValue(true)
    mockSpawn.mockImplementation(() => {
      throw 'string error'
    })
    const errLog = vi.spyOn(console, 'error')

    expect(() => createProgram().parse(['node', 'ccm', 'skills', 'add', 'work', 'a/b'])).toThrow(
      'exit:1',
    )
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('string error'))
  })
})
