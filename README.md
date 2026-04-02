# ccm

> Multi-profile manager for Claude Code

[![CI](https://github.com/remeic/ccm-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/remeic/ccm-cli/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ccm-cli.svg)](https://www.npmjs.com/package/ccm-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Switch between Claude Code accounts instantly. Like `nvm` for Claude Code profiles.

## Why

Claude Code stores auth in a single config directory. If you use multiple accounts (personal, work, client projects), you need to log out and back in every time. **ccm** manages isolated profile directories so you can switch instantly.

## Install

```sh
npm i -g ccm-cli
```

## Quick Start

```sh
ccm create work
ccm login work
ccm use work
```

## Commands

| Command | Description |
|---|---|
| `ccm create <name> [-l label]` | Create a new profile |
| `ccm list` | List all profiles with auth status |
| `ccm use <name> [-- args]` | Launch Claude Code with a profile |
| `ccm login <name>` | Authenticate a profile |
| `ccm status [name]` | Show auth status (one or all profiles) |
| `ccm remove <name> [-f]` | Remove a profile |
| `ccm run <name> -p <prompt>` | Run a prompt with a specific profile |

## How It Works

Each profile gets an isolated directory under `~/.ccm/profiles/<name>/`. When you `ccm use <name>`, it launches `claude` with `CLAUDE_CONFIG_DIR` pointed at that profile's directory — no symlinks, no hacks.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
