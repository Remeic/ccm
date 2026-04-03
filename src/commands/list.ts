import type { Command } from 'commander'
import { getAuthStatus } from '../lib/claude.js'
import { listStoredProfiles } from '../lib/profile-store.js'

export function registerList(program: Command): void {
  program
    .command('list')
    .description('List all profiles, including drifted config/filesystem entries')
    .action(async () => {
      const profiles = listStoredProfiles()

      if (profiles.length === 0) {
        console.log('No profiles. Create one: ccm create <name>')
        return
      }

      const statuses = await Promise.all(
        profiles.map(async profile => {
          const status = profile.hasDirectory ? await getAuthStatus(profile.dir) : undefined
          return { profile, status }
        }),
      )

      console.log(
        `${'NAME'.padEnd(20)}${'STATE'.padEnd(14)}${'AUTH'.padEnd(15)}${'ACCOUNT'.padEnd(
          35,
        )}CREATED`,
      )
      console.log('─'.repeat(99))

      for (const { profile, status } of statuses) {
        const account = status?.email ?? status?.apiKeySource ?? '—'
        const authMethod = status?.authMethod ?? 'unavailable'
        const created = profile.meta?.createdAt.slice(0, 10) ?? '—'
        console.log(
          `${profile.name.padEnd(20)}${profile.state.padEnd(14)}${authMethod.padEnd(
            15,
          )}${account.padEnd(35)}${created}`,
        )
      }
    })
}
