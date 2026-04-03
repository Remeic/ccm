import { afterEach, describe, expect, test, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('node:fs')
})

describe('browsers coverage branches', () => {
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
      'Could not allocate a temporary path for "/browsers/work.sh"',
    )
  })
})
