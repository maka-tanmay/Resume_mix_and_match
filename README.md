# Resume Mix & Match Formatter

## Overview

The **Resume Mix & Match Formatter** is a single‑page web application that lets users build and customize professional resumes by selecting, ordering, and styling job experiences. It provides:

- A **library** of job experiences on the left sidebar.
- The ability to **add multiple variants** (different wording/tone) for each experience.
- Drag‑and‑drop reordering of items.
- Live preview of the formatted resume on the right.
- Supabase Google authentication.
- First-run resume upload flow supporting PDF, DOC/DOCX, and LaTeX files.
- Supabase-backed resume persistence scoped by signed-in user.

The app runs entirely in the browser with no build tools required and can be deployed to static-hosting platforms such as **Vercel**, **Netlify**, or GitHub Pages.

---

## Features

- **Add / edit job experiences** – company, title, duration, and bullet points.
- **Create variants** for each experience (e.g., “Backend‑focused” vs “Leadership‑focused”).
- **Select which experiences to include** in the final resume via checkboxes.
- **Drag‑and‑drop** to reorder experiences.
- **Live LaTeX export** – copy the generated LaTeX source to the clipboard.
- **Supabase authentication** - sign in with Google.
- **Resume upload onboarding** - new users can upload one resume file in PDF, DOC/DOCX, or LaTeX.
- **Database persistence** - resume data is saved in Supabase per signed-in user.
- **Responsive UI** built with Tailwind CSS and custom dark‑mode styling.

---

## Import Pipeline

Uploaded resumes are converted through a structured pipeline:

1. **Extract** - PDF uses PDF.js text items with coordinates, DOCX uses Mammoth raw text, and LaTeX is read as text with common commands stripped.
2. **Normalize** - whitespace is cleaned, PDF rows are ordered by page/y/x coordinates, and wrapped bullet lines are merged.
3. **Detect sections** - common resume headings such as Education, Technical Skills, Experience, Projects, Research, and Leadership are detected before parsing.
4. **Parse JSON** - each section is parsed into structured resume JSON with `basics`, `education`, `skills`, `experience`, `projects`, `research`, `leadership`, and `customSections`.
5. **Preview** - PDF uploads are shown as the original PDF, DOCX uploads are shown as HTML converted from the original DOCX, and the edited output can be viewed separately.
6. **Render** - edited HTML/LaTeX/DOC downloads are generated from structured JSON, not from raw extracted text.
7. **Persist** - Supabase stores the original file metadata, original preview payload, raw extracted text, extracted line data, section boundaries, structured JSON, generated HTML, generated LaTeX, and update timestamp.

Development debugging is available by opening:

```text
http://localhost:8000/?debug=resume
```

The debug panel shows raw extracted text, detected section boundaries, structured JSON, and generated LaTeX.

Current export support includes LaTeX source, HTML, Word-compatible `.doc`, and browser print-to-PDF from the edited structured output. Native DOCX and Overleaf ZIP export are planned as the next layer.

---

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge).
- A Supabase project with Google authentication enabled.

### 1. Clone the repository

```bash
git clone https://github.com/maka-tanmay/Resume_mix_and_match.git
cd Resume_mix_and_match
```

### 2. Create a Supabase project

1. Go to https://app.supabase.com and create a project.
2. In **Authentication → Providers**, enable **Google**.
3. In **Project Settings → API**, copy:
   - Project URL
   - `anon` public API key
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
# Using Python (built‑in)
python -m http.server 8000
# Then open http://localhost:8000 in your browser
```

When the app opens, paste the Supabase project URL and anon public key. The app stores these values in local browser storage.

### 4. Deploy (optional)

Deploy the folder to any static‑hosting provider. When deploying to **Vercel**:
1. Connect the GitHub repo to Vercel.
2. Vercel will automatically serve `index.html`.

---

## Usage Guide

1. **Connect Supabase** by entering the project URL and anon public key.
2. **Sign in with Google**.
3. **Upload a resume** as PDF, DOC/DOCX, or LaTeX, or start from sample content.
4. **Add experiences** via the “+” button in the sidebar.
5. **Create variants** by clicking *Add Variant* on a job card.
6. **Select/Deselect** experiences with the checkboxes.
7. **Reorder** by dragging the drag-handle icon.
8. The **right panel** shows a live preview of the resume.
9. Toggle **Original** / **Edited** to compare the uploaded resume preview with the edited structured output.
10. Use **Copy as LaTeX**, **Download .tex**, **Download HTML**, **Download DOC**, or **Print PDF** to export the edited output.
11. Use **Reset** to return to the sample content.

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
