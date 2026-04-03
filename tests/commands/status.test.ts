import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { registerStatus } from '../../src/commands/status.js'

vi.mock('../../src/lib/claude.js', () => ({
  getAuthStatus: vi.fn(),
}))
vi.mock('../../src/lib/profile-store.js', () => ({
  getStoredProfile: vi.fn(),
  listStoredProfiles: vi.fn(),
}))

import { getAuthStatus } from '../../src/lib/claude.js'
import { getStoredProfile, listStoredProfiles } from '../../src/lib/profile-store.js'

const mockGetAuthStatus = vi.mocked(getAuthStatus)
const mockGetStoredProfile = vi.mocked(getStoredProfile)
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
  registerStatus(program)
  return program
}

describe('command: status', () => {
  test('shows auth status for specified profile', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'work',
      dir: '/tmp/profiles/work',
      state: 'ready',
      hasConfig: true,
      hasDirectory: true,
      meta: { name: 'work', createdAt: '2026-01-01' },
    })
    mockGetAuthStatus.mockResolvedValue({
      loggedIn: true,
      authMethod: 'claude.ai',
      email: 'me@test.com',
      subscriptionType: 'max',
    })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status', 'work'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('work'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('true'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('me@test.com'))
  })

  test('fails if profile does not exist', async () => {
    mockGetStoredProfile.mockReturnValue(undefined)
    const program = createProgram()
    await expect(program.parseAsync(['node', 'ccm', 'status', 'ghost'])).rejects.toThrow('exit:1')
  })

  test('shows all profiles when no name given', async () => {
    mockListStoredProfiles.mockReturnValue([
      {
        name: 'a',
        dir: '/tmp/profiles/a',
        state: 'ready',
        hasConfig: true,
        hasDirectory: true,
        meta: { name: 'a', createdAt: '2026-01-01' },
      },
      {
        name: 'b',
        dir: '/tmp/profiles/b',
        state: 'ready',
        hasConfig: true,
        hasDirectory: true,
        meta: { name: 'b', createdAt: '2026-01-02' },
      },
    ])
    mockGetAuthStatus.mockResolvedValue({ loggedIn: false, authMethod: 'none' })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status'])

    expect(mockGetAuthStatus).toHaveBeenCalledTimes(2)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('a'))
  })

  test('prints No profiles when none exist', async () => {
    mockListStoredProfiles.mockReturnValue([])
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status'])

    expect(log).toHaveBeenCalledWith('No profiles.')
  })

  test('shows authenticated state with email and subscription', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'work',
      dir: '/tmp/profiles/work',
      state: 'ready',
      hasConfig: true,
      hasDirectory: true,
      meta: { name: 'work', createdAt: '2026-01-01' },
    })
    mockGetAuthStatus.mockResolvedValue({
      loggedIn: true,
      authMethod: 'claude.ai',
      email: 'u@t.com',
      orgName: 'Org',
      subscriptionType: 'pro',
    })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status', 'work'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('u@t.com'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('pro'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Org'))
  })

  test('shows unauthenticated state', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'work',
      dir: '/tmp/profiles/work',
      state: 'ready',
      hasConfig: true,
      hasDirectory: true,
      meta: { name: 'work', createdAt: '2026-01-01' },
    })
    mockGetAuthStatus.mockResolvedValue({ loggedIn: false, authMethod: 'none' })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status', 'work'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('false'))
  })

  test('shows apiKeySource when email is absent in list view', async () => {
    mockListStoredProfiles.mockReturnValue([
      {
        name: 'api',
        dir: '/tmp/profiles/api',
        state: 'ready',
        hasConfig: true,
        hasDirectory: true,
        meta: { name: 'api', createdAt: '2026-01-01' },
      },
    ])
    mockGetAuthStatus.mockResolvedValue({
      loggedIn: true,
      authMethod: 'api_key',
      apiKeySource: 'env_var',
    })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('env_var'))
  })

  test('shows dash when both email and apiKeySource absent in list view', async () => {
    mockListStoredProfiles.mockReturnValue([
      {
        name: 'bare',
        dir: '/tmp/profiles/bare',
        state: 'ready',
        hasConfig: true,
        hasDirectory: true,
        meta: { name: 'bare', createdAt: '2026-01-01' },
      },
    ])
    mockGetAuthStatus.mockResolvedValue({
      loggedIn: false,
      authMethod: 'none',
    })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('—'))
  })

  test('prints error when getAuthStatus rejects', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'work',
      dir: '/tmp/profiles/work',
      state: 'ready',
      hasConfig: true,
      hasDirectory: true,
      meta: { name: 'work', createdAt: '2026-01-01' },
    })
    mockGetAuthStatus.mockRejectedValue(new Error('network error'))
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()
    await expect(program.parseAsync(['node', 'ccm', 'status', 'work'])).rejects.toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('network error'))
  })

  test('handles non-Error throw in catch block', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'work',
      dir: '/tmp/profiles/work',
      state: 'ready',
      hasConfig: true,
      hasDirectory: true,
      meta: { name: 'work', createdAt: '2026-01-01' },
    })
    mockGetAuthStatus.mockRejectedValue('string error')
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()
    await expect(program.parseAsync(['node', 'ccm', 'status', 'work'])).rejects.toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('string error'))
  })

  test('shows state for orphaned single-profile status', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'orphan',
      dir: '/tmp/profiles/orphan',
      state: 'orphaned',
      hasConfig: false,
      hasDirectory: true,
    })
    mockGetAuthStatus.mockResolvedValue({ loggedIn: false, authMethod: 'none' })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status', 'orphan'])

    expect(log).toHaveBeenCalledWith('State: orphaned')
  })

  test('shows missing directory for config-only single-profile status', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'stale',
      dir: '/tmp/profiles/stale',
      state: 'config-only',
      hasConfig: true,
      hasDirectory: false,
      meta: { name: 'stale', createdAt: '2026-01-01' },
    })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status', 'stale'])

    expect(mockGetAuthStatus).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('State: config-only')
    expect(log).toHaveBeenCalledWith('Directory: missing')
  })

  test('marks drift in list view output', async () => {
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
    await program.parseAsync(['node', 'ccm', 'status'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('[config-only]'))
  })
})
