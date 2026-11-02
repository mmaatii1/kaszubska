# CI files to install (owner)

The automation token cannot change `.github/workflows/` (no `workflow` scope), so the workflow
files live here. Install them once in the GitHub web UI (or from a machine with a full token):

- `check.yml` -> `.github/workflows/check.yml` (new): runs `tools/check_consistency.py` on every push/PR.
- `deploy-ftp.yml` -> `.github/workflows/deploy-ftp.yml` (replace): same deploy, plus the
  consistency check as the first step (a mismatch stops the deploy) and `tools/**` excluded from
  the FTP upload.

Diff against the current deploy workflow: one new step after `actions/checkout`, one line in `exclude`.
