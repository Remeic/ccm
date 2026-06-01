import type { Command } from 'commander'
import { getAuthStatus } from '../lib/claude.js'
import { getStoredProfile, listStoredProfiles } from '../lib/profile-store.js'
import { NO_ACCOUNT_PLACEHOLDER, toProfileView } from '../lib/profile-view.js'
import { runAction } from '../lib/run-action.js'
import { statusDot } from '../lib/ui.js'

/** Registers the CLI workflow for inspecting profile auth status. */
export function registerStatus(program: Command): void {
  program
    .command('status [name]')
    .description('Show auth status for a profile (or all profiles)')
    .option('--json', 'Output machine-readable JSON')
    .action(
      runAction(async (name: string | undefined, opts: { json?: boolean }) => {
        if (name) {
          const profile = getStoredProfile(name)
          if (!profile) {
            throw new Error(`Profile "${name}" does not exist`)
          }
          const status = profile.hasDirectory ? await getAuthStatus(profile.dir) : undefined
          const view = toProfileView(profile, status)

          if (opts.json) {
            console.log(JSON.stringify(view, null, 2))
            return
          }

          console.log(`Profile: ${view.name}`)
          console.log(`State: ${view.state}`)
          console.log(`Logged in: ${view.loggedIn ?? 'unknown'}`)
          console.log(`Auth method: ${view.authMethod}`)
          if (view.createdAt) console.log(`Created: ${view.createdAt}`)
          if (!view.hasDirectory) console.log('Directory: missing')
          if (status?.email) console.log(`Email: ${status.email}`)
          if (status?.orgName) console.log(`Org: ${status.orgName}`)
          if (status?.subscriptionType) console.log(`Subscription: ${status.subscriptionType}`)
          return
        }

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
          console.log('No profiles.')
          return
        }

        for (const view of views) {
          const icon = statusDot(view.loggedIn === true)
          const account = view.account ?? NO_ACCOUNT_PLACEHOLDER
          const stateSuffix = view.state === 'ready' ? '' : ` [${view.state}]`
          console.log(
            `${icon} ${view.name.padEnd(20)} ${view.authMethod.padEnd(15)} ${account}${stateSuffix}`,
          )
        }
      }),
    )
}
