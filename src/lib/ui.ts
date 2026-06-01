import { styleText } from 'node:util'

/**
 * Terminal output helpers. Colors are applied via `node:util` styleText, which
 * automatically degrades to plain text when output is not a TTY or NO_COLOR is
 * set — so commands never hand-write ANSI escapes and machine consumers get
 * clean strings.
 */

/** Status glyphs used across command output. */
export const icons = {
  success: '✓',
  error: '✗',
  warn: '!',
  dot: '●',
} as const

/** Wraps text in green. */
export function green(text: string): string {
  return styleText('green', text)
}

/** Wraps text in red. */
export function red(text: string): string {
  return styleText('red', text)
}

/** Wraps text in yellow. */
export function yellow(text: string): string {
  return styleText('yellow', text)
}

/** Wraps text in dim styling. */
export function dim(text: string): string {
  return styleText('dim', text)
}

/** Builds a success line: green check followed by the message. */
export function successLine(message: string): string {
  return `${green(icons.success)} ${message}`
}

/** Builds an error line: red cross followed by the message. */
export function errorLine(message: string): string {
  return `${red(icons.error)} ${message}`
}

/** Builds a warning line: yellow bang followed by the message. */
export function warnLine(message: string): string {
  return `${yellow(icons.warn)} ${message}`
}

/** Picks the colored status dot for a profile's logged-in state. */
export function statusDot(loggedIn: boolean): string {
  return loggedIn ? green(icons.dot) : red(icons.dot)
}

/** Prints a success line to stdout. */
export function printSuccess(message: string): void {
  console.log(successLine(message))
}

/** Prints an error line to stderr. */
export function printError(message: string): void {
  console.error(errorLine(message))
}
