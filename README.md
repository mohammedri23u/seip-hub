# SEIP Hub

SEIP Hub is the governed digital layer for program management, live learning, assessment, human-supervised AI-assisted grading, and analytics.

## Current status — Stage 2

The repository now contains the first working program-management vertical slice:

- Next.js 16 App Router + TypeScript + Tailwind CSS
- Supabase SSR authentication using publishable keys
- RLS-first authorization
- Role-aware dashboard backed by live Supabase data
- Platform-admin program creation
- Program Director cohort creation
- Cohort session creation with generated join codes
- Session detail with attendance/facilitator/learning-objective metrics
- Foundation database migrations for programs, cohorts, groups, sessions, learning objectives, attendance, and audit events

The next vertical slice will add learner/educator roster management and learning-objective authoring/mapping before Realtime live-session interaction.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

The app requires the dedicated SEIP Hub Supabase project and the foundation migrations before authenticated screens can return data.

## First administrator

There is intentionally no browser route that can promote a user to platform administrator. Follow `docs/STAGE2_BOOTSTRAP.md` once to create the first Auth user and promote that user through the Supabase SQL editor.

## Security

Do not put a Supabase secret/service key in any `NEXT_PUBLIC_` environment variable. The browser uses only the publishable key and database access is governed by RLS.

See `docs/ARCHITECTURE.md`, `docs/BOOTSTRAP.md`, and `docs/STAGE2.md`.
