import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { registerRename } from '../../src/commands/rename.js'

vi.mock('../../src/lib/profile-store.js', () => ({
  renameStoredProfile: vi.fn(),
}))

import { renameStoredProfile } from '../../src/lib/profile-store.js'

const mockRenameStoredProfile = vi.mocked(renameStoredProfile)

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
  registerRename(program)
  return program
}

describe('command: rename', () => {
  test('calls renameStoredProfile and logs success', async () => {
    const log = vi.spyOn(console, 'log')
    const program = createProgram()
    await program.parseAsync(['node', 'ccm', 'rename', 'old', 'new'])

    expect(mockRenameStoredProfile).toHaveBeenCalledWith('old', 'new')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('renamed'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"old"'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"new"'))
  })

  test('prints error and exits 1 on failure', async () => {
    mockRenameStoredProfile.mockImplementation(() => {
      throw new Error('rename failed')
    })
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()

    await expect(program.parseAsync(['node', 'ccm', 'rename', 'old', 'new'])).rejects.toThrow(
      'exit:1',
    )
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('rename failed'))
  })

  test('handles non-Error throw in catch block', async () => {
    mockRenameStoredProfile.mockImplementation(() => {
      throw 'string error'
    })
    const errLog = vi.spyOn(console, 'error')
    const program = createProgram()

    await expect(program.parseAsync(['node', 'ccm', 'rename', 'old', 'new'])).rejects.toThrow(
      'exit:1',
    )
    expect(errLog).toHaveBeenCalledWith(expect.stringContaining('string error'))
  })
})
