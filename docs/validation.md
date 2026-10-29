# Final validation

Validated October 29, 2026. Candidate source digest: `f789537835e71a3e90a52d32d610f7f94e722b6fc3f4c730ece7b19e7b65d517`.

A final formatting pass removed one extra trailing blank line in migration 001; it does not change SQL behavior.

The digest covers sorted tracked and nonignored untracked file names and contents, skips removed files, and excludes this validation record. Base HEAD: `815726fb94834000e7b64d9b13a5bd2ef36930a1`.

## Results

| Check | Result |
| --- | --- |
| `npm ci` | Passed; lockfile installation reproduced. |
| `npm run lint` | Passed, zero errors or warnings. |
| `npm run typecheck` | Passed, including fresh Next.js route-type generation. |
| `npm test` | 22 unit/database tests passed. |
| `npm run test:e2e` | 10 browser regressions passed. |
| `npm run build` | Passed with Next.js 16.4.3. |
| `npm run test:integration` | Eight production-server integration tests passed against real local Supabase. |
| `npm audit --json` | Zero known vulnerabilities at validation time. |
| Version-check mutation | Removing version enforcement in a disposable SQL copy made its lifecycle test fail, as expected. |
| Credential-pattern scan | No private-key, GitHub-token, Supabase-secret, or JWT literals found in candidate source. |
| `git diff --check` | Passed. |

The 40 automated cases include actual migration upgrades, private drafts, public visibility, role/ownership denials, revision isolation, stale writes, captions/HTML sanitization, reserved permalinks, origin validation, media ownership/reference protection, and HTTP loopback bounds. Browser regressions cover narrow layouts, persisted themes, lost create/rename responses, fresh drafts, concurrent versions, save ordering, and delayed recovery/revision replacement.

## Real local example verification

A real local Supabase stack was started: PostgreSQL 15.19, Auth, PostgREST, Storage, Kong, and Mailpit. All three application migrations were applied. The example created four isolated accounts, safe public profiles, published sample stories, and a real stored image. No hosted project or private user credentials were needed.

Production integration exercised owner/editor/author sessions and denial paths, publishing/unpublishing, full-content search, private previews, atomic redirects, direct database policy enforcement, actual image decoding/upload/reuse/deletion protection, public branding/font/navigation/author archives, local recovery email and password exchange, scheduled visibility in every public surface, JSON snapshot export, JSON/Markdown import as drafts, and phone-width editing of a captioned image through the UI.

The normal setup command was run repeatedly; the backend was also stopped/restarted with retained data. The documented launch command served the real sample publication. Generated account credentials and connection settings stayed in ignored files, and were excluded from source scans and Git staging.

The managed cloud Docker host required a verified single-layer copy of the official PostgreSQL image because its VFS driver exhausted disk while unpacking the ordinary layers. No image verification, TLS verification, Docker driver, or daemon data directory was weakened. The optional external-health-check mode verifies actual application services when a container's internal localhost probe fails behind a managed proxy. These are local environment accommodations, not application production credentials or a hosted deployment.

## Review and delivery scope

Fresh independent correctness/security review approved the final digest with no outstanding blocking findings. A published-caption export omission found during review was fixed and covered by the differing-public/private-caption integration regression.

Review covered privileged-client construction after verified identity/membership, SQL role/ownership checks and grants, public RLS/visibility, sanitized content and URLs, canonical-origin handling, media processing and ownership, publication state, response-loss recovery, redirects, public profiles, and local credential generation/exclusion.

Application authors were the primary Codex session and bounded public/editor/roles/media workers. Independent reviewers used fresh contexts and did not edit source. Astra worker/reviewer model and effort settings were requested through dispatch; the client's actual routing metadata was unavailable, so this record does not claim model-routing attestation.

Approval covers the public local example. No hosted deployment or physical-device Safari/Android validation is claimed. Public images/profiles are intentional. Media deletion reference checks are not a distributed transaction with a simultaneous newly added reference; this ordinary concurrency limitation is documented in README.

GitHub Actions is configured to run the same checks, install its browser explicitly, start an isolated backend, and clean up services. Remote CI results are separate from the local evidence recorded here. Full local logs and screenshots are retained at `/workspace/bloggr-implementation-evidence/` in the development workspace.


## CI follow-up: REST schema readiness

The pull-request workflow run `40932720731` failed during example profile creation with `PGRST205`, although the push workflow had passed. The readiness probe used HEAD; the installed PostgREST client normalizes an empty-body HTTP 404 into a successful 204. Setup could therefore write before the schema cache was ready.

The repair requests a PostgREST schema reload after all migration commits, including no-op reruns. Setup now waits for successful GET responses containing arrays from all nine required relations and checks newly added columns. Requests have abort deadlines; permission failures stop immediately. Seed mutations are never retried by this readiness helper.

Follow-up source digest: `037bbf97a31e9dc3e2744d602b3beb4c087b1028197d60a338a6cee0e9487cf4` (same digest method; base commit `66d1e66adf3ed7ae3f8be19634b1d9530100fb6a`). Local verification passed:

- All 28 unit/database cases, including six new real-SDK readiness regressions: delayed profiles, empty-body 404, delayed columns, permanent failure, permission denial, and stalled-request cancellation.
- Lint, type generation/checking, and a clean production build.
- Repeated example setup against the real local Supabase stack.
- A disposable PostgreSQL database and PostgREST container reproduced the old HEAD false-positive, rejected the empty schema, loaded all nine relations after fresh migrations, and observed the actual reload notification on a no-op migration rerun. The temporary database and container were removed afterward.
- Independent read-only correctness review found no blockers. RPC metadata is not explicitly probed; the final schema's relations and columns are checked without issuing extra mutations.

Local logs are retained as `/tmp/bloggr-schema-*.log`. GitHub checks will rerun on the pushed repair; this local record does not claim their outcome.
