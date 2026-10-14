# Final SQL schema

[`schema.sql`](schema.sql) is the canonical database setup file to include on GitHub. It contains the project's 13 tables, compatibility column migrations, RLS setup, Realtime publication changes, auth-user listing function, and auth-to-profile synchronization trigger.

The distributed file has no personal login identifiers, passwords, administrator seed, or Instagram account records. Follower/post defaults are generic zero values. It includes the project metadata and reference reaction columns used by current client payloads.

## Apply on a development project

1. Configure your own Supabase project in an untracked `.env` using `.env.example`.
2. Open a disposable development project's SQL Editor.
3. Review and run `schema.sql`.
4. Inspect tables, policies, functions, and publications before connecting the app.

The script can be rerun for its declared objects; it is not a database backup or a general migration system. Existing table shapes may need additional migrations beyond the compatibility columns listed. It does not delete old admin rows or change existing follower/post values. The auth-profile backfill reads users already present in the destination database; no private user rows are embedded in this file.

## Access model

This retains the app's existing **development collaboration** policies. It drops policies for the listed public tables and recreates broad public access. `get_auth_users()` remains publicly callable, and administrator passwords are still represented as plaintext by the app's current table contract. No preset password is shipped in this SQL.

Do not apply it to a production database without replacing those policies, restricting privileged functions, and implementing verified server/database authorization. The local application administrator fallback is separate from this SQL and also needs replacement for deployment.

## Validation status

The final file was checked against the source's current project/reaction payload fields and checked for accidental credentials. It has not been executed against a database during screenshot/documentation work; no live database schema was changed.
