import {
  chmodSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import type { ProfileMeta } from '../types.js'
import { BROWSERS_DIR } from './constants.js'

const SHELL_METACHAR = /[;|&`$(){}<>\\!\n\r]/

export function validateBrowserCommand(cmd: string): void {
  if (SHELL_METACHAR.test(cmd)) {
    throw new Error(
      `Unsafe browser command "${cmd}". Shell metacharacters (;|&\`$(){}<>\\!) are not allowed.`,
    )
  }
}

export function ensureBrowserWrapper(
  profileName: string,
  browserCommand: string,
  browsersDir = BROWSERS_DIR,
): string {
  validateBrowserCommand(browserCommand)
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

function getStagedPath(path: string): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const suffix =
      attempt === 0
        ? `${process.pid}-${Date.now()}`
        : `${process.pid}-${Date.now()}-${attempt.toString()}`
    const candidate = `${path}.staged-${suffix}`
    if (!existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(`Could not allocate a temporary path for "${path}"`)
}

export function getBrowserWrapperPath(profileName: string, browsersDir = BROWSERS_DIR): string {
  return join(browsersDir, `${profileName}.sh`)
}

export function removeBrowserWrapper(profileName: string, browsersDir = BROWSERS_DIR): void {
  const wrapperPath = getBrowserWrapperPath(profileName, browsersDir)
  if (!existsSync(wrapperPath)) {
    return
  }
  unlinkSync(wrapperPath)
}

export function stageBrowserWrapperRemoval(
  profileName: string,
  browsersDir = BROWSERS_DIR,
): string | undefined {
  const wrapperPath = getBrowserWrapperPath(profileName, browsersDir)
  if (!existsSync(wrapperPath)) {
    return undefined
  }

  const stagedPath = getStagedPath(wrapperPath)
  renameSync(wrapperPath, stagedPath)
  return stagedPath
}

export function restoreStagedBrowserWrapper(
  stagedPath: string,
  profileName: string,
  browsersDir = BROWSERS_DIR,
): void {
  renameSync(stagedPath, getBrowserWrapperPath(profileName, browsersDir))
}

export function finalizeStagedBrowserWrapperRemoval(stagedPath: string): void {
  rmSync(stagedPath, { force: true })
}

export function resolveBrowser(cliOverride?: string, meta?: ProfileMeta): string | undefined {
  return cliOverride ?? meta?.browser
}
