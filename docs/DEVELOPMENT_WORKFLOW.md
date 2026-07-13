# Examiner Victoria development workflow

> Current transition workflow for Examiner Victoria V3 Beta. See [V3 Current Status](V3_CURRENT_STATUS.md) for the authoritative release state.

## Current branch model

During the V3 Beta transition:

- `v3/domestic-public-beta` is the integration branch
- new task branches start from `v3/domestic-public-beta`
- task PRs target `v3/domestic-public-beta`
- `main` remains the frozen V2 release line
- `v2.0.0` at `d592900e29c0cdcc4576d884c178991deea7013c` remains the V2 baseline
- CloudBase is expected to build the V3 integration branch until promotion is explicitly approved

This is a temporary release-transition model, not permanent parallel development.

## Normal task lifecycle

1. Confirm the repository, branch, remote, and clean worktree.
2. Fast-forward the current integration branch.
3. Create a narrowly named task branch.
4. Inspect current code and documentation before making assumptions.
5. Change only the authorized scope.
6. Run focused validation and inspect the final diff.
7. Commit with an intentional message.
8. Push the task branch.
9. Open a PR to `v3/domestic-public-beta`.
10. Leave merge and deployment to an explicitly approved step.
11. After merge, sync the integration branch and remove the merged task branch when authorized.

Do not mix unrelated UI, provider, deployment, and documentation changes into one PR.

## V3 promotion sequence

Promotion to the permanent release line is a separate, human-reviewed operation:

1. complete V3 consolidation on `v3/domestic-public-beta`
2. merge all approved task PRs into the V3 branch
3. run final code, documentation, mobile, provider, and deployment checks
4. open a final promotion PR from `v3/domestic-public-beta` to `main`
5. review and merge the promotion PR only with explicit approval
6. change the CloudBase source branch to `main`
7. deploy and verify the exact main-based build
8. create tag `v3.0.0-beta.1`
9. rename the GitHub repository to `examiner-victoria`, if still desired
10. update Git remotes and public documentation links
11. delete the V3 integration branch only after confirmation and rollback review

A task PR must not silently perform any later step in this sequence.

## Deployment workflow

CloudBase Run in Shanghai is the current domestic beta entry. Its source-branch selection and deployment remain human-controlled. Before any deployment task:

- verify the expected commit and source branch
- review `Dockerfile`, `v2/DEPLOYMENT.md`, and current V3 deployment documentation
- use build-version diagnostics when configured
- keep secrets in the CloudBase secret/configuration store
- verify `/api/health`, `/api/diagnostics/runtime`, the frontend, and the intended user flow
- record only non-sensitive deployment evidence

Railway instructions are retained for V2 rollback history and the V3 overseas test baseline. They are not the default domestic V3 workflow.

## Rollback policy

Prefer reversible operations:

- use CloudBase version or traffic rollback for a bad CloudBase deployment
- revert a faulty Git commit or PR instead of rewriting history
- retain the `v2.0.0` tag and frozen V2 Railway deployment as historical recovery references
- preserve the V3 integration branch until the main-based deployment is verified
- never use force push, destructive reset, or history deletion as a routine rollback

Provider failure should degrade safely where supported. In particular, TTS failure must preserve written feedback and the next question.

## Documentation authority

Use documents in this order for current decisions:

1. root `README.md`
2. `docs/V3_CURRENT_STATUS.md`
3. `docs/USER_FEEDBACK_LOG.md`
4. `AGENTS.md`
5. this workflow
6. specialized or historical V3 audit, migration, diagnostic, and test records

Historical documents remain valuable evidence, but their old deployment or provider assumptions must not override the current-status reference.
