import type { Command } from 'commander'
import { generateCompletion, parseShell, SUPPORTED_SHELLS } from '../lib/completion.js'
import { runAction } from '../lib/run-action.js'

/** Collects the top-level command names (and aliases) registered on a program. */
export function collectCommandNames(program: Command): string[] {
  const names = new Set<string>()
  for (const command of program.commands) {
    const name = command.name()
    if (name === 'completion') continue
    names.add(name)
    for (const alias of command.aliases()) names.add(alias)
  }
  return [...names].sort((left, right) => left.localeCompare(right))
}

/** Registers the CLI workflow for emitting shell completion scripts. */
export function registerCompletion(program: Command): void {
  program
    .command('completion <shell>')
    .description(`Print a shell completion script (${SUPPORTED_SHELLS.join(', ')})`)
    .action(
      runAction((shell: string) => {
        const parsed = parseShell(shell)
        console.log(generateCompletion(parsed, collectCommandNames(program)))
      }),
    )
}
