import { join } from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('node:fs')
})

describe('profile-config-copy coverage branches', () => {
  test('throws when no staged target path can be allocated', async () => {
    vi.doMock('node:fs', () => ({
      cpSync: vi.fn(),
      existsSync: vi.fn(() => true),
      mkdirSync: vi.fn(),
      renameSync: vi.fn(),
      rmSync: vi.fn(),
      statSync: vi.fn(),
    }))

    const { applyProfileConfigCopy } = await import('../../src/lib/profile-config-copy.js')

    expectErrorMessage(
      () =>
        applyProfileConfigCopy({
          sourceName: 'source',
          targetName: 'target',
          operations: [
            {
              sourcePath: '/tmp/source/settings.json',
              targetPath: '/tmp/target/settings.json',
              relativePath: 'settings.json',
              kind: 'file',
              overwrite: true,
            },
          ],
          overwriteCount: 1,
          createCount: 0,
        }),
      'Failed to copy profile configuration: Could not allocate a temporary path for "settings.json"',
    )
  })

  test('reports rollback failure when copy fails and staged restore also fails', async () => {
    let stagedPath = ''
    const renameSync = vi.fn((_from: string, to: string) => {
      if (!stagedPath) {
        stagedPath = to
        return
      }
      throw new Error('restore failure')
    })

    vi.doMock('node:fs', () => ({
      cpSync: vi.fn(() => {
        throw new Error('copy failure')
      }),
      existsSync: vi.fn((path: string) => {
        if (path === stagedPath) return true
        return !path.includes('.settings.json.staged-')
      }),
      mkdirSync: vi.fn(),
      renameSync,
      rmSync: vi.fn(),
      statSync: vi.fn(),
    }))

    const { applyProfileConfigCopy } = await import('../../src/lib/profile-config-copy.js')

    expectErrorMessage(
      () =>
        applyProfileConfigCopy({
          sourceName: 'source',
          targetName: 'target',
          operations: [
            {
              sourcePath: '/tmp/source/settings.json',
              targetPath: '/tmp/target/settings.json',
              relativePath: 'settings.json',
              kind: 'file',
              overwrite: true,
            },
          ],
          overwriteCount: 1,
          createCount: 0,
        }),
      'Failed to copy profile configuration: copy failure. Rollback failed: restore /tmp/target/settings.json: restore failure',
    )
  })

  test('reports finalize failure and restores staged targets when possible', async () => {
    let stagedPath = ''
    const renameSync = vi.fn((_from: string, to: string) => {
      if (!stagedPath) {
        stagedPath = to
      }
    })

    const rmSync = vi.fn((path: string) => {
      if (path === stagedPath) {
        throw new Error('finalize failure')
      }
    })

    vi.doMock('node:fs', () => ({
      cpSync: vi.fn(),
      existsSync: vi.fn((path: string) => {
        if (path === stagedPath) return true
        return !path.includes('.settings.json.staged-')
      }),
      mkdirSync: vi.fn(),
      renameSync,
      rmSync,
      statSync: vi.fn(),
    }))

    const { applyProfileConfigCopy } = await import('../../src/lib/profile-config-copy.js')

    expectErrorMessage(
      () =>
        applyProfileConfigCopy({
          sourceName: 'source',
          targetName: 'target',
          operations: [
            {
              sourcePath: '/tmp/source/settings.json',
              targetPath: '/tmp/target/settings.json',
              relativePath: 'settings.json',
              kind: 'file',
              overwrite: true,
            },
          ],
          overwriteCount: 1,
          createCount: 0,
        }),
      'Failed to finalize profile configuration copy: finalize failure',
    )
    expect(rmSync).toHaveBeenCalledWith(stagedPath, { recursive: true, force: true })
  })

  test('reports finalize rollback failure when cleanup and restore both fail', async () => {
    let stagedPath = ''
    const renameSync = vi.fn((_from: string, to: string) => {
      if (!stagedPath) {
        stagedPath = to
        return
      }
      throw new Error('restore failure')
    })

    const rmSync = vi.fn((path: string) => {
      if (path === stagedPath) {
        throw new Error('finalize failure')
      }
      throw new Error('remove failure')
    })

    vi.doMock('node:fs', () => ({
      cpSync: vi.fn(),
      existsSync: vi.fn((path: string) => {
        if (path === stagedPath) return true
        return !path.includes('.settings.json.staged-')
      }),
      mkdirSync: vi.fn(),
      renameSync,
      rmSync,
      statSync: vi.fn(),
    }))

    const { applyProfileConfigCopy } = await import('../../src/lib/profile-config-copy.js')

    expectErrorMessage(
      () =>
        applyProfileConfigCopy({
          sourceName: 'source',
          targetName: 'target',
          operations: [
            {
              sourcePath: '/tmp/source/settings.json',
              targetPath: '/tmp/target/settings.json',
              relativePath: 'settings.json',
              kind: 'file',
              overwrite: true,
            },
          ],
          overwriteCount: 1,
          createCount: 0,
        }),
      'Failed to finalize profile configuration copy: finalize failure. Rollback failed: remove /tmp/target/settings.json: remove failure; restore /tmp/target/settings.json: restore failure',
    )
    expect(rmSync).toHaveBeenCalledWith(stagedPath, { recursive: true, force: true })
  })

  test('skips staged restore when staged path is already missing', async () => {
    let stagedPath = ''

    const renameSync = vi.fn((_from: string, to: string) => {
      if (!stagedPath) {
        stagedPath = to
        return
      }
      throw new Error('restore should not run')
    })

    vi.doMock('node:fs', () => ({
      cpSync: vi.fn(() => {
        throw new Error('copy failure')
      }),
      existsSync: vi.fn((path: string) => {
        if (path === stagedPath) return false
        return !path.includes('.settings.json.staged-')
      }),
      mkdirSync: vi.fn(),
      renameSync,
      rmSync: vi.fn(),
      statSync: vi.fn(),
    }))

    const { applyProfileConfigCopy } = await import('../../src/lib/profile-config-copy.js')

    expectErrorMessage(
      () =>
        applyProfileConfigCopy({
          sourceName: 'source',
          targetName: 'target',
          operations: [
            {
              sourcePath: '/tmp/source/settings.json',
              targetPath: '/tmp/target/settings.json',
              relativePath: 'settings.json',
              kind: 'file',
              overwrite: true,
            },
          ],
          overwriteCount: 1,
          createCount: 0,
        }),
      'Failed to copy profile configuration: copy failure',
    )

    expect(renameSync).toHaveBeenCalledTimes(1)
  })

  test('formats non-Error throws from filesystem operations', async () => {
    vi.doMock('node:fs', () => ({
      cpSync: vi.fn(() => {
        throw 'string failure'
      }),
      existsSync: vi.fn(() => false),
      mkdirSync: vi.fn(),
      renameSync: vi.fn(),
      rmSync: vi.fn(),
      statSync: vi.fn(),
    }))

    const { applyProfileConfigCopy } = await import('../../src/lib/profile-config-copy.js')

    expectErrorMessage(
      () =>
        applyProfileConfigCopy({
          sourceName: 'source',
          targetName: 'target',
          operations: [
            {
              sourcePath: '/tmp/source/settings.json',
              targetPath: '/tmp/target/settings.json',
              relativePath: 'settings.json',
              kind: 'file',
              overwrite: false,
            },
          ],
          overwriteCount: 0,
          createCount: 1,
        }),
      'Failed to copy profile configuration: string failure',
    )
  })

  test('uses expected cpSync options for file and directory copy', async () => {
    const cpSync = vi.fn()

    vi.doMock('node:fs', () => ({
      cpSync,
      existsSync: vi.fn(() => false),
      mkdirSync: vi.fn(),
      renameSync: vi.fn(),
      rmSync: vi.fn(),
      statSync: vi.fn(),
    }))

    const { applyProfileConfigCopy } = await import('../../src/lib/profile-config-copy.js')

    applyProfileConfigCopy({
      sourceName: 'source',
      targetName: 'target',
      operations: [
        {
          sourcePath: '/tmp/source/settings.json',
          targetPath: '/tmp/target/settings.json',
          relativePath: 'settings.json',
          kind: 'file',
          overwrite: false,
        },
        {
          sourcePath: '/tmp/source/plugins',
          targetPath: '/tmp/target/plugins',
          relativePath: 'plugins',
          kind: 'directory',
          overwrite: false,
        },
      ],
      overwriteCount: 0,
      createCount: 2,
    })

    expect(cpSync).toHaveBeenNthCalledWith(
      1,
      '/tmp/source/settings.json',
      '/tmp/target/settings.json',
      {
        errorOnExist: true,
        force: false,
      },
    )
    expect(cpSync).toHaveBeenNthCalledWith(2, '/tmp/source/plugins', '/tmp/target/plugins', {
      errorOnExist: true,
      force: false,
      recursive: true,
    })
  })

  test('rolls back copied targets in reverse order with rmSync recursive force options', async () => {
    const cpSync = vi
      .fn()
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw new Error('third copy failed')
      })
    const rmSync = vi.fn(() => {
      throw new Error('remove failed')
    })

    vi.doMock('node:fs', () => ({
      cpSync,
      existsSync: vi.fn(() => false),
      mkdirSync: vi.fn(),
      renameSync: vi.fn(),
      rmSync,
      statSync: vi.fn(),
    }))

    const { applyProfileConfigCopy } = await import('../../src/lib/profile-config-copy.js')

    expect(() =>
      applyProfileConfigCopy({
        sourceName: 'source',
        targetName: 'target',
        operations: [
          {
            sourcePath: '/tmp/source/a.json',
            targetPath: '/tmp/target/a.json',
            relativePath: 'settings.json',
            kind: 'file',
            overwrite: false,
          },
          {
            sourcePath: '/tmp/source/b.json',
            targetPath: '/tmp/target/b.json',
            relativePath: 'settings.json',
            kind: 'file',
            overwrite: false,
          },
          {
            sourcePath: '/tmp/source/c.json',
            targetPath: '/tmp/target/c.json',
            relativePath: 'settings.json',
            kind: 'file',
            overwrite: false,
          },
        ],
        overwriteCount: 0,
        createCount: 3,
      }),
    ).toThrow(
      'Failed to copy profile configuration: third copy failed. Rollback failed: remove /tmp/target/b.json: remove failed; remove /tmp/target/a.json: remove failed',
    )

    expect(rmSync).toHaveBeenNthCalledWith(1, '/tmp/target/b.json', {
      recursive: true,
      force: true,
    })
    expect(rmSync).toHaveBeenNthCalledWith(2, '/tmp/target/a.json', {
      recursive: true,
      force: true,
    })
  })

  test('restores staged targets in reverse order', async () => {
    let call = 0
    const stagedPaths: string[] = []
    const renameSync = vi.fn((_from: string, to: string) => {
      call += 1
      if (call <= 2) {
        stagedPaths.push(to)
      }
    })
    const cpSync = vi
      .fn()
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw new Error('third copy failed')
      })

    vi.doMock('node:fs', () => ({
      cpSync,
      existsSync: vi.fn((path: string) => {
        if (stagedPaths.includes(path)) return true
        return !path.includes('.staged-')
      }),
      mkdirSync: vi.fn(),
      renameSync,
      rmSync: vi.fn(),
      statSync: vi.fn(),
    }))

    const { applyProfileConfigCopy } = await import('../../src/lib/profile-config-copy.js')

    expectErrorMessage(
      () =>
        applyProfileConfigCopy({
          sourceName: 'source',
          targetName: 'target',
          operations: [
            {
              sourcePath: '/tmp/source/a.json',
              targetPath: '/tmp/target/a.json',
              relativePath: 'settings.json',
              kind: 'file',
              overwrite: true,
            },
            {
              sourcePath: '/tmp/source/b.json',
              targetPath: '/tmp/target/b.json',
              relativePath: 'settings.json',
              kind: 'file',
              overwrite: true,
            },
            {
              sourcePath: '/tmp/source/c.json',
              targetPath: '/tmp/target/c.json',
              relativePath: 'settings.json',
              kind: 'file',
              overwrite: false,
            },
          ],
          overwriteCount: 2,
          createCount: 1,
        }),
      'Failed to copy profile configuration: third copy failed',
    )

    expect(renameSync).toHaveBeenNthCalledWith(3, stagedPaths[1], '/tmp/target/b.json')
    expect(renameSync).toHaveBeenNthCalledWith(4, stagedPaths[0], '/tmp/target/a.json')
  })

  test('uses unsuffixed staging candidate for first attempt', async () => {
    const pid = process.pid
    const now = 1_700_000_000_000
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(now)
    const renameSync = vi.fn()
    const expectedStagedPath = join('/tmp/target', `.a.json.staged-${pid}-${now}`)

    vi.doMock('node:fs', () => ({
      cpSync: vi.fn(() => {
        throw new Error('copy failure')
      }),
      existsSync: vi.fn((path: string) => !path.includes('.staged-')),
      mkdirSync: vi.fn(),
      renameSync,
      rmSync: vi.fn(),
      statSync: vi.fn(),
    }))

    const { applyProfileConfigCopy } = await import('../../src/lib/profile-config-copy.js')

    expect(() =>
      applyProfileConfigCopy({
        sourceName: 'source',
        targetName: 'target',
        operations: [
          {
            sourcePath: '/tmp/source/a.json',
            targetPath: '/tmp/target/a.json',
            relativePath: 'settings.json',
            kind: 'file',
            overwrite: true,
          },
        ],
        overwriteCount: 1,
        createCount: 0,
      }),
    ).toThrow()

    expect(renameSync.mock.calls[0]?.[1]).toBe(expectedStagedPath)
    dateSpy.mockRestore()
  })

  test('uses numeric suffix when first staging candidate already exists', async () => {
    const pid = process.pid
    const now = 1_700_000_000_000
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(now)
    const renameSync = vi.fn()
    const firstCandidate = join('/tmp/target', `.a.json.staged-${pid}-${now}`)

    vi.doMock('node:fs', () => ({
      cpSync: vi.fn(() => {
        throw new Error('copy failure')
      }),
      existsSync: vi.fn((path: string) => path === firstCandidate || !path.includes('.staged-')),
      mkdirSync: vi.fn(),
      renameSync,
      rmSync: vi.fn(),
      statSync: vi.fn(),
    }))

    const { applyProfileConfigCopy } = await import('../../src/lib/profile-config-copy.js')

    expect(() =>
      applyProfileConfigCopy({
        sourceName: 'source',
        targetName: 'target',
        operations: [
          {
            sourcePath: '/tmp/source/a.json',
            targetPath: '/tmp/target/a.json',
            relativePath: 'settings.json',
            kind: 'file',
            overwrite: true,
          },
        ],
        overwriteCount: 1,
        createCount: 0,
      }),
    ).toThrow()

    expect(renameSync.mock.calls[0]?.[1]).toBe(
      join('/tmp/target', `.a.json.staged-${pid}-${now}-1`),
    )
    dateSpy.mockRestore()
  })
})

function expectErrorMessage(fn: () => unknown, expected: string): void {
  try {
    fn()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    expect(message).toBe(expected)
    return
  }

  throw new Error('Expected function to throw')
}
