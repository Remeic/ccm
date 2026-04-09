import { createInterface } from 'node:readline'
import type { Command } from 'commander'
import {
  applyProfileConfigCopy,
  type ProfileConfigCopyPlan,
  type ProfileConfigCopyPlanOptions,
  type ProfileConfigCopySelector,
  planProfileConfigCopy,
} from '../lib/profile-config-copy.js'

function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

function printPlan(plan: ProfileConfigCopyPlan): void {
  for (const operation of plan.operations) {
    const mode = operation.overwrite ? 'overwrite' : 'create'
    console.log(`- ${operation.relativePath} (${operation.kind}, ${mode})`)
  }
}

function collectOnlySelector(value: string, previous: string[]): string[] {
  const tokens = value.split(',').map(token => token.trim())
  if (tokens.some(token => token.length === 0)) {
    throw new Error('Invalid --only value. Empty entries are not allowed.')
  }
  return [...previous, ...tokens]
}

function resolvePlanOptions(only?: string[]): ProfileConfigCopyPlanOptions | undefined {
  if (!only || only.length === 0) {
    return undefined
  }
  return { only: only as ProfileConfigCopySelector[] }
}

/** Registers the CLI workflow for copying non-auth config between managed profiles. */
export function registerCopyConfig(program: Command): void {
  program
    .command('copy-config <source> <target>')
    .description(
      'Copy non-auth configuration (hooks, skills, settings) from one profile to another',
    )
    .option(
      '--only <path>',
      'Copy only selected path(s): settings, plugins (repeatable or comma-separated)',
      collectOnlySelector,
      [],
    )
    .option('--dry-run', 'Preview what would be copied without writing files')
    .option('-f, --force', 'Skip overwrite confirmation and apply immediately')
    .action(
      async (
        source: string,
        target: string,
        opts: { dryRun?: boolean; force?: boolean; only?: string[] },
      ) => {
        try {
          const plan = planProfileConfigCopy(
            source,
            target,
            undefined,
            resolvePlanOptions(opts.only),
          )

          if (opts.dryRun) {
            console.log(
              `Dry run: ${plan.operations.length} item(s) would be copied from "${source}" to "${target}"`,
            )
            printPlan(plan)
            return
          }

          if (plan.overwriteCount > 0) {
            console.log(
              `! ${plan.overwriteCount} existing path(s) in "${target}" will be overwritten.`,
            )
            if (!opts.force) {
              const ok = await confirm('Continue? (y/N) ')
              if (!ok) {
                console.log('Cancelled')
                return
              }
            }
          }

          const result = applyProfileConfigCopy(plan)
          console.log(
            `\x1b[32m✓\x1b[0m Copied ${result.copiedCount} item(s) from "${source}" to "${target}" (${result.createdCount} created, ${result.overwrittenCount} overwritten)`,
          )
        } catch (e) {
          console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`)
          process.exit(1)
        }
      },
    )
}
