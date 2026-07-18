// Two Column template — see PRD.md §5 for the contract.
// Sidebar (name / contact / skills / education) beside a main flow of dated
// entries. Recruiter-pretty and honestly graded "C": some ATS parsers read
// multi-column layouts out of order. Wrapped in an IIFE so no top-level
// bindings leak into the shared global scope of this no-build app.
(() => {
    const MAIN_SECTION_TITLES = {
        experience: "Experience",
        projects: "Projects",
        research: "Research",
        leadership: "Leadership",
    };
    // The sidebar always owns contact, skills, and education; only the
    // remaining sections flow through the main column in resume order.
    const SIDEBAR_KEYS = ["skills", "education"];

    const line = (className, value) =>
        value ? `<div class="${className}">${escapeHtml(value)}</div>` : "";

    const renderBullets = (bullets = []) =>
        bullets.length ? `<ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : "";

    const renderContact = (basics = {}) => {
        const fields = [basics.phone, basics.email, basics.linkedin, basics.github, basics.portfolio].filter(Boolean);
        return fields.length
            ? `<div class="side-contact">${fields.map((field) => `<div class="side-contact-line">${escapeHtml(field)}</div>`).join("")}</div>`
            : "";
    };

    const renderSideSkills = (skills = []) => {
        const groups = skills.filter((skill) => skill && (skill.category || (skill.items || []).length));
        if (!groups.length) return "";
        return `<section class="side-section"><h2>Skills</h2>${groups.map((skill) =>
            `<div class="side-skill">${line("side-skill-category", skill.category)}${line("side-skill-items", (skill.items || []).join(", "))}</div>`
        ).join("")}</section>`;
    };

    const renderSideEducation = (education = []) => {
        if (!education.length) return "";
        return `<section class="side-section"><h2>Education</h2>${education.map((item) =>
            `<article class="side-entry">${line("side-entry-school", item.school)}${line("side-entry-line", item.degree)}${line("side-entry-line", item.location)}${line("side-entry-line", item.dates)}</article>`
        ).join("")}</section>`;
    };

    const renderMainEntry = (entry, isProject) => {
        const technologies = (entry.technologies || []).filter(Boolean);
        const title = isProject
            ? `${escapeHtml(entry.name)}${technologies.length ? `<span class="entry-tech"> · ${technologies.map(escapeHtml).join(" · ")}</span>` : ""}`
            : escapeHtml(entry.title);
        const meta = isProject
            ? ""
            : [entry.company || entry.organization || "", entry.location || ""].filter(Boolean).map(escapeHtml).join(" · ");
        return `<article class="entry">
            <div class="entry-line">
                <span class="entry-title">${title}</span>
                ${entry.dates ? `<span class="entry-dates">${escapeHtml(entry.dates)}</span>` : ""}
            </div>
            ${meta ? `<div class="entry-meta">${meta}</div>` : ""}
            ${renderBullets(entry.bullets)}
        </article>`;
    };

    const renderMainSection = (key, entries = []) =>
        entries.length
            ? `<section class="main-section"><h2>${escapeHtml(MAIN_SECTION_TITLES[key])}</h2>${entries.map((entry) => renderMainEntry(entry, key === "projects")).join("")}</section>`
            : "";

    const renderHtml = (resume) => {
        const basics = resume.basics || {};
        const mainSections = resolveSectionOrder(resume)
            .filter((key) => !SIDEBAR_KEYS.includes(key))
            .map((key) => renderMainSection(key, resume[key] || []))
            .filter(Boolean)
            .join("\n        ");
        return `<main class="resume-doc">
    <aside class="side">
        ${basics.name ? `<h1>${escapeHtml(basics.name)}</h1>` : ""}
        ${renderContact(basics)}
        ${renderSideSkills(resume.skills || [])}
        ${renderSideEducation(resume.education || [])}
    </aside>
    <div class="main">
        ${mainSections}
    </div>
</main>`;
    };

    registerResumeTemplate({
        id: "two-column",
        name: "Two Column",
        tagline: "Sidebar layout — looks great to humans, some ATS parsers struggle with columns",
        atsRating: "C",
        renderHtml,
        renderLatex: null,
        previewCss: `
.tpl-two-column { font-family: Inter, -apple-system, "Segoe UI", system-ui, Arial, sans-serif; font-size: 9.5pt; color: #111827; line-height: 1.35; }
.tpl-two-column .resume-doc { display: grid; grid-template-columns: 32fr 68fr; gap: 0.25in; align-items: start; }
.tpl-two-column .side { background: #f3f4f6; padding: 0.2in; border-radius: 4px; box-sizing: border-box; }
.tpl-two-column .side h1 { margin: 0; font-size: 18pt; font-weight: 700; line-height: 1.1; overflow-wrap: break-word; }
.tpl-two-column .side h2 { margin: 14px 0 4px; padding-bottom: 2px; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #d1d5db; }
.tpl-two-column .side-contact { margin-top: 8px; }
.tpl-two-column .side-contact-line { margin: 1px 0; font-size: 8.5pt; word-break: break-word; }
.tpl-two-column .side-skill { margin: 0 0 6px; font-size: 8.5pt; }
.tpl-two-column .side-skill-category { font-weight: 700; }
.tpl-two-column .side-entry { margin: 0 0 8px; font-size: 8.5pt; }
.tpl-two-column .side-entry-school { font-weight: 700; }
.tpl-two-column .side-entry-line { margin-top: 1px; }
.tpl-two-column .main-section { margin: 0 0 12px; }
.tpl-two-column .main-section h2 { margin: 0 0 6px; padding-bottom: 2px; font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #d1d5db; }
.tpl-two-column .entry { margin: 0 0 8px; }
.tpl-two-column .entry-line { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; }
.tpl-two-column .entry-title { font-weight: 600; }
.tpl-two-column .entry-tech { font-weight: 400; color: #4b5563; }
.tpl-two-column .entry-dates { font-size: 9pt; color: #4b5563; white-space: nowrap; }
.tpl-two-column .entry-meta { font-size: 9pt; color: #4b5563; }
.tpl-two-column .main ul { margin: 3px 0 0; padding-left: 18px; font-size: 9.5pt; list-style: disc; }
.tpl-two-column .main li { margin-bottom: 1px; }
@media print {
    .tpl-two-column .resume-doc { display: grid; }
    .tpl-two-column .side { background: #f3f4f6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`,
    });
})();
