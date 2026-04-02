import { homedir } from 'node:os'
import { join } from 'node:path'

export const CCM_HOME = join(homedir(), '.ccm')
export const PROFILES_DIR = join(CCM_HOME, 'profiles')
export const CONFIG_FILE = join(CCM_HOME, 'config.json')
export const BROWSERS_DIR = join(CCM_HOME, 'browsers')
