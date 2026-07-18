const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const read = (relativePath) => fs.readFileSync(path.join(__dirname, relativePath), "utf8");

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(read("../js/latex.js"), context);
vm.runInContext(read("../js/templates/registry.js"), context);
["jakes", "classic", "modern", "ats-strict", "two-column"].forEach((id) => {
    vm.runInContext(read(`../js/templates/${id}.js`), context);
});
vm.runInContext(`globalThis.templatesTestApi = { RESUME_TEMPLATES, getResumeTemplate, listResumeTemplates, DEFAULT_TEMPLATE_ID };`, context);

const { RESUME_TEMPLATES, getResumeTemplate, listResumeTemplates, DEFAULT_TEMPLATE_ID } = context.templatesTestApi;

const fixture = {
    basics: { name: "Jane & Doe", headline: "", phone: "(555) 111-2222", email: "jane@example.com", linkedin: "linkedin.com/in/jane", github: "github.com/jane", portfolio: "" },
    education: [{ school: "State University", degree: "B.S. Computer Science", location: "San Jose, CA", dates: "Aug 2016 – May 2020" }],
    experience: [{ title: "Engineer <b>", company: "Acme", location: "SF", dates: "2024 – Present", bullets: ["Did 40% more with <script> tags escaped."] }],
    projects: [{ name: "Tool", technologies: ["React", "Go"], dates: "2023", bullets: ["Built it."] }],
    research: [],
    leadership: [{ title: "President", company: "Club", location: "", dates: "2022", bullets: ["Led things."] }],
    skills: [{ category: "Languages", items: ["Python", "SQL"] }],
    sectionOrder: ["education", "experience", "projects", "research", "leadership", "skills"],
    customSections: [],
};

// Every selector in a template's CSS must be scoped under .tpl-<id> so
// templates cannot leak styles into the app or each other.
const assertScopedCss = (css, scope, templateId) => {
    const withoutMediaPrelude = css.replace(/@media[^{]*\{/g, "");
    withoutMediaPrelude.split("}").forEach((chunk) => {
        const selectorPart = chunk.split("{")[0].trim();
        if (!selectorPart) return;
        selectorPart.split(",").forEach((selector) => {
            const cleaned = selector.trim();
            if (!cleaned) return;
            assert(cleaned.includes(scope), `unscoped CSS selector "${cleaned}" in template "${templateId}"`);
        });
    });
};

// --- registry behavior ---
const all = listResumeTemplates();
assert.strictEqual(all.length, 5, "all five templates must register");
assert.strictEqual(getResumeTemplate("does-not-exist").id, DEFAULT_TEMPLATE_ID, "unknown ids fall back to the default template");
assert(RESUME_TEMPLATES[DEFAULT_TEMPLATE_ID], "default template must exist");

// --- per-template contract (PRD.md section 5) ---
all.forEach((template) => {
    assert(template.name, `${template.id}: name required`);
    assert(["A", "B", "C"].includes(template.atsRating), `${template.id}: atsRating must be A/B/C`);

    const html = template.renderHtml(fixture);
    assert(typeof html === "string" && html.trim().startsWith("<main"), `${template.id}: renderHtml must return <main> markup`);
    assert(html.includes("Jane &amp; Doe"), `${template.id}: values must be HTML-escaped`);
    assert(!html.includes("<script>"), `${template.id}: unescaped user input must never reach the markup`);
    assert(html.includes("State University"), `${template.id}: education content must render`);
    assert(!/Research/i.test(html), `${template.id}: empty sections must be omitted`);
    assert(html.includes("President"), `${template.id}: leadership content must render`);
    assert(html.includes("Python"), `${template.id}: skills content must render`);

    assertScopedCss(template.previewCss, `.tpl-${template.id}`, template.id);
    assert(/@media print/.test(template.previewCss), `${template.id}: print rules required`);
});

// --- Jake's is the only LaTeX round-trip template for now ---
const jakes = RESUME_TEMPLATES.jakes;
assert(typeof jakes.renderLatex === "function", "jakes must provide renderLatex");
assert(jakes.renderLatex(fixture).includes("\\begin{document}"));
listResumeTemplates().filter((t) => t.id !== "jakes").forEach((t) => {
    assert(!t.renderLatex, `${t.id}: renderLatex must be null until a round trip exists (PRD constraint 6)`);
});

console.log("templates tests passed");
