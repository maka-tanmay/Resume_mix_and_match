# PRD — Resume Mix & Match

**One-liner:** The system of record for your career. Your experience lives once as a structured
library; every application *compiles* from it — tailored, template-rendered, ATS-clean.

This is the guiding document for all development. Every stage, sub-agent task, and
review decision traces back to it. Update it when scope changes; do not let it rot.

---

## 1. Goal

**Product goal.** A mass-market resume product with a defensible wedge:

- Upload a resume in any format → it becomes a **library** of structured entries.
- Pick any of the most popular **templates** → the same content re-renders instantly.
- Tailor per job (variants today, JD-driven selection in P1) → export an ATS-clean,
  professionally named PDF.

**YC-shaped goal.** Demonstrate, with numbers, the story: *"LLMs just made resume
parsing and per-job tailoring feasible at the exact moment AI-driven application
volume forces every candidate to tailor at scale."*

- Wedge: engineers first (Jake's template / LaTeX / GitHub credibility), templates
  carry the product outward to everyone else.
- Moat: the library compounds — variants, tailored versions, and outcomes make
  switching costs grow with use. Single-document builders have no retention gravity.
- Business: free (2 templates, limited AI) → $9–19/mo during an active search →
  B2B seats (university career centers, bootcamps). First design partner target:
  Minerva career center.

**North-star metrics (instrument from P0):**

| Metric | Definition | P0 target |
|---|---|---|
| Activation | upload → downloaded/printed a resume, same session | ≥ 40% |
| Time-to-wow | upload → first template switch | < 60s |
| Parse quality | uploads needing zero manual fixes | ≥ 70% |
| W1 retention | return within 7 days during a search | measure first |

## 2. Context

**What exists (done, verified, on `main`):**

- [x] v2 library model: every entry (education/experience/projects/research/leadership/skills)
      is an item with include-toggle, ordering, inline editing, wording variants.
- [x] Import/merge parsing: PDF (PDF.js geometry), DOCX (Mammoth), LaTeX, text; fuzzy
      section-heading detection; wrapped header/bullet merging; per-section confidence scores.
- [x] Jake's Resume projection: LaTeX + HTML + live preview from one structured JSON;
      editable LaTeX pane with Apply (lossless round trip, test-covered).
- [x] ATS polish at projection time: consistent bullet punctuation/capitalization,
      normalized date ranges, deduped skills, PDF metadata, `Name_Resume.*` filenames,
      one-page fit estimate.
- [x] Zero-config onboarding: hosted Supabase baked in (`js/config.js`), Google OAuth +
      email magic link + local-only guest mode; self-hosting behind an advanced link.
- [x] Tests: parser / latex / storage suites (`npm test`), all green.
- [ ] **Blocked on owner:** `profiles` table SQL must be run once in the hosted
      Supabase project (README §Getting Started); Vercel deploy + auth redirect URLs.

**Architecture (the part that makes templates cheap):** `structuredResume` is an
intermediate representation. Everything visible — preview, LaTeX, HTML, DOC — is a
pure projection of `(personalInfo, library, sectionOrder)`. A template is just
another projection. No template may reach into the library or parser.

## 3. Constraints

1. **No build step.** CDN React + Babel, plain script tags, global-scope modules.
   Every new file is added to `index.html` in dependency order. No npm dependencies.
2. **Static hosting.** No server we control. Secrets cannot live in the client —
   LLM features must go through a Supabase Edge Function (P0.5), never a raw API key.
3. **Public anon key by design.** All data access is gated by Supabase RLS; each user
   reads/writes only their own row.
4. **Templates are pure functions.** `renderHtml(structuredResume) → string`, with CSS
   scoped under `.tpl-<id>`. No DOM access, no fetches, no external assets (system font
   stacks; CMU Serif is already loaded globally and may be referenced).
5. **Honesty features are product features.** ATS grades on templates, parse-confidence
   flags, page-fit warnings — never hide a known risk from the user.
6. **LaTeX round trip is Jake's-only** until further notice. Other templates export
   HTML/DOC/print-PDF; the `.tex`/Overleaf path always uses the Jake's dialect.
7. Existing test suites must stay green; new surface area ships with tests.
8. No Claude/AI attribution in commits or PRs.

## 4. Plan (staged)

### P0 — The demo (this stage)

*Outcome: "upload ugly resume → correctly parsed → beautiful in 5 templates →
download `Name_Resume.pdf`" in under 60 seconds.*

- [x] Hosted Supabase + Google/magic-link auth, config screen killed (shipped).
- [x] **Template registry** (`js/templates/registry.js`) + 5 templates (contract in §5):
      `jakes`, `classic`, `modern`, `ats-strict`, `two-column`.
- [x] **Instant-switch gallery** in the dashboard; selected template persisted in
      resume state; per-template ATS grade badge shown; contact edited once in the
      sidebar and rendered by every template.
- [x] Template-aware exports: HTML and DOC use the selected template; Print-PDF uses
      the selected template's print CSS; `.tex`/Overleaf stay Jake's.
- [x] Deployed: https://resume-mix-and-match.vercel.app (guest flow + all five
      templates verified live).
- [x] Owner actions done: `profiles` SQL ran in the Supabase SQL Editor (table +
      RLS policies verified via REST); Auth Site URL and Redirect URLs point at
      https://resume-mix-and-match.vercel.app.
- [ ] Owner action remaining: verify a real Google and magic-link sign-in on
      production.

*Acceptance:* switching templates re-renders the same content with no data loss;
all templates print cleanly to one-page-capable PDF; `npm test` green including a
templates suite; browser-verified.

### P0.5 — Parse quality floor

- [x] Review flow: post-import banner with item/flagged counts; per-item confidence
      flags (amber dot, threshold 0.65) on library cards; editing a field marks the
      item reviewed; move-to-section quick fix for misfiled entries; the Original
      tab remains the side-by-side comparison.
- [x] LLM parse-fallback code: `supabase/functions/parse-resume` (Anthropic SDK,
      `claude-opus-4-8`, structured-outputs schema, JWT-gated, CORS) + `js/aiParse.js`
      client + "Fix parsing with AI" (signed-in users; replaces same-source items).
- [ ] Owner action: `supabase functions deploy parse-resume` +
      `supabase secrets set ANTHROPIC_API_KEY=...` on the hosted project.
- [ ] Measure: parse-quality metric on 50 real resumes; ≥70% zero-fix before P1.

### P1 — The wedge

- [x] Paste-a-JD tailoring code: `supabase/functions/tailor-resume` (structured
      outputs: includedItemIds / variantChoices / sectionOrder / matchReport with
      honest score, matched/missing keywords, suggestions; invented IDs filtered
      server-side) + `js/tailor.js` + dashboard panel with one-click apply and
      Undo tailoring (pre-tailor snapshot). Signed-in users only.
- [x] Paste-text import (first-run page + sidebar Paste button; same parser and
      review flow as file imports).
- [ ] Owner action: `supabase functions deploy tailor-resume` (same
      ANTHROPIC_API_KEY secret as parse-resume).
- [x] Cover letter code: `supabase/functions/cover-letter` (same pattern as
      tailor-resume: structured outputs {coverLetter, subject}, JWT-gated, honest
      no-fabrication prompt) + `js/coverLetter.js` + "Write cover letter" button
      in the tailor panel with an editable result, Copy, and Download .txt.
      Owner action: `supabase functions deploy cover-letter`.
- [x] LinkedIn-PDF import preset: "Save profile to PDF" exports auto-detected
      ("Page N of M" + linkedin.com/in), split into sidebar/main columns by x
      geometry, parsed with LinkedIn's line patterns (multi-role companies,
      durations, honors), re-emitted as generic resume lines; test-covered.
- [ ] Typst or server-side PDF for true typography (replaces print-to-PDF).

### P2 — The business

- [ ] Application tracker (job, JD, resume version used, status, dates).
- [ ] Outcome analytics: which template/variant/bullet versions got responses.
- [ ] Minerva career-center pilot (B2B seat model validation).
- [ ] Share/referral loop; template gallery as public landing pages (SEO).

## 5. Template contract (the spec sub-agents implement)

One file per template: `js/templates/<id>.js`, loaded after `js/templates/registry.js`.
Reference implementation: `js/templates/jakes.js`.

```js
registerResumeTemplate({
    id: "modern",                  // kebab-case, matches filename and .tpl-<id> CSS scope
    name: "Modern",                // 1–2 words, shown on the gallery chip
    tagline: "Clean sans-serif with a color accent",
    atsRating: "A",                // "A" parses everywhere · "B" minor risk · "C" stylized
    renderHtml: (resume) => "...", // pure; uses escapeHtml + resolveSectionOrder (globals)
    previewCss: `...`,             // every rule scoped under .tpl-<id>; includes @media print
    renderLatex: null,             // Jake's only for now (see Constraint 6)
});
```

**renderHtml requirements.** Consume the `structuredResume` shape exactly as
`generateStructuredHtml` does (see `js/latex.js`): `basics{name,phone,email,linkedin,github,portfolio}`,
`education[]`, `experience[]`, `projects[]{technologies[]}`, `research[]`, `leadership[]`,
`skills[]{category,items[]}`, `sectionOrder`. Rules:

- Escape **every** interpolated value with `escapeHtml`. No exceptions.
- Respect `resolveSectionOrder(resume)`; omit empty sections entirely.
- Root element: `<main class="resume-doc">…</main>`; no `<html>/<head>/<body>`.
- Empty-field hygiene: no dangling separators when a contact field is missing.

**previewCss requirements.**

- Scope every selector under `.tpl-<id>` (the host wraps the HTML in
  `<div class="tpl-<id>">`). Zero unscoped rules.
- Letter-page look: black-on-white, ~10–11pt equivalent, content fits a 7.5in column.
- `@media print` rules so Print-PDF is clean (no shadows, exact colors via
  `-webkit-print-color-adjust: exact` where accents are used).
- Fonts: system stacks only (`Georgia/'Times New Roman'` serif; `Inter/system-ui/Arial`
  sans; `"CMU Serif"` allowed — already loaded).

**The 5 templates.**

| id | look | audience | ATS |
|---|---|---|---|
| `jakes` | Computer Modern, small-caps ruled sections (existing) | engineers | A |
| `classic` | centered serif, conservative, Harvard-style | finance/consulting/law | A |
| `modern` | left-aligned sans, single accent color, tight | general mass market | A |
| `ats-strict` | intentionally plain: Arial, UPPERCASE headers, zero decoration | ATS-paranoid applicants | A |
| `two-column` | 30% sidebar (contact/skills/education) + 70% main | design-tolerant fields | C |

## 6. Development protocol

- **This PRD guides all agents.** Every sub-agent prompt links here and to the
  reference implementation; deviation requires updating the PRD first.
- **Parallelization rule:** sub-agents only author files no one else touches
  (one template file per agent). Shared files (registry, Dashboard, index.html,
  tests) are integrated by the main session only.
- **Review gate:** every agent-authored file is reviewed in the main session for
  escaping, CSS scoping, and contract conformance before wiring into `index.html`.
- **Verification ladder per stage:** `npm test` green → fresh-profile browser
  walkthrough → commit with a descriptive message → push.
- **Staging:** P0 ships before any P0.5 work starts; each stage's acceptance
  criteria are checked off in §4 in the same commit that completes them.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Parse quality kills first impressions | P0.5 is the very next stage; confidence flags already exist; review screen makes fixes one-click |
| Template sprawl → ugly output | 5 curated templates, 3 knobs max (font/accent/density, P1); no free-form styling |
| Two-column templates hurt ATS parsing | Honest "C" grade shown on the chip; ats-strict offered beside it |
| LLM cost abuse on a public endpoint | Edge Function: auth-required, per-user daily quota, raw-text-only payloads |
| Consumer churn after hire | P2 B2B (career centers) + lifecycle re-entry; tracked from the start via outcome analytics |
| No-build architecture ages badly | Acceptable until traction; revisit (Vite migration) only after P1 validates |

## 8. Out of scope (explicitly, for now)

Multi-resume documents, cover-letter design templates, interview prep, Chrome
extension, mobile apps, team/recruiter seats, custom template editor.
