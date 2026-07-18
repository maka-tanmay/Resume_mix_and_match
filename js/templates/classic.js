// Classic template — see PRD.md §5. Harvard-style conservative serif for
// finance/consulting/law: centered name, uppercase ruled section headers,
// company-first entry lines. Pure projection; escapeHtml + resolveSectionOrder
// are globals from js/latex.js.
(() => {
    const renderBullets = (bullets = []) =>
        bullets.length ? `<ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : "";

    // Line 1: bold company + dates. Line 2: italic title + location. When the
    // company is missing the title is promoted to line 1 and not repeated.
    const renderEntry = (entry) => {
        const company = entry.company || entry.organization || "";
        const primary = company || entry.title || "";
        const secondary = company ? (entry.title || "") : "";
        const subheader = (secondary || entry.location)
            ? `<div class="subheader"><em>${escapeHtml(secondary)}</em><span>${escapeHtml(entry.location || "")}</span></div>`
            : "";
        return `<article><header><strong>${escapeHtml(primary)}</strong><span>${escapeHtml(entry.dates || "")}</span></header>${subheader}${renderBullets(entry.bullets)}</article>`;
    };

    const renderEducationEntry = (item) =>
        `<article><header><strong>${escapeHtml(item.school || "")}</strong><span>${escapeHtml(item.location || "")}</span></header><div class="subheader"><em>${escapeHtml(item.degree || "")}</em><em>${escapeHtml(item.dates || "")}</em></div></article>`;

    const renderProjectEntry = (entry) => {
        const technologies = (entry.technologies || []).join(", ");
        const title = `<strong>${escapeHtml(entry.name || "")}</strong>${technologies ? ` — <em>${escapeHtml(technologies)}</em>` : ""}`;
        return `<article><header><span class="project-title">${title}</span><span>${escapeHtml(entry.dates || "")}</span></header>${renderBullets(entry.bullets)}</article>`;
    };

    const renderSection = (title, entries = [], renderItem) =>
        entries.length ? `<section><h2>${escapeHtml(title)}</h2>${entries.map(renderItem).join("")}</section>` : "";

    const renderSkills = (skills = []) =>
        skills.length
            ? `<section><h2>Skills</h2>${skills.map((skill) => `<p class="skill-row"><strong>${escapeHtml(skill.category)}:</strong> ${escapeHtml((skill.items || []).join(", "))}</p>`).join("")}</section>`
            : "";

    const SECTION_RENDERERS = {
        education: (resume) => renderSection("Education", resume.education, renderEducationEntry),
        experience: (resume) => renderSection("Experience", resume.experience, renderEntry),
        projects: (resume) => renderSection("Projects", resume.projects, renderProjectEntry),
        research: (resume) => renderSection("Research", resume.research, renderEntry),
        leadership: (resume) => renderSection("Leadership", resume.leadership, renderEntry),
        skills: (resume) => renderSkills(resume.skills),
    };

    const renderHtml = (resume) => {
        const contact = [resume.basics?.phone, resume.basics?.email, resume.basics?.linkedin, resume.basics?.github, resume.basics?.portfolio]
            .filter(Boolean)
            .map(escapeHtml)
            .join(" · ");
        return `<main class="resume-doc">
    <header>
        <h1>${escapeHtml(resume.basics?.name)}</h1>${contact ? `
        <p>${contact}</p>` : ""}
    </header>
    ${resolveSectionOrder(resume).map((key) => SECTION_RENDERERS[key](resume)).filter(Boolean).join("\n    ")}
</main>`;
    };

    registerResumeTemplate({
        id: "classic",
        name: "Classic",
        tagline: "Conservative serif — the finance and consulting safe pick",
        atsRating: "A",
        renderHtml,
        renderLatex: null,
        previewCss: `
.tpl-classic { font-family: Georgia, "Times New Roman", serif; font-size: 10.5pt; color: #111; background: #fff; line-height: 1.35; }
.tpl-classic h1 { text-align: center; margin: 0; font-size: 22pt; font-weight: 700; }
.tpl-classic main > header p { text-align: center; margin: 3px 0 0; font-size: 9.5pt; }
.tpl-classic h2 { text-transform: uppercase; font-weight: 700; font-size: 11pt; letter-spacing: 1px; border-bottom: 1px solid #333; margin: 14px 0 6px; padding-bottom: 2px; }
.tpl-classic article { margin: 7px 0; }
.tpl-classic article header, .tpl-classic .subheader { display: flex; justify-content: space-between; gap: 24px; }
.tpl-classic .subheader { font-size: 10pt; }
.tpl-classic ul { margin: 3px 0 0; padding-left: 20px; font-size: 10pt; list-style: disc; }
.tpl-classic li { margin-bottom: 1px; }
.tpl-classic .skill-row { margin: 2px 0; font-size: 10pt; }
@media print {
    .tpl-classic { line-height: 1.3; }
    .tpl-classic article { margin: 6px 0; }
}
`,
    });
})();
