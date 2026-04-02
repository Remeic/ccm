import { chmodSync, existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ProfileMeta } from '../types.js'
import { BROWSERS_DIR } from './constants.js'

export function ensureBrowserWrapper(
  profileName: string,
  browserCommand: string,
  browsersDir = BROWSERS_DIR,
): string {
  if (!browserCommand.includes(' ')) return browserCommand

  if (!existsSync(browsersDir)) mkdirSync(browsersDir, { recursive: true })

  const scriptPath = join(browsersDir, `${profileName}.sh`)
  const content = `#!/bin/sh\nexec ${browserCommand} "$@"\n`
  const tmp = `${scriptPath}.tmp`
  writeFileSync(tmp, content)
  chmodSync(tmp, 0o755)
  renameSync(tmp, scriptPath)
  return scriptPath
}

export function resolveBrowser(cliOverride?: string, meta?: ProfileMeta): string | undefined {
  return cliOverride ?? meta?.browser
}
