// Modern template — see PRD.md §5. Clean left-aligned sans-serif with a single
// blue accent; the mass-market default. Pure projection of structuredResume:
// relies on the escapeHtml / resolveSectionOrder globals from js/latex.js.
(() => {
    const joinMuted = (parts, separator = " · ") =>
        parts.filter(Boolean).map(escapeHtml).join(separator);

    const renderBullets = (bullets = []) =>
        bullets.length ? `<ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : "";

    const renderEntryHeader = (left, dates) =>
        `<header><span class="title-line">${left}</span><span class="dates">${escapeHtml(dates)}</span></header>`;

    const renderEntries = (title, entries = []) => {
        if (!entries.length) return "";
        return `<section><h2>${escapeHtml(title)}</h2>${entries.map((entry) => {
            const subline = joinMuted([entry.company || entry.organization, entry.location]);
            return `<article>${renderEntryHeader(`<strong>${escapeHtml(entry.title)}</strong>`, entry.dates)}${subline ? `<p class="subline">${subline}</p>` : ""}${renderBullets(entry.bullets)}</article>`;
        }).join("")}</section>`;
    };

    const renderEducation = (education = []) => {
        if (!education.length) return "";
        return `<section><h2>Education</h2>${education.map((item) => {
            const subline = joinMuted([item.degree, item.location]);
            return `<article>${renderEntryHeader(`<strong>${escapeHtml(item.school)}</strong>`, item.dates)}${subline ? `<p class="subline">${subline}</p>` : ""}</article>`;
        }).join("")}</section>`;
    };

    const renderProjects = (projects = []) => {
        if (!projects.length) return "";
        return `<section><h2>Projects</h2>${projects.map((project) => {
            const name = escapeHtml(project.name);
            const tech = joinMuted(project.technologies || []);
            const left = `<strong>${name}</strong>${tech ? `<span class="tech">${name ? " · " : ""}${tech}</span>` : ""}`;
            return `<article>${renderEntryHeader(left, project.dates)}${renderBullets(project.bullets)}</article>`;
        }).join("")}</section>`;
    };

    const renderSkills = (skills = []) => {
        if (!skills.length) return "";
        return `<section><h2>Skills</h2>${skills.map((skill) =>
            `<p class="skill-row"><strong>${escapeHtml(skill.category)}:</strong> ${escapeHtml((skill.items || []).join(", "))}</p>`
        ).join("")}</section>`;
    };

    const SECTION_RENDERERS = {
        education: (resume) => renderEducation(resume.education),
        experience: (resume) => renderEntries("Experience", resume.experience),
        projects: (resume) => renderProjects(resume.projects),
        research: (resume) => renderEntries("Research", resume.research),
        leadership: (resume) => renderEntries("Leadership", resume.leadership),
        skills: (resume) => renderSkills(resume.skills),
    };

    const renderModernHtml = (resume) => {
        const basics = resume.basics || {};
        const contact = [basics.phone, basics.email, basics.linkedin, basics.github, basics.portfolio]
            .filter(Boolean).map(escapeHtml).join("  •  ");
        const sections = resolveSectionOrder(resume)
            .map((key) => SECTION_RENDERERS[key](resume))
            .filter(Boolean)
            .join("\n    ");
        return `<main class="resume-doc">
    <header>
        <h1>${escapeHtml(basics.name)}</h1>${contact ? `
        <p class="contact">${contact}</p>` : ""}
    </header>
    ${sections}
</main>`;
    };

    registerResumeTemplate({
        id: "modern",
        name: "Modern",
        tagline: "Clean sans-serif with a color accent",
        atsRating: "A",
        renderHtml: renderModernHtml,
        renderLatex: null,
        previewCss: `
.tpl-modern { font-family: Inter, -apple-system, "Segoe UI", system-ui, Arial, sans-serif; font-size: 10pt; color: #111827; line-height: 1.35; }
.tpl-modern main > header { border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
.tpl-modern h1 { margin: 0; text-align: left; font-size: 20pt; font-weight: 700; color: #2563eb; letter-spacing: -0.25px; }
.tpl-modern .contact { margin: 3px 0 0; font-size: 9.5pt; color: #4b5563; }
.tpl-modern h2 { margin: 12px 0 4px; font-size: 9.5pt; font-weight: 600; color: #2563eb; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; }
.tpl-modern article { margin: 0 0 7px; }
.tpl-modern article header { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; }
.tpl-modern article header strong { font-weight: 600; }
.tpl-modern .title-line { min-width: 0; }
.tpl-modern .dates { flex-shrink: 0; font-size: 9.5pt; color: #4b5563; }
.tpl-modern .subline { margin: 1px 0 0; font-size: 9.5pt; color: #4b5563; }
.tpl-modern .tech { font-size: 9.5pt; font-weight: 400; color: #4b5563; }
.tpl-modern ul { margin: 3px 0 0; padding-left: 18px; font-size: 9.5pt; }
.tpl-modern li { margin-bottom: 2px; }
.tpl-modern .skill-row { margin: 0 0 2px; font-size: 10pt; }
.tpl-modern .skill-row strong { font-weight: 600; }
@media print {
    .tpl-modern { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .tpl-modern article { break-inside: avoid; }
}
`,
    });
})();
