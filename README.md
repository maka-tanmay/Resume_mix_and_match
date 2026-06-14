# Resume Mix & Match Formatter

## Overview

The **Resume Mix & Match Formatter** is a single‑page web application that lets users build and customize professional resumes by selecting, ordering, and styling job experiences. It provides:

- A **library** of job experiences on the left sidebar.
- The ability to **add multiple variants** (different wording/tone) for each experience.
- Drag‑and‑drop reordering of items.
- Live preview of the formatted resume on the right.
- Cloud persistence of data and authentication using **Supabase**.

The app runs entirely in the browser (no build tools required) and can be deployed to static‑hosting platforms such as **Vercel**, **Netlify**, or GitHub Pages.

---

## Features

- **Add / edit job experiences** – company, title, duration, and bullet points.
- **Create variants** for each experience (e.g., “Backend‑focused” vs “Leadership‑focused”).
- **Select which experiences to include** in the final resume via checkboxes.
- **Drag‑and‑drop** to reorder experiences.
- **Live LaTeX export** – copy the generated LaTeX source to the clipboard.
- **Supabase authentication** – sign‑up / sign‑in, with cloud sync of profile and job data.
- **Responsive UI** built with Tailwind CSS and custom dark‑mode styling.

---

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge).
- A **Supabase** account (free tier is sufficient).

### 1. Clone the repository

```bash
git clone https://github.com/maka-tanmay/Resume_mix_and_match.git
cd Resume_mix_and_match
```

### 2. Create a Supabase project

1. Go to https://app.supabase.com and create a new project.
2. In the **Project Settings → API** section copy:
   - **URL** (`SUPABASE_URL`)
   - **anon public key** (`SUPABASE_ANON_KEY`)
3. Create a table named `profiles` with the following columns:
   - `uid` – `uuid` (primary key)
   - `personalInfo` – `jsonb`
   - `jobs` – `jsonb`

### 3. Add the Supabase configuration file

Create a file named `supabaseConfig.js` in the project root (this file is ignored by Git via `.gitignore`). Add the following content, replacing the placeholders with your Supabase values:

```javascript
export const supabase = supabase.createClient(
  "YOUR_SUPABASE_URL",
  "YOUR_SUPABASE_ANON_KEY"
);
```

> **Important:** Do **not** commit `supabaseConfig.js` to the repository – it is listed in `.gitignore` to keep your keys private.

### 4. Run the app locally

Since the app is pure HTML/JS, you can simply open `index.html` in a browser. For a smoother development experience you may use a lightweight static server:

```bash
# Using Python (built‑in)
python -m http.server 8000
# Then open http://localhost:8000 in your browser
```

### 5. Deploy (optional)

Deploy the folder to any static‑hosting provider. When deploying to **Vercel**:
1. Connect the GitHub repo to Vercel.
2. Add environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the Vercel dashboard.
3. Vercel will automatically serve `index.html`.

---

## Usage Guide

1. **Configure Supabase** – ensure `supabaseConfig.js` is present (or set env vars on the host).
2. **Sign up / log in** using the authentication panel on the left.
3. **Add experiences** via the “+” button in the sidebar.
4. **Create variants** by clicking *Add Variant* on a job card.
5. **Select/Deselect** experiences with the checkboxes.
6. **Reorder** by dragging the drag‑handle icon.
7. The **right panel** shows a live preview of the resume.
8. Click **Copy as LaTeX** to copy the generated LaTeX source – you can paste this into Overleaf or a local LaTeX editor.

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

- **Supabase** for the backend‑as‑a‑service solution.
- **Tailwind CSS** for rapid UI styling.
- **React (via CDN)** for component‑based UI without a build step.

---

Enjoy building and customizing your resume! 🎉