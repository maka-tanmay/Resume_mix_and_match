const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const parserSource = fs.readFileSync(path.join(__dirname, "../js/resumeParser.js"), "utf8");
const context = {
    window: {},
    defaultPersonalInfo: {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "(555) 123-4567",
        linkedin: "linkedin.com/in/janedoe",
    },
};

vm.createContext(context);
vm.runInContext(`${parserSource}
globalThis.parserTestApi = {
  normalizeTextLines,
  splitIntoSections,
  parseHeader,
  parseEducation,
  parseSkills,
  parseExperienceLike,
  validateStructuredResume,
  emptyStructuredResume
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
assert.strictEqual(education.length, 1);
assert.strictEqual(skills.length, 2);
assert.strictEqual(experience.length, 2);
assert.strictEqual(projects.length, 1);
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

console.log("parser tests passed");
