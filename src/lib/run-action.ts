import { formatError } from './errors.js'
import { printError } from './ui.js'

/**
 * Wraps a commander action so any thrown (or rejected) error is reported as a
 * single `✗ message` line and exits with code 1. Centralizes the error-handling
 * boilerplate every command would otherwise repeat.
 *
 * The wrapper stays synchronous for synchronous actions (so callers see the
 * failure on the same tick) and only awaits when the action returns a promise.
 */
export function runAction<Args extends unknown[]>(
  action: (...args: Args) => void | Promise<void>,
): (...args: Args) => void | Promise<void> {
  return (...args: Args): void | Promise<void> => {
    try {
      const result = action(...args)
      if (result instanceof Promise) {
        return result.catch(fail)
      }
    } catch (error) {
      fail(error)
    }
  }
}

function fail(error: unknown): never {
  printError(formatError(error))
  process.exit(1)
}
