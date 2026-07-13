# Examiner Victoria project-level agent instructions

## Repository context

- Repository: `waterhomie/examiner-victoria-v2` (legacy-compatible name)
- Active Windows V3 worktree: `D:\Software\Codex\Projects\examiner-victoria-v3`
- Active integration branch: `v3/domestic-public-beta`
- Frozen V2 release: `main`, tag `v2.0.0`, commit `d592900e29c0cdcc4576d884c178991deea7013c`
- Authoritative current state: `docs/V3_CURRENT_STATUS.md`

Older canonical or temporary worktree paths in historical documents are context only. Do not use them as the default location for new work.

## Product and directory status

Examiner Victoria V3 Beta is the current product line. The application still lives under `v2/` for compatibility: imports, Docker paths, scripts, and tests rely on that directory. Do not move or rename `v2/` during ordinary V3 tasks.

V2 remains a frozen baseline. Preserve its tag, commit history, QA records, and rollback documentation.

## Branch discipline during the V3 transition

Until a reviewed V3 promotion to `main` is complete:

1. start task branches from `v3/domestic-public-beta`
2. open task PRs with `v3/domestic-public-beta` as the base
3. do not merge task branches directly to `main`
4. do not delete the V3 integration branch
5. do not rewrite V2 or V3 history
6. do not create a V3 tag without explicit approval

After V3 is promoted, deployed from `main`, and verified, normal task branches may use `main` according to the updated workflow.

## Safe change boundaries

Before editing:

- inspect `git status --short --branch`
- preserve unrelated user changes
- do not read or print real `.env` values
- do not expose keys, tokens, cookies, credentials, user recordings, full answers, or transcripts
- use repository-local dependencies and existing scripts
- keep Prompt, question bank, scoring, Practice/Mock rules, and provider behavior unchanged unless the task explicitly authorizes them

Never use `git reset --hard`, `git clean`, force push, or history rewriting to work around a dirty worktree.

## Deployment awareness

The current domestic beta runs on Tencent CloudBase Run:

- service: `examiner-victoria-v3-beta`
- expected source branch during transition: `v3/domestic-public-beta`
- container port: `8080`
- health: `/api/health`
- diagnostics: `/api/diagnostics/runtime`

Before deployment-related work, inspect:

- `Dockerfile`
- `docs/V3_CURRENT_STATUS.md`
- `docs/V3_CLOUDBASE_MIGRATION_PLAN.md`
- `docs/V3_RUNTIME_DEPENDENCIES.md`
- `v2/DEPLOYMENT.md`
- the actual CloudBase source branch reported by the user

Do not assume Railway is the current domestic deployment. Railway V2 is a frozen historical/rollback reference, and Railway V3 is an overseas test baseline.

Do not change CloudBase or Railway settings, trigger a deployment, or create cloud resources unless explicitly authorized.

## Required human confirmation

Stop and request confirmation before:

- promoting V3 to `main` or merging the promotion PR
- changing the CloudBase build source branch
- creating a V3 release tag
- renaming the GitHub repository or changing Git remotes
- deleting `v3/domestic-public-beta`
- moving or renaming `v2/`
- deleting, moving, or substantially rewriting historical audit and test documents
- adding accounts, databases, payment, a Mini Program, or other scope-expanding features

## Validation and delivery

Use validation proportional to the change. For documentation work, at minimum:

- inspect the complete diff and `git diff --stat`
- run `git diff --check`
- check changed Markdown links
- scan changed files for accidental secrets and personal data
- confirm that only intended files changed

For code work, use the relevant compile, smoke, build, and focused regression tests documented by the repository.

Create commits and PRs only when the user authorizes them. Never auto-merge unless the user explicitly asks for that exact action.
