# Architecture

This document explains the non-obvious design decisions in `ccm` — the ones that aren't visible from
the command list. The headline ideas: profiles have **no single source of truth**, so state is
*reconciled*; and every destructive operation is **transactional**, so a mid-operation failure never
leaves a half-migrated profile.

## State model

A profile is not one thing. It is up to three independent pieces of on-disk state:

| Piece            | Location                          | Owner            |
| ---------------- | --------------------------------- | ---------------- |
| Metadata         | `~/.ccm/config.json` (`profiles`) | ccm              |
| Config directory | `~/.ccm/profiles/<name>/`         | Claude Code      |
| Browser wrapper  | `~/.ccm/browsers/<name>`          | ccm (optional)   |

These can drift out of sync — a directory deleted by hand, a config edited externally, a crash
between two writes. Rather than trust one source, `listStoredProfiles` / `getStoredProfile`
(`src/lib/profile-store.ts`) **reconcile** the config keys with the filesystem and classify each
profile into a state:

- `ready` — present in both config and filesystem (the normal case).
- `orphaned` — directory exists, but no config entry.
- `config-only` — config entry exists, but no directory.

`ccm list` and `ccm status` surface these states so drift is visible instead of silently misleading.
`profile-view.ts` projects this reconciled view (plus live Claude auth status) into the serializable
shape emitted by `--json`.

## Transactional protocol

`remove`, `rename`, and `copy-config` each mutate more than one of the three state pieces. A naive
implementation deletes/renames/copies in sequence and hopes nothing throws halfway. ccm instead uses a
**stage → mutate → finalize** protocol with rollback, so each operation is all-or-nothing.

### Why staging exists

`rename(2)` is atomic on a POSIX filesystem; a recursive copy is not. So:

- **Removal** (`removeStoredProfile`) does not delete eagerly. It first *stages* the directory and
  browser wrapper by renaming them aside (`stageProfileDirRemoval` →
  `.<name>.staged-<pid>-<timestamp>`), then removes the config entry, then *finalizes* by deleting the
  staged copies. If the config write fails, the staged assets are renamed back. If finalization fails,
  both the assets and the config entry are restored.
- **Rename** (`renameStoredProfile`) renames the directory, then the browser wrapper, then the config
  entry — each step guarded. A failure at any step rolls the prior steps back in reverse order before
  re-throwing.
- **Copy** (`applyProfileConfigCopy` in `profile-config-copy.ts`) stages any path it is about to
  overwrite (rename to a staged path), copies the new content, then deletes the staged originals. On
  failure it removes what it copied and renames the staged originals back.

### Rollback runs in reverse

`rollbackCopy` undoes work in the opposite order it was applied: remove copied targets newest-first,
then restore staged originals newest-first. Reverse order matters because later operations can depend
on earlier ones (a created parent directory, an overwritten file shadowing a staged one). Unwinding a
stack in LIFO order is the only ordering that is always safe.

### Staged path safety

`getStagedPath` builds the temporary name from `process.pid` + `Date.now()`, with an incrementing
suffix and a 100-attempt cap. The PID component keeps two concurrent `ccm` processes from colliding on
the same staged path; the timestamp + counter handle repeats within one process. If all 100 candidates
are somehow taken, it throws rather than guess — failing loudly beats clobbering a real file.

### Rollback-of-rollback

Rollback can itself fail (a filesystem that broke mid-operation may also break during recovery). The
code never swallows that. It aggregates recovery errors and folds them into the thrown message —
`Failed to remove profile "x": <original>. Recovery failed: <details>` — so the user learns both what
went wrong *and* that the automatic repair didn't fully succeed, including which assets to inspect by
hand. This is the difference between "operation failed, state intact" and "operation failed, state
unknown" — and the message tells you which.

## Testability is a design constraint, not an afterthought

Every library function takes its filesystem roots as parameters that default to the real paths:

```ts
export function listStoredProfiles(
  configFile = CONFIG_FILE,
  profilesDir = PROFILES_DIR,
): StoredProfile[]
```

This dependency-injection seam is deliberate. It lets tests run against temp directories with zero
global mocking, and it is *why* 100% line, branch, function, and mutation coverage is achievable on
real file I/O instead of stubs. When adding a function that touches disk, keep the seam.

## Error handling: `runAction`, not a top-level catch

CLI commands wrap their action body in `runAction` (`src/lib/run-action.ts`), which prints a single
`✗ <message>` line and exits with code 1 on any throw or rejection. It runs synchronous actions
synchronously (so failures surface on the same tick, which the tests rely on) and only awaits when the
action returns a promise.

The tempting alternative — one `try/catch` around `program.parse()` in `index.ts` — was rejected on
purpose. `index.ts` is excluded from coverage (it is pure command registration), so putting error
logic there would hide it from the 100% gate. `runAction` lives in a covered, mutation-tested library
file, so the behavior every command depends on is actually verified. Honest coverage over convenient
coverage.

Output styling (colors, icons, the `✓`/`✗`/`!`/`●` glyphs) is centralized in `src/lib/ui.ts`, built on
`node:util` `styleText`. Because `styleText` degrades to plain text on a non-TTY or under `NO_COLOR`,
piping `ccm list` or `--json` into another tool yields clean, escape-free strings without any
command-level branching.

## Privacy boundary

ccm never reads, parses, or copies Claude auth tokens. It manipulates *directories* and sets
`CLAUDE_CONFIG_DIR`; Claude Code owns everything inside a profile dir. `ccm copy-config` is explicitly
scoped to non-auth config (`settings.json`, `plugins`) and refuses anything else. Auth status shown by
`ccm status` comes from invoking `claude auth status --json` in the profile's environment, not from
inspecting credentials directly.
