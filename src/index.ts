import { Command } from 'commander'
import { registerCreate } from './commands/create.js'
import { registerList } from './commands/list.js'
import { registerLogin } from './commands/login.js'
import { registerRemove } from './commands/remove.js'
import { registerRun } from './commands/run.js'
import { registerStatus } from './commands/status.js'
import { registerUse } from './commands/use.js'

const program = new Command()
  .name('ccm')
  .version('0.1.0')
  .description('Manage multiple Claude Code profiles')

registerCreate(program)
registerList(program)
registerRemove(program)
registerLogin(program)
registerStatus(program)
registerUse(program)
registerRun(program)

program.parse()
