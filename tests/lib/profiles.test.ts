import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  createProfileDir,
  getProfileDir,
  listProfileDirs,
  profileExists,
  removeProfileDir,
  validateProfileName,
} from '../../src/lib/profiles.js'
import { cleanupTempDir, createTempCcmHome, type TempCcmHome } from '../helpers.js'

let tmp: TempCcmHome

beforeEach(() => {
  tmp = createTempCcmHome()
  mkdirSync(tmp.profilesDir, { recursive: true })
})
afterEach(() => {
  cleanupTempDir(tmp.ccmHome)
})

describe('validateProfileName', () => {
  test('rejects names with spaces', () => {
    expect(() => validateProfileName('my profile')).toThrow('Invalid profile name')
  })

  test('rejects names with path separators (/ and \\)', () => {
    expect(() => validateProfileName('a/b')).toThrow('Invalid profile name')
    expect(() => validateProfileName('a\\b')).toThrow('Invalid profile name')
  })

  test('rejects names starting with a dot', () => {
    expect(() => validateProfileName('.hidden')).toThrow('Invalid profile name')
  })

  test('rejects empty string', () => {
    expect(() => validateProfileName('')).toThrow('Invalid profile name')
  })

  test('rejects names with special characters', () => {
    expect(() => validateProfileName('foo@bar')).toThrow('Invalid profile name')
    expect(() => validateProfileName('foo!bar')).toThrow('Invalid profile name')
  })

  test('accepts valid alphanumeric names with hyphens and underscores', () => {
    expect(() => validateProfileName('work')).not.toThrow()
    expect(() => validateProfileName('my-profile')).not.toThrow()
    expect(() => validateProfileName('my_profile_2')).not.toThrow()
    expect(() => validateProfileName('Work123')).not.toThrow()
  })

  test('rejects names exceeding 64 characters', () => {
    expect(() => validateProfileName('a'.repeat(65))).toThrow('too long')
  })

  test('accepts names at exactly 64 characters', () => {
    expect(() => validateProfileName('a'.repeat(64))).not.toThrow()
  })
})

describe('createProfileDir', () => {
  test('creates profile directory under profiles dir', () => {
    const dir = createProfileDir('work', tmp.profilesDir)
    expect(existsSync(dir)).toBe(true)
    expect(dir).toBe(join(tmp.profilesDir, 'work'))
  })

  test('creates parent profiles dir if it does not exist', () => {
    const nested = join(tmp.ccmHome, 'new-profiles')
    const dir = createProfileDir('test', nested)
    expect(existsSync(dir)).toBe(true)
  })

  test('throws if profile directory already exists', () => {
    createProfileDir('dup', tmp.profilesDir)
    expect(() => createProfileDir('dup', tmp.profilesDir)).toThrow('already exists')
  })

  test('creates directory with correct permissions', () => {
    const dir = createProfileDir('perm-test', tmp.profilesDir)
    expect(existsSync(dir)).toBe(true)
  })
})

describe('removeProfileDir', () => {
  test('removes existing profile directory recursively', () => {
    const dir = createProfileDir('removeme', tmp.profilesDir)
    writeFileSync(join(dir, 'settings.json'), '{}')
    removeProfileDir('removeme', tmp.profilesDir)
    expect(existsSync(dir)).toBe(false)
  })

  test('throws if profile directory does not exist', () => {
    expect(() => removeProfileDir('ghost', tmp.profilesDir)).toThrow('does not exist')
  })

  test('does not affect other profile directories', () => {
    createProfileDir('keep', tmp.profilesDir)
    createProfileDir('remove', tmp.profilesDir)
    removeProfileDir('remove', tmp.profilesDir)
    expect(existsSync(join(tmp.profilesDir, 'keep'))).toBe(true)
  })
})

describe('getProfileDir', () => {
  test('returns correct path for profile name', () => {
    expect(getProfileDir('work', tmp.profilesDir)).toBe(join(tmp.profilesDir, 'work'))
  })

  test('returns path even if directory does not exist', () => {
    const path = getProfileDir('nonexistent', tmp.profilesDir)
    expect(path).toBe(join(tmp.profilesDir, 'nonexistent'))
    expect(existsSync(path)).toBe(false)
  })
})

describe('profileExists', () => {
  test('returns true for existing profile directory', () => {
    createProfileDir('exists', tmp.profilesDir)
    expect(profileExists('exists', tmp.profilesDir)).toBe(true)
  })

  test('returns false for non-existent profile directory', () => {
    expect(profileExists('nope', tmp.profilesDir)).toBe(false)
  })

  test('returns false if profiles dir does not exist', () => {
    expect(profileExists('any', '/tmp/nonexistent-profiles-dir')).toBe(false)
  })
})

describe('listProfileDirs', () => {
  test('returns empty array when no profiles exist', () => {
    expect(listProfileDirs(tmp.profilesDir)).toEqual([])
  })

  test('returns empty array when profiles dir does not exist', () => {
    expect(listProfileDirs('/tmp/nonexistent-profiles')).toEqual([])
  })

  test('returns all profile directory names', () => {
    createProfileDir('alpha', tmp.profilesDir)
    createProfileDir('beta', tmp.profilesDir)
    const list = listProfileDirs(tmp.profilesDir)
    expect(list.sort()).toEqual(['alpha', 'beta'])
  })

  test('does not include hidden files or non-directories', () => {
    createProfileDir('visible', tmp.profilesDir)
    mkdirSync(join(tmp.profilesDir, '.hidden'))
    writeFileSync(join(tmp.profilesDir, 'file.txt'), 'not a dir')
    const list = listProfileDirs(tmp.profilesDir)
    expect(list).toEqual(['visible'])
  })
})
