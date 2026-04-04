import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { type CcmConfig, CcmConfigSchema, type ProfileMeta, ProfileMetaSchema } from '../types.js'
import { CONFIG_FILE } from './constants.js'

const DEFAULT_CONFIG: CcmConfig = { profiles: {} }

export function loadConfig(configFile = CONFIG_FILE): CcmConfig {
  try {
    const raw = readFileSync(configFile, 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    const result = CcmConfigSchema.safeParse(parsed)
    return result.success ? result.data : { ...DEFAULT_CONFIG, profiles: {} }
  } catch {
    return { ...DEFAULT_CONFIG, profiles: {} }
  }
}

export function saveConfig(config: CcmConfig, configFile = CONFIG_FILE): void {
  const validatedConfig = CcmConfigSchema.parse(config)
  const dir = dirname(configFile)
  mkdirSync(dir, { recursive: true })
  const tmp = `${configFile}.tmp`
  writeFileSync(tmp, JSON.stringify(validatedConfig, null, 2), { mode: 0o600 })
  renameSync(tmp, configFile)
}

export function addProfile(meta: ProfileMeta, configFile = CONFIG_FILE): void {
  const config = loadConfig(configFile)
  const validatedMeta = ProfileMetaSchema.parse(meta)
  if (config.profiles[validatedMeta.name]) {
    throw new Error(`Profile "${validatedMeta.name}" already exists`)
  }
  config.profiles[validatedMeta.name] = validatedMeta
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

export function renameProfile(oldName: string, newName: string, configFile = CONFIG_FILE): void {
  const config = loadConfig(configFile)
  if (!config.profiles[oldName]) {
    throw new Error(`Profile "${oldName}" not found`)
  }
  if (config.profiles[newName]) {
    throw new Error(`Profile "${newName}" already exists`)
  }
  config.profiles[newName] = { ...config.profiles[oldName], name: newName }
  delete config.profiles[oldName]
  saveConfig(config, configFile)
}

export function getProfile(name: string, configFile = CONFIG_FILE): ProfileMeta | undefined {
  return loadConfig(configFile).profiles[name]
}
