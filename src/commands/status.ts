import type { Command } from 'commander'
import { getAuthStatus } from '../lib/claude.js'
import { getStoredProfile, listStoredProfiles } from '../lib/profile-store.js'

export function registerStatus(program: Command): void {
  program
    .command('status [name]')
    .description('Show auth status for a profile (or all profiles)')
    .action(async (name?: string) => {
      try {
        if (name) {
          const profile = getStoredProfile(name)
          if (!profile) {
            throw new Error(`Profile "${name}" does not exist`)
          }
          const status = profile.hasDirectory ? await getAuthStatus(profile.dir) : undefined
          console.log(`Profile: ${name}`)
          console.log(`State: ${profile.state}`)
          console.log(`Logged in: ${status?.loggedIn ?? 'unknown'}`)
          console.log(`Auth method: ${status?.authMethod ?? 'unavailable'}`)
          if (profile.meta?.createdAt) console.log(`Created: ${profile.meta.createdAt}`)
          if (!profile.hasDirectory) console.log('Directory: missing')
          if (status?.email) console.log(`Email: ${status.email}`)
          if (status?.orgName) console.log(`Org: ${status.orgName}`)
          if (status?.subscriptionType) console.log(`Subscription: ${status.subscriptionType}`)
        } else {
          const profiles = listStoredProfiles()
          if (profiles.length === 0) {
            console.log('No profiles.')
            return
          }
          const statuses = await Promise.all(
            profiles.map(async profile => ({
              profile,
              status: profile.hasDirectory ? await getAuthStatus(profile.dir) : undefined,
            })),
          )
          for (const { profile, status } of statuses) {
            const icon = status?.loggedIn === true ? '\x1b[32m●\x1b[0m' : '\x1b[31m●\x1b[0m'
            const account = status?.email ?? status?.apiKeySource ?? '—'
            const authMethod = status?.authMethod ?? 'unavailable'
            const stateSuffix = profile.state === 'ready' ? '' : ` [${profile.state}]`
            console.log(
              `${icon} ${profile.name.padEnd(20)} ${authMethod.padEnd(15)} ${account}${stateSuffix}`,
            )
          }
        }
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`)
        process.exit(1)
      }
    })
}
