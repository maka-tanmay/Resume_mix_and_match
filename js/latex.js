const escapeLatex = (value) =>
    String(value || "")
        .replace(/\\/g, "\\textbackslash{}")
        .replace(/%/g, "\\%")
        .replace(/&/g, "\\&")
        .replace(/\$/g, "\\$")
        .replace(/#/g, "\\#")
        .replace(/_/g, "\\_")
        .replace(/{/g, "\\{")
        .replace(/}/g, "\\}")
        .replace(/\^/g, "\\textasciicircum{}")
        .replace(/~/g, "\\textasciitilde{}");

const latexPreamble = () => `\\documentclass[letterpaper,11pt]{article}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}
\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}
\\titleformat{\\section}{\\vspace{-4pt}\\scshape\\raggedright\\large}{}{0em}{}[\\titlerule \\vspace{-5pt}]
\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-2pt}}}}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}
\\begin{document}
`;

const renderHeaderLatex = (basics) => {
    const links = [basics.phone, basics.email, basics.linkedin, basics.github, basics.portfolio].filter(Boolean).map(escapeLatex).join(" $|$ ");
    return `\\begin{center}
    \\textbf{\\Huge \\scshape ${escapeLatex(basics.name)}} \\\\ \\vspace{1pt}
    \\small ${links}
\\end{center}
`;
};

const renderEducationLatex = (education = []) => {
    if (!education.length) return "";
    return `\\section{Education}
\\resumeSubHeadingListStart
${education.map((item) => `\\resumeSubheading{${escapeLatex(item.school)}}{${escapeLatex(item.location)}}{${escapeLatex(item.degree)}}{${escapeLatex(item.dates)}}`).join("\n")}
\\resumeSubHeadingListEnd
`;
};

const renderSkillsLatex = (skills = []) => {
    if (!skills.length) return "";
    return `\\section{Technical Skills}
\\begin{itemize}[leftmargin=0.15in, label={}]
${skills.map((skill) => `\\item\\small{\\textbf{${escapeLatex(skill.category)}}{: ${escapeLatex((skill.items || []).join(", "))}}}`).join("\n")}
\\end{itemize}
`;
};

const renderEntriesLatex = (title, entries = [], isProject = false) => {
    if (!entries.length) return "";
    return `\\section{${escapeLatex(title)}}
\\resumeSubHeadingListStart
${entries.map((entry) => {
    const heading = isProject ? entry.name : entry.title;
    const subheading = isProject ? (entry.technologies || []).join(", ") : (entry.company || entry.organization || "");
    return `\\resumeSubheading{${escapeLatex(heading)}}{${escapeLatex(entry.dates)}}{${escapeLatex(subheading)}}{${escapeLatex(entry.location)}}
\\resumeItemListStart
${(entry.bullets || []).map((bullet) => `\\resumeItem{${escapeLatex(bullet)}}`).join("\n")}
\\resumeItemListEnd`;
}).join("\n")}
\\resumeSubHeadingListEnd
`;
};

const generateStructuredLatex = (resume) => `${latexPreamble()}
${renderHeaderLatex(resume.basics || {})}
${renderEducationLatex(resume.education)}
${renderSkillsLatex(resume.skills)}
${renderEntriesLatex("Experience", resume.experience)}
${renderEntriesLatex("Projects", resume.projects, true)}
${renderEntriesLatex("Research", resume.research)}
${renderEntriesLatex("Leadership", resume.leadership)}
\\end{document}`;

const generateLatex = (personalInfo, selectedJobs) => {
    const structuredResume = {
        basics: personalInfo,
        experience: selectedJobs.map((job) => {
            const activeVariant = job.variants.find((variant) => variant.id === job.selectedVariantId);
            return {
                title: job.title,
                company: job.company,
                location: "",
                dates: job.duration,
                bullets: activeVariant ? activeVariant.bullets.split("\n").filter(Boolean) : [],
            };
        }),
        education: [],
        skills: [],
        projects: [],
        research: [],
        leadership: [],
    };
    return generateStructuredLatex(structuredResume);
};

const escapeHtml = (value) =>
    String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const renderHtmlList = (items = []) => items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";

const renderHtmlEntries = (title, entries = [], isProject = false) => {
    if (!entries.length) return "";
    return `<section><h2>${escapeHtml(title)}</h2>${entries.map((entry) => `
        <article>
            <header>
                <strong>${escapeHtml(isProject ? entry.name : (entry.company || entry.organization || entry.title))}</strong>
                <span>${escapeHtml(entry.dates)}</span>
            </header>
            <p><em>${escapeHtml(isProject ? (entry.technologies || []).join(", ") : entry.title)}</em>${entry.location ? ` · ${escapeHtml(entry.location)}` : ""}</p>
            ${renderHtmlList(entry.bullets)}
        </article>
    `).join("")}</section>`;
};

const generateStructuredHtml = (resume) => `
<main class="resume">
    <header>
        <h1>${escapeHtml(resume.basics?.name)}</h1>
        <p>${[resume.basics?.phone, resume.basics?.email, resume.basics?.linkedin, resume.basics?.github, resume.basics?.portfolio].filter(Boolean).map(escapeHtml).join(" | ")}</p>
    </header>
    ${resume.education?.length ? `<section><h2>Education</h2>${resume.education.map((item) => `<article><header><strong>${escapeHtml(item.school)}</strong><span>${escapeHtml(item.dates)}</span></header><p>${escapeHtml(item.degree)}${item.location ? ` · ${escapeHtml(item.location)}` : ""}</p></article>`).join("")}</section>` : ""}
    ${resume.skills?.length ? `<section><h2>Technical Skills</h2>${resume.skills.map((skill) => `<p><strong>${escapeHtml(skill.category)}:</strong> ${escapeHtml((skill.items || []).join(", "))}</p>`).join("")}</section>` : ""}
    ${renderHtmlEntries("Experience", resume.experience)}
    ${renderHtmlEntries("Projects", resume.projects, true)}
    ${renderHtmlEntries("Research", resume.research)}
    ${renderHtmlEntries("Leadership", resume.leadership)}
</main>`;

const generateStandaloneHtml = (resume) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(resume.basics?.name || "Resume")}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 850px; margin: 40px auto; color: #111; line-height: 1.35; }
    h1 { text-align: center; margin-bottom: 4px; text-transform: uppercase; }
    main > header p { text-align: center; margin-top: 0; }
    h2 { text-transform: uppercase; border-bottom: 1px solid #111; font-size: 18px; margin-top: 22px; }
    article { margin: 12px 0; }
    article header { display: flex; justify-content: space-between; gap: 24px; }
    ul { margin-top: 6px; }
  </style>
</head>
<body>
${generateStructuredHtml(resume)}
</body>
</html>`;

const generateDocHtml = (resume) => generateStandaloneHtml(resume);
