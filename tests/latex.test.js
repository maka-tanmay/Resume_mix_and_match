const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const latexSource = fs.readFileSync(path.join(__dirname, "../js/latex.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(`${latexSource}
globalThis.latexTestApi = { escapeLatex, sanitizeLatexText, generateStructuredLatex, generateStandaloneHtml, escapeHtml };`, context);

const { escapeLatex, sanitizeLatexText, generateStructuredLatex, generateStandaloneHtml, escapeHtml } = context.latexTestApi;

// --- escaping ---
assert.strictEqual(escapeLatex("100% & $5 #1_a"), "100\\% \\& \\$5 \\#1\\_a");
assert.strictEqual(escapeLatex("a\\b"), "a\\textbackslash{}b");
assert.strictEqual(escapeLatex("{x}"), "\\{x\\}");
assert.strictEqual(escapeLatex("a^b~c"), "a\\textasciicircum{}b\\textasciitilde{}c");
assert.strictEqual(escapeLatex(""), "");
assert.strictEqual(escapeLatex(null), "");

// --- unicode sanitization (PDF extraction artifacts must not reach pdflatex) ---
assert.strictEqual(sanitizeLatexText("“quoted” ‘single’"), "``quoted'' `single'");
assert.strictEqual(sanitizeLatexText("Jan 2021 – Present"), "Jan 2021 -- Present");
assert.strictEqual(sanitizeLatexText("em—dash"), "em---dash");
assert.strictEqual(sanitizeLatexText("eﬃcient oﬀer ﬁle ﬂow"), "efficient offer file flow");
assert.strictEqual(sanitizeLatexText("a b c"), "a b c");
assert.strictEqual(sanitizeLatexText("x • y"), "x - y");

assert.strictEqual(escapeHtml("<b>&\"'"), "&lt;b&gt;&amp;&quot;&#039;");

// --- full document (Jake's Resume template) ---
const resume = {
    basics: { name: "Jane & Co", email: "jane@example.com", phone: "555-111-2222", linkedin: "linkedin.com/in/jane_doe", github: "github.com/jane", portfolio: "" },
    education: [{ school: "State University", location: "San Jose, CA", degree: "B.S. CS", dates: "2027" }],
    skills: [{ category: "Languages", items: ["Python", "C++"] }, { category: "Tools", items: ["Git", "Docker"] }],
    experience: [
        { title: "Engineer", company: "Acme 100%", location: "Remote", dates: "2024 – 2025", bullets: ["Cut costs by 50%", "Shipped “v2”"] },
        { title: "Intern", company: "NoBullets Inc", location: "", dates: "2023", bullets: [] },
    ],
    projects: [{ name: "Gitlytics", technologies: ["Python", "Flask"], dates: "2024", bullets: ["Built REST API"] }],
    research: [],
    leadership: [],
};

const latex = generateStructuredLatex(resume);

// Template fidelity
assert(latex.includes("\\documentclass[letterpaper,11pt]{article}"));
assert(latex.includes("\\input{glyphtounicode}"));
assert(latex.includes("\\pdfgentounicode=1"));
assert(latex.includes("\\begin{document}"));
assert(latex.includes("\\end{document}"));
assert(latex.includes("\\resumeProjectHeading{\\textbf{Gitlytics} $|$ \\emph{Python, Flask}}{2024}"));
assert(latex.includes("\\href{mailto:jane@example.com}{\\underline{jane@example.com}}"));
assert(latex.includes("\\href{https://linkedin.com/in/jane_doe}{\\underline{linkedin.com/in/jane\\_doe}}"));

// Escaping and sanitization applied
assert(latex.includes("Jane \\& Co"));
assert(latex.includes("Acme 100\\%"));
assert(latex.includes("Cut costs by 50\\%"));
assert(latex.includes("2024 -- 2025"));
assert(latex.includes("Shipped ``v2''"));
assert(!latex.includes("\\textbackslash\\{"), "escapeLatex must not corrupt its own replacements");
assert(!/[–—“”‘’•]/.test(latex), "no raw smart punctuation may reach the .tex file");

// Compile-safety: an itemize without \item is a LaTeX error
assert(!/resumeItemListStart\s*\\resumeItemListEnd/.test(latex), "entries without bullets must not emit an empty itemize");

// Balanced environments
const count = (pattern) => (latex.match(pattern) || []).length;
assert.strictEqual(count(/\\resumeSubHeadingListStart/g) - 1, count(/\\resumeSubHeadingListEnd/g) - 1); // -1 for the \newcommand definitions
assert.strictEqual(count(/\\resumeItemListStart/g), count(/\\resumeItemListEnd/g));
assert.strictEqual(count(/\\begin\{document\}/g), count(/\\end\{document\}/g));

// Empty sections are omitted entirely
assert(!latex.includes("\\section{Research}"));
assert(!latex.includes("\\section{Leadership}"));

// Section order matches Jake's template (skills last)
const orderOf = (needle) => latex.indexOf(needle);
assert(orderOf("\\section{Education}") < orderOf("\\section{Experience}"));
assert(orderOf("\\section{Experience}") < orderOf("\\section{Projects}"));
assert(orderOf("\\section{Projects}") < orderOf("\\section{Technical Skills}"));

// --- HTML export mirrors the template ---
const html = generateStandaloneHtml(resume);
assert(html.includes("<!DOCTYPE html>"));
assert(html.includes("CMU Serif"));
assert(html.includes("small-caps"));
assert(html.includes("Jane &amp; Co"));
assert(html.includes("Cut costs by 50%"));
assert(html.indexOf("<h2>Experience</h2>") < html.indexOf("<h2>Technical Skills</h2>"));

console.log("latex tests passed");
