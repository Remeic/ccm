import { homedir } from 'node:os'
import { join } from 'node:path'

/** Defines the base directory used for CCM-managed state. */
export const CCM_HOME = join(homedir(), '.ccm')
/** Defines where managed profile directories are stored. */
export const PROFILES_DIR = join(CCM_HOME, 'profiles')
/** Defines where the CCM configuration file is stored. */
export const CONFIG_FILE = join(CCM_HOME, 'config.json')
/** Defines where generated browser wrappers are stored. */
export const BROWSERS_DIR = join(CCM_HOME, 'browsers')
