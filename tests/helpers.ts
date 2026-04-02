import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'

export interface TempCcmHome {
  ccmHome: string
  profilesDir: string
  configFile: string
}

/**
 * Creates a temporary CCM_HOME directory with expected subdirectories.
 * Returns paths for CCM_HOME, PROFILES_DIR, and CONFIG_FILE.
 */
export function createTempCcmHome(): TempCcmHome {
  const ccmHome = mkdtempSync(join(tmpdir(), 'ccm-test-'))
  const profilesDir = join(ccmHome, 'profiles')
  const configFile = join(ccmHome, 'config.json')
  return { ccmHome, profilesDir, configFile }
}

/**
 * Removes a temporary directory recursively.
 */
export function cleanupTempDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true })
}

export interface MockSpawnResult {
  process: ChildProcess
  emitStdout: (data: string) => void
  emitStderr: (data: string) => void
  emitClose: (code: number) => void
  emitError: (err: Error) => void
}

/**
 * Creates a type-safe mock for child_process.spawn.
 * Returns a mock ChildProcess with controllable stdout, stderr, and events.
 */
export function createMockSpawn(): MockSpawnResult {
  const emitter = new EventEmitter()
  const stdout = new Readable({ read() {} })
  const stderr = new Readable({ read() {} })

  const process = Object.assign(emitter, {
    stdout,
    stderr,
    stdin: null,
    stdio: [null, stdout, stderr] as const,
    pid: 12345,
    connected: false,
    exitCode: null as number | null,
    signalCode: null as NodeJS.Signals | null,
    spawnargs: [] as string[],
    spawnfile: '',
    killed: false,
    kill: () => true,
    send: () => true,
    disconnect: () => {},
    unref: () => emitter,
    ref: () => emitter,
    [Symbol.dispose]: () => {},
  }) as unknown as ChildProcess

  return {
    process,
    emitStdout: (data: string) => stdout.push(data),
    emitStderr: (data: string) => stderr.push(data),
    emitClose: (code: number) => {
      stdout.push(null)
      stderr.push(null)
      emitter.emit('close', code)
    },
    emitError: (err: Error) => emitter.emit('error', err),
  }
}
