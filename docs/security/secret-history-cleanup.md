# Secret history cleanup — AgroDesk

**Date:** 2026-08-11  
**Path removed from Git history:** `.env.production`  
**Method:** `git filter-repo --path .env.production --invert-paths --force`

## What happened

A historical commit contained `.env.production` with real production secrets.
The file was later deleted from the tree, but remained reachable in Git history.
History was rewritten to remove that path from all reachable commits.

## Rewritten refs

| Ref | Notes |
|-----|--------|
| `main` | History rewritten |
| `release/payroll-workspace-fields-2026-08` | History rewritten; product commits preserved |
| `harvest-unify-baseline` (tag) | History rewritten |

Exact new hashes: see operator report / `git rev-parse` after cleanup.

Local emergency backup (do **not** push to GitHub):

- `../agrodesk-before-secret-cleanup.bundle` (created and verified before rewrite)

## Required follow-ups (incident NOT closed)

1. **Rotate all secrets** that were ever present in `.env.production`
   (DB passwords, JWT/secret keys, Telegram/bot tokens, SMTP, cloud keys, etc.).
   Cleaning Git history does **not** make previously exposed values safe.
2. Developers must **stop using old clones**. Prefer fresh `git clone`.
3. Check forks and stale local remotes; force-push does not update them.
4. If an old commit URL with `.env.production` still appears cached, contact
   [GitHub Support](https://support.github.com/) about cached views / PR refs.

## Developer message

```text
История репозитория была переписана из-за удаления секретного env-файла.
Не используйте старые clone и не делайте push из старой истории.
Сохраните локальные незакоммиченные изменения отдельно, затем удалите старый clone
и сделайте свежий git clone репозитория.
```

## Safe tracked env templates only

Allowed in Git:

- `.env.example`
- `.env.production.example`
- `backend/.env.example`
- `bot/.env.example`

Never commit `.env`, `.env.production`, `.env.local`, or any file with real secrets.
