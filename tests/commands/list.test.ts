import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { registerList } from '../../src/commands/list.js'

vi.mock('../../src/lib/config.js', () => ({
  loadConfig: vi.fn(),
}))
vi.mock('../../src/lib/claude.js', () => ({
  getAuthStatus: vi.fn(),
}))
vi.mock('../../src/lib/profiles.js', () => ({
  getProfileDir: vi.fn((name: string) => `/tmp/profiles/${name}`),
}))

import { getAuthStatus } from '../../src/lib/claude.js'
import { loadConfig } from '../../src/lib/config.js'

const mockLoadConfig = vi.mocked(loadConfig)
const mockGetAuthStatus = vi.mocked(getAuthStatus)

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
    mockLoadConfig.mockReturnValue({ profiles: {} })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'list'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('No profiles'))
  })

  test('lists all profile names with auth status', async () => {
    mockLoadConfig.mockReturnValue({
      profiles: {
        work: { name: 'work', createdAt: '2026-01-15T00:00:00.000Z' },
        personal: { name: 'personal', createdAt: '2026-02-01T00:00:00.000Z' },
      },
    })
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
    mockLoadConfig.mockReturnValue({
      profiles: { x: { name: 'x', createdAt: '2026-01-01' } },
    })
    mockGetAuthStatus.mockResolvedValue({ loggedIn: true, authMethod: 'api_key' })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'list'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('NAME'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('AUTH'))
  })

  test('shows dash when no email or apiKeySource', async () => {
    mockLoadConfig.mockReturnValue({
      profiles: { x: { name: 'x', createdAt: '2026-01-01' } },
    })
    mockGetAuthStatus.mockResolvedValue({ loggedIn: false, authMethod: 'none' })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'list'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('—'))
  })
})
