import type { Command } from 'commander'
import { getAuthStatus } from '../lib/claude.js'
import { loadConfig } from '../lib/config.js'
import { getProfileDir, profileExists } from '../lib/profiles.js'

export function registerStatus(program: Command): void {
  program
    .command('status [name]')
    .description('Show auth status for a profile (or all profiles)')
    .action(async (name?: string) => {
      try {
        if (name) {
          if (!profileExists(name)) {
            throw new Error(`Profile "${name}" does not exist`)
          }
          const dir = getProfileDir(name)
          const status = await getAuthStatus(dir)
          console.log(`Profile: ${name}`)
          console.log(`Logged in: ${status.loggedIn}`)
          console.log(`Auth method: ${status.authMethod}`)
          if (status.email) console.log(`Email: ${status.email}`)
          if (status.orgName) console.log(`Org: ${status.orgName}`)
          if (status.subscriptionType) console.log(`Subscription: ${status.subscriptionType}`)
        } else {
          const config = loadConfig()
          const names = Object.keys(config.profiles)
          if (names.length === 0) {
            console.log('No profiles.')
            return
          }
          const statuses = await Promise.all(
            names.map(async n => ({
              name: n,
              status: await getAuthStatus(getProfileDir(n)),
            })),
          )
          for (const { name: n, status } of statuses) {
            const icon = status.loggedIn ? '\x1b[32m●\x1b[0m' : '\x1b[31m●\x1b[0m'
            const account = status.email ?? status.apiKeySource ?? '—'
            console.log(`${icon} ${n.padEnd(20)} ${status.authMethod.padEnd(15)} ${account}`)
          }
        }
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`)
        process.exit(1)
      }
    })
}
