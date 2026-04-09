import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { applyProfileConfigCopy, planProfileConfigCopy } from '../../src/lib/profile-config-copy.js'
import { cleanupTempDir, createTempCcmHome, type TempCcmHome } from '../helpers.js'

let tmp: TempCcmHome

beforeEach(() => {
  tmp = createTempCcmHome()
  mkdirSync(tmp.profilesDir, { recursive: true })
})

afterEach(() => {
  cleanupTempDir(tmp.ccmHome)
})

function createProfile(name: string): string {
  const dir = join(tmp.profilesDir, name)
  mkdirSync(dir, { recursive: true })
  return dir
}

describe('planProfileConfigCopy', () => {
  test('throws when source and target names are equal', () => {
    expect(() => planProfileConfigCopy('work', 'work', tmp.profilesDir)).toThrow(
      'Source and target profiles must be different',
    )
  })

  test('throws when source profile directory does not exist', () => {
    createProfile('target')

    expect(() => planProfileConfigCopy('source', 'target', tmp.profilesDir)).toThrow(
      'Profile "source" does not exist',
    )
  })

  test('throws when target profile directory does not exist', () => {
    createProfile('source')

    expect(() => planProfileConfigCopy('source', 'target', tmp.profilesDir)).toThrow(
      'Profile "target" does not exist',
    )
  })

  test('plans supported config entries only (settings and plugins)', () => {
    const source = createProfile('source')
    createProfile('target')

    writeFileSync(join(source, 'settings.json'), '{"hooksEnabled":true}')
    writeFileSync(join(source, '.claude.json'), '{"oauthAccount":"secret"}')
    mkdirSync(join(source, 'plugins', 'marketplaces', 'official', 'skills'), { recursive: true })
    writeFileSync(join(source, 'plugins', 'marketplaces', 'official', 'skills', 'foo.md'), 'skill')

    const plan = planProfileConfigCopy('source', 'target', tmp.profilesDir)

    expect(plan.operations.map(operation => operation.relativePath)).toEqual([
      'settings.json',
      'plugins',
    ])
    expect(plan.operations.map(operation => operation.kind)).toEqual(['file', 'directory'])
    expect(plan.overwriteCount).toBe(0)
    expect(plan.createCount).toBe(2)
  })

  test('marks operations as overwrite when target paths already exist', () => {
    const source = createProfile('source')
    const target = createProfile('target')

    writeFileSync(join(source, 'settings.json'), '{"x":1}')
    mkdirSync(join(source, 'plugins', 'marketplaces'), { recursive: true })
    writeFileSync(join(target, 'settings.json'), '{"x":0}')
    mkdirSync(join(target, 'plugins'), { recursive: true })

    const plan = planProfileConfigCopy('source', 'target', tmp.profilesDir)

    expect(plan.operations.every(operation => operation.overwrite)).toBe(true)
    expect(plan.overwriteCount).toBe(2)
    expect(plan.createCount).toBe(0)
  })

  test('throws when no supported config exists in source profile', () => {
    const source = createProfile('source')
    createProfile('target')

    writeFileSync(join(source, '.claude.json'), '{"oauthAccount":"secret"}')

    expect(() => planProfileConfigCopy('source', 'target', tmp.profilesDir)).toThrow(
      'No supported configuration found in profile "source". Supported paths: settings.json, plugins',
    )
  })

  test('supports selecting only settings via options.only', () => {
    const source = createProfile('source')
    createProfile('target')

    writeFileSync(join(source, 'settings.json'), '{"hooksEnabled":true}')
    mkdirSync(join(source, 'plugins', 'marketplaces', 'official', 'skills'), { recursive: true })
    writeFileSync(join(source, 'plugins', 'marketplaces', 'official', 'skills', 'foo.md'), 'skill')

    const plan = planProfileConfigCopy('source', 'target', tmp.profilesDir, { only: ['settings'] })

    expect(plan.operations.map(operation => operation.relativePath)).toEqual(['settings.json'])
  })

  test('supports selecting only settings.json alias via options.only', () => {
    const source = createProfile('source')
    createProfile('target')

    writeFileSync(join(source, 'settings.json'), '{"hooksEnabled":true}')

    const plan = planProfileConfigCopy('source', 'target', tmp.profilesDir, {
      only: ['settings.json'],
    })

    expect(plan.operations.map(operation => operation.relativePath)).toEqual(['settings.json'])
  })

  test('supports selecting only plugins via options.only', () => {
    const source = createProfile('source')
    createProfile('target')

    writeFileSync(join(source, 'settings.json'), '{"hooksEnabled":true}')
    mkdirSync(join(source, 'plugins', 'marketplaces', 'official', 'skills'), { recursive: true })
    writeFileSync(join(source, 'plugins', 'marketplaces', 'official', 'skills', 'foo.md'), 'skill')

    const plan = planProfileConfigCopy('source', 'target', tmp.profilesDir, { only: ['plugins'] })

    expect(plan.operations.map(operation => operation.relativePath)).toEqual(['plugins'])
  })

  test('throws when options.only contains unsupported targets', () => {
    const source = createProfile('source')
    createProfile('target')
    writeFileSync(join(source, 'settings.json'), '{"hooksEnabled":true}')

    expect(() =>
      planProfileConfigCopy('source', 'target', tmp.profilesDir, {
        only: ['unknown' as never],
      }),
    ).toThrow('Unsupported --only target "unknown". Allowed values: settings, plugins.')
  })

  test('treats empty options.only as default selection', () => {
    const source = createProfile('source')
    createProfile('target')
    writeFileSync(join(source, 'settings.json'), '{"hooksEnabled":true}')

    const plan = planProfileConfigCopy('source', 'target', tmp.profilesDir, { only: [] })

    expect(plan.operations.map(operation => operation.relativePath)).toEqual(['settings.json'])
  })
})

describe('applyProfileConfigCopy', () => {
  test('copies settings and plugins to target profile', () => {
    const source = createProfile('source')
    const target = createProfile('target')

    writeFileSync(join(source, 'settings.json'), '{"hook":"on"}')
    mkdirSync(join(source, 'plugins', 'marketplaces', 'official', 'skills'), { recursive: true })
    writeFileSync(
      join(source, 'plugins', 'marketplaces', 'official', 'skills', 'guide.md'),
      'guide',
    )

    const plan = planProfileConfigCopy('source', 'target', tmp.profilesDir)
    const result = applyProfileConfigCopy(plan)

    expect(result.copiedCount).toBe(2)
    expect(result.overwrittenCount).toBe(0)
    expect(result.createdCount).toBe(2)
    expect(readFileSync(join(target, 'settings.json'), 'utf-8')).toBe('{"hook":"on"}')
    expect(
      readFileSync(
        join(target, 'plugins', 'marketplaces', 'official', 'skills', 'guide.md'),
        'utf-8',
      ),
    ).toBe('guide')
  })

  test('overwrites existing config and removes temporary staged paths', () => {
    const source = createProfile('source')
    const target = createProfile('target')

    writeFileSync(join(source, 'settings.json'), '{"new":true}')
    mkdirSync(join(source, 'plugins', 'marketplaces', 'official'), { recursive: true })
    writeFileSync(join(source, 'plugins', 'marketplaces', 'official', 'plugin.json'), '{"v":2}')

    writeFileSync(join(target, 'settings.json'), '{"old":true}')
    mkdirSync(join(target, 'plugins', 'marketplaces', 'legacy'), { recursive: true })
    writeFileSync(join(target, 'plugins', 'marketplaces', 'legacy', 'legacy.json'), '{"v":1}')

    const plan = planProfileConfigCopy('source', 'target', tmp.profilesDir)
    const result = applyProfileConfigCopy(plan)

    expect(result.overwrittenCount).toBe(2)
    expect(result.createdCount).toBe(0)
    expect(readFileSync(join(target, 'settings.json'), 'utf-8')).toBe('{"new":true}')
    expect(existsSync(join(target, 'plugins', 'marketplaces', 'legacy', 'legacy.json'))).toBe(false)

    const stagedLeft = [
      ...findStagedPaths(target, '.settings.json.staged-'),
      ...findStagedPaths(target, '.plugins.staged-'),
    ]
    expect(stagedLeft).toEqual([])
  })

  test('rolls back target config when copy fails mid-flight', () => {
    const source = createProfile('source')
    const target = createProfile('target')

    const sourceSettings = join(source, 'settings.json')
    writeFileSync(sourceSettings, '{"new":true}')
    writeFileSync(join(target, 'settings.json'), '{"old":true}')

    const plan = planProfileConfigCopy('source', 'target', tmp.profilesDir)

    rmSync(sourceSettings, { force: true })

    expect(() => applyProfileConfigCopy(plan)).toThrow('Failed to copy profile configuration')
    expect(readFileSync(join(target, 'settings.json'), 'utf-8')).toBe('{"old":true}')
    expect(findStagedPaths(target, '.settings.json.staged-')).toEqual([])
  })

  test('fails when plan says create but destination already exists', () => {
    const source = createProfile('source')
    const target = createProfile('target')

    const sourcePath = join(source, 'settings.json')
    const targetPath = join(target, 'settings.json')
    writeFileSync(sourcePath, '{"new":true}')
    writeFileSync(targetPath, '{"old":true}')

    expect(() =>
      applyProfileConfigCopy({
        sourceName: 'source',
        targetName: 'target',
        operations: [
          {
            sourcePath,
            targetPath,
            relativePath: 'settings.json',
            kind: 'file',
            overwrite: false,
          },
        ],
        overwriteCount: 0,
        createCount: 1,
      }),
    ).toThrow('Failed to copy profile configuration')
    expect(readFileSync(targetPath, 'utf-8')).toBe('{"old":true}')
  })

  test('uses a secondary staged name when the first candidate is occupied', () => {
    const source = createProfile('source')
    const target = createProfile('target')
    const now = 1_700_000_000_000
    const pid = process.pid
    const firstCandidate = join(target, `.settings.json.staged-${pid}-${now}`)

    writeFileSync(join(source, 'settings.json'), '{"new":true}')
    writeFileSync(join(target, 'settings.json'), '{"old":true}')
    writeFileSync(firstCandidate, 'occupied')

    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(now)
    const plan = planProfileConfigCopy('source', 'target', tmp.profilesDir)
    const result = applyProfileConfigCopy(plan)
    dateSpy.mockRestore()

    expect(result.overwrittenCount).toBe(1)
    expect(existsSync(firstCandidate)).toBe(true)
    expect(findStagedPaths(target, '.settings.json.staged-')).toEqual([firstCandidate])
    expect(readFileSync(join(target, 'settings.json'), 'utf-8')).toBe('{"new":true}')
  })
})

function findStagedPaths(root: string, marker: string): string[] {
  const paths: string[] = []

  const stack = [root]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current || !existsSync(current)) {
      continue
    }

    const children = readdirSync(current, { withFileTypes: true })
    for (const child of children) {
      const full = join(current, child.name)
      if (child.name.includes(marker)) {
        paths.push(full)
      }
      if (child.isDirectory()) {
        stack.push(full)
      }
    }
  }

  return paths
}
