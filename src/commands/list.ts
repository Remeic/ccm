import type { Command } from 'commander'
import { getAuthStatus } from '../lib/claude.js'
import { loadConfig } from '../lib/config.js'
import { getProfileDir } from '../lib/profiles.js'

export function registerList(program: Command): void {
  program
    .command('list')
    .description('List all profiles')
    .action(async () => {
      const config = loadConfig()
      const names = Object.keys(config.profiles)

      if (names.length === 0) {
        console.log('No profiles. Create one: ccm create <name>')
        return
      }

      const statuses = await Promise.all(
        names.map(async name => {
          const dir = getProfileDir(name)
          const status = await getAuthStatus(dir)
          return { name, status }
        }),
      )

      console.log(`${'NAME'.padEnd(20)}${'AUTH'.padEnd(15)}${'ACCOUNT'.padEnd(35)}CREATED`)
      console.log('─'.repeat(85))

      for (const { name, status } of statuses) {
        const meta = config.profiles[name]
        if (!meta) continue
        const account = status.email ?? status.apiKeySource ?? '—'
        const created = meta.createdAt.slice(0, 10)
        console.log(
          `${name.padEnd(20)}${status.authMethod.padEnd(15)}${account.padEnd(35)}${created}`,
        )
      }
    })
}
