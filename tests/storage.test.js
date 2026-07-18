const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const read = (relativePath) => fs.readFileSync(path.join(__dirname, relativePath), "utf8");
const json = (value) => JSON.stringify(value);
const quietConsole = { ...console, warn: () => {} };

const createLocalStorageStub = ({ failOnSet = false } = {}) => {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => {
            if (failOnSet) {
                throw new Error("QuotaExceededError (stub)");
            }
            store.set(key, String(value));
        },
        removeItem: (key) => {
            store.delete(key);
        },
    };
};

// storage.js depends on data.js (sample content) and latex.js (generators +
// RESUME_SECTION_KEYS), mirroring the script order in index.html.
const buildContext = (localStorageStub) => {
    const context = {
        window: {},
        console: quietConsole,
        localStorage: localStorageStub,
        Date,
        JSON,
    };
    vm.createContext(context);
    vm.runInContext(read("../js/data.js"), context);
    vm.runInContext(read("../js/latex.js"), context);
    vm.runInContext(`${read("../js/storage.js")}
globalThis.storageTestApi = {
  loadResumeState,
  saveResumeState,
  clearResumeState,
  isLocalModeEnabled,
  setLocalModeEnabled,
  createEmptyLibrary,
  createLibraryFromStructuredResume,
  mergeLibraries,
  libraryToStructuredResume,
  migrateResumeState,
  createResumeStateFromSample,
  normalizeSectionOrder,
  fillEmptyPersonalInfo,
  buildResumeStateProjections,
  isFlaggedItem,
  createParseStats,
  convertItemForSection,
  PARSE_REVIEW_THRESHOLD,
};`, context);
    return context.storageTestApi;
};

const api = buildContext(createLocalStorageStub());
const DEFAULT_ORDER = ["education", "experience", "projects", "research", "leadership", "skills"];

// --- sample state (v2 library model) ---
const sample = api.createResumeStateFromSample();
assert.strictEqual(sample.version, 2);
assert.strictEqual(sample.personalInfo.name, "Jane Doe");
assert.strictEqual(sample.library.experience.length, 5);
assert.strictEqual(sample.library.education.length, 1);
assert.strictEqual(sample.library.projects.length, 1);
assert.strictEqual(sample.library.skills.length, 2);
const includedExperience = sample.library.experience.filter((item) => item.included).length;
assert.strictEqual(sample.structuredResume.experience.length, includedExperience);
assert.strictEqual(sample.structuredResume.education.length, 1);
assert.strictEqual(json(sample.sectionOrder), json(DEFAULT_ORDER));
assert(sample.generatedLatex.includes("\\begin{document}"));
assert(sample.generatedLatex.includes("TechNova Solutions"));
assert(sample.generatedHtml.includes("Jane Doe"));

// --- parsed resume -> library items (used by upload, import-merge, latex apply) ---
const parsedStructuredResume = {
    basics: {},
    education: [{ school: "State U", degree: "BS", location: "", dates: "2020" }],
    skills: [{ category: "Languages", items: ["Go"] }],
    experience: [{ title: "Engineer", company: "Acme", location: "SF", dates: "2024", bullets: ["Did a thing", "Did more"] }],
    projects: [{ name: "Tool", technologies: ["Rust"], dates: "2023", bullets: [] }],
    research: [],
    leadership: [],
};
const importedLibrary = api.createLibraryFromStructuredResume(parsedStructuredResume, "resume-b.pdf");
assert.strictEqual(importedLibrary.experience.length, 1);
assert.strictEqual(importedLibrary.experience[0].source, "resume-b.pdf");
assert.strictEqual(importedLibrary.experience[0].included, true);
assert.strictEqual(importedLibrary.experience[0].variants.length, 1);
assert.strictEqual(importedLibrary.experience[0].variants[0].bullets, "Did a thing\nDid more");
assert.strictEqual(importedLibrary.projects[0].name, "Tool");

const merged = api.mergeLibraries(sample.library, importedLibrary);
assert.strictEqual(merged.experience.length, 6, "import must append, not replace");
assert.strictEqual(merged.education.length, 2);
assert.strictEqual(merged.skills.length, 3);

// --- projection honors included flags, selected variant, and section order ---
const projectionLibrary = api.createEmptyLibrary();
projectionLibrary.experience = [
    {
        id: "e1", title: "A", company: "CoA", location: "", dates: "2020", included: true,
        selectedVariantId: "v2",
        variants: [
            { id: "v1", label: "One", bullets: "first" },
            { id: "v2", label: "Two", bullets: "second line\nanother" },
        ],
    },
    {
        id: "e2", title: "B", company: "CoB", location: "", dates: "2021", included: false,
        selectedVariantId: "v1",
        variants: [{ id: "v1", label: "One", bullets: "hidden" }],
    },
];
projectionLibrary.skills = [{ id: "s1", category: "Tools", items: ["Git"], included: true }];

const projected = api.libraryToStructuredResume(
    { name: "P", email: "p@x.co", phone: "", linkedin: "", github: "gh", portfolio: "" },
    projectionLibrary,
    ["skills", "experience"]
);
assert.strictEqual(projected.experience.length, 1, "excluded items must not be exported");
assert.strictEqual(json(projected.experience[0].bullets), json(["Second line", "Another"]), "active variant supplies the bullets (sentence-capitalized)");
assert.strictEqual(projected.basics.github, "gh");
assert.strictEqual(json(projected.sectionOrder), json(["skills", "experience", "education", "projects", "research", "leadership"]));

const projectedState = api.buildResumeStateProjections({
    personalInfo: { name: "P" },
    library: projectionLibrary,
    sectionOrder: ["skills", "experience"],
});
assert(
    projectedState.generatedLatex.indexOf("\\section{Technical Skills}") < projectedState.generatedLatex.indexOf("\\section{Experience}"),
    "generated LaTeX must honor the section order"
);

// --- migration from the pre-library state shape ---
const legacyState = {
    personalInfo: { name: "Old Name", email: "old@x.co", phone: "1", linkedin: "li" },
    jobs: [
        {
            id: "job-1", company: "Acme", title: "Engineer", duration: "2020 - 2021", included: true,
            selectedVariantId: "v2",
            variants: [
                { id: "v1", label: "A", bullets: "a1" },
                { id: "v2", label: "B", bullets: "b1\nb2" },
            ],
        },
        {
            id: "job-2", company: "Beta", title: "Analyst", duration: "2019", included: false,
            selectedVariantId: "v1",
            variants: [{ id: "v1", label: "A", bullets: "x" }],
        },
    ],
    structuredResume: {
        basics: { name: "Old Name", github: "github.com/old" },
        education: [{ school: "State U", degree: "BS", location: "SJ", dates: "2018" }],
        skills: [{ category: "Languages", items: ["Python"] }],
        experience: [{ title: "ignored - jobs win", company: "", bullets: [] }],
        projects: [],
        research: [],
        leadership: [],
    },
    originalPreview: { kind: "text", text: "raw" },
    sourceFile: { name: "old.pdf" },
};

const migrated = api.migrateResumeState(legacyState);
assert.strictEqual(migrated.version, 2);
assert.strictEqual(migrated.library.experience.length, 2, "jobs must become experience items");
assert.strictEqual(migrated.library.experience[0].variants.length, 2, "variants must be preserved");
assert.strictEqual(migrated.library.experience[0].selectedVariantId, "v2");
assert.strictEqual(migrated.library.experience[0].dates, "2020 - 2021");
assert.strictEqual(migrated.library.experience[1].included, false);
assert.strictEqual(migrated.library.education.length, 1);
assert.strictEqual(migrated.library.skills.length, 1);
assert.strictEqual(migrated.personalInfo.github, "github.com/old", "github must be lifted from stored basics");
assert.strictEqual(migrated.structuredResume.experience.length, 1, "projection includes only included items");
assert.strictEqual(migrated.jobs, undefined, "legacy jobs key must be dropped");
assert.strictEqual(migrated.originalPreview.kind, "text", "upload artifacts must survive migration");
assert.strictEqual(json(api.migrateResumeState(migrated).sectionOrder), json(DEFAULT_ORDER), "v2 states pass through");

// --- export polish: consistent bullets, normalized dates, deduped skills ---
const polishLibrary = api.createEmptyLibrary();
polishLibrary.experience = [{
    id: "px", title: "Dev", company: "Co", location: "", dates: "Jan 2021-present", included: true,
    selectedVariantId: "v1",
    variants: [{ id: "v1", label: "D", bullets: "shipped the roadmap ahead of schedule.\nreduced costs by 20%.\niOS build pipeline hardening" }],
}];
polishLibrary.skills = [{ id: "sx", category: "Languages", items: ["Python", "python ", "Go", ""], included: true }];
const polishedResume = api.libraryToStructuredResume({ name: "X" }, polishLibrary, undefined);
assert.strictEqual(polishedResume.experience[0].dates, "Jan 2021 – Present", "dates must normalize to 'Mon YYYY – Mon YYYY'");
assert.strictEqual(
    json(polishedResume.experience[0].bullets),
    json(["Shipped the roadmap ahead of schedule.", "Reduced costs by 20%.", "iOS build pipeline hardening."]),
    "bullets must be capitalized (brand casing kept) with consistent periods"
);
assert.strictEqual(json(polishedResume.skills[0].items), json(["Python", "Go"]), "skill items must be trimmed and deduped");

// Majority without periods -> stray periods are stripped instead
const stripLibrary = api.createEmptyLibrary();
stripLibrary.experience = [{
    id: "sx2", title: "Dev", company: "Co", location: "", dates: "2020", included: true,
    selectedVariantId: "v1",
    variants: [{ id: "v1", label: "D", bullets: "Did a thing\nDid another thing\nEnded with a period." }],
}];
const strippedResume = api.libraryToStructuredResume({ name: "X" }, stripLibrary, undefined);
assert.strictEqual(json(strippedResume.experience[0].bullets), json(["Did a thing", "Did another thing", "Ended with a period"]));

// --- parse review: confidence flags, stats, section moves (PRD P0.5) ---
const confidentSR = {
    basics: {},
    education: [],
    skills: [],
    experience: [
        { title: "Solid", company: "Co", location: "", dates: "2024", bullets: ["Did"], confidence: 0.8 },
        { title: "Shaky", company: "", location: "", dates: "", bullets: [], confidence: 0.5 },
    ],
    projects: [], research: [], leadership: [],
};
const flaggedLibrary = api.createLibraryFromStructuredResume(confidentSR, "review.pdf");
assert.strictEqual(flaggedLibrary.experience[0].confidence, 0.8, "confidence must ride into library items");
assert.strictEqual(api.isFlaggedItem(flaggedLibrary.experience[0]), false);
assert.strictEqual(api.isFlaggedItem(flaggedLibrary.experience[1]), true, "low-confidence items must be flagged");
assert.strictEqual(api.isFlaggedItem({ title: "manual" }), false, "items without confidence are never flagged");

const stats = api.createParseStats(flaggedLibrary, "review.pdf");
assert.strictEqual(stats.itemCount, 2);
assert.strictEqual(stats.flaggedCount, 1);
assert.strictEqual(stats.source, "review.pdf");
assert.strictEqual(stats.reviewedAt, null);

const expItem = { id: "x1", title: "Built A Thing", company: "Club", location: "NY", dates: "2024", included: true, source: "s", confidence: 0.5, selectedVariantId: "v1", variants: [{ id: "v1", label: "P", bullets: "b" }] };
const asProject = api.convertItemForSection(expItem, "experience", "projects");
assert.strictEqual(asProject.name, "Built A Thing", "title maps to project name");
assert.strictEqual(json(asProject.technologies), json([]));
assert.strictEqual(asProject.variants[0].bullets, "b", "variants survive the move");
const backToExp = api.convertItemForSection(asProject, "projects", "leadership");
assert.strictEqual(backToExp.title, "Built A Thing", "project name maps back to title");
assert.strictEqual(backToExp.company, "");
assert.strictEqual(api.convertItemForSection(expItem, "experience", "education"), null, "education is not a valid move target");
const passthrough = api.convertItemForSection(expItem, "experience", "research");
assert.strictEqual(passthrough.company, "Club", "same-shape moves keep the organization");

// --- helpers ---
assert.strictEqual(json(api.normalizeSectionOrder(["skills", "bogus"])), json(["skills", "education", "experience", "projects", "research", "leadership"]));
const filled = api.fillEmptyPersonalInfo(
    { name: "Keep", email: "", phone: "", linkedin: "", github: "", portfolio: "" },
    { name: "Other", email: "e@x.co" }
);
assert.strictEqual(filled.name, "Keep", "existing values must not be overwritten");
assert.strictEqual(filled.email, "e@x.co", "empty values must be filled");

// --- local persistence round trip ---
assert.strictEqual(api.isLocalModeEnabled(), false);
api.setLocalModeEnabled(true);
assert.strictEqual(api.isLocalModeEnabled(), true);
api.setLocalModeEnabled(false);
assert.strictEqual(api.isLocalModeEnabled(), false);

assert.strictEqual(api.saveResumeState({ a: 1 }, "user-1"), true);
assert.strictEqual(json(api.loadResumeState("user-1")), json({ a: 1 }));
assert.strictEqual(api.loadResumeState("user-2"), null, "states must be scoped per user");
api.clearResumeState("user-1");
assert.strictEqual(api.loadResumeState("user-1"), null);

// --- quota failures must not throw (large PDF data URLs can exceed quota) ---
const failingApi = buildContext(createLocalStorageStub({ failOnSet: true }));
assert.strictEqual(failingApi.saveResumeState({ big: "state" }, "user-1"), false);
assert.doesNotThrow(() => failingApi.setLocalModeEnabled(true));

console.log("storage tests passed");
