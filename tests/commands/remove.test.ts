import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { registerRemove } from '../../src/commands/remove.js'

vi.mock('node:readline', () => ({
  createInterface: vi.fn(),
}))
vi.mock('../../src/lib/config.js', () => ({
  removeProfile: vi.fn(),
}))
vi.mock('../../src/lib/profiles.js', () => ({
  removeProfileDir: vi.fn(),
  profileExists: vi.fn(),
}))

import { createInterface } from 'node:readline'
import { removeProfile } from '../../src/lib/config.js'
import { profileExists, removeProfileDir } from '../../src/lib/profiles.js'

const mockCreateInterface = vi.mocked(createInterface)
const mockRemoveProfile = vi.mocked(removeProfile)
const mockRemoveProfileDir = vi.mocked(removeProfileDir)
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
  registerRemove(program)
  return program
}

describe('command: remove', () => {
  test('removes profile directory and config entry with --force', async () => {
    mockProfileExists.mockReturnValue(true)
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'remove', 'work', '--force'])

    expect(mockRemoveProfileDir).toHaveBeenCalledWith('work')
    expect(mockRemoveProfile).toHaveBeenCalledWith('work')
  })

  test('fails if profile does not exist', async () => {
    mockProfileExists.mockReturnValue(false)
    const program = createProgram()
    await expect(program.parseAsync(['node', 'ccm', 'remove', 'ghost', '--force'])).rejects.toThrow(
      'exit:1',
    )
  })

  test('prints success message after removal', async () => {
    mockProfileExists.mockReturnValue(true)
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'remove', 'test', '--force'])

    expect(log).toHaveBeenCalledWith(expect.stringContaining('removed'))
  })

  test('prints error message on failure', async () => {
    mockProfileExists.mockReturnValue(true)
    mockRemoveProfileDir.mockImplementation(() => {
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
    mockProfileExists.mockReturnValue(true)
    mockRemoveProfileDir.mockReset()
    mockRemoveProfile.mockReset()
    const closeFn = vi.fn()
    mockCreateInterface.mockReturnValue({
      question: (_q: string, cb: (answer: string) => void) => cb('y'),
      close: closeFn,
    } as any)
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'remove', 'work'])

    expect(mockRemoveProfileDir).toHaveBeenCalledWith('work')
    expect(mockRemoveProfile).toHaveBeenCalledWith('work')
    expect(closeFn).toHaveBeenCalled()
  })

  test('cancels removal when user answers n', async () => {
    mockProfileExists.mockReturnValue(true)
    mockCreateInterface.mockReturnValue({
      question: (_q: string, cb: (answer: string) => void) => cb('n'),
      close: vi.fn(),
    } as any)
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'remove', 'work'])

    expect(log).toHaveBeenCalledWith('Cancelled')
    expect(mockRemoveProfileDir).not.toHaveBeenCalled()
    expect(mockRemoveProfile).not.toHaveBeenCalled()
  })

  test('handles non-Error throw in catch block', async () => {
    mockProfileExists.mockReturnValue(true)
    mockRemoveProfile.mockReset()
    mockRemoveProfile.mockImplementation(() => {
      throw 'string error'
    })
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()
    await expect(program.parseAsync(['node', 'ccm', 'remove', 'work', '--force'])).rejects.toThrow(
      'exit:1',
    )
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('string error'))
  })
})
