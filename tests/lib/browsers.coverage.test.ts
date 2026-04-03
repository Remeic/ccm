import { afterEach, describe, expect, test, vi } from 'vitest'

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/')
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('node:fs')
})

describe('browsers coverage branches', () => {
  test('creates browsers dir recursively when it is missing', async () => {
    const mkdirSync = vi.fn()

    vi.doMock('node:fs', () => ({
      chmodSync: vi.fn(),
      existsSync: vi.fn(() => false),
      mkdirSync,
      renameSync: vi.fn(),
      rmSync: vi.fn(),
      unlinkSync: vi.fn(),
      writeFileSync: vi.fn(),
    }))

    const { ensureBrowserWrapper } = await import('../../src/lib/browsers.js')

    ensureBrowserWrapper('work', 'open -a Chrome', '/nested/browsers')
    expect(mkdirSync).toHaveBeenCalledWith('/nested/browsers', { recursive: true })
  })

  test('does not recreate browsers dir when it already exists', async () => {
    const mkdirSync = vi.fn()

    vi.doMock('node:fs', () => ({
      chmodSync: vi.fn(),
      existsSync: vi.fn((path: string) => normalizePath(path) === '/browsers'),
      mkdirSync,
      renameSync: vi.fn(),
      rmSync: vi.fn(),
      unlinkSync: vi.fn(),
      writeFileSync: vi.fn(),
    }))

    const { ensureBrowserWrapper } = await import('../../src/lib/browsers.js')

    ensureBrowserWrapper('work', 'open -a Chrome', '/browsers')
    expect(mkdirSync).not.toHaveBeenCalled()
  })

  test('uses a second staged wrapper path candidate when the first one already exists', async () => {
    const pid = process.pid
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const renameSync = vi.fn()

    vi.doMock('node:fs', () => ({
      chmodSync: vi.fn(),
      existsSync: vi.fn((path: string) => {
        const normalized = normalizePath(path)
        return (
          normalized === '/browsers/work.sh' ||
          normalized === `/browsers/work.sh.staged-${pid}-1700000000000`
        )
      }),
      mkdirSync: vi.fn(),
      renameSync,
      rmSync: vi.fn(),
      unlinkSync: vi.fn(),
      writeFileSync: vi.fn(),
    }))

    const { stageBrowserWrapperRemoval } = await import('../../src/lib/browsers.js')

    const stagedPath = stageBrowserWrapperRemoval('work', '/browsers')

    expect(normalizePath(stagedPath as string)).toBe(
      `/browsers/work.sh.staged-${pid}-1700000000000-1`,
    )
    expect(renameSync).toHaveBeenCalledTimes(1)
    expect(normalizePath(renameSync.mock.calls[0]?.[0] as string)).toBe('/browsers/work.sh')
    expect(normalizePath(renameSync.mock.calls[0]?.[1] as string)).toBe(
      `/browsers/work.sh.staged-${pid}-1700000000000-1`,
    )

    dateSpy.mockRestore()
  })

  test('throws when no temporary wrapper staging path can be allocated', async () => {
    vi.doMock('node:fs', () => ({
      chmodSync: vi.fn(),
      existsSync: vi.fn(() => true),
      mkdirSync: vi.fn(),
      renameSync: vi.fn(),
      rmSync: vi.fn(),
      unlinkSync: vi.fn(),
      writeFileSync: vi.fn(),
    }))

    const { stageBrowserWrapperRemoval } = await import('../../src/lib/browsers.js')

    expect(() => stageBrowserWrapperRemoval('work', '/browsers')).toThrow(
      /Could not allocate a temporary path/,
    )
  })

  test('throws when the first 100 staged wrapper candidates are occupied', async () => {
    const pid = process.pid
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    vi.doMock('node:fs', () => ({
      chmodSync: vi.fn(),
      existsSync: vi.fn((path: string) => {
        const normalized = normalizePath(path)
        if (normalized === '/browsers/work.sh') return true
        if (normalized === `/browsers/work.sh.staged-${pid}-1700000000000`) return true
        const match = normalized.match(
          new RegExp(`^/browsers/work\\.sh\\.staged-${pid}-1700000000000-(\\d+)$`),
        )
        if (!match) return false
        return Number(match[1]) < 100
      }),
      mkdirSync: vi.fn(),
      renameSync: vi.fn(),
      rmSync: vi.fn(),
      unlinkSync: vi.fn(),
      writeFileSync: vi.fn(),
    }))

    const { stageBrowserWrapperRemoval } = await import('../../src/lib/browsers.js')

    expect(() => stageBrowserWrapperRemoval('work', '/browsers')).toThrow(
      /Could not allocate a temporary path/,
    )

    dateSpy.mockRestore()
  })

  test('ignores missing staged wrapper paths during finalize', async () => {
    const rmSync = vi.fn()

    vi.doMock('node:fs', () => ({
      chmodSync: vi.fn(),
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
      renameSync: vi.fn(),
      rmSync,
      unlinkSync: vi.fn(),
      writeFileSync: vi.fn(),
    }))

    const { finalizeStagedBrowserWrapperRemoval } = await import('../../src/lib/browsers.js')

    expect(() => finalizeStagedBrowserWrapperRemoval('/missing')).not.toThrow()
    expect(rmSync).toHaveBeenCalledWith('/missing', { force: true })
  })
})
