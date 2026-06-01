# Contributing

## Setup

```sh
git clone https://github.com/remeic/ccm.git
cd ccm
nvm use 24
bun install
```

## Architecture

The codebase separates pure logic from CLI wiring:

- `src/lib/` — core modules (config I/O, profile management, Claude interaction). No CLI framework dependencies.
- `src/commands/` — thin Commander.js command registrations that call into `lib/`.

This makes the core logic independently testable without mocking the CLI framework. For the design
rationale (state reconciliation, the transactional stage/rollback protocol, and why error handling
lives in `runAction` rather than `index.ts`), see [ARCHITECTURE.md](ARCHITECTURE.md).

## Development

```sh
bun run dev            # watch mode build
bun run test:watch     # watch mode tests
bun run test:coverage  # coverage (100% threshold enforced)
```

### Running locally

Build and test the CLI directly:

```sh
bun run build
node dist/index.js create test-profile
node dist/index.js list
node dist/index.js remove test-profile -f
```

## Code Quality

- **Linter/formatter**: [Biome](https://biomejs.dev/) (runs on commit via lint-staged)
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint
- **Tests**: 100% coverage required on branches, functions, lines, statements
- **Mutation testing**: [Stryker](https://stryker-mutator.io/) enforces a 100% mutation score

```sh
bun run test:mutation  # run mutation tests
```

## Submitting Changes

1. Fork and create a feature branch
2. Write tests for new functionality
3. Ensure `bun run test:coverage` passes
4. Open a PR against `main` with a Conventional Commit title such as `feat: add profile import command`
5. Use **Squash and merge** when merging the PR

## Release Notes Hygiene

`release-please` builds the release PR and changelog from Conventional Commit messages on `main`.

- Keep the PR title in Conventional Commit format so the squash commit is releasable and readable
- Prefer **Squash and merge** to keep a linear history and avoid noisy or duplicated changelog entries
- Use `feat:` and `fix:` for user-facing changes that should appear in release notes
- Expect `docs:`, `refactor:`, `chore:` and similar maintenance-only changes to be omitted from Node release notes unless the release configuration is changed
