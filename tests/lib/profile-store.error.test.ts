import { beforeEach, describe, expect, test, vi } from 'vitest'

const {
  mockAddProfile,
  mockGetProfile,
  mockLoadConfig,
  mockRemoveProfile,
  mockFinalizeStagedBrowserWrapperRemoval,
  mockRestoreStagedBrowserWrapper,
  mockStageBrowserWrapperRemoval,
  mockFinalizeStagedProfileDirRemoval,
  mockGetProfileDir,
  mockListProfileDirs,
  mockProfileExists,
  mockRestoreStagedProfileDir,
  mockStageProfileDirRemoval,
} = vi.hoisted(() => ({
  mockAddProfile: vi.fn(),
  mockGetProfile: vi.fn(),
  mockLoadConfig: vi.fn(),
  mockRemoveProfile: vi.fn(),
  mockFinalizeStagedBrowserWrapperRemoval: vi.fn(),
  mockRestoreStagedBrowserWrapper: vi.fn(),
  mockStageBrowserWrapperRemoval: vi.fn(),
  mockFinalizeStagedProfileDirRemoval: vi.fn(),
  mockGetProfileDir: vi.fn((name: string, profilesDir = '/profiles') => `${profilesDir}/${name}`),
  mockListProfileDirs: vi.fn(),
  mockProfileExists: vi.fn(),
  mockRestoreStagedProfileDir: vi.fn(),
  mockStageProfileDirRemoval: vi.fn(),
}))

vi.mock('../../src/lib/config.js', () => ({
  addProfile: mockAddProfile,
  getProfile: mockGetProfile,
  loadConfig: mockLoadConfig,
  removeProfile: mockRemoveProfile,
}))

vi.mock('../../src/lib/browsers.js', () => ({
  finalizeStagedBrowserWrapperRemoval: mockFinalizeStagedBrowserWrapperRemoval,
  restoreStagedBrowserWrapper: mockRestoreStagedBrowserWrapper,
  stageBrowserWrapperRemoval: mockStageBrowserWrapperRemoval,
}))

vi.mock('../../src/lib/profiles.js', () => ({
  finalizeStagedProfileDirRemoval: mockFinalizeStagedProfileDirRemoval,
  getProfileDir: mockGetProfileDir,
  listProfileDirs: mockListProfileDirs,
  profileExists: mockProfileExists,
  restoreStagedProfileDir: mockRestoreStagedProfileDir,
  stageProfileDirRemoval: mockStageProfileDirRemoval,
}))

import { listStoredProfiles, removeStoredProfile } from '../../src/lib/profile-store.js'

beforeEach(() => {
  vi.resetAllMocks()
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

    expect(() => removeStoredProfile('work', '/cfg.json', '/profiles', '/browsers')).toThrow(
      'config fail',
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
    mockFinalizeStagedProfileDirRemoval.mockImplementation(() => {
      throw new Error('finalize fail')
    })

    expect(() => removeStoredProfile('work', '/cfg.json', '/profiles', '/browsers')).toThrow(
      'finalize fail',
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
})
