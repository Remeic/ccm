import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { registerStatus } from '../../src/commands/status.js'

vi.mock('../../src/lib/config.js', () => ({
  loadConfig: vi.fn(),
}))
vi.mock('../../src/lib/claude.js', () => ({
  getAuthStatus: vi.fn(),
}))
vi.mock('../../src/lib/profiles.js', () => ({
  profileExists: vi.fn(),
  getProfileDir: vi.fn((name: string) => `/tmp/profiles/${name}`),
}))

import { getAuthStatus } from '../../src/lib/claude.js'
import { loadConfig } from '../../src/lib/config.js'
import { profileExists } from '../../src/lib/profiles.js'

const mockLoadConfig = vi.mocked(loadConfig)
const mockGetAuthStatus = vi.mocked(getAuthStatus)
const mockProfileExists = vi.mocked(profileExists)

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
    mockProfileExists.mockReturnValue(true)
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
    mockProfileExists.mockReturnValue(false)
    const program = createProgram()
    await expect(program.parseAsync(['node', 'ccm', 'status', 'ghost'])).rejects.toThrow('exit:1')
  })

  test('shows all profiles when no name given', async () => {
    mockLoadConfig.mockReturnValue({
      profiles: {
        a: { name: 'a', createdAt: '2026-01-01' },
        b: { name: 'b', createdAt: '2026-01-02' },
      },
    })
    mockGetAuthStatus.mockResolvedValue({ loggedIn: false, authMethod: 'none' })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status'])

    expect(mockGetAuthStatus).toHaveBeenCalledTimes(2)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('a'))
  })

  test('prints No profiles when none exist', async () => {
    mockLoadConfig.mockReturnValue({ profiles: {} })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status'])

    expect(log).toHaveBeenCalledWith('No profiles.')
  })

  test('shows authenticated state with email and subscription', async () => {
    mockProfileExists.mockReturnValue(true)
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
    mockProfileExists.mockReturnValue(true)
    mockGetAuthStatus.mockResolvedValue({ loggedIn: false, authMethod: 'none' })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'status', 'work'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('false'))
  })

  test('shows apiKeySource when email is absent in list view', async () => {
    mockLoadConfig.mockReturnValue({
      profiles: { api: { name: 'api', createdAt: '2026-01-01' } },
    })
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
    mockLoadConfig.mockReturnValue({
      profiles: { bare: { name: 'bare', createdAt: '2026-01-01' } },
    })
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
    mockProfileExists.mockReturnValue(true)
    mockGetAuthStatus.mockRejectedValue(new Error('network error'))
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()
    await expect(program.parseAsync(['node', 'ccm', 'status', 'work'])).rejects.toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('network error'))
  })

  test('handles non-Error throw in catch block', async () => {
    mockProfileExists.mockReturnValue(true)
    mockGetAuthStatus.mockRejectedValue('string error')
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()
    await expect(program.parseAsync(['node', 'ccm', 'status', 'work'])).rejects.toThrow('exit:1')
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('string error'))
  })
})
