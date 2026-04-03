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
})

function createProgram() {
  const program = new Command()
  program.exitOverride()
  registerList(program)
  return program
}

describe('command: list', () => {
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

  test('displays header row with column names', async () => {
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
    mockGetAuthStatus.mockResolvedValue({ loggedIn: true, authMethod: 'api_key' })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'list'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('NAME'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('STATE'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('AUTH'))
  })

  test('shows orphaned profile rows when metadata is missing', async () => {
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

    expect(log).toHaveBeenCalledWith(expect.stringContaining('orphaned'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('—'))
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
    expect(log).toHaveBeenCalledWith(expect.stringContaining('unavailable'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('config-only'))
  })
})
