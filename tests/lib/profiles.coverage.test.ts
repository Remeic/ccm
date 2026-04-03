import { afterEach, describe, expect, test, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('node:fs')
})

describe('profiles coverage branches', () => {
  test('throws when no temporary profile staging path can be allocated', async () => {
    vi.doMock('node:fs', () => ({
      existsSync: vi.fn(() => true),
      mkdirSync: vi.fn(),
      readdirSync: vi.fn(),
      renameSync: vi.fn(),
      rmSync: vi.fn(),
    }))

    const { stageProfileDirRemoval } = await import('../../src/lib/profiles.js')

    expect(() => stageProfileDirRemoval('work', '/profiles')).toThrow(
      'Could not allocate a temporary path for "work"',
    )
  })
})
