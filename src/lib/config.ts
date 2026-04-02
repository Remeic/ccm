import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { CcmConfig, ProfileMeta } from '../types.js'
import { CONFIG_FILE } from './constants.js'

const DEFAULT_CONFIG: CcmConfig = { profiles: {} }

export function loadConfig(configFile = CONFIG_FILE): CcmConfig {
  try {
    const raw = readFileSync(configFile, 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('profiles' in parsed) ||
      typeof (parsed as Record<string, unknown>).profiles !== 'object' ||
      (parsed as Record<string, unknown>).profiles === null
    ) {
      return { ...DEFAULT_CONFIG, profiles: {} }
    }
    return parsed as CcmConfig
  } catch {
    return { ...DEFAULT_CONFIG, profiles: {} }
  }
}

export function saveConfig(config: CcmConfig, configFile = CONFIG_FILE): void {
  const dir = dirname(configFile)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const tmp = `${configFile}.tmp`
  writeFileSync(tmp, JSON.stringify(config, null, 2))
  renameSync(tmp, configFile)
}

export function addProfile(meta: ProfileMeta, configFile = CONFIG_FILE): void {
  const config = loadConfig(configFile)
  if (config.profiles[meta.name]) {
    throw new Error(`Profile "${meta.name}" already exists`)
  }
  config.profiles[meta.name] = meta
  saveConfig(config, configFile)
}

export function removeProfile(name: string, configFile = CONFIG_FILE): void {
  const config = loadConfig(configFile)
  if (!config.profiles[name]) {
    throw new Error(`Profile "${name}" not found`)
  }
  delete config.profiles[name]
  saveConfig(config, configFile)
}

export function getProfile(name: string, configFile = CONFIG_FILE): ProfileMeta | undefined {
  return loadConfig(configFile).profiles[name]
}
