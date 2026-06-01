import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { collectCommandNames, registerCompletion } from '../../src/commands/completion.js'

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(process, 'exit').mockImplementation(code => {
    throw new Error(`exit:${code}`)
  })
})

function createProgram() {
  const program = new Command()
  program.exitOverride()
  program.command('create <name>').action(() => {})
  program.command('list').action(() => {})
  program
    .command('compliance')
    .alias('tos')
    .action(() => {})
  registerCompletion(program)
  return program
}

describe('collectCommandNames', () => {
  test('returns sorted command names and aliases, excluding completion', () => {
    const program = createProgram()
    expect(collectCommandNames(program)).toEqual(['compliance', 'create', 'list', 'tos'])
  })
})

describe('command: completion', () => {
  test('registers a description listing the supported shells', () => {
    const program = createProgram()
    const completion = program.commands.find(command => command.name() === 'completion')
    expect(completion?.description()).toBe('Print a shell completion script (bash, zsh, fish)')
  })

  test('prints a script for a valid shell containing the commands', () => {
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    program.parse(['node', 'ccm', 'completion', 'bash'])

    const output = log.mock.calls.at(-1)?.[0] as string
    expect(output).toContain('create')
    expect(output).toContain('list')
    expect(output).toContain('complete -F _ccm_completions ccm')
  })

  test('exits with error for an unsupported shell', () => {
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()
    expect(() => program.parse(['node', 'ccm', 'completion', 'nushell'])).toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('Unsupported shell'))
  })
})
