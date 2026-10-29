# Bloggr publication routes

See the [project setup guide](../../README.md) for installation, environment variables, migrations, and validation.

- `/blog`: searchable, paginated public stories and topic filters.
- `/blog/[slug]`: published story with share metadata and related posts.
- `/blog/login`: owner sign-in and password recovery.
- `/blog/admin`: Posts, Editor, Media, and Settings workspace.
- `/blog/preview/[slug]`: authenticated, uncached private draft preview.
- `/blog/api/validate`: authenticated readiness check; it does not create tables or change policies.

Run `npm run db:migrate` before using the workspace. Public row policies expose only published, nondeleted posts whose publication timestamp has arrived. Drafts and revisions are separate private tables. Privileged mutations require owner authorization through server APIs; browser clients cannot write the database directly.
