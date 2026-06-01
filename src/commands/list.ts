import type { Command } from 'commander'
import { getAuthStatus } from '../lib/claude.js'
import { listStoredProfiles } from '../lib/profile-store.js'
import { NO_ACCOUNT_PLACEHOLDER, toProfileView } from '../lib/profile-view.js'
import { runAction } from '../lib/run-action.js'

const COLUMNS = {
  name: 20,
  state: 14,
  auth: 15,
  account: 35,
} as const

const TABLE_WIDTH = COLUMNS.name + COLUMNS.state + COLUMNS.auth + COLUMNS.account + 'CREATED'.length

/** Registers the CLI workflow for listing managed profiles. */
export function registerList(program: Command): void {
  program
    .command('list')
    .description('List all profiles, including drifted config/filesystem entries')
    .option('--json', 'Output machine-readable JSON')
    .action(
      runAction(async (opts: { json?: boolean }) => {
        const profiles = listStoredProfiles()

        const views = await Promise.all(
          profiles.map(async profile => {
            const status = profile.hasDirectory ? await getAuthStatus(profile.dir) : undefined
            return toProfileView(profile, status)
          }),
        )

        if (opts.json) {
          console.log(JSON.stringify(views, null, 2))
          return
        }

        if (views.length === 0) {
          console.log('No profiles. Create one: ccm create <name>')
          return
        }

        console.log(
          `${'NAME'.padEnd(COLUMNS.name)}${'STATE'.padEnd(COLUMNS.state)}${'AUTH'.padEnd(
            COLUMNS.auth,
          )}${'ACCOUNT'.padEnd(COLUMNS.account)}CREATED`,
        )
        console.log('─'.repeat(TABLE_WIDTH))

        for (const view of views) {
          const account = view.account ?? NO_ACCOUNT_PLACEHOLDER
          const created = view.createdAt?.slice(0, 10) ?? NO_ACCOUNT_PLACEHOLDER
          console.log(
            `${view.name.padEnd(COLUMNS.name)}${view.state.padEnd(COLUMNS.state)}${view.authMethod.padEnd(
              COLUMNS.auth,
            )}${account.padEnd(COLUMNS.account)}${created}`,
          )
        }
      }),
    )
}
