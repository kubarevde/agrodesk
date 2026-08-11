# Secret history cleanup — AgroDesk

**Date:** 2026-08-11  
**Path removed from Git history:** `.env.production`  
**Method:** `git filter-repo --path .env.production --invert-paths --force`

## What happened

A historical commit contained `.env.production` with real production secrets.
The file was later deleted from the tree, but remained reachable in Git history.
History was rewritten to remove that path from all reachable commits.

## Rewritten refs

| Ref | Old tip (pre-cleanup) | New tip (post-cleanup) |
|-----|----------------------|-------------------------|
| `main` | `2f3722240bf1f3cd254f924721737e9716a5e35e` | `3f0ab409848cab52e3bbf41ec9c82f4b1a3f4a14` |
| `release/payroll-workspace-fields-2026-08` | `ffbb254fcbb24f69461a8676707b784be04b112c` | `fee5bad1cb21ac398ff9d1fc1d9e26563b61d731` |
| tag `harvest-unify-baseline` | `64dff57359ebdf5f4c125045108deef770e9a61e` | `5701f4bf1e05516d31b60a14ef34718574d28bdb` |

Local emergency backup (do **not** push to GitHub):

- `../agrodesk-before-secret-cleanup.bundle` (created and verified before rewrite)
- `../agrodesk-refs-before-secret-cleanup.txt` (ref map only; no secret values)

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
