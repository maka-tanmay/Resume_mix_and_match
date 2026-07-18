// ATS Strict template — see PRD.md §5 for the contract.
// Deliberately plain: system sans, black-on-white, zero decoration. Markup stays
// strictly linear (heading, one-line entry header, location, bullets) so any
// applicant-tracking parser reads the content exactly as written.
// Wrapped in an IIFE: template files share one global scope, so no top-level names.
(() => {
    const renderBullets = (bullets = []) =>
        bullets.length
            ? `<ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>`
            : "";

    // Line 1 of every entry: bold left text + dates right (flex keeps source order linear).
    const renderEntryHeader = (leftText, dates) =>
        `<header><strong>${escapeHtml(leftText)}</strong>${dates ? `<span>${escapeHtml(dates)}</span>` : ""}</header>`;

    const renderLocation = (location) =>
        location ? `<p class="entry-location">${escapeHtml(location)}</p>` : "";

    // Experience / research / leadership: "Title, Company" — comma only when both present.
    const renderRoleSection = (title, entries = []) => {
        if (!entries.length) return "";
        return `<section><h2>${escapeHtml(title)}</h2>${entries.map((entry) => `
        <article>
            ${renderEntryHeader([entry.title, entry.company || entry.organization].filter(Boolean).join(", "), entry.dates)}
            ${renderLocation(entry.location)}
            ${renderBullets(entry.bullets)}
        </article>`).join("")}</section>`;
    };

    const renderEducationSection = (education = []) => {
        if (!education.length) return "";
        return `<section><h2>EDUCATION</h2>${education.map((item) => `
        <article>
            ${renderEntryHeader([item.degree, item.school].filter(Boolean).join(", "), item.dates)}
            ${renderLocation(item.location)}
        </article>`).join("")}</section>`;
    };

    const renderProjectsSection = (projects = []) => {
        if (!projects.length) return "";
        return `<section><h2>PROJECTS</h2>${projects.map((entry) => {
            const technologies = (entry.technologies || []).filter(Boolean).join(", ");
            const heading = [entry.name, technologies ? `(${technologies})` : ""].filter(Boolean).join(" ");
            return `
        <article>
            ${renderEntryHeader(heading, entry.dates)}
            ${renderBullets(entry.bullets)}
        </article>`;
        }).join("")}</section>`;
    };

    const renderSkillsSection = (skills = []) => {
        if (!skills.length) return "";
        return `<section><h2>SKILLS</h2>${skills.map((skill) => `<p class="skill-row">${skill.category ? `<strong>${escapeHtml(skill.category)}:</strong> ` : ""}${escapeHtml((skill.items || []).join(", "))}</p>`).join("")}</section>`;
    };

    const SECTION_RENDERERS = {
        education: (resume) => renderEducationSection(resume.education),
        experience: (resume) => renderRoleSection("EXPERIENCE", resume.experience),
        projects: (resume) => renderProjectsSection(resume.projects),
        research: (resume) => renderRoleSection("RESEARCH", resume.research),
        leadership: (resume) => renderRoleSection("LEADERSHIP", resume.leadership),
        skills: (resume) => renderSkillsSection(resume.skills),
    };

    registerResumeTemplate({
        id: "ats-strict",
        name: "ATS Strict",
        tagline: "Deliberately plain — nothing for a parser to trip on",
        atsRating: "A",
        renderHtml: (resume) => {
            const basics = resume.basics || {};
            const contact = [basics.phone, basics.email, basics.linkedin, basics.github, basics.portfolio]
                .filter(Boolean)
                .map(escapeHtml)
                .join(" | ");
            const sections = resolveSectionOrder(resume)
                .map((key) => SECTION_RENDERERS[key](resume))
                .filter(Boolean)
                .join("\n    ");
            return `<main class="resume-doc">
    <header>
        <h1>${escapeHtml(basics.name)}</h1>
        ${contact ? `<p class="contact-line">${contact}</p>` : ""}
    </header>
    ${sections}
</main>`;
        },
        renderLatex: null,
        previewCss: `
.tpl-ats-strict { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #000; background: #fff; line-height: 1.4; }
.tpl-ats-strict h1 { font-size: 16pt; font-weight: 700; text-transform: uppercase; text-align: left; margin: 0 0 4px; }
.tpl-ats-strict .contact-line { margin: 0; font-size: 10.5pt; }
.tpl-ats-strict h2 { font-size: 11pt; font-weight: 700; text-transform: uppercase; border: 0; margin: 12px 0 4px; padding: 0; }
.tpl-ats-strict article { margin: 0 0 8px; }
.tpl-ats-strict article header { display: flex; justify-content: space-between; gap: 24px; }
.tpl-ats-strict .entry-location { margin: 0; }
.tpl-ats-strict ul { margin: 2px 0 0; padding-left: 18px; font-size: 10pt; list-style-type: disc; }
.tpl-ats-strict li { margin: 0 0 2px; }
.tpl-ats-strict .skill-row { margin: 0 0 3px; }
@media print {
    .tpl-ats-strict { line-height: 1.35; }
    .tpl-ats-strict article { page-break-inside: avoid; }
}
`,
    });
})();
