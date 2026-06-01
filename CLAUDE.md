# CLAUDE.md

Guidance for AI agents (and humans) working in this repo. See `ARCHITECTURE.md` for the design
deep-dive.

## What this is

`ccm` (`@remeic/ccm`) — nvm-like manager for Claude Code profiles. Each profile is an isolated
`CLAUDE_CONFIG_DIR`, so multiple Claude accounts can coexist without re-login. CLI built on
`commander` + `zod`. Zero other runtime deps — keep it that way.

## Commands

Bun is the dev package manager (`bun.lock`). Node 24 (`.nvmrc`, `engines`).

```bash
bun install
bun run build           # tsup → single ESM file in dist/
bun run dev             # tsup watch
bun run test            # vitest
bun run test:coverage   # vitest + coverage (gate)
bun run test:mutation   # stryker (gate)
bun run lint            # biome check
bun run lint:fix        # biome check --write
bun run format          # biome format
```

## Non-negotiable invariants

- **100% coverage** (vitest, all of branches/functions/lines/statements) and **100% mutation**
  (Stryker, `break: 100`). Any new code must be fully tested AND mutation-proof. CI enforces both.
- **Every new `src/lib/*.ts` and mutated `src/commands/*.ts` must be added to `stryker.config.mjs`
  `mutate[]`.** Omitting it silently weakens the 100%-mutation claim — a reviewer will diff `mutate[]`
  against `src/`. Add a direct `tests/lib/*.test.ts` for each new lib file; don't rely on caller
  coverage to kill mutants.
- `src/index.ts` and `src/types.ts` are excluded from coverage — keep them logic-free (registration
  and schemas only). Don't move testable logic there to dodge the gate.

## Conventions

- **ESM `.js` import specifiers** in `.ts` source (e.g. `import { x } from './foo.js'`) — required by
  the bundler's module resolution. New files follow this.
- **Layering:** `src/lib/*` = pure, testable logic (named exports + `/** JSDoc */`). `src/commands/*` =
  CLI wiring (commander registration, I/O). Keep UI out of logic.
- **UI/output:** colors, icons, and print helpers live in `src/lib/ui.ts` (built on `node:util`
  `styleText`, NO_COLOR/non-TTY aware). Never hand-write `\x1b[...` escapes in commands.
- **Errors:** `formatError` in `src/lib/errors.ts`; CLI error handling via `runAction` in
  `src/lib/run-action.ts` (prints `✗ message` + `exit(1)`). Don't re-add per-command try/catch
  boilerplate; keep only inner try/catch that carries real rollback semantics.
- **Dependency-injectable seams:** lib functions take `configFile`/`profilesDir`/`browsersDir` params
  defaulting to the real paths. This is what makes 100% coverage achievable — preserve the pattern.
- **Validation:** all external input via zod schemas in `src/types.ts` (profile names, config shape,
  Claude auth status). Parse with `.safeParse` and degrade gracefully.
- Biome style: single quotes, no semicolons, trailing commas, 100-col width. Conventional Commits
  (commitlint-enforced).
