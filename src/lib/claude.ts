import { type ChildProcess, execFileSync, spawn } from 'node:child_process'
import type { ClaudeAuthStatus } from '../types.js'

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

export function getAuthStatus(profileDir: string): Promise<ClaudeAuthStatus> {
  const bin = findClaudeBinary()
  return new Promise(resolve => {
    const child = spawn(bin, ['auth', 'status', '--json'], {
      env: { ...process.env, CLAUDE_CONFIG_DIR: profileDir },
      stdio: ['ignore', 'pipe', 'ignore'],
    })

    let stdout = ''
    if (!child.stdout) {
      resolve({ loggedIn: false, authMethod: 'unknown' })
      return
    }
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })

    const timeout = setTimeout(() => {
      child.kill()
      resolve({ loggedIn: false, authMethod: 'unknown' })
    }, 10_000)

    child.on('close', () => {
      clearTimeout(timeout)
      try {
        const parsed: unknown = JSON.parse(stdout)
        if (
          // Stryker disable next-line ConditionalExpression: equivalent — non-object fails `in` operator with TypeError caught below
          typeof parsed === 'object' &&
          parsed !== null &&
          'loggedIn' in parsed &&
          typeof (parsed as Record<string, unknown>).loggedIn === 'boolean' &&
          'authMethod' in parsed &&
          typeof (parsed as Record<string, unknown>).authMethod === 'string'
        ) {
          resolve(parsed as ClaudeAuthStatus)
        } else {
          resolve({ loggedIn: false, authMethod: 'unknown' })
        }
      } catch {
        resolve({ loggedIn: false, authMethod: 'unknown' })
      }
    })

    child.on('error', () => {
      clearTimeout(timeout)
      resolve({ loggedIn: false, authMethod: 'unknown' })
    })
  })
}
