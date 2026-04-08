import type { Command } from 'commander'
import { getFullComplianceNoticeLines } from '../lib/compliance.js'

/** Registers the CLI workflow for surfacing the project's compliance notice. */
export function registerCompliance(program: Command): void {
  program
    .command('compliance')
    .alias('tos')
    .description('Show the Claude Code compliance notice and official source links')
    .action(() => {
      for (const line of getFullComplianceNoticeLines()) {
        console.log(line)
      }
    })
}
