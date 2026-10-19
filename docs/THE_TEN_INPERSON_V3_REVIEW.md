# THE TEN in-person experience v3 — implementation and verification

Date: 19 October 2026. Base: main 330e690. Clinical candidate: 2.2-draft-for-clinical-signoff.

## Implemented

- New locally optimized House of Wisdom environment (168 KB), cinematic Arabic overview and seven-week W0/S1–S5/W6 map.
- Optional four-Mission story atlas with calm/story/team presentation preferences and explicitly labeled visual activation previews. Preview never awards a Key or records official progress. S1 grants no Key; M01 finishes after S2, followed by M02/S3, M03/S4 and M04/S5.
- Protected teacher presentation with next/back, keyboard, fullscreen, larger type, discussion pause and manual formative answer reveal. Speaker notes are unmounted in audience/fullscreen mode. No forced assessment timer or submission.
- Personal device-only preparation checklist; existing persisted attendance and grading remain intact.
- Protected AI synthetic workbench aligned to THE_TEN_RESEARCH_AI_1.0, including exact evidence, rubric IDs, null abstention reason for scored results, score0/1/2,1200-character feedback and explicit separation from human/reference grades. No provider calls or real research export from this page.
- Protected v2.2 candidate preview supports local import of the supplied session_content.json, validates all five24-slide sessions and10 PI/DU reveal gates, and projects only slide text/notes and source references. File stays in browser memory, without uploads or storage. Named clinical supervisor signoff remains pending.
- Optional server-only candidate reader understands payload.classroom_v22. Incomplete/absent staged data does not replace approved v2.0 content. No new secure research Forms or answer keys were committed to the public repository.
- In-person completion page shows own recorded classroom attendance and explains manual catch-up, five Exit tickets and Quick Pre/Post requirements. Previous electronic certificate logic remains under its separate historical link.

## Verification

PASS: production build; TypeScript; protected classroom-content regression; existing journey/auth/assessment/realtime suite;51 assessment/grading/retake/resume checks;24 strict AI parser cases; actual full v2.2 pack5x24 projection with10 explicit reveal gates; diff checks.

Browser: public screenshots at320/390/768/1440; reviewed desktop/mobile hero and atlas. Isolated real-React components verified Mission selection, preview/reset, calm/story/team modes, preference persistence, mobile overflow, reduced motion, stage keyboard/pause/reveal/reset/private-note unmount and AI invalid-score rejection. Stage and overview browser fixtures use synthetic data/local approved imagery. No live learner account, production grading mutation or authenticated end-to-end Supabase journey was tested. Temporary public QA routes were removed before commit.

Independent security review confirmed TS-to-Python AI sample compatibility and teacher guards; no teaching/research master JSON is in public assets.

## Remote state and release limitations

No frontend production deployment was performed. Vercel project listing succeeded but deployment access returned403 for scope aucom; CLI fallback had no credentials. No credentials were requested or included.

A readback confirmed original protected teaching payload10cases/20slides, MD5 excluding candidate field567cf30507093645f56d69de7ad84de0, with no classroom_v22. A subsequent metadata-only additive write hung and was aborted without completion: its final state is UNKNOWN. No further Supabase calls were made. Existing approved payload fields were not intentionally replaced, and no schema, assessment, consent, grade, account or certificate migration was attempted. Latest120slides remain usable through local teacher import irrespective of candidate staging. Verify the optional backend field separately before claiming remote import.

Candidate data retains pending named clinical signoff. ResearchREC/consent/reference-freeze and PhaseB gates remain separate; no real AI scoring is activated.
