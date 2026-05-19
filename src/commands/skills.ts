import { spawn } from 'node:child_process'
import type { Command } from 'commander'
import { getProfileDir, profileExists } from '../lib/profiles.js'

/**
 * Runs `npx skills <action> ...` with CLAUDE_CONFIG_DIR pointed at the profile
 * dir, so skills install into <profile>/skills/ instead of the global
 * ~/.claude. The `skills` tool (vercel-labs) resolves its global skills dir
 * from CLAUDE_CONFIG_DIR.
 */
function runSkills(action: string, name: string, rest: string[]): void {
  try {
    if (!profileExists(name)) {
      throw new Error(`Profile "${name}" does not exist. Create it first: ccm create ${name}`)
    }

    const dir = getProfileDir(name)
    const args = ['-y', 'skills', action, ...rest, '-a', 'claude-code', '-g', '-y']
    const child = spawn('npx', args, {
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
      stdio: 'inherit',
    })
    child.on('close', code => process.exit(code ?? 0))
  } catch (e) {
    console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`)
    process.exit(1)
  }
}

/** Registers the `skills` command group: install/manage skills per profile. */
export function registerSkills(program: Command): void {
  const skills = program
    .command('skills')
    .description('Manage Claude Code skills scoped to a profile')

  skills
    .command('add <name> [repos...]')
    .description('Install skills from GitHub into a profile (e.g. owner/repo)')
    .allowUnknownOption(true)
    .helpOption(false)
    .action((name: string, repos: string[]) => runSkills('add', name, repos))

  skills
    .command('list <name> [args...]')
    .description('List skills installed in a profile')
    .allowUnknownOption(true)
    .helpOption(false)
    .action((name: string, args: string[]) => runSkills('list', name, args))

  skills
    .command('remove <name> [skills...]')
    .description('Remove skills from a profile')
    .allowUnknownOption(true)
    .helpOption(false)
    .action((name: string, names: string[]) => runSkills('remove', name, names))

  skills
    .command('update <name> [skills...]')
    .description('Update skills in a profile')
    .allowUnknownOption(true)
    .helpOption(false)
    .action((name: string, names: string[]) => runSkills('update', name, names))
}
