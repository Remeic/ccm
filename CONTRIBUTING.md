# Contributing

## Setup

```sh
git clone https://github.com/remeic/ccm-cli.git
cd ccm-cli
bun install
```

## Development

```sh
bun run dev            # watch mode build
bun run test:watch     # watch mode tests
bun run test:coverage  # coverage (100% threshold enforced)
```

## Code Quality

- **Linter/formatter**: Biome (runs on commit via lint-staged)
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint
- **Tests**: 100% coverage required on branches, functions, lines, statements

## Submitting Changes

1. Fork and create a feature branch
2. Write tests for new functionality
3. Ensure `bun run test:coverage` passes
4. Open a PR against `main`
