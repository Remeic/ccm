/** Shells for which completion scripts can be generated. */
export const SUPPORTED_SHELLS = ['bash', 'zsh', 'fish'] as const

export type CompletionShell = (typeof SUPPORTED_SHELLS)[number]

/** Narrows an arbitrary string to a supported shell, or throws. */
export function parseShell(value: string): CompletionShell {
  if ((SUPPORTED_SHELLS as readonly string[]).includes(value)) {
    return value as CompletionShell
  }
  throw new Error(`Unsupported shell "${value}". Supported: ${SUPPORTED_SHELLS.join(', ')}`)
}

function bashScript(commands: string[]): string {
  return `# ccm bash completion
_ccm_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${commands.join(' ')}" -- "$cur") )
  fi
}
complete -F _ccm_completions ccm
`
}

function zshScript(commands: string[]): string {
  return `#compdef ccm
# ccm zsh completion
_ccm() {
  local -a commands
  commands=(${commands.map(name => `'${name}'`).join(' ')})
  if (( CURRENT == 2 )); then
    compadd -- \${commands[@]}
  fi
}
compdef _ccm ccm
`
}

function fishScript(commands: string[]): string {
  return commands
    .map(name => `complete -c ccm -n "__fish_use_subcommand" -a "${name}"`)
    .join('\n')
    .concat('\n')
}

/** Generates a shell completion script listing the given top-level commands. */
export function generateCompletion(shell: CompletionShell, commands: string[]): string {
  switch (shell) {
    case 'bash':
      return bashScript(commands)
    case 'zsh':
      return zshScript(commands)
    case 'fish':
      return fishScript(commands)
  }
}
