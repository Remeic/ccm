import { type ChildProcess, execFileSync, spawn } from 'node:child_process'
import { type ClaudeAuthStatus, ClaudeAuthStatusSchema } from '../types.js'

const UNKNOWN_AUTH_STATUS: ClaudeAuthStatus = { loggedIn: false, authMethod: 'unknown' }

/** Resolves the Claude Code executable used by CCM commands. */
export function findClaudeBinary(): string {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN
  const cmd = process.platform === 'win32' ? 'where' : 'which'
  try {
    const result = execFileSync(cmd, ['claude'], { encoding: 'utf-8' }).trim().split('\n')[0]
    // Stryker disable next-line StringLiteral: message swallowed by catch — outer error is the observable one
    if (!result) throw new Error('not found')
    return result
  } catch {
    throw new Error('Claude Code not found. Install: npm i -g @anthropic-ai/claude-code')
  }
}

/** Starts Claude Code with environment scoped to a managed profile. */
export function spawnClaude(
  profileDir: string,
  args: string[],
  opts?: { browser?: string },
): ChildProcess {
  const bin = findClaudeBinary()
  const env: Record<string, string | undefined> = {
    ...process.env,
    CLAUDE_CONFIG_DIR: profileDir,
  }
  if (opts?.browser) env.BROWSER = opts.browser
  return spawn(bin, args, { env, stdio: 'inherit' })
}

/** Reads Claude Code authentication state for a managed profile. */
export function getAuthStatus(profileDir: string): Promise<ClaudeAuthStatus> {
  const bin = findClaudeBinary()
  return new Promise(resolve => {
    const child = spawn(bin, ['auth', 'status', '--json'], {
      env: { ...process.env, CLAUDE_CONFIG_DIR: profileDir },
      stdio: ['ignore', 'pipe', 'ignore'],
    })

    let stdout = ''
    if (!child.stdout) {
      resolve(UNKNOWN_AUTH_STATUS)
      return
    }
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })

    const timeout = setTimeout(() => {
      child.kill()
      resolve(UNKNOWN_AUTH_STATUS)
    }, 10_000)

    child.on('close', () => {
      clearTimeout(timeout)
      try {
        const parsed: unknown = JSON.parse(stdout)
        const result = ClaudeAuthStatusSchema.safeParse(parsed)
        resolve(result.success ? result.data : UNKNOWN_AUTH_STATUS)
      } catch {
        resolve(UNKNOWN_AUTH_STATUS)
      }
    })

    child.on('error', () => {
      clearTimeout(timeout)
      resolve(UNKNOWN_AUTH_STATUS)
    })
  })
}
