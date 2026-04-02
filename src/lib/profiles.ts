import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { PROFILES_DIR } from './constants.js'

const VALID_NAME = /^[a-zA-Z0-9_-]+$/
const MAX_NAME_LENGTH = 64

export function validateProfileName(name: string): void {
  if (!name || !VALID_NAME.test(name)) {
    throw new Error(
      `Invalid profile name "${name}". Use only letters, numbers, hyphens, underscores.`,
    )
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`Profile name too long (max ${MAX_NAME_LENGTH} chars).`)
  }
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
