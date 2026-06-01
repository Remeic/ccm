import { Command } from 'commander'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { registerStatus } from '../../src/commands/status.js'
import { statusDot } from '../../src/lib/ui.js'

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

const prevForceColor = process.env.FORCE_COLOR

beforeEach(() => {
  vi.clearAllMocks()
  // Force color so the logged-in/out status dots differ (green vs red), making the
  // statusDot(...) call observable instead of collapsing to a plain glyph.
  process.env.FORCE_COLOR = '1'
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(process, 'exit').mockImplementation(code => {
    throw new Error(`exit:${code}`)
  })
})

afterEach(() => {
  if (prevForceColor === undefined) delete process.env.FORCE_COLOR
  else process.env.FORCE_COLOR = prevForceColor
})

function createProgram() {
  const program = new Command()
  program.exitOverride()
  registerStatus(program)
  return program
}

describe('command: status', () => {
  test('registers description and --json option text', () => {
    const program = createProgram()
    const status = program.commands.find(command => command.name() === 'status')
    expect(status?.description()).toBe('Show auth status for a profile (or all profiles)')
    const jsonOption = status?.options.find(option => option.long === '--json')
    expect(jsonOption?.description).toBe('Output machine-readable JSON')
  })

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

    expect(log).toHaveBeenCalledWith('Profile: work')
    expect(log).toHaveBeenCalledWith('State: ready')
    expect(log).toHaveBeenCalledWith('Logged in: true')
    expect(log).toHaveBeenCalledWith('Auth method: claude.ai')
    expect(log).toHaveBeenCalledWith('Created: 2026-01-01')
    expect(log).toHaveBeenCalledWith('Email: me@test.com')
    expect(log).toHaveBeenCalledWith('Subscription: max')
    // A profile with a directory must NOT print the "missing" line.
    expect(log).not.toHaveBeenCalledWith('Directory: missing')
  })

  test('fails with a descriptive message if profile does not exist', async () => {
    mockGetStoredProfile.mockReturnValue(undefined)
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()
    await expect(program.parseAsync(['node', 'ccm', 'status', 'ghost'])).rejects.toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('Profile "ghost" does not exist'))
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

    expect(log).toHaveBeenCalledWith('Email: u@t.com')
    expect(log).toHaveBeenCalledWith('Org: Org')
    expect(log).toHaveBeenCalledWith('Subscription: pro')
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

    expect(log).toHaveBeenCalledWith('Logged in: false')
    expect(log).toHaveBeenCalledWith('Auth method: none')
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

    // Logged-in dot, padded name/auth columns, account from apiKeySource, no drift suffix.
    expect(log).toHaveBeenCalledWith(
      `${statusDot(true)} ${'api'.padEnd(20)} ${'api_key'.padEnd(15)} env_var`,
    )
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

    // Logged-out dot and em-dash account placeholder, ready state so no suffix.
    expect(log).toHaveBeenCalledWith(
      `${statusDot(false)} ${'bare'.padEnd(20)} ${'none'.padEnd(15)} —`,
    )
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
    expect(log).toHaveBeenCalledWith('Logged in: unknown')
    expect(log).toHaveBeenCalledWith('Auth method: unavailable')
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

    // Drifted state appends a bracketed suffix; config-only never queries auth.
    expect(log).toHaveBeenCalledWith(
      `${statusDot(false)} ${'stale'.padEnd(20)} ${'unavailable'.padEnd(15)} — [config-only]`,
    )
  })

  test('--json prints a single profile view', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'work',
      dir: '/tmp/profiles/work',
      state: 'ready',
      hasConfig: true,
      hasDirectory: true,
      meta: { name: 'work', createdAt: '2026-01-01T00:00:00.000Z' },
    })
    mockGetAuthStatus.mockResolvedValue({
      loggedIn: true,
      authMethod: 'claude.ai',
      email: 'u@t.com',
    })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status', 'work', '--json'])

    expect(JSON.parse(log.mock.calls.at(-1)?.[0] as string)).toEqual({
      name: 'work',
      state: 'ready',
      authMethod: 'claude.ai',
      account: 'u@t.com',
      loggedIn: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      hasConfig: true,
      hasDirectory: true,
    })
    // Human key/value lines must not be printed in JSON mode.
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('Auth method:'))
  })

  test('--json prints an array for all profiles', async () => {
    mockListStoredProfiles.mockReturnValue([
      {
        name: 'bare',
        dir: '/tmp/profiles/bare',
        state: 'orphaned',
        hasConfig: false,
        hasDirectory: true,
      },
    ])
    mockGetAuthStatus.mockResolvedValue({ loggedIn: false, authMethod: 'none' })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status', '--json'])

    expect(JSON.parse(log.mock.calls.at(-1)?.[0] as string)).toEqual([
      {
        name: 'bare',
        state: 'orphaned',
        authMethod: 'none',
        account: null,
        loggedIn: false,
        createdAt: null,
        hasConfig: false,
        hasDirectory: true,
      },
    ])
  })

  test('colors the dot by per-profile login state in the list view', async () => {
    mockListStoredProfiles.mockReturnValue([
      {
        name: 'in',
        dir: '/tmp/profiles/in',
        state: 'ready',
        hasConfig: true,
        hasDirectory: true,
        meta: { name: 'in', createdAt: '2026-01-01' },
      },
      {
        name: 'out',
        dir: '/tmp/profiles/out',
        state: 'ready',
        hasConfig: true,
        hasDirectory: true,
        meta: { name: 'out', createdAt: '2026-01-02' },
      },
    ])
    mockGetAuthStatus.mockImplementation(async (dir: string) =>
      dir.endsWith('/in')
        ? { loggedIn: true, authMethod: 'claude.ai', email: 'a@b.c' }
        : { loggedIn: false, authMethod: 'none' },
    )
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status'])

    // Mixed login states in one run: a constant or flipped dot fails one of the two rows.
    expect(log).toHaveBeenCalledWith(
      `${statusDot(true)} ${'in'.padEnd(20)} ${'claude.ai'.padEnd(15)} a@b.c`,
    )
    expect(log).toHaveBeenCalledWith(
      `${statusDot(false)} ${'out'.padEnd(20)} ${'none'.padEnd(15)} —`,
    )
    expect(statusDot(true)).not.toBe(statusDot(false))
  })

  test('omits the Created line when a single profile has no createdAt', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'nodate',
      dir: '/tmp/profiles/nodate',
      state: 'orphaned',
      hasConfig: false,
      hasDirectory: true,
    })
    mockGetAuthStatus.mockResolvedValue({ loggedIn: false, authMethod: 'none' })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status', 'nodate'])

    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('Created:'))
  })
})
