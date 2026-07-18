const STORAGE_KEY = "resume_mix_match_state";
const LOCAL_MODE_KEY = "resume_mix_match_local_mode";
const RESUME_STATE_VERSION = 2;

const getResumeStorageKey = (userId) => (userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY);

const loadResumeState = (userId) => {
    try {
        return JSON.parse(localStorage.getItem(getResumeStorageKey(userId)));
    } catch (error) {
        console.error("Error loading saved data:", error);
        return null;
    }
};

// Best-effort cache: large states (e.g. a PDF preview stored as a base64 data URL)
// can exceed the localStorage quota, and that must not abort the caller's save flow.
const saveResumeState = (state, userId) => {
    try {
        localStorage.setItem(getResumeStorageKey(userId), JSON.stringify(state));
        return true;
    } catch (error) {
        console.warn("Could not cache resume state locally:", error);
        return false;
    }
};

const clearResumeState = (userId) => {
    try {
        localStorage.removeItem(getResumeStorageKey(userId));
    } catch (error) {
        console.warn("Could not clear cached resume state:", error);
    }
};

const isLocalModeEnabled = () => {
    try {
        return localStorage.getItem(LOCAL_MODE_KEY) === "1";
    } catch (error) {
        return false;
    }
};

const setLocalModeEnabled = (enabled) => {
    try {
        if (enabled) {
            localStorage.setItem(LOCAL_MODE_KEY, "1");
        } else {
            localStorage.removeItem(LOCAL_MODE_KEY);
        }
    } catch (error) {
        console.warn("Could not persist local mode flag:", error);
    }
};

// ---------------------------------------------------------------------------
// v2 library model: every resume entry (a job, a project, a degree, a skills
// row) is an item in library[section] with { included, source } plus type-
// specific fields. Entry-like items carry wording variants; the active variant
// supplies the bullets. The structured resume rendered on the right is a pure
// projection of (personalInfo, library, sectionOrder).
// ---------------------------------------------------------------------------

const createItemId = (prefix) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyLibrary = () => ({
    education: [],
    experience: [],
    projects: [],
    research: [],
    leadership: [],
    skills: [],
});

const normalizeSectionOrder = (order) => {
    const requested = Array.isArray(order) ? order.filter((key) => RESUME_SECTION_KEYS.includes(key)) : [];
    return [...requested, ...RESUME_SECTION_KEYS.filter((key) => !requested.includes(key))];
};

const createVariantSet = (bullets, label = "Imported") => {
    const variantId = createItemId("var");
    return {
        selectedVariantId: variantId,
        variants: [
            {
                id: variantId,
                label,
                bullets: (bullets || []).join("\n"),
            },
        ],
    };
};

const activeVariantBullets = (item) => {
    const variants = item.variants || [];
    const active = variants.find((variant) => variant.id === item.selectedVariantId) || variants[0];
    return active ? active.bullets.split("\n").map((text) => text.trim()).filter(Boolean) : [];
};

const createLibraryFromStructuredResume = (structuredResume = {}, source = "import") => ({
    education: (structuredResume.education || []).map((entry) => ({
        id: createItemId("edu"),
        school: entry.school || "",
        degree: entry.degree || "",
        location: entry.location || "",
        dates: entry.dates || "",
        included: true,
        source,
    })),
    experience: (structuredResume.experience || []).map((entry) => ({
        id: createItemId("exp"),
        title: entry.title || "",
        company: entry.company || entry.organization || "",
        location: entry.location || "",
        dates: entry.dates || "",
        included: true,
        source,
        ...createVariantSet(entry.bullets),
    })),
    projects: (structuredResume.projects || []).map((entry) => ({
        id: createItemId("proj"),
        name: entry.name || "",
        technologies: entry.technologies || [],
        dates: entry.dates || "",
        included: true,
        source,
        ...createVariantSet(entry.bullets),
    })),
    research: (structuredResume.research || []).map((entry) => ({
        id: createItemId("res"),
        title: entry.title || "",
        company: entry.company || entry.organization || "",
        location: entry.location || "",
        dates: entry.dates || "",
        included: true,
        source,
        ...createVariantSet(entry.bullets),
    })),
    leadership: (structuredResume.leadership || []).map((entry) => ({
        id: createItemId("lead"),
        title: entry.title || "",
        company: entry.company || entry.organization || "",
        location: entry.location || "",
        dates: entry.dates || "",
        included: true,
        source,
        ...createVariantSet(entry.bullets),
    })),
    skills: (structuredResume.skills || []).map((entry) => ({
        id: createItemId("skill"),
        category: entry.category || "Skills",
        items: entry.items || [],
        included: true,
        source,
    })),
});

const mergeLibraries = (base, extra) =>
    Object.fromEntries(
        RESUME_SECTION_KEYS.map((key) => [key, [...(base?.[key] || []), ...(extra?.[key] || [])]])
    );

const fillEmptyPersonalInfo = (personalInfo, basics = {}) => {
    const filled = { ...personalInfo };
    ["name", "email", "phone", "linkedin", "github", "portfolio"].forEach((field) => {
        if (!filled[field] && basics[field]) filled[field] = basics[field];
    });
    return filled;
};

const libraryToStructuredResume = (personalInfo = {}, library = createEmptyLibrary(), sectionOrder) => {
    const included = (key) => (library[key] || []).filter((item) => item.included);
    const entryToStructured = (item) => ({
        title: item.title || "",
        company: item.company || "",
        location: item.location || "",
        dates: item.dates || "",
        bullets: activeVariantBullets(item),
    });

    return {
        basics: {
            name: personalInfo.name || "",
            headline: "",
            phone: personalInfo.phone || "",
            email: personalInfo.email || "",
            linkedin: personalInfo.linkedin || "",
            github: personalInfo.github || "",
            portfolio: personalInfo.portfolio || "",
        },
        education: included("education").map((item) => ({
            school: item.school || "",
            degree: item.degree || "",
            location: item.location || "",
            dates: item.dates || "",
        })),
        experience: included("experience").map(entryToStructured),
        projects: included("projects").map((item) => ({
            name: item.name || "",
            technologies: item.technologies || [],
            dates: item.dates || "",
            bullets: activeVariantBullets(item),
        })),
        research: included("research").map(entryToStructured),
        leadership: included("leadership").map(entryToStructured),
        skills: included("skills").map((item) => ({
            category: item.category || "Skills",
            items: item.items || [],
        })),
        customSections: [],
        sectionOrder: normalizeSectionOrder(sectionOrder),
    };
};

// Recomputes the derived fields (structuredResume + exports) from the library.
const buildResumeStateProjections = (state) => {
    const structuredResume = libraryToStructuredResume(state.personalInfo, state.library, state.sectionOrder);
    return {
        ...state,
        version: RESUME_STATE_VERSION,
        sectionOrder: structuredResume.sectionOrder,
        structuredResume,
        generatedLatex: generateStructuredLatex(structuredResume),
        generatedHtml: generateStructuredHtml(structuredResume),
    };
};

const createResumeStateFromUpload = (file, format, parsedResume) => {
    const basics = parsedResume.structuredResume.basics || {};
    return buildResumeStateProjections({
        personalInfo: fillEmptyPersonalInfo(
            { name: "", email: "", phone: "", linkedin: "", github: "", portfolio: "" },
            basics
        ),
        library: createLibraryFromStructuredResume(parsedResume.structuredResume, file.name),
        sectionOrder: normalizeSectionOrder(),
        rawText: parsedResume.rawText,
        rawLines: parsedResume.rawLines,
        sectionBoundaries: parsedResume.sectionBoundaries,
        originalPreview: parsedResume.originalPreview,
        sourceFile: {
            name: file.name,
            size: file.size,
            type: file.type || format,
            format,
            uploadedAt: new Date().toISOString(),
        },
    });
};

const createResumeStateFromSample = () =>
    buildResumeStateProjections({
        personalInfo: { ...defaultPersonalInfo },
        library: JSON.parse(JSON.stringify(sampleLibrary)),
        sectionOrder: normalizeSectionOrder(),
    });

// Upgrades pre-library states ({ personalInfo, jobs, structuredResume }) to v2.
// Jobs become experience items (variants preserved); the other parsed sections
// come from the stored structuredResume.
const migrateResumeState = (state) => {
    if (!state) return null;

    if (state.version >= RESUME_STATE_VERSION && state.library) {
        return {
            ...state,
            library: mergeLibraries(createEmptyLibrary(), state.library),
            sectionOrder: normalizeSectionOrder(state.sectionOrder),
        };
    }

    const structuredResume = state.structuredResume || {};
    const source = state.sourceFile?.name || "imported";
    const jobs = state.jobs || [];

    const library = createLibraryFromStructuredResume(
        { ...structuredResume, experience: jobs.length ? [] : structuredResume.experience },
        source
    );

    if (jobs.length) {
        library.experience = jobs.map((job) => {
            const variants = (job.variants || []).length
                ? job.variants
                : [{ id: "v1", label: "Default", bullets: "" }];
            const selectedVariantId = variants.some((variant) => variant.id === job.selectedVariantId)
                ? job.selectedVariantId
                : variants[0].id;
            return {
                id: job.id || createItemId("exp"),
                title: job.title || "",
                company: job.company || "",
                location: "",
                dates: job.duration || "",
                included: job.included !== false,
                source,
                selectedVariantId,
                variants,
            };
        });
    }

    const personalInfo = fillEmptyPersonalInfo(
        { name: "", email: "", phone: "", linkedin: "", github: "", portfolio: "", ...(state.personalInfo || {}) },
        structuredResume.basics || {}
    );

    return buildResumeStateProjections({
        ...state,
        jobs: undefined,
        personalInfo,
        library,
        sectionOrder: normalizeSectionOrder(state.sectionOrder),
    });
};
