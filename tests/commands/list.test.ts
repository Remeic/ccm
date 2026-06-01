import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { registerList } from '../../src/commands/list.js'

vi.mock('../../src/lib/claude.js', () => ({
  getAuthStatus: vi.fn(),
}))
vi.mock('../../src/lib/profile-store.js', () => ({
  listStoredProfiles: vi.fn(),
}))

import { getAuthStatus } from '../../src/lib/claude.js'
import { listStoredProfiles } from '../../src/lib/profile-store.js'

const mockGetAuthStatus = vi.mocked(getAuthStatus)
const mockListStoredProfiles = vi.mocked(listStoredProfiles)

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
  registerList(program)
  return program
}

describe('command: list', () => {
  test('registers description and --json option text', () => {
    const program = createProgram()
    const list = program.commands.find(command => command.name() === 'list')
    expect(list?.description()).toBe(
      'List all profiles, including drifted config/filesystem entries',
    )
    const jsonOption = list?.options.find(option => option.long === '--json')
    expect(jsonOption?.description).toBe('Output machine-readable JSON')
  })

  test('prints empty message when no profiles exist', async () => {
    mockListStoredProfiles.mockReturnValue([])
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'list'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('No profiles'))
  })

  test('lists all profile names with auth status', async () => {
    mockListStoredProfiles.mockReturnValue([
      {
        name: 'work',
        dir: '/tmp/profiles/work',
        state: 'ready',
        hasConfig: true,
        hasDirectory: true,
        meta: { name: 'work', createdAt: '2026-01-15T00:00:00.000Z' },
      },
      {
        name: 'personal',
        dir: '/tmp/profiles/personal',
        state: 'ready',
        hasConfig: true,
        hasDirectory: true,
        meta: { name: 'personal', createdAt: '2026-02-01T00:00:00.000Z' },
      },
    ])
    mockGetAuthStatus.mockResolvedValue({
      loggedIn: true,
      authMethod: 'claude.ai',
      email: 'u@t.com',
    })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'list'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('work'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('personal'))
    expect(mockGetAuthStatus).toHaveBeenCalledTimes(2)
  })

  test('displays header, separator, and an exactly formatted data row', async () => {
    mockListStoredProfiles.mockReturnValue([
      {
        name: 'work',
        dir: '/tmp/profiles/work',
        state: 'ready',
        hasConfig: true,
        hasDirectory: true,
        meta: { name: 'work', createdAt: '2026-01-15T00:00:00.000Z' },
      },
    ])
    mockGetAuthStatus.mockResolvedValue({
      loggedIn: true,
      authMethod: 'claude.ai',
      email: 'u@t.com',
    })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'list'])

    // Exact column layout pins padding widths, separator width, and the createdAt slice.
    expect(log).toHaveBeenCalledWith(
      'NAME                STATE         AUTH           ACCOUNT                            CREATED',
    )
    expect(log).toHaveBeenCalledWith('─'.repeat(91))
    expect(log).toHaveBeenCalledWith(
      'work                ready         claude.ai      u@t.com                            2026-01-15',
    )
  })

  test('shows orphaned profile rows with dash placeholders for account and created', async () => {
    mockListStoredProfiles.mockReturnValue([
      {
        name: 'x',
        dir: '/tmp/profiles/x',
        state: 'orphaned',
        hasConfig: false,
        hasDirectory: true,
      },
    ])
    mockGetAuthStatus.mockResolvedValue({ loggedIn: false, authMethod: 'none' })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'list'])

    // Both the account and the created columns fall back to the em-dash placeholder.
    expect(log).toHaveBeenCalledWith(
      'x                   orphaned      none           —                                  —',
    )
  })

  test('shows dash when no email or apiKeySource', async () => {
    mockListStoredProfiles.mockReturnValue([
      {
        name: 'x',
        dir: '/tmp/profiles/x',
        state: 'ready',
        hasConfig: true,
        hasDirectory: true,
        meta: { name: 'x', createdAt: '2026-01-01' },
      },
    ])
    mockGetAuthStatus.mockResolvedValue({ loggedIn: false, authMethod: 'none' })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'list'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('—'))
  })

  test('shows config-only profiles without querying Claude', async () => {
    mockListStoredProfiles.mockReturnValue([
      {
        name: 'stale',
        dir: '/tmp/profiles/stale',
        state: 'config-only',
        hasConfig: true,
        hasDirectory: false,
        meta: { name: 'stale', createdAt: '2026-01-01' },
      },
    ])
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'list'])

    expect(mockGetAuthStatus).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(
      'stale               config-only   unavailable    —                                  2026-01-01',
    )
  })

  test('--json prints a parseable array of profile views', async () => {
    mockListStoredProfiles.mockReturnValue([
      {
        name: 'work',
        dir: '/tmp/profiles/work',
        state: 'ready',
        hasConfig: true,
        hasDirectory: true,
        meta: { name: 'work', createdAt: '2026-01-15T00:00:00.000Z' },
      },
    ])
    mockGetAuthStatus.mockResolvedValue({
      loggedIn: true,
      authMethod: 'claude.ai',
      email: 'u@t.com',
    })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'list', '--json'])

    const payload = JSON.parse(log.mock.calls.at(-1)?.[0] as string)
    expect(payload).toEqual([
      {
        name: 'work',
        state: 'ready',
        authMethod: 'claude.ai',
        account: 'u@t.com',
        loggedIn: true,
        createdAt: '2026-01-15T00:00:00.000Z',
        hasConfig: true,
        hasDirectory: true,
      },
    ])
    // Human table header must not be printed in JSON mode.
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('NAME'))
  })

  test('--json emits an empty array when no profiles exist', async () => {
    mockListStoredProfiles.mockReturnValue([])
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'list', '--json'])

    expect(JSON.parse(log.mock.calls.at(-1)?.[0] as string)).toEqual([])
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('No profiles'))
  })

  test('prints error and exits when listing fails', async () => {
    mockListStoredProfiles.mockImplementation(() => {
      throw new Error('store unreadable')
    })
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()

    await expect(program.parseAsync(['node', 'ccm', 'list'])).rejects.toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('store unreadable'))
  })
})
