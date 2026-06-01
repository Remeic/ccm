import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { registerCopyConfig } from '../../src/commands/copy-config.js'

vi.mock('node:readline', () => ({
  createInterface: vi.fn(),
}))
vi.mock('../../src/lib/profile-config-copy.js', () => ({
  applyProfileConfigCopy: vi.fn(),
  planProfileConfigCopy: vi.fn(),
}))

import { createInterface } from 'node:readline'
import { applyProfileConfigCopy, planProfileConfigCopy } from '../../src/lib/profile-config-copy.js'

const mockCreateInterface = vi.mocked(createInterface)
const mockPlanProfileConfigCopy = vi.mocked(planProfileConfigCopy)
const mockApplyProfileConfigCopy = vi.mocked(applyProfileConfigCopy)

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(process, 'exit').mockImplementation(code => {
    throw new Error(`exit:${code}`)
  })

  mockPlanProfileConfigCopy.mockReturnValue({
    sourceName: 'source',
    targetName: 'target',
    operations: [
      {
        sourcePath: '/tmp/source/settings.json',
        targetPath: '/tmp/target/settings.json',
        relativePath: 'settings.json',
        kind: 'file',
        overwrite: true,
      },
    ],
    overwriteCount: 1,
    createCount: 0,
  })
  mockApplyProfileConfigCopy.mockReturnValue({
    copiedCount: 1,
    overwrittenCount: 1,
    createdCount: 0,
  })
})

function createProgram() {
  const program = new Command()
  program.exitOverride()
  registerCopyConfig(program)
  return program
}

describe('command: copy-config', () => {
  test('registers command and option descriptions', () => {
    const program = createProgram()
    const command = program.commands.find(candidate => candidate.name() === 'copy-config')
    const onlyOption = command?.options.find(option => option.long === '--only')
    const dryRunOption = command?.options.find(option => option.long === '--dry-run')
    const forceOption = command?.options.find(option => option.long === '--force')

    expect(command?.description()).toContain('non-auth configuration')
    expect(onlyOption?.description).toContain('Copy only selected path(s)')
    expect(dryRunOption?.description).toContain('Preview')
    expect(forceOption?.description).toContain('Skip overwrite confirmation')
  })

  test('shows dry-run plan without applying changes', async () => {
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'copy-config', 'source', 'target', '--dry-run'])

    expect(mockPlanProfileConfigCopy).toHaveBeenCalledWith('source', 'target', undefined, undefined)
    expect(mockApplyProfileConfigCopy).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('Dry run: 1 item(s) would be copied from "source" to "target"')
    expect(log).toHaveBeenCalledWith('- settings.json (file, overwrite)')
  })

  test('shows create mode in dry-run when operation is not overwrite', async () => {
    mockPlanProfileConfigCopy.mockReturnValue({
      sourceName: 'source',
      targetName: 'target',
      operations: [
        {
          sourcePath: '/tmp/source/settings.json',
          targetPath: '/tmp/target/settings.json',
          relativePath: 'settings.json',
          kind: 'file',
          overwrite: false,
        },
      ],
      overwriteCount: 0,
      createCount: 1,
    })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()

    await program.parseAsync(['node', 'ccm', 'copy-config', 'source', 'target', '--dry-run'])

    expect(log).toHaveBeenCalledWith('- settings.json (file, create)')
  })

  test('prompts and applies when conflicts exist and user confirms', async () => {
    const question = vi.fn((_q: string, cb: (answer: string) => void) => cb('y'))
    mockCreateInterface.mockReturnValue({
      question,
      close: vi.fn(),
    } as any)
    const log = vi.spyOn(console, 'log')

    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'copy-config', 'source', 'target'])

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('1 existing path(s) in "target" will be overwritten.'),
    )
    expect(question).toHaveBeenCalledWith('Continue? (y/N) ', expect.any(Function))
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(
        'Copied 1 item(s) from "source" to "target" (0 created, 1 overwritten)',
      ),
    )
    expect(mockApplyProfileConfigCopy).toHaveBeenCalledTimes(1)
  })

  test('cancels when conflicts exist and user rejects confirmation', async () => {
    const question = vi.fn((_q: string, cb: (answer: string) => void) => cb('n'))
    const log = vi.spyOn(console, 'log')
    mockCreateInterface.mockReturnValue({
      question,
      close: vi.fn(),
    } as any)

    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'copy-config', 'source', 'target'])

    expect(question).toHaveBeenCalledWith('Continue? (y/N) ', expect.any(Function))
    expect(log).toHaveBeenCalledWith('Cancelled')
    expect(mockApplyProfileConfigCopy).not.toHaveBeenCalled()
  })

  test('skips prompt with --force', async () => {
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'copy-config', 'source', 'target', '--force'])

    expect(mockCreateInterface).not.toHaveBeenCalled()
    expect(mockApplyProfileConfigCopy).toHaveBeenCalledTimes(1)
  })

  test('does not prompt when no conflicts are present', async () => {
    mockPlanProfileConfigCopy.mockReturnValue({
      sourceName: 'source',
      targetName: 'target',
      operations: [
        {
          sourcePath: '/tmp/source/settings.json',
          targetPath: '/tmp/target/settings.json',
          relativePath: 'settings.json',
          kind: 'file',
          overwrite: false,
        },
      ],
      overwriteCount: 0,
      createCount: 1,
    })

    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'copy-config', 'source', 'target'])

    expect(mockCreateInterface).not.toHaveBeenCalled()
    expect(mockApplyProfileConfigCopy).toHaveBeenCalledTimes(1)
  })

  test('passes --only values to planProfileConfigCopy', async () => {
    const program = createProgram()
    await program.parseAsync([
      'node',
      'ccm',
      'copy-config',
      'source',
      'target',
      '--force',
      '--only',
      'settings',
      '--only',
      'plugins',
    ])

    expect(mockPlanProfileConfigCopy).toHaveBeenCalledWith('source', 'target', undefined, {
      only: ['settings', 'plugins'],
    })
  })

  test('supports comma-separated values for --only', async () => {
    const program = createProgram()
    await program.parseAsync([
      'node',
      'ccm',
      'copy-config',
      'source',
      'target',
      '--force',
      '--only',
      'settings,plugins',
    ])

    expect(mockPlanProfileConfigCopy).toHaveBeenCalledWith('source', 'target', undefined, {
      only: ['settings', 'plugins'],
    })
  })

  test('trims whitespace in comma-separated --only values', async () => {
    const program = createProgram()
    await program.parseAsync([
      'node',
      'ccm',
      'copy-config',
      'source',
      'target',
      '--force',
      '--only',
      ' settings , plugins ',
    ])

    expect(mockPlanProfileConfigCopy).toHaveBeenCalledWith('source', 'target', undefined, {
      only: ['settings', 'plugins'],
    })
  })

  test('fails on empty comma-separated --only entries', async () => {
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()

    await expect(
      program.parseAsync(['node', 'ccm', 'copy-config', 'source', 'target', '--only', 'settings,']),
    ).rejects.toThrow('Invalid --only value. Empty entries are not allowed.')
    expect(mockPlanProfileConfigCopy).not.toHaveBeenCalled()
    expect(errLog).not.toHaveBeenCalled()
  })

  test('prints error and exits on thrown exception', async () => {
    mockPlanProfileConfigCopy.mockImplementation(() => {
      throw new Error('boom')
    })
    const errLog = vi.spyOn(console, 'error')

    const program = createProgram()
    await expect(
      program.parseAsync(['node', 'ccm', 'copy-config', 'source', 'target']),
    ).rejects.toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('boom'))
  })

  test('prints error and exits on non-Error throw', async () => {
    mockPlanProfileConfigCopy.mockImplementation(() => {
      throw 'string boom'
    })
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()

    await expect(
      program.parseAsync(['node', 'ccm', 'copy-config', 'source', 'target']),
    ).rejects.toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('string boom'))
  })
})
