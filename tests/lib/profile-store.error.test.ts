import { beforeEach, describe, expect, test, vi } from 'vitest'

const {
  mockExistsSync,
  mockAddProfile,
  mockGetProfile,
  mockLoadConfig,
  mockRemoveProfile,
  mockRenameProfile,
  mockFinalizeStagedBrowserWrapperRemoval,
  mockGetBrowserWrapperPath,
  mockRenameBrowserWrapper,
  mockRestoreStagedBrowserWrapper,
  mockStageBrowserWrapperRemoval,
  mockFinalizeStagedProfileDirRemoval,
  mockGetProfileDir,
  mockListProfileDirs,
  mockProfileExists,
  mockRenameProfileDir,
  mockRestoreStagedProfileDir,
  mockStageProfileDirRemoval,
  mockValidateProfileName,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockAddProfile: vi.fn(),
  mockGetProfile: vi.fn(),
  mockLoadConfig: vi.fn(),
  mockRemoveProfile: vi.fn(),
  mockRenameProfile: vi.fn(),
  mockFinalizeStagedBrowserWrapperRemoval: vi.fn(),
  mockGetBrowserWrapperPath: vi.fn(
    (name: string, browsersDir = '/browsers') => `${browsersDir}/${name}.sh`,
  ),
  mockRenameBrowserWrapper: vi.fn(),
  mockRestoreStagedBrowserWrapper: vi.fn(),
  mockStageBrowserWrapperRemoval: vi.fn(),
  mockFinalizeStagedProfileDirRemoval: vi.fn(),
  mockGetProfileDir: vi.fn((name: string, profilesDir = '/profiles') => `${profilesDir}/${name}`),
  mockListProfileDirs: vi.fn(),
  mockProfileExists: vi.fn(),
  mockRenameProfileDir: vi.fn(),
  mockRestoreStagedProfileDir: vi.fn(),
  mockStageProfileDirRemoval: vi.fn(),
  mockValidateProfileName: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
}))

vi.mock('../../src/lib/config.js', () => ({
  addProfile: mockAddProfile,
  getProfile: mockGetProfile,
  loadConfig: mockLoadConfig,
  removeProfile: mockRemoveProfile,
  renameProfile: mockRenameProfile,
}))

vi.mock('../../src/lib/browsers.js', () => ({
  finalizeStagedBrowserWrapperRemoval: mockFinalizeStagedBrowserWrapperRemoval,
  getBrowserWrapperPath: mockGetBrowserWrapperPath,
  renameBrowserWrapper: mockRenameBrowserWrapper,
  restoreStagedBrowserWrapper: mockRestoreStagedBrowserWrapper,
  stageBrowserWrapperRemoval: mockStageBrowserWrapperRemoval,
}))

vi.mock('../../src/lib/profiles.js', () => ({
  finalizeStagedProfileDirRemoval: mockFinalizeStagedProfileDirRemoval,
  getProfileDir: mockGetProfileDir,
  listProfileDirs: mockListProfileDirs,
  profileExists: mockProfileExists,
  renameProfileDir: mockRenameProfileDir,
  restoreStagedProfileDir: mockRestoreStagedProfileDir,
  stageProfileDirRemoval: mockStageProfileDirRemoval,
  validateProfileName: mockValidateProfileName,
}))

import {
  listStoredProfiles,
  removeStoredProfile,
  renameStoredProfile,
} from '../../src/lib/profile-store.js'

beforeEach(() => {
  vi.resetAllMocks()
  mockExistsSync.mockReturnValue(false)
  mockLoadConfig.mockReturnValue({ profiles: {} })
  mockListProfileDirs.mockReturnValue([])
  mockProfileExists.mockReturnValue(false)
  mockStageBrowserWrapperRemoval.mockReturnValue(undefined)
})

describe('profile-store error paths', () => {
  test('throws when removing a profile that does not exist anywhere', () => {
    expect(() => removeStoredProfile('ghost', '/cfg.json', '/profiles', '/browsers')).toThrow(
      'Profile "ghost" does not exist',
    )
  })

  test('rethrows the original config removal error when rollback succeeds', () => {
    mockGetProfile.mockReturnValue({ name: 'work', createdAt: '2026-01-01' })
    mockProfileExists.mockReturnValue(true)
    mockStageProfileDirRemoval.mockReturnValue('/profiles/.work.staged')
    mockStageBrowserWrapperRemoval.mockReturnValue('/browsers/work.sh.staged')
    mockRemoveProfile.mockImplementation(() => {
      throw new Error('config fail')
    })

    expect(() => removeStoredProfile('work', '/cfg.json', '/profiles', '/browsers')).toThrowError(
      new Error('config fail'),
    )
    expect(mockRestoreStagedProfileDir).toHaveBeenCalledWith(
      '/profiles/.work.staged',
      'work',
      '/profiles',
    )
    expect(mockRestoreStagedBrowserWrapper).toHaveBeenCalledWith(
      '/browsers/work.sh.staged',
      'work',
      '/browsers',
    )
  })

  test('wraps config removal errors when rollback also fails', () => {
    mockGetProfile.mockReturnValue({ name: 'work', createdAt: '2026-01-01' })
    mockProfileExists.mockReturnValue(true)
    mockStageProfileDirRemoval.mockReturnValue('/profiles/.work.staged')
    mockStageBrowserWrapperRemoval.mockReturnValue('/browsers/work.sh.staged')
    mockRemoveProfile.mockImplementation(() => {
      throw 'config fail'
    })
    mockRestoreStagedProfileDir.mockImplementation(() => {
      throw 'dir restore fail'
    })
    mockRestoreStagedBrowserWrapper.mockImplementation(() => {
      throw new Error('wrapper restore fail')
    })

    expect(() => removeStoredProfile('work', '/cfg.json', '/profiles', '/browsers')).toThrow(
      'Failed to remove profile "work": config fail. Rollback failed: Rollback failed for profile "work": profile dir: dir restore fail; browser wrapper: wrapper restore fail',
    )
  })

  test('rethrows finalization errors when recovery succeeds and config already exists', () => {
    mockGetProfile
      .mockReturnValueOnce({ name: 'work', createdAt: '2026-01-01' })
      .mockReturnValueOnce({ name: 'work', createdAt: '2026-01-01' })
    mockProfileExists.mockReturnValue(true)
    mockStageProfileDirRemoval.mockReturnValue('/profiles/.work.staged')
    mockStageBrowserWrapperRemoval.mockReturnValue('/browsers/work.sh.staged')
    mockFinalizeStagedProfileDirRemoval.mockImplementation(() => {
      throw new Error('finalize fail')
    })

    expect(() => removeStoredProfile('work', '/cfg.json', '/profiles', '/browsers')).toThrowError(
      new Error('finalize fail'),
    )
    expect(mockRestoreStagedProfileDir).toHaveBeenCalledWith(
      '/profiles/.work.staged',
      'work',
      '/profiles',
    )
    expect(mockAddProfile).not.toHaveBeenCalled()
  })

  test('wraps finalization errors when recovery and config restore fail', () => {
    mockGetProfile
      .mockReturnValueOnce({ name: 'work', createdAt: '2026-01-01' })
      .mockReturnValueOnce(undefined)
    mockProfileExists.mockReturnValue(true)
    mockStageProfileDirRemoval.mockReturnValue('/profiles/.work.staged')
    mockFinalizeStagedProfileDirRemoval.mockImplementation(() => {
      throw new Error('finalize fail')
    })
    mockRestoreStagedProfileDir.mockImplementation(() => {
      throw new Error('restore fail')
    })
    mockAddProfile.mockImplementation(() => {
      throw new Error('config add fail')
    })

    expect(() => removeStoredProfile('work', '/cfg.json', '/profiles', '/browsers')).toThrow(
      'Failed to remove profile "work": finalize fail. Recovery failed: Rollback failed for profile "work": profile dir: restore fail; config: config add fail',
    )
  })

  test('lists stored profiles using reconciled config and filesystem names', () => {
    mockLoadConfig.mockReturnValue({
      profiles: {
        configOnly: { name: 'configOnly', createdAt: '2026-01-01' },
      },
    })
    mockListProfileDirs.mockReturnValue(['orphaned'])

    expect(listStoredProfiles('/cfg.json', '/profiles')).toEqual([
      expect.objectContaining({ name: 'configOnly', state: 'config-only' }),
      expect.objectContaining({ name: 'orphaned', state: 'orphaned' }),
    ])
  })

  test('finalizes a staged browser wrapper for config-only profiles', () => {
    mockGetProfile.mockReturnValue({ name: 'work', createdAt: '2026-01-01' })
    mockProfileExists.mockReturnValue(false)
    mockStageBrowserWrapperRemoval.mockReturnValue('/browsers/work.sh.staged')

    removeStoredProfile('work', '/cfg.json', '/profiles', '/browsers')

    expect(mockFinalizeStagedBrowserWrapperRemoval).toHaveBeenCalledWith('/browsers/work.sh.staged')
  })
})

describe('renameStoredProfile error paths', () => {
  test('throws when old profile does not exist', () => {
    expect(() =>
      renameStoredProfile('ghost', 'new', '/cfg.json', '/profiles', '/browsers'),
    ).toThrow('Profile "ghost" does not exist')
  })

  test('throws when old and new names are the same', () => {
    mockGetProfile.mockReturnValue({ name: 'a', createdAt: '2026-01-01' })
    mockProfileExists.mockReturnValue(true)
    expect(() => renameStoredProfile('a', 'a', '/cfg.json', '/profiles', '/browsers')).toThrow(
      'Old and new profile names are the same',
    )
  })

  test('throws on invalid new name via validateProfileName', () => {
    mockValidateProfileName.mockImplementation(() => {
      throw new Error(
        'Invalid profile name "a/b". Use only letters, numbers, hyphens, underscores.',
      )
    })
    expect(() => renameStoredProfile('old', 'a/b', '/cfg.json', '/profiles', '/browsers')).toThrow(
      'Invalid profile name',
    )
  })

  test('throws when new name already exists in config', () => {
    mockGetProfile.mockImplementation((name: string) => {
      if (name === 'old') return { name: 'old', createdAt: '2026-01-01' }
      if (name === 'new') return { name: 'new', createdAt: '2026-01-02' }
      return undefined
    })
    mockProfileExists.mockReturnValue(true)

    expect(() => renameStoredProfile('old', 'new', '/cfg.json', '/profiles', '/browsers')).toThrow(
      'Profile "new" already exists',
    )
  })

  test('throws when new profile directory already exists', () => {
    mockGetProfile.mockImplementation((name: string) => {
      if (name === 'old') return { name: 'old', createdAt: '2026-01-01' }
      return undefined
    })
    mockProfileExists.mockImplementation((name: string) => name === 'old' || name === 'new')

    expect(() => renameStoredProfile('old', 'new', '/cfg.json', '/profiles', '/browsers')).toThrow(
      'Profile directory "new" already exists',
    )
  })

  test('config rename failure triggers rollback of dir and wrapper', () => {
    mockGetProfile.mockImplementation((name: string) => {
      if (name === 'old') return { name: 'old', createdAt: '2026-01-01' }
      return undefined
    })
    mockProfileExists.mockImplementation((name: string) => name === 'old')
    mockExistsSync.mockReturnValue(true) // wrapper exists
    mockRenameProfile.mockImplementation(() => {
      throw new Error('config write fail')
    })

    expect(() => renameStoredProfile('old', 'new', '/cfg.json', '/profiles', '/browsers')).toThrow(
      'config write fail',
    )

    expect(mockRenameProfileDir).toHaveBeenCalledWith('old', 'new', '/profiles')
    expect(mockRenameBrowserWrapper).toHaveBeenCalledWith('old', 'new', '/browsers')
    // Rollback calls
    expect(mockRenameBrowserWrapper).toHaveBeenCalledWith('new', 'old', '/browsers')
    expect(mockRenameProfileDir).toHaveBeenCalledWith('new', 'old', '/profiles')
  })

  test('config rename failure + rollback failure produces compound error', () => {
    mockGetProfile.mockImplementation((name: string) => {
      if (name === 'old') return { name: 'old', createdAt: '2026-01-01' }
      return undefined
    })
    mockProfileExists.mockImplementation((name: string) => name === 'old')
    mockExistsSync.mockReturnValue(true)
    mockRenameProfile.mockImplementation(() => {
      throw new Error('config fail')
    })
    mockRenameBrowserWrapper
      .mockImplementationOnce(() => {}) // forward rename ok
      .mockImplementationOnce(() => {
        throw new Error('wrapper rollback fail')
      })
    mockRenameProfileDir
      .mockImplementationOnce(() => {}) // forward rename ok
      .mockImplementationOnce(() => {
        throw new Error('dir rollback fail')
      })

    expect(() => renameStoredProfile('old', 'new', '/cfg.json', '/profiles', '/browsers')).toThrow(
      'Failed to rename profile "old" to "new": config fail. Rollback failed: Rollback failed for rename "old" to "new": browser wrapper: wrapper rollback fail; profile dir: dir rollback fail',
    )
  })

  test('wrapper rename failure triggers rollback of dir only', () => {
    mockGetProfile.mockImplementation((name: string) => {
      if (name === 'old') return { name: 'old', createdAt: '2026-01-01' }
      return undefined
    })
    mockProfileExists.mockImplementation((name: string) => name === 'old')
    mockExistsSync.mockReturnValue(true)
    mockRenameBrowserWrapper.mockImplementation(() => {
      throw new Error('wrapper fail')
    })

    expect(() => renameStoredProfile('old', 'new', '/cfg.json', '/profiles', '/browsers')).toThrow(
      'wrapper fail',
    )

    // Dir was renamed forward then rolled back
    expect(mockRenameProfileDir).toHaveBeenCalledWith('old', 'new', '/profiles')
    expect(mockRenameProfileDir).toHaveBeenCalledWith('new', 'old', '/profiles')
    // Config was never touched
    expect(mockRenameProfile).not.toHaveBeenCalled()
  })

  test('wrapper rename failure + dir rollback failure produces compound error', () => {
    mockGetProfile.mockImplementation((name: string) => {
      if (name === 'old') return { name: 'old', createdAt: '2026-01-01' }
      return undefined
    })
    mockProfileExists.mockImplementation((name: string) => name === 'old')
    mockExistsSync.mockReturnValue(true)
    mockRenameBrowserWrapper.mockImplementation(() => {
      throw new Error('wrapper fail')
    })
    mockRenameProfileDir
      .mockImplementationOnce(() => {}) // forward ok
      .mockImplementationOnce(() => {
        throw new Error('dir rollback fail')
      })

    expect(() => renameStoredProfile('old', 'new', '/cfg.json', '/profiles', '/browsers')).toThrow(
      'Failed to rename profile "old" to "new": wrapper fail. Rollback failed: Rollback failed for rename "old" to "new": profile dir: dir rollback fail',
    )
  })

  test('skips dir rename for config-only profiles', () => {
    mockGetProfile.mockImplementation((name: string) => {
      if (name === 'old') return { name: 'old', createdAt: '2026-01-01' }
      return undefined
    })
    mockProfileExists.mockReturnValue(false)

    renameStoredProfile('old', 'new', '/cfg.json', '/profiles', '/browsers')

    expect(mockRenameProfileDir).not.toHaveBeenCalled()
    expect(mockRenameProfile).toHaveBeenCalledWith('old', 'new', '/cfg.json')
  })

  test('skips wrapper rename when wrapper does not exist', () => {
    mockGetProfile.mockImplementation((name: string) => {
      if (name === 'old') return { name: 'old', createdAt: '2026-01-01' }
      return undefined
    })
    mockProfileExists.mockImplementation((name: string) => name === 'old')
    mockExistsSync.mockReturnValue(false) // no wrapper

    renameStoredProfile('old', 'new', '/cfg.json', '/profiles', '/browsers')

    expect(mockRenameBrowserWrapper).not.toHaveBeenCalled()
    expect(mockRenameProfile).toHaveBeenCalledWith('old', 'new', '/cfg.json')
  })

  test('handles non-Error throw in config rename', () => {
    mockGetProfile.mockImplementation((name: string) => {
      if (name === 'old') return { name: 'old', createdAt: '2026-01-01' }
      return undefined
    })
    mockProfileExists.mockImplementation((name: string) => name === 'old')
    mockExistsSync.mockReturnValue(false)
    mockRenameProfile.mockImplementation(() => {
      throw 'string error'
    })

    expect(() => renameStoredProfile('old', 'new', '/cfg.json', '/profiles', '/browsers')).toThrow(
      'string error',
    )
  })
})
