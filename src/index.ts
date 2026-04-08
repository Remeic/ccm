declare const __PKG_VERSION__: string

import { Command } from 'commander'
import { registerCompliance } from './commands/compliance.js'
import { registerCreate } from './commands/create.js'
import { registerList } from './commands/list.js'
import { registerLogin } from './commands/login.js'
import { registerRemove } from './commands/remove.js'
import { registerRename } from './commands/rename.js'
import { registerRun } from './commands/run.js'
import { registerStatus } from './commands/status.js'
import { registerUse } from './commands/use.js'

const program = new Command()
  .name('ccm')
  .version(__PKG_VERSION__)
  .description('Manage multiple Claude Code profiles')

registerCreate(program)
registerCompliance(program)
registerList(program)
registerRemove(program)
registerRename(program)
registerLogin(program)
registerStatus(program)
registerUse(program)
registerRun(program)

program.parse()
