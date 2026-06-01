import { describe, expect, test } from 'vitest'
import {
  type CompletionShell,
  generateCompletion,
  parseShell,
  SUPPORTED_SHELLS,
} from '../../src/lib/completion.js'

const COMMANDS = ['create', 'list', 'use']

describe('parseShell', () => {
  test.each(SUPPORTED_SHELLS)('accepts %s', shell => {
    expect(parseShell(shell)).toBe(shell)
  })

  test('rejects unsupported shells and lists the supported ones', () => {
    expect(() => parseShell('powershell')).toThrow(
      'Unsupported shell "powershell". Supported: bash, zsh, fish',
    )
  })
})

describe('generateCompletion', () => {
  test('bash script is exact (commands space-joined inside compgen)', () => {
    expect(generateCompletion('bash', COMMANDS)).toBe(
      `# ccm bash completion
_ccm_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "create list use" -- "$cur") )
  fi
}
complete -F _ccm_completions ccm
`,
    )
  })

  test('zsh script is exact (commands quoted and space-joined)', () => {
    expect(generateCompletion('zsh', COMMANDS)).toBe(
      `#compdef ccm
# ccm zsh completion
_ccm() {
  local -a commands
  commands=('create' 'list' 'use')
  if (( CURRENT == 2 )); then
    compadd -- \${commands[@]}
  fi
}
compdef _ccm ccm
`,
    )
  })

  test('fish script is exact (one newline-joined complete line per command)', () => {
    expect(generateCompletion('fish', COMMANDS)).toBe(
      `complete -c ccm -n "__fish_use_subcommand" -a "create"
complete -c ccm -n "__fish_use_subcommand" -a "list"
complete -c ccm -n "__fish_use_subcommand" -a "use"
`,
    )
  })

  test.each(SUPPORTED_SHELLS)('%s script mentions every command', shell => {
    const script = generateCompletion(shell, COMMANDS)
    for (const name of COMMANDS) {
      expect(script).toContain(name)
    }
  })

  test('produces distinct scripts per shell', () => {
    const scripts = SUPPORTED_SHELLS.map((shell: CompletionShell) =>
      generateCompletion(shell, COMMANDS),
    )
    expect(new Set(scripts).size).toBe(SUPPORTED_SHELLS.length)
  })
})
