// LaTeX generation targets Jake's Resume template (https://github.com/jakegut/resume),
// the de-facto standard single-column resume. Preview/HTML/DOC exports mirror its
// structure and Computer Modern font so what users see matches what LaTeX produces.

// PDF/DOCX extraction leaves unicode (smart quotes, dashes, ligatures) that breaks
// or mis-renders under pdflatex — normalize to ASCII/LaTeX idioms before escaping.
const LATEX_UNICODE_REPLACEMENTS = [
    [/[‘‛]/g, "`"],
    [/[’ʼ]/g, "'"],
    [/“/g, "``"],
    [/”/g, "''"],
    [/[–‒]/g, "--"],
    [/—/g, "---"],
    [/[‐‑−]/g, "-"],
    [/…/g, "..."],
    [/[•●▪◦∙·⁃]/g, "-"],
    [/ﬀ/g, "ff"],
    [/ﬁ/g, "fi"],
    [/ﬂ/g, "fl"],
    [/ﬃ/g, "ffi"],
    [/ﬄ/g, "ffl"],
    [/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, " "],
];

const sanitizeLatexText = (value) =>
    LATEX_UNICODE_REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), String(value || ""));

const LATEX_ESCAPES = {
    "\\": "\\textbackslash{}",
    "%": "\\%",
    "&": "\\&",
    "$": "\\$",
    "#": "\\#",
    "_": "\\_",
    "{": "\\{",
    "}": "\\}",
    "^": "\\textasciicircum{}",
    "~": "\\textasciitilde{}",
};

// Single pass so replacement text (e.g. the braces in \textbackslash{}) is never re-escaped.
const escapeLatex = (value) =>
    sanitizeLatexText(value).replace(/[\\%&$#_{}^~]/g, (character) => LATEX_ESCAPES[character]);

// \href URL argument follows different rules: strip whitespace/backslashes, escape %, #, &.
const escapeLatexUrl = (value) =>
    sanitizeLatexText(value)
        .replace(/[\\\s]+/g, "")
        .replace(/([%#&])/g, "\\$1");

const ensureAbsoluteUrl = (value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

const stripProtocol = (value) => String(value || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");

const latexPreamble = () => `\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% Ensure that generated pdf is machine readable/ATS parsable
\\pdfgentounicode=1

%-------------------------
% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}
`;

const renderHeaderLatex = (basics = {}) => {
    const parts = [];
    if (basics.phone) parts.push(escapeLatex(basics.phone));
    if (basics.email) parts.push(`\\href{mailto:${escapeLatexUrl(basics.email)}}{\\underline{${escapeLatex(basics.email)}}}`);
    [basics.linkedin, basics.github, basics.portfolio].filter(Boolean).forEach((link) => {
        parts.push(`\\href{${escapeLatexUrl(ensureAbsoluteUrl(link))}}{\\underline{${escapeLatex(stripProtocol(link))}}}`);
    });

    return `\\begin{center}
    \\textbf{\\Huge \\scshape ${escapeLatex(basics.name)}} \\\\ \\vspace{1pt}
    \\small ${parts.join(" $|$ ")}
\\end{center}
`;
};

const renderBulletsLatex = (bullets = []) => {
    // An itemize with zero \item entries is a LaTeX compile error — skip it entirely.
    if (!bullets.length) return "";
    return `
\\resumeItemListStart
${bullets.map((bullet) => `    \\resumeItem{${escapeLatex(bullet)}}`).join("\n")}
\\resumeItemListEnd`;
};

const renderEducationLatex = (education = []) => {
    if (!education.length) return "";
    return `\\section{Education}
\\resumeSubHeadingListStart
${education.map((item) => `    \\resumeSubheading{${escapeLatex(item.school)}}{${escapeLatex(item.location)}}{${escapeLatex(item.degree)}}{${escapeLatex(item.dates)}}`).join("\n")}
\\resumeSubHeadingListEnd
`;
};

const renderSkillsLatex = (skills = []) => {
    if (!skills.length) return "";
    const rows = skills
        .map((skill) => `     \\textbf{${escapeLatex(skill.category)}}{: ${escapeLatex((skill.items || []).join(", "))}}`)
        .join(" \\\\\n");
    return `\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${rows}
    }}
 \\end{itemize}
`;
};

const renderExperienceEntryLatex = (entry) => `    \\resumeSubheading{${escapeLatex(entry.title)}}{${escapeLatex(entry.dates)}}{${escapeLatex(entry.company || entry.organization || "")}}{${escapeLatex(entry.location)}}${renderBulletsLatex(entry.bullets)}`;

const renderProjectEntryLatex = (entry) => {
    const name = `\\textbf{${escapeLatex(entry.name)}}`;
    const technologies = (entry.technologies || []).length ? ` $|$ \\emph{${escapeLatex(entry.technologies.join(", "))}}` : "";
    return `    \\resumeProjectHeading{${name}${technologies}}{${escapeLatex(entry.dates)}}${renderBulletsLatex(entry.bullets)}`;
};

const renderEntriesLatex = (title, entries = [], isProject = false) => {
    if (!entries.length) return "";
    return `\\section{${escapeLatex(title)}}
\\resumeSubHeadingListStart
${entries.map((entry) => (isProject ? renderProjectEntryLatex(entry) : renderExperienceEntryLatex(entry))).join("\n")}
\\resumeSubHeadingListEnd
`;
};

// Section order follows Jake's template: Education, Experience, Projects, then the rest.
const generateStructuredLatex = (resume) => [
    latexPreamble(),
    renderHeaderLatex(resume.basics || {}),
    renderEducationLatex(resume.education),
    renderEntriesLatex("Experience", resume.experience),
    renderEntriesLatex("Projects", resume.projects, true),
    renderEntriesLatex("Research", resume.research),
    renderEntriesLatex("Leadership", resume.leadership),
    renderSkillsLatex(resume.skills),
    "\\end{document}",
].filter(Boolean).join("\n");

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
                <strong>${escapeHtml(isProject ? entry.name : entry.title)}</strong>
                <span>${escapeHtml(entry.dates)}</span>
            </header>
            <div class="subheader">
                <em>${escapeHtml(isProject ? (entry.technologies || []).join(", ") : (entry.company || entry.organization || ""))}</em>
                <em>${escapeHtml(entry.location || "")}</em>
            </div>
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
    ${resume.education?.length ? `<section><h2>Education</h2>${resume.education.map((item) => `<article><header><strong>${escapeHtml(item.school)}</strong><span>${escapeHtml(item.location)}</span></header><div class="subheader"><em>${escapeHtml(item.degree)}</em><em>${escapeHtml(item.dates)}</em></div></article>`).join("")}</section>` : ""}
    ${renderHtmlEntries("Experience", resume.experience)}
    ${renderHtmlEntries("Projects", resume.projects, true)}
    ${renderHtmlEntries("Research", resume.research)}
    ${renderHtmlEntries("Leadership", resume.leadership)}
    ${resume.skills?.length ? `<section><h2>Technical Skills</h2>${resume.skills.map((skill) => `<p class="skill-row"><strong>${escapeHtml(skill.category)}:</strong> ${escapeHtml((skill.items || []).join(", "))}</p>`).join("")}</section>` : ""}
</main>`;

// Standalone export styled to match Jake's template output: Computer Modern,
// small-caps name and section titles, ruled sections.
const generateStandaloneHtml = (resume) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(resume.basics?.name || "Resume")}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/computer-modern@0.1.3/cmu-serif.css">
  <style>
    body { font-family: "CMU Serif", Georgia, "Times New Roman", serif; font-size: 11pt; max-width: 7.6in; margin: 40px auto; color: #111; line-height: 1.3; }
    h1 { text-align: center; margin: 0 0 2px; font-variant: small-caps; font-size: 28pt; letter-spacing: 0.5px; }
    main > header p { text-align: center; margin: 2px 0 0; font-size: 10pt; }
    h2 { font-variant: small-caps; font-weight: normal; border-bottom: 1px solid #111; font-size: 14pt; margin: 16px 0 6px; padding-bottom: 1px; }
    article { margin: 6px 0; }
    article header, .subheader { display: flex; justify-content: space-between; gap: 24px; }
    .subheader { font-size: 10pt; }
    ul { margin: 3px 0 0; padding-left: 22px; font-size: 10pt; }
    li { margin-bottom: 1px; }
    .skill-row { margin: 2px 0; font-size: 10pt; }
    @media print { body { margin: 0.5in auto; } }
  </style>
</head>
<body>
${generateStructuredHtml(resume)}
</body>
</html>`;

const generateDocHtml = (resume) => generateStandaloneHtml(resume);
