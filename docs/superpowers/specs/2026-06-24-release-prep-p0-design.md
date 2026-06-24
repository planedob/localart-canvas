# Release Prep P0 Design

## Goal

Prepare LocalArt Canvas for a future public release without crossing credential, repository-setting, or signing red lines.

## Scope

This phase creates release documentation and a read-only local preflight script. It does not publish releases, create GitHub Releases, change repository visibility/settings, sign artifacts, notarize builds, write secrets, or configure CI credentials.

## Approach

Use a small Node script as the release preflight checker. The script reads local repository state and reports pass/fail items for:

- required docs;
- expected milestone tags;
- latest git status;
- ignored sensitive/local folders;
- availability of GitHub Actions run references from the docs.

The script can optionally call `gh run view` for run IDs passed through CLI flags, but the default check stays local and read-only.

## Files

- `scripts/release-preflight.mjs`: read-only release readiness checker.
- `scripts/release-preflight.test.ts`: focused unit tests for checker logic, run explicitly because default desktop packaging tests cover product code.
- `vitest.release.config.ts`: dedicated Vitest config for release-maintenance tests.
- `docs/release/README.md`: release preparation index.
- `docs/release/P0-checklist.md`: publish-prep checklist.
- `docs/release/github-release-draft.md`: copyable release notes draft.
- `docs/release/manual-qa.md`: macOS / Windows / Linux manual validation steps.
- `docs/release/rollback.md`: rollback and recovery notes.
- `README.md`: link release docs and preflight command.
- `PROGRESS.md`: record this phase.

## Preflight Behavior

The checker returns a non-zero exit code only when local release readiness checks fail. It treats `.DS_Store` as a warning because macOS can create these locally, but it fails if local-only directories such as `.localart/`, `canvas/`, `out/`, or secret-looking files are tracked.

Checks are intentionally conservative:

- Report missing docs as failures.
- Report missing `m2-done` tag as failure.
- Report dirty tracked files as warning, not failure, so the script can run while release notes are being edited.
- Report untracked `.DS_Store` files as warning.
- Never print environment variables, API keys, or config file contents.

## Testing

Focused unit tests cover the pure check functions with temporary in-memory-style fixtures. A small integration smoke runs the CLI with `--help` and on the current repo. The release preflight test is not included in the default `npm test` suite because it is a release-maintenance helper rather than product runtime code.

## Out of Scope

- macOS signing / notarization.
- Windows code signing.
- GitHub Release creation.
- Auto-update.
- Real cloud model key validation.
- Windows / Linux GUI execution on real machines.
