import { afterEach, describe, expect, test, vi } from 'vitest'

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/')
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('node:fs')
})

describe('profiles coverage branches', () => {
  test('throws when the first 100 staged profile candidates are occupied', async () => {
    const pid = process.pid
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    vi.doMock('node:fs', () => ({
      existsSync: vi.fn((path: string) => {
        const normalized = normalizePath(path)
        if (normalized === '/profiles/work') return true
        if (normalized === `/profiles/.work.staged-${pid}-1700000000000`) return true
        const match = normalized.match(
          new RegExp(`^/profiles/\\.work\\.staged-${pid}-1700000000000-(\\d+)$`),
        )
        if (!match) return false
        return Number(match[1]) < 100
      }),
      mkdirSync: vi.fn(),
      readdirSync: vi.fn(),
      renameSync: vi.fn(),
      rmSync: vi.fn(),
    }))

    const { stageProfileDirRemoval } = await import('../../src/lib/profiles.js')

    expect(() => stageProfileDirRemoval('work', '/profiles')).toThrow(
      /Could not allocate a temporary path/,
    )

    dateSpy.mockRestore()
  })

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
