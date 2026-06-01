import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { registerCreate } from '../../src/commands/create.js'

vi.mock('../../src/lib/config.js', () => ({
  addProfile: vi.fn(),
}))
vi.mock('../../src/lib/compliance.js', () => ({
  getCompactComplianceNoticeLines: vi.fn(),
}))
vi.mock('../../src/lib/profiles.js', () => ({
  createProfileDir: vi.fn(),
  removeProfileDir: vi.fn(),
}))
vi.mock('../../src/lib/profile-config-copy.js', () => ({
  applyProfileConfigCopy: vi.fn(),
  planProfileConfigCopy: vi.fn(),
}))
vi.mock('../../src/lib/browsers.js', () => ({
  ensureBrowserWrapper: vi.fn(),
  removeBrowserWrapper: vi.fn(),
}))

import { ensureBrowserWrapper, removeBrowserWrapper } from '../../src/lib/browsers.js'
import { getCompactComplianceNoticeLines } from '../../src/lib/compliance.js'
import { addProfile } from '../../src/lib/config.js'
import { applyProfileConfigCopy, planProfileConfigCopy } from '../../src/lib/profile-config-copy.js'
import { createProfileDir, removeProfileDir } from '../../src/lib/profiles.js'

const mockAddProfile = vi.mocked(addProfile)
const mockGetCompactComplianceNoticeLines = vi.mocked(getCompactComplianceNoticeLines)
const mockCreateProfileDir = vi.mocked(createProfileDir)
const mockRemoveProfileDir = vi.mocked(removeProfileDir)
const mockEnsureBrowserWrapper = vi.mocked(ensureBrowserWrapper)
const mockRemoveBrowserWrapper = vi.mocked(removeBrowserWrapper)
const mockApplyProfileConfigCopy = vi.mocked(applyProfileConfigCopy)
const mockPlanProfileConfigCopy = vi.mocked(planProfileConfigCopy)

beforeEach(() => {
  vi.resetAllMocks()
  mockGetCompactComplianceNoticeLines.mockReturnValue(['warning line 1', 'warning line 2'])
  mockPlanProfileConfigCopy.mockReturnValue({
    sourceName: 'base',
    targetName: 'work',
    operations: [],
    overwriteCount: 0,
    createCount: 0,
  })
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(process, 'exit').mockImplementation(code => {
    throw new Error(`exit:${code}`)
  })
})

function createProgram() {
  const program = new Command()
  program.exitOverride()
  registerCreate(program)
  return program
}

describe('command: create', () => {
  describe('profile creation', () => {
    test('registers the documented command and option descriptions', () => {
      const program = createProgram()
      const command = program.commands.find(candidate => candidate.name() === 'create')
      const labelOption = command?.options.find(option => option.long === '--label')
      const browserOption = command?.options.find(option => option.long === '--browser')
      const fromOption = command?.options.find(option => option.long === '--from')

      expect(command?.description()).toBe('Create a new profile')
      expect(labelOption?.description).toBe('Profile label')
      expect(browserOption?.description).toBe('Browser for OAuth login')
      expect(fromOption?.description).toBe('Initialize non-auth config from an existing profile')
    })

    test('creates profile directory and adds to config', () => {
      mockCreateProfileDir.mockReturnValue('/tmp/profiles/work')
      const program = createProgram()
      program.parse(['node', 'ccm', 'create', 'work'])

      expect(mockCreateProfileDir).toHaveBeenCalledWith('work')
      expect(mockAddProfile).toHaveBeenCalledWith(expect.objectContaining({ name: 'work' }))
    })

    test('passes label option to addProfile', () => {
      mockCreateProfileDir.mockReturnValue('/tmp/profiles/myprof')
      const program = createProgram()
      program.parse(['node', 'ccm', 'create', 'myprof', '--label', 'My Profile'])

      expect(mockAddProfile).toHaveBeenCalledWith(expect.objectContaining({ label: 'My Profile' }))
    })

    test('fails if profile already exists', () => {
      mockCreateProfileDir.mockImplementation(() => {
        throw new Error('already exists')
      })
      const program = createProgram()
      expect(() => program.parse(['node', 'ccm', 'create', 'dup'])).toThrow('exit:1')
    })

    test('prints success message with profile name', () => {
      mockCreateProfileDir.mockReturnValue('/tmp/x')
      const log = vi.spyOn(console, 'log')
      const program = createProgram()
      program.parse(['node', 'ccm', 'create', 'test'])

      expect(log).toHaveBeenCalledWith(expect.stringContaining('Profile "test" created'))
    })

    test('prints compact compliance notice after success', () => {
      mockCreateProfileDir.mockReturnValue('/tmp/x')
      const log = vi.spyOn(console, 'log')
      const program = createProgram()
      program.parse(['node', 'ccm', 'create', 'test'])

      expect(mockGetCompactComplianceNoticeLines).toHaveBeenCalledTimes(1)
      expect(log).toHaveBeenCalledWith('warning line 1')
      expect(log).toHaveBeenCalledWith('warning line 2')
    })

    test('prints error message on failure', () => {
      mockCreateProfileDir.mockImplementation(() => {
        throw new Error('oops')
      })
      const errLog = vi.spyOn(console, 'error')
      const program = createProgram()
      expect(() => program.parse(['node', 'ccm', 'create', 'fail'])).toThrow('exit:1')
      expect(errLog).toHaveBeenCalledWith(expect.stringContaining('oops'))
    })

    test('sets createdAt as ISO string', () => {
      mockCreateProfileDir.mockReturnValue('/tmp/x')
      const program = createProgram()
      program.parse(['node', 'ccm', 'create', 'dated'])

      const meta = mockAddProfile.mock.calls[0]?.[0]
      expect(() => new Date(meta.createdAt).toISOString()).not.toThrow()
    })

    test('rolls back profile dir when addProfile fails', () => {
      mockCreateProfileDir.mockReturnValue('/tmp/profiles/bad')
      mockAddProfile.mockImplementation(() => {
        throw new Error('config write failed')
      })
      const program = createProgram()
      expect(() => program.parse(['node', 'ccm', 'create', 'bad'])).toThrow('exit:1')
      expect(mockRemoveProfileDir).toHaveBeenCalledWith('bad')
      expect(mockRemoveBrowserWrapper).toHaveBeenCalledWith('bad')
    })

    test('handles rollback failure silently when addProfile fails', () => {
      mockCreateProfileDir.mockReturnValue('/tmp/profiles/bad')
      mockAddProfile.mockImplementation(() => {
        throw new Error('config write failed')
      })
      mockRemoveProfileDir.mockImplementation(() => {
        throw new Error('cleanup failed')
      })
      const errLog = vi.spyOn(console, 'error')
      const program = createProgram()
      expect(() => program.parse(['node', 'ccm', 'create', 'bad'])).toThrow('exit:1')
      expect(errLog).toHaveBeenCalledWith(expect.stringContaining('config write failed'))
    })

    test('handles browser wrapper cleanup failure silently when addProfile fails', () => {
      mockCreateProfileDir.mockReturnValue('/tmp/profiles/bad')
      mockAddProfile.mockImplementation(() => {
        throw new Error('config write failed')
      })
      mockRemoveBrowserWrapper.mockImplementation(() => {
        throw new Error('wrapper cleanup failed')
      })
      const errLog = vi.spyOn(console, 'error')
      const program = createProgram()
      expect(() => program.parse(['node', 'ccm', 'create', 'bad'])).toThrow('exit:1')
      expect(errLog).toHaveBeenCalledWith(expect.stringContaining('config write failed'))
    })

    test('handles non-Error throw in catch block', () => {
      mockCreateProfileDir.mockImplementation(() => {
        throw 'string error'
      })
      const errLog = vi.spyOn(console, 'error')
      const program = createProgram()
      expect(() => program.parse(['node', 'ccm', 'create', 'bad'])).toThrow('exit:1')
      expect(errLog).toHaveBeenCalledWith(expect.stringContaining('string error'))
    })

    test('passes --browser option through ensureBrowserWrapper to addProfile', () => {
      mockCreateProfileDir.mockReturnValue('/tmp/profiles/work')
      mockEnsureBrowserWrapper.mockReturnValue('/usr/bin/firefox')
      const program = createProgram()
      program.parse(['node', 'ccm', 'create', 'work', '--browser', '/usr/bin/firefox'])

      expect(mockEnsureBrowserWrapper).toHaveBeenCalledWith('work', '/usr/bin/firefox')
      expect(mockAddProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'work', browser: '/usr/bin/firefox' }),
      )
    })

    test('stores browser wrapper path when browser command has spaces', () => {
      mockCreateProfileDir.mockReturnValue('/tmp/profiles/work')
      mockEnsureBrowserWrapper.mockReturnValue('/home/.ccm/browsers/work.sh')
      const program = createProgram()
      program.parse(['node', 'ccm', 'create', 'work', '--browser', 'open -a Firefox'])

      expect(mockEnsureBrowserWrapper).toHaveBeenCalledWith('work', 'open -a Firefox')
      expect(mockAddProfile).toHaveBeenCalledWith(
        expect.objectContaining({ browser: '/home/.ccm/browsers/work.sh' }),
      )
    })

    test('does not call ensureBrowserWrapper when no --browser', () => {
      mockCreateProfileDir.mockReturnValue('/tmp/profiles/work')
      const log = vi.spyOn(console, 'log')
      const program = createProgram()
      program.parse(['node', 'ccm', 'create', 'work'])

      expect(mockEnsureBrowserWrapper).not.toHaveBeenCalled()
      expect(mockAddProfile).toHaveBeenCalledWith(expect.objectContaining({ browser: undefined }))
      expect(log).toHaveBeenCalledWith('  Next: ccm login work')
    })

    test('copies non-auth config from source profile when --from is provided', () => {
      mockCreateProfileDir.mockReturnValue('/tmp/profiles/work')
      mockPlanProfileConfigCopy.mockReturnValue({
        sourceName: 'base',
        targetName: 'work',
        operations: [
          {
            sourcePath: '/tmp/profiles/base/settings.json',
            targetPath: '/tmp/profiles/work/settings.json',
            relativePath: 'settings.json',
            kind: 'file',
            overwrite: false,
          },
        ],
        overwriteCount: 0,
        createCount: 1,
      })

      const program = createProgram()
      program.parse(['node', 'ccm', 'create', 'work', '--from', 'base'])

      expect(mockPlanProfileConfigCopy).toHaveBeenCalledWith('base', 'work')
      expect(mockApplyProfileConfigCopy).toHaveBeenCalledTimes(1)
      expect(mockAddProfile).toHaveBeenCalledWith(expect.objectContaining({ name: 'work' }))
    })

    test('does not copy profile config when --from is not provided', () => {
      mockCreateProfileDir.mockReturnValue('/tmp/profiles/work')

      const program = createProgram()
      program.parse(['node', 'ccm', 'create', 'work'])

      expect(mockPlanProfileConfigCopy).not.toHaveBeenCalled()
      expect(mockApplyProfileConfigCopy).not.toHaveBeenCalled()
    })

    test('rolls back profile dir and browser wrapper when --from copy fails', () => {
      mockCreateProfileDir.mockReturnValue('/tmp/profiles/work')
      mockEnsureBrowserWrapper.mockReturnValue('/home/.ccm/browsers/work.sh')
      mockPlanProfileConfigCopy.mockImplementation(() => {
        throw new Error('source profile missing')
      })

      const program = createProgram()
      expect(() =>
        program.parse(['node', 'ccm', 'create', 'work', '--from', 'base', '--browser', 'firefox']),
      ).toThrow('exit:1')

      expect(mockRemoveProfileDir).toHaveBeenCalledWith('work')
      expect(mockRemoveBrowserWrapper).toHaveBeenCalledWith('work')
    })
  })
})
