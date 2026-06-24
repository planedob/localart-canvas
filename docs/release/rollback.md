# Release Rollback Notes

## Safe rollback targets

- `safe-start`: original safe baseline.
- `m0-done`: M0 completed.
- `m1-done`: M1 completed.
- `m2s1-done`: Electron shell stage completed.
- `m2-done`: M2 Claude-signed stage completed.

## If a release artifact is bad

1. Do not force-push or delete tags.
2. Mark the GitHub Release as pre-release or draft if it has not been broadly shared.
3. If already public, add a clear warning to the release notes.
4. Publish a corrected patch release from a new commit and new tag.
5. Record the issue and fix in `PROGRESS.md`.

## If a secret is exposed

1. Stop distribution of the affected artifact.
2. Revoke the exposed credential outside the repository.
3. Remove the secret from future artifacts.
4. Do not rewrite public git history without explicit human approval.
5. Document only the credential type and remediation, not the secret value.

## If local user data is corrupted

LocalArt stores Electron canvas data under the OS user data directory, usually:

- macOS: `~/Library/Application Support/localart-canvas/canvas`
- Windows: `%APPDATA%/localart-canvas/canvas`
- Linux: `~/.config/localart-canvas/canvas`

Recovery options:

1. Back up the whole `canvas` directory before attempting manual repair.
2. Use Canvas History restore if the app can launch.
3. Restore `document.json` from `canvas/versions/` if manual recovery is needed.
4. Keep `assets/` with `document.json`, because shapes may reference local assets.

## Red lines

- Do not force-push `main`.
- Do not delete release tags.
- Do not commit secrets, signing certificates, or local user data.
- Do not write to non-GitHub remotes.
