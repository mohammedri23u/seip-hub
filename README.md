# SEIP Hub

SEIP Hub is the governed digital layer for program management, live learning, assessment, human-supervised AI-assisted grading, and analytics.

## Foundation status

This repository currently contains the first secure foundation slice:

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Supabase SSR authentication using publishable keys
- Program/cohort/session data model
- RLS-first authorization
- Login and protected dashboard skeleton

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

The app requires a dedicated Supabase project and the foundation migration before authenticated screens can return data.

## Security

Do not put a Supabase secret/service key in any `NEXT_PUBLIC_` environment variable. The browser uses only the publishable key and database access is governed by RLS.

See `docs/ARCHITECTURE.md` and `docs/BOOTSTRAP.md`.
