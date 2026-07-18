const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const parserSource = fs.readFileSync(path.join(__dirname, "../js/resumeParser.js"), "utf8");
const latexSource = fs.readFileSync(path.join(__dirname, "../js/latex.js"), "utf8");
const context = {
    window: {},
    defaultPersonalInfo: {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "(555) 123-4567",
        linkedin: "linkedin.com/in/janedoe",
        github: "",
        portfolio: "",
    },
};

vm.createContext(context);
vm.runInContext(`${latexSource}
${parserSource}
globalThis.parserTestApi = {
  normalizeTextLines,
  splitIntoSections,
  parseHeader,
  parseEducation,
  parseSkills,
  parseExperienceLike,
  validateStructuredResume,
  emptyStructuredResume,
  stripLatex,
  parseLatexSource,
  parsePastedResumeText,
  generateStructuredLatex,
  getSectionKey,
  isLinkedInExport,
  transformLinkedInProfile,
  parseResumeLines
};`, context);

const {
    normalizeTextLines,
    splitIntoSections,
    parseHeader,
    parseEducation,
    parseSkills,
    parseExperienceLike,
    validateStructuredResume,
    emptyStructuredResume,
    stripLatex,
    parseLatexSource,
    parsePastedResumeText,
    generateStructuredLatex,
    getSectionKey,
} = context.parserTestApi;

const sample = `
Jane Candidate
(555) 111-2222 | jane@example.com | linkedin.com/in/jane | github.com/jane
EDUCATION
State University | San Jose, CA
B.S. Computer Science Expected May 2027
TECHNICAL SKILLS
Languages: Python, TypeScript, Go
Frameworks: React, Next.js, Angular
EXPERIENCE
Engineering Intern May 2026 - Present
UL Solutions | Fremont, CA
• Executed automated SAR compliance test suites on wireless devices
• Analyzed raw instrumentation output and compiled structured test reports
Software Engineer Intern Sep 2024 - May 2026
Acme Corp | Remote
• Built internal tools with React
PROJECTS
Resume Parser | JavaScript, PDF.js 2026
• Parsed PDF resumes into structured JSON
RESEARCH
Wireless Compliance Study 2025
University Lab | San Jose, CA
• Evaluated device telemetry
LEADERSHIP
President 2024 - 2025
Computing Club | San Jose, CA
• Led weekly technical workshops
`;

const lines = normalizeTextLines(sample);
const sections = splitIntoSections(lines);
const basics = parseHeader(sections.header);
const education = parseEducation(sections.education);
const skills = parseSkills(sections.skills);
const experience = parseExperienceLike(sections.experience, "experience");
const projects = parseExperienceLike(sections.projects, "projects");
const research = parseExperienceLike(sections.research, "research");
const leadership = parseExperienceLike(sections.leadership, "leadership");

assert.strictEqual(basics.name, "Jane Candidate");
assert.strictEqual(basics.email, "jane@example.com");
assert.strictEqual(basics.phone, "(555) 111-2222", "phone must keep its leading parenthesis");
assert(!basics.headline.includes("@"), "headline must not absorb the contact line");
assert.strictEqual(education.length, 1);
assert.strictEqual(skills.length, 2);
assert.strictEqual(experience.length, 2);
assert.strictEqual(projects.length, 1);
assert.strictEqual(projects[0].name, "Resume Parser");
assert.strictEqual(JSON.stringify(projects[0].technologies), JSON.stringify(["JavaScript", "PDF.js"]), "project technologies must survive the | split");
assert.strictEqual(research.length, 1);
assert.strictEqual(leadership.length, 1);
assert(!experience.some((entry) => /Technical Skills|Languages|State University|Resume Parser/.test(JSON.stringify(entry))));
assert(experience[0].bullets[0].includes("SAR compliance"));
assert.strictEqual(experience[0].location, "Fremont, CA");
assert.strictEqual(experience[0].dates, "May 2026 - Present");

const resume = emptyStructuredResume();
resume.basics = basics;
resume.education = education;
resume.skills = skills;
resume.experience = experience;
resume.projects = projects;
resume.research = research;
resume.leadership = leadership;
validateStructuredResume(resume);
assert(resume.confidence.score > 0.7);

// --- LaTeX stripping: preamble/environments must not leak into resume text ---
const latexSample = `\\documentclass[letterpaper,11pt]{article}
\\usepackage[empty]{fullpage}
\\addtolength{\\oddsidemargin}{-0.5in}
% a comment
\\begin{document}
\\begin{center}
    \\textbf{\\Huge \\scshape Alex Rivera} \\\\ \\vspace{1pt}
    \\small (408) 555-0100 $|$ \\href{mailto:alex@rivera.dev}{\\underline{alex@rivera.dev}} $|$ \\href{https://linkedin.com/in/alexr}{\\underline{linkedin.com/in/alexr}}
\\end{center}
\\section{Experience}
\\resumeSubHeadingListStart
    \\resumeSubheading{Software Engineer Intern}{May 2025 - Aug 2025}{CloudWorks}{San Francisco, CA}
\\resumeItemListStart
    \\resumeItem{Built data ingestion pipeline processing 2M events daily}
    \\resumeItem{Cut costs by 35\\% and saved \\$500k annually}
\\resumeItemListEnd
\\resumeSubHeadingListEnd
\\end{document}`;

const stripped = stripLatex(latexSample);
assert(!/article|usepackage|documentclass|oddsidemargin|itemize/.test(stripped), "preamble must be removed");
assert(!/a comment/.test(stripped), "comments must be removed");
assert(stripped.includes("Alex Rivera"));
assert(stripped.includes("alex@rivera.dev"));
assert(/•\s+Built data ingestion pipeline processing 2M events daily/.test(stripped), "resumeItem must become a bullet");
assert(/Cut costs by 35% and saved \$500k annually/.test(stripped), "\\% and \\$ must unescape, not truncate as comments");

const latexLines = normalizeTextLines(stripped);
const latexSections = splitIntoSections(latexLines);
const latexBasics = parseHeader(latexSections.header || []);
assert.strictEqual(latexBasics.name, "Alex Rivera", "name must come from document content, not LaTeX noise");
assert.strictEqual(latexBasics.email, "alex@rivera.dev");
const latexExperience = parseExperienceLike(latexSections.experience || [], "experience");
assert.strictEqual(latexExperience.length, 1);
assert(latexExperience[0].bullets[0].includes("data ingestion"));

// --- full round trip: the app's own LaTeX export must parse back losslessly ---
// (this is what the editable-LaTeX panel relies on)
const roundtripResume = {
    basics: { name: "Jane Candidate", headline: "", phone: "(555) 111-2222", email: "jane@example.com", linkedin: "linkedin.com/in/jane", github: "github.com/jane", portfolio: "" },
    education: [{ school: "State University", degree: "B.S. Computer Science", location: "San Jose, CA", dates: "Aug 2023 - May 2027" }],
    experience: [
        { title: "Software Engineer Intern", company: "CloudWorks", location: "San Francisco, CA", dates: "May 2025 – Aug 2025", bullets: ["Built data pipeline processing 2M events daily", "Cut costs by 35% and saved $500k annually"] },
        { title: "Engineering Intern", company: "UL Solutions", location: "Fremont, CA", dates: "May 2026 - Present", bullets: ["Executed automated compliance suites"] },
    ],
    projects: [{ name: "Gitlytics", technologies: ["Python", "Flask"], dates: "2024", bullets: ["Built REST API"] }],
    research: [],
    leadership: [{ title: "President", company: "Computing Club", location: "San Jose, CA", dates: "2024 - 2025", bullets: ["Led weekly workshops"] }],
    skills: [
        { category: "Languages", items: ["Python", "TypeScript"] },
        { category: "Frameworks", items: ["React", "Node.js"] },
    ],
};

const roundtripLatex = generateStructuredLatex(roundtripResume);
const rt = parseLatexSource(roundtripLatex).structuredResume;

assert.strictEqual(rt.basics.name, "Jane Candidate");
assert.strictEqual(rt.basics.email, "jane@example.com");
assert.strictEqual(rt.basics.phone, "(555) 111-2222");
assert.strictEqual(rt.basics.linkedin, "linkedin.com/in/jane");
assert.strictEqual(rt.education.length, 1);
assert.strictEqual(rt.education[0].school, "State University");
assert.strictEqual(rt.education[0].degree, "B.S. Computer Science");
assert.strictEqual(rt.education[0].location, "San Jose, CA");
assert.strictEqual(rt.education[0].dates, "Aug 2023 - May 2027");
assert.strictEqual(rt.experience.length, 2);
assert.strictEqual(rt.experience[0].title, "Software Engineer Intern");
assert.strictEqual(rt.experience[0].company, "CloudWorks");
assert.strictEqual(rt.experience[0].location, "San Francisco, CA");
assert.strictEqual(rt.experience[0].dates, "May 2025 – Aug 2025", "en-dash dates must survive the LaTeX '--' round trip");
assert.strictEqual(JSON.stringify(rt.experience[0].bullets), JSON.stringify(roundtripResume.experience[0].bullets), "bullets (incl. % and $) must survive the round trip");
assert.strictEqual(rt.experience[1].company, "UL Solutions");
assert.strictEqual(rt.projects.length, 1);
assert.strictEqual(rt.projects[0].name, "Gitlytics");
assert.strictEqual(JSON.stringify(rt.projects[0].technologies), JSON.stringify(["Python", "Flask"]));
assert.strictEqual(rt.projects[0].dates, "2024");
assert.strictEqual(rt.leadership.length, 1);
assert.strictEqual(rt.leadership[0].title, "President");
assert.strictEqual(rt.leadership[0].company, "Computing Club");
assert.strictEqual(rt.leadership[0].dates, "2024 - 2025");
assert.strictEqual(rt.skills.length, 2);
assert.strictEqual(rt.skills[0].category, "Languages");
assert.strictEqual(JSON.stringify(rt.skills[0].items), JSON.stringify(["Python", "TypeScript"]));
assert.strictEqual(rt.skills[1].category, "Frameworks");

// --- fuzzy section auto-detection ---
assert.strictEqual(getSectionKey("SELECTED SOFTWARE PROJECTS"), "projects");
assert.strictEqual(getSectionKey("Academic Projects"), "projects");
assert.strictEqual(getSectionKey("PROJECT EXPERIENCE"), "projects");
assert.strictEqual(getSectionKey("Notable Software Projects"), "projects");
assert.strictEqual(getSectionKey("WORK HISTORY"), "experience");
assert.strictEqual(getSectionKey("EXPERIENCE:"), "experience");
assert.strictEqual(getSectionKey("Relevant Experience"), "experience");
assert.strictEqual(getSectionKey("VOLUNTEER EXPERIENCE"), "leadership");
assert.strictEqual(getSectionKey("Extracurricular Activities"), "leadership");
assert.strictEqual(getSectionKey("HONORS & AWARDS"), "awards");
assert.strictEqual(getSectionKey("CORE COMPETENCIES"), "skills");
assert.strictEqual(getSectionKey("RESEARCH PROJECTS"), "research");
assert.strictEqual(getSectionKey("Academic Background"), "education");
// Guards: sentence-like lines and data rows must never split sections
assert.strictEqual(getSectionKey("Experience with Python and SQL"), null);
assert.strictEqual(getSectionKey("Managed multiple projects across teams"), null);
assert.strictEqual(getSectionKey("Technologies: AWS, Docker"), null);
assert.strictEqual(getSectionKey("Resume Parser | JavaScript, PDF.js"), null);
assert.strictEqual(getSectionKey("TANMAY MAKA"), null);

// --- real-world projects section: non-standard heading + wrapped tech lists ---
const realWorldSample = `
Tanmay Maka
(555) 000-1111 | tanmay@example.com | linkedin.com/in/tanmay
EDUCATION
Minerva University | San Francisco, CA
B.S. Computational Sciences Expected May 2027
SELECTED SOFTWARE PROJECTS
NarutoVerse AI Suite – Scalable LLM-Powered Media Analysis & Character Simulation Framework | Python, NLP,
LLMs, Gradio
• Engineered a domain-agnostic NLP pipeline for thematic analysis, entity extraction, and character-aware chat using BART-MNLI,
spaCy, DistilBERT, LoRA-tuned Llama-3-8B, and a Gradio UI.
• Designed a modular workflow that combines analysis and interactive simulation components, demonstrating applied AI, backend
orchestration, and user-facing interface development.
JobDiary – Full-Stack GraphQL Job Tracker | React, Apollo Client, Spring Boot Reactive, GraphQL, PostgreSQL, Docker
Compose
• Built a full-stack job-tracking platform enabling real-time updates, profile management, and scalable API-first workflows for
streamlined job search management.
• Implemented a modern React frontend integrated with GraphQL APIs and PostgreSQL-backed services, packaged through Docker
Compose for reproducible local deployment.
VOLUNTEER EXPERIENCE
Community Instructor 2023 - 2024
Code Club | San Jose, CA
• Taught weekly classes
`;

const realLines = normalizeTextLines(realWorldSample);
const realSections = splitIntoSections(realLines);
assert(realSections.projects, "SELECTED SOFTWARE PROJECTS must be detected as the projects section");
assert(realSections.leadership, "VOLUNTEER EXPERIENCE must be detected as leadership");

const realProjects = parseExperienceLike(realSections.projects, "projects");
assert.strictEqual(realProjects.length, 2, "both projects must be caught");
assert(realProjects[0].name.startsWith("NarutoVerse AI Suite"), "project name must be preserved");
assert.strictEqual(
    JSON.stringify(realProjects[0].technologies),
    JSON.stringify(["Python", "NLP", "LLMs", "Gradio"]),
    "wrapped tech list (trailing comma) must merge into the header"
);
assert.strictEqual(realProjects[0].bullets.length, 2, "wrapped bullets must merge, not become extra entries");
assert(realProjects[0].bullets[0].includes("spaCy, DistilBERT"), "bullet continuation lines must merge into the bullet");
assert(realProjects[0].bullets[1].endsWith("interface development."));
assert(realProjects[1].name.startsWith("JobDiary"));
assert(
    realProjects[1].technologies.includes("Docker Compose"),
    "wrapped tech list (single word) must merge into the header"
);
assert.strictEqual(realProjects[1].bullets.length, 2);
assert(realProjects[1].bullets[0].endsWith("streamlined job search management."));
assert(realProjects[1].bullets[1].includes("Docker Compose for reproducible local deployment."));

const realLeadership = parseExperienceLike(realSections.leadership, "leadership");
assert.strictEqual(realLeadership.length, 1);
assert.strictEqual(realLeadership[0].title, "Community Instructor");
assert.strictEqual(realLeadership[0].dates, "2023 - 2024");

// --- pasted-text import shares the upload pipeline ---
const pasted = parsePastedResumeText(sample);
assert.strictEqual(pasted.structuredResume.basics.name, "Jane Candidate");
assert.strictEqual(pasted.structuredResume.experience.length, 2);
assert.strictEqual(pasted.originalPreview.kind, "text");
assert(pasted.rawText.includes("SAR compliance"));
assert.throws(() => parsePastedResumeText("   "), /Paste some resume text/);

// --- LinkedIn "Save profile to PDF" preset ---
const { isLinkedInExport, transformLinkedInProfile, parseResumeLines } = context.parserTestApi;

assert.strictEqual(
    isLinkedInExport(normalizeTextLines("Jane Doe\nwww.linkedin.com/in/jane\nPage 1 of 2")),
    true
);
assert.strictEqual(
    isLinkedInExport(normalizeTextLines("Jane Doe\nlinkedin.com/in/jane\nExperience")),
    false,
    "a plain resume that mentions a LinkedIn URL is not a LinkedIn export"
);

const linkedInSidebar = [
    "Contact",
    "jane@example.com",
    "www.linkedin.com/in/janedoe (LinkedIn)",
    "Top Skills",
    "Python",
    "SQL",
    "Data Analysis",
    "Languages",
    "English (Native or Bilingual)",
    "Honors-Awards",
    "Dean's List 2019",
    "Hackathon Winner",
];
const linkedInMain = [
    "Jane Doe",
    "Data Engineer at Acme",
    "San Francisco, California, United States",
    "Summary",
    "I build data pipelines and dashboards.",
    "Experience",
    "Acme Corp",
    "3 years 2 months",
    "Senior Data Engineer",
    "January 2023 - Present (1 year 6 months)",
    "San Francisco, California, United States",
    "Built the ingestion platform processing 2B events daily.",
    "Data Engineer",
    "May 2021 - December 2022 (1 year 8 months)",
    "Migrated the warehouse to BigQuery.",
    "Beta Analytics",
    "Data Analyst",
    "June 2019 - April 2021 (1 year 11 months)",
    "New York, New York, United States",
    "Automated weekly reporting.",
    "Education",
    "State University",
    "Bachelor's degree, Computer Science · (2015 - 2019)",
    "Page 2 of 2",
];

const linkedInLines = transformLinkedInProfile(linkedInSidebar, linkedInMain);
const linkedInParsed = parseResumeLines(normalizeTextLines(linkedInLines.join("\n"))).structuredResume;

assert.strictEqual(linkedInParsed.basics.name, "Jane Doe");
assert.strictEqual(linkedInParsed.basics.email, "jane@example.com");
assert(linkedInParsed.basics.linkedin.includes("linkedin.com/in/janedoe"));
assert.strictEqual(linkedInParsed.experience.length, 3, "two Acme roles + one Beta role");
assert.strictEqual(linkedInParsed.experience[0].title, "Senior Data Engineer");
assert.strictEqual(linkedInParsed.experience[0].company, "Acme Corp");
assert.strictEqual(linkedInParsed.experience[0].dates, "January 2023 - Present");
assert.strictEqual(linkedInParsed.experience[1].title, "Data Engineer");
assert.strictEqual(linkedInParsed.experience[1].company, "Acme Corp", "second role inherits the company");
assert.strictEqual(linkedInParsed.experience[2].company, "Beta Analytics");
assert.strictEqual(linkedInParsed.experience[2].bullets.length, 1);
assert.strictEqual(linkedInParsed.education.length, 1);
assert.strictEqual(linkedInParsed.education[0].school, "State University");
assert(linkedInParsed.education[0].degree.includes("Computer Science"));
assert.strictEqual(linkedInParsed.education[0].dates, "2015 - 2019");
const skillCategories = linkedInParsed.skills.map((skill) => skill.category);
assert(skillCategories.includes("Top Skills"));
assert(skillCategories.includes("Languages"));
assert.strictEqual(linkedInParsed.leadership.length, 1, "honors become a leadership bullet entry");
assert.strictEqual(linkedInParsed.leadership[0].bullets.length, 2);

console.log("parser tests passed");
