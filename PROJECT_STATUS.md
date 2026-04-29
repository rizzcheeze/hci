# Hire GCians! Project Status

## Read This First

This project now has two important realities:

- the current working baseline is a static-HTML frontend at the project root with shared CSS/JS, plus a parallel Django/AI backend scaffold at the project root
- the target system is the approved proposal architecture: `Vue.js` frontend + `Django REST` backend + `Celery` + `Redis` + `Ollama` + `PyMuPDF` + `Tesseract OCR` + `pgvector`

If reopening this project in a future session, start here, then read:
- `hire_gcians.js`
- `hire_gcians.css`
- `frontend/`
- `core/`, `students/`, `jobs/`, `ai_pipeline/`, `ai/`
- `C:\Users\yana.LAPTOP-I8ASRTS6\ESPIRIDION.ALLYANARIZZ.REVISED.APPROVED.PROPOSAL.docx.pdf`

Recommended prompt for future sessions:
- `Read PROJECT_STATUS.md first, then continue from there.`

## Current Product Model

### Roles
- `student` = Gordon College applicants
- `employer` = third-party companies hiring Gordon College students
- `admin` = Gordon College officials with oversight access only

### Core rule for matching
- students do not manually manage profile skills
- skills used for matching should come from AI analysis of the uploaded PDF resume
- the current app simulates that flow on the client side

### Current baseline architecture
- standalone HTML pages
- shared styles in `hire_gcians.css`
- shared app logic and seeded state in `hire_gcians.js`
- separate presentation-first frontend copy in `frontend/`
- browser `localStorage` persistence
- Django/AI scaffold at the project root with app folders for `students`, `jobs`, `ai_pipeline`, `ai`, and `tasks`
- live Vercel deployment from the project root

### Target architecture
- `Vue.js` frontend
- `Django REST` backend
- `PostgreSQL 18` with `pgvector`
- `Celery` + `Redis` for background processing
- `PyMuPDF` for direct PDF text extraction
- `Tesseract OCR` fallback for scanned/image-based resumes
- local `Ollama` models for resume parsing and embeddings (`qwen3:4b` + `nomic-embed-text`)
- semantic job matching with cosine similarity

### Current reality vs target
- the deployed static frontend at the project root is still the operational reference implementation
- the separate `frontend/` folder is now the presentation-first copy for local walkthroughs and design work
- the Django scaffold at the project root is the active backend direction in this workspace
- the approved proposal architecture is now the intended direction for future development

## Current Routes

### Landing and auth
- `hire_gcians_landing_page_full.html`
- `hire_gcians_for_employers.html`
- `hire_gcians_about.html`
- `hire_gcians_auth.html`

### Student routes
- `hire_gcians_student_dashboard.html`
- `hire_gcians_job_listing.html`
- `hire_gcians_my_applications.html`
- `hire_gcians_saved_jobs.html`
- `hire_gcians_student_profile.html`
- `hire_gcians_skills_resume.html`
- `hire_gcians_settings.html`
- `hire_gcians_public_profile.html`

### Employer routes
- `hire_gcians_employer_dashboard.html`
- `hire_gcians_employer_posting.html`
- `hire_gcians_employer_applicants.html`
- `hire_gcians_employer_active_listings.html`
- `hire_gcians_hired_students.html`
- `hire_gcians_company_profile.html`
- `hire_gcians_employer_settings.html`

### Admin overview route
- `hire_gcians_admin.html`

### Admin detail routes
- `hire_gcians_admin_users.html`
- `hire_gcians_admin_listings.html`
- `hire_gcians_admin_applications.html`
- `hire_gcians_admin_ai_logs.html`
- `hire_gcians_admin_employers.html`
- `hire_gcians_admin_announcements.html`
- `hire_gcians_admin_reports.html`
- `hire_gcians_admin_settings.html`
- `hire_gcians_admin_audit_logs.html`

## What Works Now

### Student side
- login/signup flow
- job browsing and filtering
- clean-route navigation across student pages on Vercel (`/student/...`)
- job detail rendering
- save/unsave jobs
- apply/withdraw applications
- applications status view
- profile rendering
- settings rendering
- public profile rendering
- resume upload/demo analysis flow
- compatibility scoring driven by resume-derived skills

### Employer side
- employer dashboard metrics
- clean-route navigation across employer pages on Vercel (`/employer/...`)
- posting draft and publish flow
- live posting preview
- applicants list and detail
- stage updates and notes
- active listings
- hired students
- company profile
- employer settings
- employer settings and posting drafts persist per employer account in local demo state

### Admin side
- overview metrics
- dedicated admin tab pages for users, listings, applications, AI logs, employers, announcements, reports, settings, and audit logs
- clean-route navigation across admin pages on Vercel (`/admin/...`)
- recent users table
- active listings table
- health card
- alerts card

## Most Recent Structural Changes

### Architecture direction reset
- current project direction now aims at the approved proposal system, not just the static MVP
- the static HTML + Express stack should be treated as the migration baseline/reference implementation
- future backend/frontend planning should assume a `Vue.js` + `Django REST` + async AI pipeline target

### Landing/navigation
- landing nav now has working routes for `Browse Jobs`, `For Employers`, and `About`

### Resume-driven matching
- student skills are no longer treated as manually managed profile data
- matching now reads resume-derived skill data
- student profile and public profile reflect resume-derived skills

### Role refactor
- employers are now outside companies, not college departments
- admins are now college officials, not hiring users
- employer/account copy was updated across the app to company/employer wording

### Company route migration
- active employer profile route is now `hire_gcians_company_profile.html`
- nav links now point to company profile
- active JS page key is `company-profile`

### Deployment prep
- added `vercel.json` with root routing, clean public paths, and basic security headers
- seeded jobs are now split across multiple employer accounts instead of one employer owning every sample listing
- added `POST_DEPLOY_SMOKE_TEST.md` to standardize auth, student, employer, admin, route-refresh, and responsive checks after each release

### Frontend presentation split
- added a separate `frontend/` folder as a presentation-first copy with its own `assets/` folder, standalone `index.html`, and full public/student/employer/admin page set
- upgraded the presentation copy with stronger landing/dashboard styling, completed admin tabs, and internal local page-to-page navigation

### Vercel route normalization
- root deployable pages now use clean Vercel routes instead of relying mainly on raw `hire_gcians_*.html` links
- `vercel.json` now includes `/student/jobs` plus admin detail rewrites like `/admin/users`, `/admin/listings`, `/admin/applications`, `/admin/ai-logs`, `/admin/reports`, and related routes
- `hire_gcians_route_index.html` is now treated as a public route page and lists the full clean-route set

### Presentation copy cleanup
- public-facing `MVP`, `demo`, and similar disclaimer language was removed from the root deployable frontend and the separate `frontend/` copy
- landing, auth, about, route index, employer marketing, resume, and admin/settings copy now read as product-facing presentation text

### Employer account state
- employer settings are now stored per employer account instead of one shared demo object
- employer posting drafts/skills are now isolated per employer account in local state
- saving employer settings now updates that employer's organization name and synced listing company labels

### Demo and MVP language removal
- all `demo-banner` divs removed from `landing_page_full`, `about`, `for_employers`, and `route_index`
- all `Presentation mode` live-badge elements removed from every admin page (`admin_ai_logs`, `admin_announcements`, `admin_applications`, `admin_audit_logs`, `admin_employers`, `admin_listings`, `admin_reports`, `admin_settings`, `admin_users`)
- `demo-credentials` block (seeded account hints) removed from `auth` page
- `admin_ai_logs` page-sub updated from "presentation build" copy to product-facing copy
- `admin_announcements` page-sub updated from "Presentation notes" to "Platform announcements and updates"
- `admin_audit_logs` page-sub updated from "static presentation flow" to "platform actions"
- `admin_reports` page-sub updated from "panel walkthroughs and screenshots" to product-facing copy
- `admin_listings` panel-action updated from "Presentation-ready snapshot" to "All employer listings"
- `about` section label and title updated from "Current build / What works today" to "Platform capabilities / What the platform supports"
- `for_employers` "Recommended next build" panel renamed to "Coming to the platform"
- `route_index` descriptions for Announcements and Reports updated to match product-facing copy
- completed on `2026-04-29`

### Demo and MVP language removal — JS and CSS
- `hire_gcians.js`: removed `liveBadge` DOM update (badge no longer exists in HTML); updated announcements list to remove "panel presentations" wording; updated admin settings panel to replace "Supabase presentation state" with accurate copy
- `hire_gcians.css`: removed `.demo-banner` rule set and all responsive overrides; removed `body.hg-auth .demo-credentials` rule; removed `/* Presentation refresh */` comment block and all `.presentation-banner`, `.presentation-kicker`, `.presentation-title`, `.presentation-chip-row`, `.presentation-chip` rules; removed `body.hg-admin .live-badge` rule; removed responsive `.presentation-banner` override
- `vercel.json`: no changes needed — routing config only, no demo/presentation language present
- completed on `2026-04-29`

### Demo and MVP language removal — second batch
- `admin` overview page: removed `presentation-banner` section (kicker, title, chip row), removed `Presentation mode` live-badge, replaced "Presentation talking points" card with a neutral "Quick navigation" card
- `settings` (student): removed the "Privacy note" ai-tip block that referenced "current build" and "real deployment"
- remaining 8 files (`employer_dashboard`, `job_listing`, `my_applications`, `public_profile`, `saved_jobs`, `student_dashboard`, `student_profile`, `hired_students`) confirmed clean — no demo/MVP/presentation language found
- completed on `2026-04-29`

### Deployment status
- deployed to Vercel on `2026-04-09`
- root route and clean public routes are configured through `vercel.json`
- nested routes use root-absolute CSS/JS/page links for Vercel rewrite compatibility
- the current deploy target should remain the project root, not `frontend/`

### Backend hardening
- backend repository layer now uses UUID-based prefixed IDs instead of `Date.now()`-based IDs
- public signup no longer allows creating `admin` accounts
- job create/update validation is now stricter for required fields, status, and slots
- save-job and application creation paths now fail earlier on invalid input/missing records
- resume processing now clears stale `processed_at` values when moving back to nonterminal states
- employer settings updates now validate required fields before writing

### Backend seed cleanup
- `backend/sql/seed.sql` now preserves `original_file_name` correctly during resume-analysis upserts
- corrected seed file was reapplied to the local `hire_gcians` PostgreSQL database on `2026-04-22`

### pgvector status
- PostgreSQL `18` is the intended backend database for the project
- `pgvector` files were installed for PostgreSQL `18`
- `vector` extension is now enabled in the local `hire_gcians` database at version `0.8.2`
- vector storage/search is still not wired into the application schema or matching logic yet

### Django AI pipeline progress
- Django project scaffold now exists at the project root with `.venv`, `manage.py`, `core/`, and app/module folders for `ai_pipeline`, `jobs`, `students`, `ai/`, and `tasks`
- `ai/extractor.py` is now implemented with direct PDF extraction via `PyMuPDF`, OCR fallback hooks via `pdf2image` + `pytesseract`, text normalization, and OCR-needed heuristics
- `ai/parser.py` is now implemented and can parse resume text through local Ollama `qwen3:4b` into validated structured JSON
- `ai/embedder.py` is now implemented and can generate live embedding vectors through Ollama using `nomic-embed-text`
- `ai/matcher.py` is now implemented with cosine similarity, percentage mapping, and ranked vector matching
- first-pass Django model layer is now implemented in `students/models.py`, `jobs/models.py`, and `ai_pipeline/models.py`
- parser + embedder have been verified end-to-end locally on `2026-04-23`
- Django migration history and the live PostgreSQL schema were rechecked on `2026-04-29`; `showmigrations`, `migrate --plan`, and `makemigrations --check --dry-run` all reported a clean aligned state
- the `jobs` API detail route now accepts string job IDs, matching the live `jobs.id` primary key used by the frontend data model

## Known Migration / Cleanup State

These are not blockers, but they still exist:

- some `department` references remain inside `hire_gcians.js` only as compatibility fallbacks for older `localStorage` data
- some marketing/explanatory text is still static by design
- browser `localStorage` means deployed state is still per-browser and not shared across users/devices

## Seed Accounts

### Student
- email: `allyana@gordoncollege.edu.ph`
- password: `student123`

### Employer
- email: `hiring@brightpathdigital.com`
- password: `employer123`

### Admin
- email: `admin@gordoncollege.edu.ph`
- password: `admin123`

## Known Limits

### Resume / PDF analysis
Current state:
- accepts PDF file selection
- stores file name in app state
- generates a local AI-style skills/quantifiable preview
- uses resume-derived skills as the source for matching

Still missing:
- OCR fallback verification against real scanned PDFs / Poppler-backed runtime
- real quantifiable-achievement detection
- safe Django migration reconciliation for the new model layer
- AI-generated match rationale
- REST endpoints for upload, matching, jobs, and student/profile data
- Celery task wiring for async extraction / parsing / embedding / matching

### Persistence and backend
- still uses `localStorage`
- Django backend scaffold exists at the project root, but the frontend is not wired to it yet
- live server-backed persistence is not active in the frontend yet
- role-protected backend routes now exist for auth, jobs, applications, saved jobs, employer applicants, employer settings, and resume metadata
- current frontend deploy is still static/local-state driven, while the target stack in the proposal is Vue + Django REST

## Migration Path

1. Preserve the current static frontend as the UI/flow reference while building the target stack in parallel.
2. Stand up the proposal-aligned backend foundation: `Django REST` + PostgreSQL 18 + `Celery` + `Redis`.
3. Rebuild the resume pipeline on the target backend: upload -> `PyMuPDF` extraction -> `Tesseract OCR` fallback -> LLM structuring -> embeddings -> semantic scoring.
4. Move frontend consumers from static/local demo state to real API-driven state.
5. Replace local preview-only matching with real resume-derived matching and employer-facing rationale output.

## Best Next Steps

1. Redeploy the root project to Vercel so the clean-route navigation, admin detail pages, and presentation-copy cleanup are live.
2. Run the route smoke test across `/`, `/routes`, `/student/dashboard`, `/student/jobs`, `/employer/dashboard`, `/admin`, and `/admin/users`.
3. Add automated API coverage for the current Django endpoints beyond the new job-detail regression test, especially resume upload and match retrieval.
4. Wire Celery tasks around extractor -> parser -> embedder so resume processing runs asynchronously.
5. Start replacing `localStorage`-backed frontend reads with real API-driven student/job/match data.

## Active In-Progress Work

- backend foundation started on `2026-04-18`
- initial PostgreSQL schema and seed data now mirror the current client-side MVP state
- auth now includes hashed seed credentials, signup support, JWT verification, and `/api/me`
- core protected API now includes employer job create/update, student applications, saved jobs, employer applicants, and employer settings
- resume backend infrastructure now includes file metadata, upload endpoints, local storage, and processing-status fields for a future PDF/OCR/AI worker
- backend validation/auth hardening completed on `2026-04-22` in `backend/src/db/repositories.js`
- resume seed upsert fix completed on `2026-04-22` in `backend/sql/seed.sql` and reapplied to the local database
- `pgvector` package files for PostgreSQL `18` were installed and the `vector` extension was enabled in the local `hire_gcians` database on `2026-04-22`
- approved proposal was re-read on `2026-04-22` and is now the target architecture reference for future work
- next planning direction is to scaffold the proposal-aligned stack (`Vue.js` + `Django REST` + `Celery` + `Redis` + `Ollama`) rather than extending the static MVP indefinitely
- Django scaffold at the project root is now active and verified with `manage.py check`
- `backend/.env` now contains the active local AI service config, including `OLLAMA_LLM_MODEL=qwen3:4b` and `OLLAMA_EMBED_MODEL=nomic-embed-text`
- `ai/extractor.py`, `ai/parser.py`, `ai/embedder.py`, and `ai/matcher.py` were implemented and live-verified on `2026-04-23`
- first-pass Django models for students/jobs/AI pipeline were implemented on `2026-04-23`, but migration rollout is blocked by previously-applied placeholder Django migrations that do not fully match the current database state
- Django migration alignment was revalidated on `2026-04-29`; the previously noted migration-rollout blocker is no longer active in this workspace
- a separate `frontend/` presentation copy was created on `2026-04-29` with its own assets and complete page set
- the root Vercel frontend was updated on `2026-04-29` to use clean student/employer/admin routes and dedicated admin detail pages
- public-facing MVP/demo wording was removed from the root deployable frontend and the `frontend/` presentation copy on `2026-04-29`
- frontend is still using `localStorage`; migration to backend is not wired yet

## Resume-After-Reopen Instructions

If you come back later, tell the assistant:
- `Read PROJECT_STATUS.md first.`
- `Use the current role model: students, third-party employers, and college-admin oversight.`
- `Resume matching must stay PDF/AI-driven, not manually entered by students.`
- `Treat the current static HTML frontend as the UI baseline, but aim future work at the approved Vue + Django + Celery + Redis + Ollama proposal architecture.`

If a feature is actively in progress, add that task here before closing the tab.
