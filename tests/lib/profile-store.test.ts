import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { ensureBrowserWrapper, getBrowserWrapperPath } from '../../src/lib/browsers.js'
import { addProfile, loadConfig } from '../../src/lib/config.js'
import {
  getStoredProfile,
  listStoredProfiles,
  removeStoredProfile,
  renameStoredProfile,
} from '../../src/lib/profile-store.js'
import { createProfileDir } from '../../src/lib/profiles.js'
import { cleanupTempDir, createTempCcmHome, type TempCcmHome } from '../helpers.js'

let tmp: TempCcmHome
let browsersDir: string

beforeEach(() => {
  tmp = createTempCcmHome()
  browsersDir = join(tmp.ccmHome, 'browsers')
  mkdirSync(tmp.profilesDir, { recursive: true })
})

afterEach(() => {
  cleanupTempDir(tmp.ccmHome)
})

describe('listStoredProfiles', () => {
  test('merges config and filesystem profiles into a single view', () => {
    addProfile({ name: 'config-only', createdAt: '2026-01-01' }, tmp.configFile)
    addProfile({ name: 'ready', createdAt: '2026-01-02' }, tmp.configFile)
    createProfileDir('ready', tmp.profilesDir)
    createProfileDir('orphan', tmp.profilesDir)

    const profiles = listStoredProfiles(tmp.configFile, tmp.profilesDir)

    expect(profiles).toEqual([
      expect.objectContaining({ name: 'config-only', state: 'config-only' }),
      expect.objectContaining({ name: 'orphan', state: 'orphaned' }),
      expect.objectContaining({ name: 'ready', state: 'ready' }),
    ])
  })
})

describe('getStoredProfile', () => {
  test('returns undefined when profile is absent from config and filesystem', () => {
    expect(getStoredProfile('ghost', tmp.configFile, tmp.profilesDir)).toBeUndefined()
  })
})

describe('removeStoredProfile', () => {
  test('removes config entry, profile directory, and browser wrapper for ready profiles', () => {
    addProfile({ name: 'work', createdAt: '2026-01-01' }, tmp.configFile)
    createProfileDir('work', tmp.profilesDir)
    ensureBrowserWrapper('work', 'open -a Chrome', browsersDir)

    removeStoredProfile('work', tmp.configFile, tmp.profilesDir, browsersDir)

    expect(loadConfig(tmp.configFile).profiles.work).toBeUndefined()
    expect(existsSync(join(tmp.profilesDir, 'work'))).toBe(false)
    expect(existsSync(getBrowserWrapperPath('work', browsersDir))).toBe(false)
  })

  test('removes config-only profiles without touching Claude auth status', () => {
    addProfile({ name: 'stale', createdAt: '2026-01-01' }, tmp.configFile)

    removeStoredProfile('stale', tmp.configFile, tmp.profilesDir, browsersDir)

    expect(loadConfig(tmp.configFile).profiles.stale).toBeUndefined()
  })

  test('removes orphaned profile directories even without config metadata', () => {
    createProfileDir('orphan', tmp.profilesDir)

    removeStoredProfile('orphan', tmp.configFile, tmp.profilesDir, browsersDir)

    expect(existsSync(join(tmp.profilesDir, 'orphan'))).toBe(false)
  })
})

describe('renameStoredProfile', () => {
  test('renames ready profile: config + dir + wrapper all updated', () => {
    addProfile({ name: 'old', createdAt: '2026-01-01', label: 'L' }, tmp.configFile)
    createProfileDir('old', tmp.profilesDir)
    ensureBrowserWrapper('old', 'open -a Chrome', browsersDir)

    renameStoredProfile('old', 'new', tmp.configFile, tmp.profilesDir, browsersDir)

    const config = loadConfig(tmp.configFile)
    expect(config.profiles.new).toBeDefined()
    expect(config.profiles.new.name).toBe('new')
    expect(config.profiles.new.label).toBe('L')
    expect(config.profiles.old).toBeUndefined()
    expect(existsSync(join(tmp.profilesDir, 'new'))).toBe(true)
    expect(existsSync(join(tmp.profilesDir, 'old'))).toBe(false)
    expect(existsSync(getBrowserWrapperPath('new', browsersDir))).toBe(true)
    expect(existsSync(getBrowserWrapperPath('old', browsersDir))).toBe(false)
  })

  test('renames config-only profile (no dir to rename)', () => {
    addProfile({ name: 'old', createdAt: '2026-01-01' }, tmp.configFile)

    renameStoredProfile('old', 'new', tmp.configFile, tmp.profilesDir, browsersDir)

    const config = loadConfig(tmp.configFile)
    expect(config.profiles.new).toBeDefined()
    expect(config.profiles.old).toBeUndefined()
  })

  test('renames profile without browser wrapper', () => {
    addProfile({ name: 'old', createdAt: '2026-01-01' }, tmp.configFile)
    createProfileDir('old', tmp.profilesDir)

    renameStoredProfile('old', 'new', tmp.configFile, tmp.profilesDir, browsersDir)

    expect(existsSync(join(tmp.profilesDir, 'new'))).toBe(true)
    expect(existsSync(join(tmp.profilesDir, 'old'))).toBe(false)
    expect(existsSync(getBrowserWrapperPath('new', browsersDir))).toBe(false)
  })

  test('old artifacts are completely gone after rename', () => {
    addProfile({ name: 'old', createdAt: '2026-01-01' }, tmp.configFile)
    createProfileDir('old', tmp.profilesDir)
    ensureBrowserWrapper('old', 'open -a Chrome', browsersDir)

    renameStoredProfile('old', 'new', tmp.configFile, tmp.profilesDir, browsersDir)

    expect(getStoredProfile('old', tmp.configFile, tmp.profilesDir)).toBeUndefined()
    const newProfile = getStoredProfile('new', tmp.configFile, tmp.profilesDir)
    expect(newProfile).toBeDefined()
    expect(newProfile?.state).toBe('ready')
  })
})
