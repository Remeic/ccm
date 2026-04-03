import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { registerRemove } from '../../src/commands/remove.js'

vi.mock('node:readline', () => ({
  createInterface: vi.fn(),
}))
vi.mock('../../src/lib/profile-store.js', () => ({
  getStoredProfile: vi.fn(),
  removeStoredProfile: vi.fn(),
}))

import { createInterface } from 'node:readline'
import { getStoredProfile, removeStoredProfile } from '../../src/lib/profile-store.js'

const mockCreateInterface = vi.mocked(createInterface)
const mockGetStoredProfile = vi.mocked(getStoredProfile)
const mockRemoveStoredProfile = vi.mocked(removeStoredProfile)

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(process, 'exit').mockImplementation(code => {
    throw new Error(`exit:${code}`)
  })
})

function createProgram() {
  const program = new Command()
  program.exitOverride()
  registerRemove(program)
  return program
}

describe('command: remove', () => {
  test('removes profile directory and config entry with --force', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'work',
      dir: '/tmp/profiles/work',
      state: 'ready',
      hasConfig: true,
      hasDirectory: true,
      meta: { name: 'work', createdAt: '2026-01-01' },
    })
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'remove', 'work', '--force'])

    expect(mockRemoveStoredProfile).toHaveBeenCalledWith('work')
  })

  test('fails if profile does not exist', async () => {
    mockGetStoredProfile.mockReturnValue(undefined)
    const program = createProgram()
    await expect(program.parseAsync(['node', 'ccm', 'remove', 'ghost', '--force'])).rejects.toThrow(
      'exit:1',
    )
  })

  test('prints success message after removal', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'test',
      dir: '/tmp/profiles/test',
      state: 'ready',
      hasConfig: true,
      hasDirectory: true,
      meta: { name: 'test', createdAt: '2026-01-01' },
    })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'remove', 'test', '--force'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('removed'))
  })

  test('prints error message on failure', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'bad',
      dir: '/tmp/profiles/bad',
      state: 'ready',
      hasConfig: true,
      hasDirectory: true,
      meta: { name: 'bad', createdAt: '2026-01-01' },
    })
    mockRemoveStoredProfile.mockImplementation(() => {
      throw new Error('fs error')
    })
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()

    await expect(program.parseAsync(['node', 'ccm', 'remove', 'bad', '--force'])).rejects.toThrow(
      'exit:1',
    )
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('fs error'))
  })

  test('confirms and removes when user answers y', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'work',
      dir: '/tmp/profiles/work',
      state: 'ready',
      hasConfig: true,
      hasDirectory: true,
      meta: { name: 'work', createdAt: '2026-01-01' },
    })
    mockRemoveStoredProfile.mockReset()
    const closeFn = vi.fn()
    mockCreateInterface.mockReturnValue({
      question: (_q: string, cb: (answer: string) => void) => cb('y'),
      close: closeFn,
    } as any)
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'remove', 'work'])

    expect(mockRemoveStoredProfile).toHaveBeenCalledWith('work')
    expect(closeFn).toHaveBeenCalled()
  })

  test('cancels removal when user answers n', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'work',
      dir: '/tmp/profiles/work',
      state: 'ready',
      hasConfig: true,
      hasDirectory: true,
      meta: { name: 'work', createdAt: '2026-01-01' },
    })
    mockCreateInterface.mockReturnValue({
      question: (_q: string, cb: (answer: string) => void) => cb('n'),
      close: vi.fn(),
    } as any)
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'remove', 'work'])

    expect(log).toHaveBeenCalledWith('Cancelled')
    expect(mockRemoveStoredProfile).not.toHaveBeenCalled()
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
    mockRemoveStoredProfile.mockReset()
    mockRemoveStoredProfile.mockImplementation(() => {
      throw 'string error'
    })
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()
    await expect(program.parseAsync(['node', 'ccm', 'remove', 'work', '--force'])).rejects.toThrow(
      'exit:1',
    )
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('string error'))
  })

  test('shows drift state in success message for orphaned profiles', async () => {
    mockGetStoredProfile.mockReturnValue({
      name: 'orphan',
      dir: '/tmp/profiles/orphan',
      state: 'orphaned',
      hasConfig: false,
      hasDirectory: true,
    })
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'remove', 'orphan', '--force'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('(orphaned)'))
  })
})
