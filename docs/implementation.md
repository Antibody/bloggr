# Complete Bloggr example

This repository is a public example, not a connection to a hosted Supabase project. `npm run example` prepares a real, isolated local Supabase backend and sample publication, then starts Next.js. Generated account credentials and connection settings are ignored by Git.

## Delivered experience

Public pages share responsive navigation, persisted themes, configurable typography/branding, full-content search, topics, pagination, public author archives, captions, stable heading anchors/table of contents, related stories, sharing, RSS and sitemap. Existing permalinks can change through versioned redirects; reserved application routes are rejected.

The mobile workspace separates post management and writing, with a multiline title, grouped formatting, metadata panels, private preview, autosave, local recovery, publication review, scheduling, revisions, and trash. Recovery uses immutable post IDs and handles lost creation/rename responses, stale saves, and delayed replacement requests.

Media provides progress/retry, search/pagination, reusable images, editable alt text/captions, and unused filtering. Actual image bytes are decoded and re-encoded. References from posts, private drafts, revisions, publication settings, and author avatars prevent library deletion.

Owner/editor/author roles are enforced on the server and in atomic SQL mutations. Owners manage publication settings and contributors; editors manage publication; authors manage their own drafts and media. Public profiles expose safe fields without account email or membership data.

## Security invariants

- Privileged clients are created only after `getUser()` verifies an owner or an authenticated self-readable membership. Every admin/private endpoint checks its required role and ownership.
- Private drafts and revisions are separate tables. Browser clients cannot write posts or storage directly. Public rows, counts, search, metadata, redirects, RSS, and sitemap require published/nondeleted/current publication state.
- Draft saves never replace a public snapshot. Atomic RPCs lock posts, recheck contributor role/ownership, verify the expected version, and update revisions/state together. Old RPC overloads are removed.
- Mutations check the trusted configured publication origin, supporting reverse proxies without trusting forwarded host data. Invalid/missing/foreign mutation origins fail closed. Private responses are uncached.
- HTML is sanitized on write and read. The explicit local example flag allows HTTP images only on loopback; normal deployments require HTTPS. Public media and profiles are intentional.
- Uploads have streamed byte limits, pixel/format validation and metadata stripping. Storage/database operations compensate failures; cross-service deletion reference checks are not an atomic lock against a simultaneous new reference.
- Local setup checks for an existing user-owned `.env.local`, generates random account passwords, verifies loopback endpoints, and keeps secrets out of console output and Git. Production credentials are not required or committed.

## Setup and compatibility

Use Node.js 24 and Docker. The repository uses Next.js 16, Tiptap 3, and a committed lockfile. Version-matched Next.js docs are referenced by AGENTS.md. The Supabase CLI and local service versions come from the lockfile/configuration. Application migrations are tracked by `npm run db:migrate`; CLI automatic migration/seed is disabled to avoid double application.

The migrations upgrade the original schema while preserving post IDs, slugs, dates, and content. Existing future dates become visible only at their timestamp. Legacy permissive policies are replaced. Hosted deployment is a separate operation with its own credentials, database backup, redirect URLs, and network settings; the example does not deploy externally.

Validation commands and current results are recorded in [validation.md](validation.md). GitHub Actions runs the same checks on a clean runner. Physical-device Safari/Android validation and arbitrary hosted deployments are not claimed by automated Chromium tests.
