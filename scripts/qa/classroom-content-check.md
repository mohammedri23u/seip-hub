# Classroom content and resource checks

Run from the repository root with Node.js 22.16 or newer:

```sh
node scripts/qa/classroom-content-check.cjs
```

The check uses only Node built-ins. It does not connect to Supabase, require credentials, read private files or alter data. The teacher payload is an explicitly synthetic fixture; no real answer keys or teacher notes are embedded.

It verifies the five-meeting/ten-encounter mapping, safe learner data, teacher authorization before database reads, versioned payload retrieval, failure on unavailable or invalid content, protected RTF download headers, preserved first-meeting slide ordering, and correct teacher resource links.

Native TypeScript stripping can print an experimental-feature warning on supported Node releases; a successful run ends with `PASS` and exit status 0. This focused check complements the production typecheck/build and live authorization tests.
