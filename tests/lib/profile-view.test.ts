import { describe, expect, test } from 'vitest'
import type { StoredProfile } from '../../src/lib/profile-store.js'
import {
  accountLabel,
  authMethodLabel,
  NO_ACCOUNT_PLACEHOLDER,
  toProfileView,
} from '../../src/lib/profile-view.js'

const readyProfile: StoredProfile = {
  name: 'work',
  dir: '/tmp/profiles/work',
  state: 'ready',
  hasConfig: true,
  hasDirectory: true,
  meta: { name: 'work', createdAt: '2026-01-15T00:00:00.000Z' },
}

describe('accountLabel', () => {
  test('prefers email', () => {
    expect(
      accountLabel({ loggedIn: true, authMethod: 'x', email: 'a@b.c', apiKeySource: 'env' }),
    ).toBe('a@b.c')
  })

  test('falls back to apiKeySource when email absent', () => {
    expect(accountLabel({ loggedIn: true, authMethod: 'x', apiKeySource: 'env' })).toBe('env')
  })

  test('returns null when neither present', () => {
    expect(accountLabel({ loggedIn: false, authMethod: 'none' })).toBeNull()
  })

  test('returns null when status is undefined', () => {
    expect(accountLabel(undefined)).toBeNull()
  })
})

describe('authMethodLabel', () => {
  test('returns the auth method when present', () => {
    expect(authMethodLabel({ loggedIn: true, authMethod: 'claude.ai' })).toBe('claude.ai')
  })

  test('returns "unavailable" when status is undefined', () => {
    expect(authMethodLabel(undefined)).toBe('unavailable')
  })
})

describe('toProfileView', () => {
  test('projects a ready profile with auth status', () => {
    expect(
      toProfileView(readyProfile, { loggedIn: true, authMethod: 'claude.ai', email: 'a@b.c' }),
    ).toEqual({
      name: 'work',
      state: 'ready',
      authMethod: 'claude.ai',
      account: 'a@b.c',
      loggedIn: true,
      createdAt: '2026-01-15T00:00:00.000Z',
      hasConfig: true,
      hasDirectory: true,
    })
  })

  test('uses null fields when status and metadata are missing', () => {
    const orphan: StoredProfile = {
      name: 'orphan',
      dir: '/tmp/profiles/orphan',
      state: 'orphaned',
      hasConfig: false,
      hasDirectory: true,
    }
    expect(toProfileView(orphan, undefined)).toEqual({
      name: 'orphan',
      state: 'orphaned',
      authMethod: 'unavailable',
      account: null,
      loggedIn: null,
      createdAt: null,
      hasConfig: false,
      hasDirectory: true,
    })
  })
})

describe('NO_ACCOUNT_PLACEHOLDER', () => {
  test('is the em dash', () => {
    expect(NO_ACCOUNT_PLACEHOLDER).toBe('—')
  })
})
