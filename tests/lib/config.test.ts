import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  addProfile,
  getProfile,
  loadConfig,
  removeProfile,
  saveConfig,
} from '../../src/lib/config.js'
import { cleanupTempDir, createTempCcmHome, type TempCcmHome } from '../helpers.js'

let tmp: TempCcmHome

beforeEach(() => {
  tmp = createTempCcmHome()
})
afterEach(() => {
  cleanupTempDir(tmp.ccmHome)
})

describe('loadConfig', () => {
  test('returns default config when config file does not exist', () => {
    const config = loadConfig(tmp.configFile)
    expect(config).toEqual({ profiles: {} })
  })

  test('returns default config when config dir does not exist', () => {
    const config = loadConfig('/tmp/nonexistent-ccm-dir/config.json')
    expect(config).toEqual({ profiles: {} })
  })

  test('loads and parses existing config file', () => {
    const data = { profiles: { work: { name: 'work', createdAt: '2026-01-01' } } }
    writeFileSync(tmp.configFile, JSON.stringify(data))
    expect(loadConfig(tmp.configFile)).toEqual(data)
  })

  test('recovers from malformed JSON by returning default config', () => {
    writeFileSync(tmp.configFile, '{invalid json')
    expect(loadConfig(tmp.configFile)).toEqual({ profiles: {} })
  })

  test('recovers from empty file by returning default config', () => {
    writeFileSync(tmp.configFile, '')
    expect(loadConfig(tmp.configFile)).toEqual({ profiles: {} })
  })

  test('preserves unknown fields in config', () => {
    const data = { profiles: {}, customField: 'value' }
    writeFileSync(tmp.configFile, JSON.stringify(data))
    expect(loadConfig(tmp.configFile)).toEqual(data)
  })

  test('returns default when profiles field is null', () => {
    writeFileSync(tmp.configFile, JSON.stringify({ profiles: null }))
    expect(loadConfig(tmp.configFile)).toEqual({ profiles: {} })
  })

  test('returns default when profiles field is not an object', () => {
    writeFileSync(tmp.configFile, JSON.stringify({ profiles: 'string' }))
    expect(loadConfig(tmp.configFile)).toEqual({ profiles: {} })
  })

  test('returns default when parsed value has no profiles key', () => {
    writeFileSync(tmp.configFile, JSON.stringify({ other: 'field' }))
    expect(loadConfig(tmp.configFile)).toEqual({ profiles: {} })
  })

  test('returns default when parsed value is null', () => {
    writeFileSync(tmp.configFile, 'null')
    expect(loadConfig(tmp.configFile)).toEqual({ profiles: {} })
  })

  test('returns default when parsed value is an array', () => {
    writeFileSync(tmp.configFile, '[]')
    expect(loadConfig(tmp.configFile)).toEqual({ profiles: {} })
  })

  test('returns default when parsed value is a number', () => {
    writeFileSync(tmp.configFile, '42')
    expect(loadConfig(tmp.configFile)).toEqual({ profiles: {} })
  })
})

describe('saveConfig', () => {
  test('creates config file if it does not exist', () => {
    saveConfig({ profiles: {} }, tmp.configFile)
    expect(JSON.parse(readFileSync(tmp.configFile, 'utf-8'))).toEqual({ profiles: {} })
  })

  test('creates parent directories if they do not exist', () => {
    const nested = `${tmp.ccmHome}/deep/nested/config.json`
    saveConfig({ profiles: {} }, nested)
    expect(JSON.parse(readFileSync(nested, 'utf-8'))).toEqual({ profiles: {} })
  })

  test('overwrites existing config file', () => {
    writeFileSync(tmp.configFile, JSON.stringify({ profiles: {} }))
    const updated = { profiles: { x: { name: 'x', createdAt: '2026-01-01' } } }
    saveConfig(updated, tmp.configFile)
    expect(JSON.parse(readFileSync(tmp.configFile, 'utf-8'))).toEqual(updated)
  })

  test('writes valid JSON', () => {
    saveConfig({ profiles: { a: { name: 'a', createdAt: '2026-01-01' } } }, tmp.configFile)
    expect(() => JSON.parse(readFileSync(tmp.configFile, 'utf-8'))).not.toThrow()
  })

  test('writes config with restrictive permissions (0o600)', () => {
    saveConfig({ profiles: {} }, tmp.configFile)
    const mode = statSync(tmp.configFile).mode & 0o777
    expect(mode).toBe(0o600)
  })

  test('handles concurrent writes without data loss', () => {
    for (let i = 0; i < 10; i++) {
      saveConfig(
        { profiles: { [`p${i}`]: { name: `p${i}`, createdAt: '2026-01-01' } } },
        tmp.configFile,
      )
    }
    const final = JSON.parse(readFileSync(tmp.configFile, 'utf-8'))
    expect(final.profiles.p9).toBeDefined()
  })
})

describe('addProfile', () => {
  test('adds a new profile to empty config', () => {
    addProfile({ name: 'work', createdAt: '2026-01-01' }, tmp.configFile)
    expect(loadConfig(tmp.configFile).profiles.work).toBeDefined()
  })

  test('adds a new profile to existing profiles', () => {
    addProfile({ name: 'work', createdAt: '2026-01-01' }, tmp.configFile)
    addProfile({ name: 'personal', createdAt: '2026-01-02' }, tmp.configFile)
    const config = loadConfig(tmp.configFile)
    expect(Object.keys(config.profiles)).toHaveLength(2)
  })

  test('throws if profile name already exists', () => {
    addProfile({ name: 'work', createdAt: '2026-01-01' }, tmp.configFile)
    expect(() => addProfile({ name: 'work', createdAt: '2026-01-02' }, tmp.configFile)).toThrow(
      'already exists',
    )
  })

  test('persists profile to disk after adding', () => {
    addProfile({ name: 'test', createdAt: '2026-03-01' }, tmp.configFile)
    const raw = JSON.parse(readFileSync(tmp.configFile, 'utf-8'))
    expect(raw.profiles.test.name).toBe('test')
  })
})

describe('removeProfile', () => {
  test('removes an existing profile', () => {
    addProfile({ name: 'work', createdAt: '2026-01-01' }, tmp.configFile)
    removeProfile('work', tmp.configFile)
    expect(loadConfig(tmp.configFile).profiles.work).toBeUndefined()
  })

  test('throws if profile does not exist', () => {
    expect(() => removeProfile('nonexistent', tmp.configFile)).toThrow('not found')
  })

  test('persists config to disk after removing', () => {
    addProfile({ name: 'a', createdAt: '2026-01-01' }, tmp.configFile)
    removeProfile('a', tmp.configFile)
    const raw = JSON.parse(readFileSync(tmp.configFile, 'utf-8'))
    expect(raw.profiles.a).toBeUndefined()
  })

  test('does not affect other profiles', () => {
    addProfile({ name: 'a', createdAt: '2026-01-01' }, tmp.configFile)
    addProfile({ name: 'b', createdAt: '2026-01-02' }, tmp.configFile)
    removeProfile('a', tmp.configFile)
    expect(loadConfig(tmp.configFile).profiles.b).toBeDefined()
  })
})

describe('getProfile', () => {
  test('returns profile by name', () => {
    addProfile({ name: 'work', createdAt: '2026-01-01' }, tmp.configFile)
    expect(getProfile('work', tmp.configFile)?.name).toBe('work')
  })

  test('returns undefined for non-existent profile', () => {
    expect(getProfile('nope', tmp.configFile)).toBeUndefined()
  })

  test('returns correct profile when multiple exist', () => {
    addProfile({ name: 'a', createdAt: '2026-01-01' }, tmp.configFile)
    addProfile({ name: 'b', createdAt: '2026-01-02', label: 'B Label' }, tmp.configFile)
    expect(getProfile('b', tmp.configFile)?.label).toBe('B Label')
  })
})
