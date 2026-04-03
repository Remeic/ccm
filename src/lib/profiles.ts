import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { MAX_PROFILE_NAME_LENGTH, ProfileNameSchema } from '../types.js'
import { PROFILES_DIR } from './constants.js'

export function validateProfileName(name: string): void {
  const result = ProfileNameSchema.safeParse(name)
  if (result.success) {
    return
  }

  if (name.length > MAX_PROFILE_NAME_LENGTH) {
    throw new Error(`Profile name too long (max ${MAX_PROFILE_NAME_LENGTH} chars).`)
  }

  throw new Error(
    `Invalid profile name "${name}". Use only letters, numbers, hyphens, underscores.`,
  )
}

export function createProfileDir(name: string, profilesDir = PROFILES_DIR): string {
  validateProfileName(name)
  const dir = join(profilesDir, name)
  if (existsSync(dir)) {
    throw new Error(`Profile directory "${name}" already exists`)
  }
  mkdirSync(dir, { recursive: true })
  return dir
}

export function removeProfileDir(name: string, profilesDir = PROFILES_DIR): void {
  const dir = join(profilesDir, name)
  if (!existsSync(dir)) {
    throw new Error(`Profile directory "${name}" does not exist`)
  }
  rmSync(dir, { recursive: true })
}

function getStagedPath(path: string): string {
  const parentDir = dirname(path)
  const baseName = basename(path)

  for (let attempt = 0; attempt < 100; attempt++) {
    const suffix =
      attempt === 0
        ? `${process.pid}-${Date.now()}`
        : `${process.pid}-${Date.now()}-${attempt.toString()}`
    const candidate = join(parentDir, `.${baseName}.staged-${suffix}`)
    if (!existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(`Could not allocate a temporary path for "${baseName}"`)
}

export function stageProfileDirRemoval(name: string, profilesDir = PROFILES_DIR): string {
  const dir = join(profilesDir, name)
  if (!existsSync(dir)) {
    throw new Error(`Profile directory "${name}" does not exist`)
  }

  const stagedDir = getStagedPath(dir)
  renameSync(dir, stagedDir)
  return stagedDir
}

export function restoreStagedProfileDir(
  stagedDir: string,
  name: string,
  profilesDir = PROFILES_DIR,
): void {
  renameSync(stagedDir, join(profilesDir, name))
}

export function finalizeStagedProfileDirRemoval(stagedDir: string): void {
  rmSync(stagedDir, { recursive: true })
}

export function getProfileDir(name: string, profilesDir = PROFILES_DIR): string {
  return join(profilesDir, name)
}

export function profileExists(name: string, profilesDir = PROFILES_DIR): boolean {
  return existsSync(join(profilesDir, name))
}

export function listProfileDirs(profilesDir = PROFILES_DIR): string[] {
  if (!existsSync(profilesDir)) return []
  return readdirSync(profilesDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name)
}
