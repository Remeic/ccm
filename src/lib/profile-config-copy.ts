import { cpSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { PROFILES_DIR } from './constants.js'
import { formatError } from './errors.js'
import { getProfileDir, profileExists, validateProfileName } from './profiles.js'

const SUPPORTED_CONFIG_PATHS = ['settings.json', 'plugins'] as const

type CopyKind = 'file' | 'directory'
type SupportedConfigPath = (typeof SUPPORTED_CONFIG_PATHS)[number]
export type ProfileConfigCopySelector = 'settings' | 'settings.json' | 'plugins'

export interface ProfileConfigCopyOperation {
  sourcePath: string
  targetPath: string
  relativePath: SupportedConfigPath
  kind: CopyKind
  overwrite: boolean
}

export interface ProfileConfigCopyPlan {
  sourceName: string
  targetName: string
  operations: ProfileConfigCopyOperation[]
  overwriteCount: number
  createCount: number
}

export interface ProfileConfigCopyResult {
  copiedCount: number
  overwrittenCount: number
  createdCount: number
}

export interface ProfileConfigCopyPlanOptions {
  only?: ProfileConfigCopySelector[]
}

/** Plans non-auth profile configuration copy operations between two managed profiles. */
export function planProfileConfigCopy(
  sourceName: string,
  targetName: string,
  profilesDir = PROFILES_DIR,
  options: ProfileConfigCopyPlanOptions = {},
): ProfileConfigCopyPlan {
  validateProfileName(sourceName)
  validateProfileName(targetName)

  if (sourceName === targetName) {
    throw new Error('Source and target profiles must be different')
  }

  if (!profileExists(sourceName, profilesDir)) {
    throw new Error(`Profile "${sourceName}" does not exist`)
  }
  if (!profileExists(targetName, profilesDir)) {
    throw new Error(`Profile "${targetName}" does not exist`)
  }

  const sourceDir = getProfileDir(sourceName, profilesDir)
  const targetDir = getProfileDir(targetName, profilesDir)
  const selectedPaths = normalizeSelectedPaths(options.only)

  const operations: ProfileConfigCopyOperation[] = []
  for (const relativePath of selectedPaths) {
    const sourcePath = join(sourceDir, relativePath)
    if (!existsSync(sourcePath)) {
      continue
    }

    const kind: CopyKind = statSync(sourcePath).isDirectory() ? 'directory' : 'file'
    const targetPath = join(targetDir, relativePath)

    operations.push({
      sourcePath,
      targetPath,
      relativePath,
      kind,
      overwrite: existsSync(targetPath),
    })
  }

  if (operations.length === 0) {
    throw new Error(
      `No supported configuration found in profile "${sourceName}". Supported paths: ${SUPPORTED_CONFIG_PATHS.join(', ')}`,
    )
  }

  const overwriteCount = operations.filter(operation => operation.overwrite).length

  return {
    sourceName,
    targetName,
    operations,
    overwriteCount,
    createCount: operations.length - overwriteCount,
  }
}

function normalizeSelectedPaths(only?: ProfileConfigCopySelector[]): SupportedConfigPath[] {
  if (!only || only.length === 0) {
    return [...SUPPORTED_CONFIG_PATHS]
  }

  const selected = new Set<SupportedConfigPath>()
  for (const entry of only) {
    if (entry === 'settings' || entry === 'settings.json') {
      selected.add('settings.json')
      continue
    }
    if (entry === 'plugins') {
      selected.add('plugins')
      continue
    }

    throw new Error(`Unsupported --only target "${entry}". Allowed values: settings, plugins.`)
  }

  return SUPPORTED_CONFIG_PATHS.filter(path => selected.has(path))
}

/** Applies a previously computed profile configuration copy plan with full rollback on failure. */
export function applyProfileConfigCopy(plan: ProfileConfigCopyPlan): ProfileConfigCopyResult {
  const stagedTargets: Array<{ targetPath: string; stagedPath: string }> = []
  const copiedTargets: string[] = []

  try {
    for (const operation of plan.operations) {
      if (operation.overwrite) {
        const stagedPath = getStagedPath(operation.targetPath)
        renameSync(operation.targetPath, stagedPath)
        stagedTargets.push({ targetPath: operation.targetPath, stagedPath })
      }

      mkdirSync(dirname(operation.targetPath), { recursive: true })
      copyOperation(operation)
      copiedTargets.push(operation.targetPath)
    }
  } catch (error) {
    const rollbackErrors = rollbackCopy(copiedTargets, stagedTargets)
    if (rollbackErrors.length > 0) {
      throw new Error(
        `Failed to copy profile configuration: ${formatError(error)}. Rollback failed: ${rollbackErrors.join('; ')}`,
      )
    }
    throw new Error(`Failed to copy profile configuration: ${formatError(error)}`)
  }

  try {
    for (const { stagedPath } of stagedTargets) {
      rmSync(stagedPath, { recursive: true, force: true })
    }
  } catch (error) {
    const rollbackErrors = rollbackCopy(copiedTargets, stagedTargets)
    if (rollbackErrors.length > 0) {
      throw new Error(
        `Failed to finalize profile configuration copy: ${formatError(error)}. Rollback failed: ${rollbackErrors.join('; ')}`,
      )
    }
    throw new Error(`Failed to finalize profile configuration copy: ${formatError(error)}`)
  }

  return {
    copiedCount: plan.operations.length,
    overwrittenCount: plan.overwriteCount,
    createdCount: plan.createCount,
  }
}

function copyOperation(operation: ProfileConfigCopyOperation): void {
  const baseOptions = { errorOnExist: true, force: false }
  if (operation.kind === 'directory') {
    cpSync(operation.sourcePath, operation.targetPath, { ...baseOptions, recursive: true })
    return
  }

  cpSync(operation.sourcePath, operation.targetPath, baseOptions)
}

function rollbackCopy(
  copiedTargets: string[],
  stagedTargets: Array<{ targetPath: string; stagedPath: string }>,
): string[] {
  const rollbackErrors: string[] = []

  for (const copiedPath of [...copiedTargets].reverse()) {
    try {
      rmSync(copiedPath, { recursive: true, force: true })
    } catch (error) {
      rollbackErrors.push(`remove ${copiedPath}: ${formatError(error)}`)
    }
  }

  for (const { targetPath, stagedPath } of [...stagedTargets].reverse()) {
    try {
      if (existsSync(stagedPath)) {
        renameSync(stagedPath, targetPath)
      }
    } catch (error) {
      rollbackErrors.push(`restore ${targetPath}: ${formatError(error)}`)
    }
  }

  return rollbackErrors
}

function getStagedPath(path: string): string {
  const parent = dirname(path)
  const base = basename(path)

  for (const attempt of Array.from({ length: 100 }, (_, index) => index)) {
    const suffix =
      attempt === 0
        ? `${process.pid}-${Date.now()}`
        : `${process.pid}-${Date.now()}-${attempt.toString()}`
    const candidate = join(parent, `.${base}.staged-${suffix}`)
    if (!existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(`Could not allocate a temporary path for "${base}"`)
}
