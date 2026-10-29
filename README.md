# Bloggr

A public example of a self-hosted publishing system built with Next.js, Supabase, and Tiptap. It includes a complete local backend and sample publication; no hosted Supabase account or private project credentials are needed to try it.

## Run the example

Install Node.js 24 and start Docker, then:

```bash
npm ci
npm run example
```

The command starts local PostgreSQL, authentication, image storage, and a development mail inbox; applies the versioned migrations; creates sample users and stories; and starts the app. Initial Docker downloads take several minutes. The app uses the normal development port 3000. Local services use ports 54321–54324.

Open the publication, then use **Write** to sign in. Generated owner, editor, author, and outsider test-account credentials are in the ignored `.bloggr-example.json` file. Application connection settings are generated into ignored `.env.local`. Neither file belongs in Git. Setup refuses to overwrite an existing `.env.local` that it did not create.

```bash
npm run example:setup  # Prepare the backend without starting Next.js
npm run dev            # Start the app after setup
npm run example:stop   # Stop local services, retaining their data
```

When a managed Docker proxy breaks internal localhost probes, `BLOGGR_EXAMPLE_EXTERNAL_HEALTHCHECKS=1 npm run example` uses explicit Auth, Storage, REST, and database readiness checks instead. It still fails if the actual services cannot work; this setting does not disable TLS verification.

Repeated setup preserves existing post content and account passwords. Sample-account roles and profiles are created when absent. The local mail inbox receives recovery emails without sending them to external addresses. These accounts and the local HTTP setting are for the example, not a production deployment.

## Readers

- Responsive publication or introduction homepage, configurable navigation, and three typography presets.
- Persistent System/Light/Dark themes, accessible controls, readable article widths, and mobile navigation.
- Full-content search, topics, pagination, author profiles/archives, related stories, and reading time.
- Stable article heading anchors and a table of contents for longer posts.
- Cover and inline image captions, RSS, sitemap, canonical URLs, and social metadata.

## Writing and collaboration

The phone workspace separates Posts, Editor, Media, Profile, Settings, and Members instead of stacking a desktop editor into a fixed viewport.

- **Owner:** publication settings, contributor roles, backups, and all editorial operations.
- **Editor:** all posts and publication operations, media, and their own public profile.
- **Author:** their own private drafts and media; an editor or owner publishes them.

The owner can grant editor/author access to an existing authentication account by its user ID. The example creates those accounts automatically. For a separate deployment, create accounts through Supabase Auth first; the app does not silently create accounts or email invitations.

Autosave updates a private working copy. It never changes a published story until publication is confirmed. The editor includes recovery/download, preview, scheduling, unpublish, revision restore, and trash/restore. Version checks prevent competing edits from silently overwriting each other. Recovery uses stable post IDs and follows authenticated permalink changes, including response-loss cases.

Existing titles and permalinks are independent. A deliberate permalink change creates a redirect from the old address; reserved application paths are rejected. Duplicate addresses produce a suggested alternative.

Media supports reusable images, editable alt text/captions, upload progress and retry, search, pagination, and unused filtering. The server validates size and actual image contents, strips metadata, and re-encodes to WebP; GIFs become still images. Images referenced by posts, drafts, revisions, logos, or avatars cannot be deleted through the library. Storage and database operations use compensation on failure; deletion checks do not guarantee atomicity against a simultaneous newly introduced reference.

## Data and security

Private working copies and revisions live in separate tables. Public policies expose only published, nondeleted posts whose timestamp has arrived. The same rule applies to search, counts, direct URLs, redirects, RSS, and sitemap. Scheduled visibility does not need a cron job or rebuild hook.

Every privileged operation verifies the authenticated user and publication role. Contributor ownership and versions are checked again in the database mutation. Anonymous/browser clients cannot write posts or access drafts directly. HTML is sanitized on write and read. Mutation origins are checked against the configured canonical site origin. Images and author profiles are intentionally public; private media is not promised.

## Export and import

Settings → Backup and import exports posts, working copies, published snapshots, and publication settings as JSON. Download images separately from Media. JSON and Markdown imports create private drafts with new addresses; they do not overwrite settings or authentication identities. Import up to 20 posts/600 KB per request. Use database/storage backups for larger publications.

## Validate

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run example:setup
npm run build
npm run test:integration
```

Unit/database tests execute the actual migrations and lifecycle in PGlite with Supabase role/storage fixtures. Browser regressions exercise recovery, response loss, phone layouts, and fail-closed endpoints. The integration suite uses the real local backend for sign-in, role denial, publishing, search, redirects, image storage/captions, scheduling, direct database policies, and recovery email/password exchange. `npm run build` is required before the production integration suite.

Playwright uses system Chromium when available; otherwise run `npx playwright install --with-deps chromium`. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` selects a different Chromium binary. GitHub Actions runs the same checks and installs its browser explicitly.

## Use a separate Supabase project

The repository is an example and is not attached to a hosted project. To deploy your own publication, configure these values securely instead of running the local seed command:

| Variable                        | Purpose                                                              |
| ------------------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your project URL.                                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public project key, constrained by row policies.                     |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-only privileged key.                                          |
| `ADMIN_ALLOWED_EMAIL`           | The publication owner's authentication email.                        |
| `DATABASE_URL`                  | PostgreSQL connection for migrations. Keep TLS verification enabled. |
| `NEXT_PUBLIC_SITE_URL`          | Canonical HTTPS publication origin.                                  |

Use `.env.local` or host environment settings; never commit keys. Do not enable `BLOGGR_LOCAL_EXAMPLE` on a hosted deployment. That flag permits HTTP images only on loopback for the local example; normal image URLs require HTTPS.

Create the owner account with email/password authentication enabled. Add `<site origin>/blog/login` to the allowed authentication redirect URLs. Recovery uses PKCE: open the emailed link in the browser that requested it.

Back up an existing database, then run `npm run db:migrate` against the intended project. Migrations preserve existing post IDs, slugs, content, and dates, backfill private drafts, replace legacy permissive policies, and configure the image bucket. The readiness endpoint only checks setup; it never changes schema. Existing future-dated posts become visible when their date arrives. Review any custom policies on a shared image bucket before migration.

See [implementation notes](docs/implementation.md) and [validation evidence](docs/validation.md).
