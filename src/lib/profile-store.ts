import type { ProfileMeta } from '../types.js'
import {
  finalizeStagedBrowserWrapperRemoval,
  restoreStagedBrowserWrapper,
  stageBrowserWrapperRemoval,
} from './browsers.js'
import { addProfile, getProfile, loadConfig, removeProfile } from './config.js'
import { BROWSERS_DIR, CONFIG_FILE, PROFILES_DIR } from './constants.js'
import {
  finalizeStagedProfileDirRemoval,
  getProfileDir,
  listProfileDirs,
  profileExists,
  restoreStagedProfileDir,
  stageProfileDirRemoval,
} from './profiles.js'

export type ProfileState = 'ready' | 'orphaned' | 'config-only'

export interface StoredProfile {
  name: string
  dir: string
  meta?: ProfileMeta
  state: ProfileState
  hasConfig: boolean
  hasDirectory: boolean
}

function getProfileState(hasConfig: boolean, hasDirectory: boolean): ProfileState {
  if (hasConfig && hasDirectory) return 'ready'
  if (hasDirectory) return 'orphaned'
  return 'config-only'
}

export function listStoredProfiles(
  configFile = CONFIG_FILE,
  profilesDir = PROFILES_DIR,
): StoredProfile[] {
  const config = loadConfig(configFile)
  const dirNames = new Set(listProfileDirs(profilesDir))
  const names = new Set([...Object.keys(config.profiles), ...dirNames])

  return [...names]
    .sort((left, right) => left.localeCompare(right))
    .map(name => {
      const meta = config.profiles[name]
      const hasConfig = meta !== undefined
      const hasDirectory = dirNames.has(name)

      return {
        name,
        dir: getProfileDir(name, profilesDir),
        meta,
        state: getProfileState(hasConfig, hasDirectory),
        hasConfig,
        hasDirectory,
      }
    })
}

export function getStoredProfile(
  name: string,
  configFile = CONFIG_FILE,
  profilesDir = PROFILES_DIR,
): StoredProfile | undefined {
  const meta = getProfile(name, configFile)
  const hasConfig = meta !== undefined
  const hasDirectory = profileExists(name, profilesDir)

  if (!hasConfig && !hasDirectory) {
    return undefined
  }

  return {
    name,
    dir: getProfileDir(name, profilesDir),
    meta,
    state: getProfileState(hasConfig, hasDirectory),
    hasConfig,
    hasDirectory,
  }
}

export function removeStoredProfile(
  name: string,
  configFile = CONFIG_FILE,
  profilesDir = PROFILES_DIR,
  browsersDir = BROWSERS_DIR,
): void {
  const profile = getStoredProfile(name, configFile, profilesDir)
  if (!profile) {
    throw new Error(`Profile "${name}" does not exist`)
  }

  const stagedDir = profile.hasDirectory ? stageProfileDirRemoval(name, profilesDir) : undefined
  const stagedWrapper = stageBrowserWrapperRemoval(name, browsersDir)

  try {
    if (profile.hasConfig) {
      removeProfile(name, configFile)
    }
  } catch (error) {
    try {
      rollbackStorage(name, stagedDir, stagedWrapper, profilesDir, browsersDir)
    } catch (rollbackError) {
      throw new Error(
        `Failed to remove profile "${name}": ${formatError(error)}. Rollback failed: ${formatError(
          rollbackError,
        )}`,
      )
    }
    throw error
  }

  try {
    if (stagedDir) {
      finalizeStagedProfileDirRemoval(stagedDir)
    }
    if (stagedWrapper) {
      finalizeStagedBrowserWrapperRemoval(stagedWrapper)
    }
  } catch (error) {
    const recoveryErrors: string[] = []

    try {
      rollbackStorage(name, stagedDir, stagedWrapper, profilesDir, browsersDir)
    } catch (rollbackError) {
      recoveryErrors.push(formatError(rollbackError))
    }

    if (profile.meta) {
      try {
        restoreConfigEntry(profile.meta, configFile)
      } catch (configRestoreError) {
        recoveryErrors.push(`config: ${formatError(configRestoreError)}`)
      }
    }

    if (recoveryErrors.length > 0) {
      throw new Error(
        `Failed to remove profile "${name}": ${formatError(error)}. Recovery failed: ${recoveryErrors.join(
          '; ',
        )}`,
      )
    }
    throw error
  }
}

function rollbackStorage(
  name: string,
  stagedDir: string | undefined,
  stagedWrapper: string | undefined,
  profilesDir: string,
  browsersDir: string,
): void {
  const rollbackErrors: string[] = []

  if (stagedDir) {
    try {
      restoreStagedProfileDir(stagedDir, name, profilesDir)
    } catch (error) {
      rollbackErrors.push(`profile dir: ${formatError(error)}`)
    }
  }

  if (stagedWrapper) {
    try {
      restoreStagedBrowserWrapper(stagedWrapper, name, browsersDir)
    } catch (error) {
      rollbackErrors.push(`browser wrapper: ${formatError(error)}`)
    }
  }

  if (rollbackErrors.length > 0) {
    throw new Error(`Rollback failed for profile "${name}": ${rollbackErrors.join('; ')}`)
  }
}

function restoreConfigEntry(meta: ProfileMeta, configFile: string): void {
  if (getProfile(meta.name, configFile)) {
    return
  }
  addProfile(meta, configFile)
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
