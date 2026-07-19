# Resume Mix & Match Formatter

## Overview

The **Resume Mix & Match Formatter** is a single‑page web application built around a simple idea: every entry in your resumes — each job, project, degree, research role, leadership role, and skills row — becomes an item in a **library**. You mix and match items from that library into a resume and export it as Jake's-template LaTeX.

- A **library of all section types** on the left: Education, Experience, Projects, Research, Leadership, Technical Skills.
- **Merge as many resumes as you want** — each import appends its parsed entries to the library, tagged with the source file.
- **Manual entries** — add any item type by hand; edit every field inline.
- **Wording variants** per entry (e.g. "Backend-focused" vs "Leadership-focused" bullets) with one active at a time.
- **Mix and match** — check items in/out, move items up/down (buttons or drag), and reorder whole sections.
- **Live preview** on the right, styled to match the compiled LaTeX output.
- **Editable LaTeX** — view the generated LaTeX, edit it directly, and Apply to update the resume and library.
- **Open in Overleaf** for a real compiled PDF in one click.
- Optional Supabase Google authentication, or a **local-only mode** with no account.
- Resume persistence per signed-in user (Supabase) or per browser (local mode).

The app runs entirely in the browser with no build tools required and can be deployed to static-hosting platforms such as **Vercel**, **Netlify**, or GitHub Pages.

---

## Features

- **Template gallery** – five templates (Jake's, Classic serif, Modern sans, ATS Strict, Two Column) with instant switching: the same library re-renders in any theme. Each template shows an honest ATS-safety grade, and HTML/DOC/print exports follow the selected template. See `PRD.md` for the template contract.
- **Section library** – every parsed or manual entry is a card with an include checkbox, ▲▼ reorder buttons, drag-and-drop, inline field editing, and a source tag showing which resume it came from.
- **Import & merge** – the *Import Resume* button parses another PDF/DOCX/LaTeX file and appends its entries to the library (nothing is replaced).
- **Parse review** – after every import a banner reports how many items landed and flags low-confidence ones with an amber dot; expand a flagged card to fix fields (editing clears the flag), move a misfiled entry between sections, or click **Fix parsing with AI** (signed-in users, when the backend function is deployed).
- **Paste-text import** – no file needed: paste resume text on the first-run page or via the sidebar *Paste* button; it goes through the same parser and review flow.
- **Tailor to Job** – paste a job description and the AI picks the most relevant items, chooses the best wording variant per entry, reorders sections, and returns an honest match report (score, matched/missing keywords, suggestions). One-click **Undo tailoring** restores your manual selection. Signed-in users; requires the `tailor-resume` Edge Function.
- **Cover letter** – in the same panel, **Write cover letter** drafts a 3–4 paragraph letter (plus an email subject line) strictly from facts in your library — no invented employers, metrics, or skills. Edit it inline, copy, or download as `.txt`. Signed-in users; requires the `cover-letter` Edge Function.
- **LinkedIn import** – "Save profile to PDF" exports from LinkedIn are detected automatically and parsed with a dedicated preset: sidebar (contact, top skills, languages, certifications, honors) and main column (experience with multi-role companies, education) land in the right library sections.
- **AI variants** – every experience/project/research/leadership card has a ✨ *AI variant* button: it rewords that entry's real bullets with a different emphasis (targeting the pasted job description when one is open) and adds the result as a new wording variant. Same facts only — the prompt forbids invented metrics, tools, or scope. Signed-in users; requires the `write-variant` Edge Function.
- **Landing page** – logged-out visitors see the product, not a login wall: live template previews rendered by the real template engine, the honesty features, and a no-signup guest mode.
- **Application tracker** – the 📋 Applications panel records every application (company, role, JD, match score) together with a snapshot of the exact items, wording variants, section order, and template you sent. Update the status as it moves (applied → response → interview → offer/rejected), **Restore** any sent version with one click, and watch honest outcome analytics accumulate: overall response rate and per-template response attribution.
- **Variants** – entry-like items (experience, projects, research, leadership) hold multiple wording variants; the selected variant supplies the bullets.
- **Section reordering** – move whole sections (e.g. put Projects before Experience); the preview, LaTeX, and HTML exports all honor the order.
- **Editable LaTeX loop** – the LaTeX tab shows the Jake's-template source for your current selection. Edit it and *Apply to Resume*: the source is parsed back into structured entries which replace the currently included items (unchecked items are kept).
- **Exports** – copy LaTeX, download `.tex` / HTML / Word-compatible `.doc`, print to PDF, or **Open in Overleaf** to compile the real PDF. Files are named `Firstname_Lastname_Resume.*`.
- **ATS polish** – exports are normalized for acceptance: bullets get consistent capitalization and terminal punctuation, date ranges render as `Mon YYYY – Mon YYYY`, skills are deduped, and the PDF carries `pdftitle`/`pdfauthor` metadata. A header chip estimates page count and warns when content likely exceeds one page.
- **Editable header** – name, phone, email, LinkedIn, GitHub, and portfolio are editable directly in the resume preview.
- **Supabase authentication** – sign in with Google (legacy `eyJ...` anon keys and new `sb_publishable_...` keys both supported).
- **Local-only mode** – click *Continue without an account* to use the app with no Supabase project; data stays in browser storage.
- **Database persistence** – the full library is saved in Supabase per signed-in user (or locally in local mode). Pre-library saves are migrated automatically.
- **Responsive UI** built with Tailwind CSS and custom dark‑mode styling.

---

## Import Pipeline

Uploaded resumes are converted through a structured pipeline:

1. **Extract** - PDF uses PDF.js text items with coordinates, DOCX uses Mammoth raw text, and LaTeX is read as text with commands stripped (the Jake's-template macros this app generates round-trip losslessly).
2. **Normalize** - whitespace is cleaned, PDF rows are ordered by page/y/x coordinates, and wrapped bullet lines are merged.
3. **Detect sections** - common resume headings such as Education, Technical Skills, Experience, Projects, Research, and Leadership are detected before parsing.
4. **Parse JSON** - each section is parsed into structured resume JSON with `basics`, `education`, `skills`, `experience`, `projects`, `research`, `leadership`, and `customSections`.
5. **Library** - every parsed entry becomes a library item (`included`, `source`, editable fields, wording variants). Imports merge into the existing library.
6. **Preview** - PDF uploads are shown as the original PDF, DOCX uploads are shown as HTML converted from the original DOCX, and the edited output can be viewed separately.
7. **Render** - the preview, LaTeX, HTML, and DOC outputs are all projections of (personal info + library selection + section order) — never of raw extracted text.
8. **Persist** - Supabase (or browser storage in local mode) stores the library, personal info, section order, original file metadata, original preview payload, raw extracted text, section boundaries, and the generated LaTeX/HTML.

The **LaTeX tab** closes the loop in the other direction: its *Apply to Resume* button runs the same LaTeX-stripping parser on your edits and replaces the currently included items with the result, so you can edit either the structured cards or the LaTeX source — whichever is easier.

Development debugging is available by opening:

```text
http://localhost:8000/?debug=resume
```

The debug panel shows raw extracted text, detected section boundaries, structured JSON, and generated LaTeX.

Current export support includes LaTeX source, HTML, Word-compatible `.doc`, and browser print-to-PDF from the edited structured output. Native DOCX and Overleaf ZIP export are planned as the next layer.

---

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge). Nothing else — the app ships with a hosted Supabase backend, so there is no configuration step.
- On first open you choose: **Continue with Google**, **Email me a sign-in link** (magic link, no password), or **Try without an account** (local-only mode; data stays in the browser).

> The Supabase anon key in `js/config.js` is public by design — it only grants what Row Level Security policies allow, and each user can only read/write their own row.

### 1. Clone the repository

```bash
git clone https://github.com/maka-tanmay/Resume_mix_and_match.git
cd Resume_mix_and_match
```

### 2. Self-host your own backend (optional)

Skip this section unless you want your own Supabase project instead of the hosted one — the in-app link **"Self-hosting? Use your own Supabase"** accepts the values below. Note: the hosted backend also requires the SQL in step 6 to have been run once by the project owner.

1. Go to https://app.supabase.com and create a project.
2. In **Authentication → Providers**, enable **Google**.
3. In **Project Settings → API**, copy:
   - Project URL
   - `anon` public API key (`eyJ...`) or publishable key (`sb_publishable_...`)
4. In **Authentication → URL Configuration**, add your local and deployed app URLs to redirect URLs.
5. In Supabase's Google provider settings, copy the callback URL and add it to Google Cloud as an authorized redirect URI.
6. In **SQL Editor**, run:

```sql
create table if not exists public.profiles (
  uid uuid primary key references auth.users(id) on delete cascade,
  resume_state jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own resume"
on public.profiles
for select
using (auth.uid() = uid);

create policy "Users can insert their own resume"
on public.profiles
for insert
with check (auth.uid() = uid);

create policy "Users can update their own resume"
on public.profiles
for update
using (auth.uid() = uid)
with check (auth.uid() = uid);

create policy "Users can delete their own resume"
on public.profiles
for delete
using (auth.uid() = uid);
```

### 3. Run the app locally

Serve the folder with a lightweight static server so the browser can load the split JavaScript and JSX files:

```bash
# Using npm (requires Node.js)
npm start
# Then open http://localhost:3000 in your browser

# Or using Python (built‑in)
python -m http.server 8000
# Then open http://localhost:8000 in your browser
```

### AI parse fallback (optional backend, project owner only)

The **Fix parsing with AI** button calls a Supabase Edge Function that holds the Anthropic API key server-side (the key never reaches browsers; the function requires a signed-in user). To enable it:

```bash
# from the repo root, with the Supabase CLI linked to the project
supabase functions deploy parse-resume
supabase functions deploy tailor-resume
supabase functions deploy cover-letter
supabase functions deploy write-variant
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

All functions use `claude-opus-4-8` with structured outputs so replies always match the expected JSON shapes (`parse-resume` returns the resume schema; `tailor-resume` returns the selection + match report; `cover-letter` returns the letter + subject line). Until deployed, the buttons report that the AI backend isn't set up; everything else works without them.

### Run the tests

```bash
npm test
```

When the app opens, sign in with Google, request an email magic link, or click **Try without an account** for local-only use.

### 4. Deploy (optional)

Deploy the folder to any static‑hosting provider. When deploying to **Vercel**:
1. Connect the GitHub repo to Vercel.
2. Vercel will automatically serve `index.html`.

---

## Usage Guide

1. **Sign in** with Google or an email magic link — or choose **Try without an account** (local-only).
2. There is no configuration step; self-hosters can swap in their own Supabase via the link on the sign-in page.
3. **Upload a resume** as PDF, DOC/DOCX, or LaTeX, or start from sample content. Every entry lands in the left-hand library.
4. **Import more resumes** with *＋ Import Resume* — their entries are appended to the library, tagged with the file name.
5. **Add items manually** with the ＋ button on any section header; click a card to expand and edit its fields.
6. **Create variants** on entry cards to keep alternative wordings; the selected variant is what exports.
7. **Mix and match**: check items in/out, reorder items with ▲▼ or drag, and reorder whole sections with the header arrows.
8. The **right panel** live-previews the selection; name and contact lines are editable in place.
9. Toggle **Original** / **Preview** / **LaTeX**. In the LaTeX tab you can edit the source and *Apply to Resume* to update the library from your LaTeX edits.
10. Export with **Copy LaTeX**, **.tex**, **HTML**, **DOC**, **Print PDF**, or **Open in Overleaf** (compiles the real PDF).
11. Use **Reset** to return to the sample content, or **Start Over** to clear everything and upload fresh.

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/your-feature`.
3. Make your changes.
4. Ensure the app still works locally.
5. Submit a pull request.

Please keep the `.gitignore` updated if you add new local configuration files.

---

## License

This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---

## Acknowledgements

- **Tailwind CSS** for rapid UI styling.
- **React (via CDN)** for component‑based UI without a build step.
- **Supabase** for authentication.

---

Enjoy building and customizing your resume! 🎉
