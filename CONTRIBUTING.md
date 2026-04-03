# Contributing

## Setup

```sh
git clone https://github.com/remeic/ccm.git
cd ccm
bun install
```

## Architecture

The codebase separates pure logic from CLI wiring:

- `src/lib/` — core modules (config I/O, profile management, Claude interaction). No CLI framework dependencies.
- `src/commands/` — thin Commander.js command registrations that call into `lib/`.

This makes the core logic independently testable without mocking the CLI framework.

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
- **Mutation testing**: [Stryker](https://stryker-mutator.io/) validates test effectiveness beyond line coverage

```sh
bun run test:mutation  # run mutation tests
```

## Submitting Changes

1. Fork and create a feature branch
2. Write tests for new functionality
3. Ensure `bun run test:coverage` passes
4. Open a PR against `main`
