const STORAGE_KEY = "resume_mix_match_state";

const getResumeStorageKey = (userId) => (userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY);

const loadResumeState = (userId) => {
    try {
        return JSON.parse(localStorage.getItem(getResumeStorageKey(userId)));
    } catch (error) {
        console.error("Error loading saved data:", error);
        return null;
    }
};

const saveResumeState = (state, userId) => {
    localStorage.setItem(getResumeStorageKey(userId), JSON.stringify(state));
};

const clearResumeState = (userId) => {
    localStorage.removeItem(getResumeStorageKey(userId));
};

const createResumeStateFromUpload = (file, format, parsedResume) => ({
    structuredResume: parsedResume.structuredResume,
    personalInfo: {
        name: parsedResume.structuredResume.basics.name,
        email: parsedResume.structuredResume.basics.email,
        phone: parsedResume.structuredResume.basics.phone,
        linkedin: parsedResume.structuredResume.basics.linkedin,
    },
    jobs: structuredExperienceToJobs(parsedResume.structuredResume.experience),
    rawText: parsedResume.rawText,
    rawLines: parsedResume.rawLines,
    sectionBoundaries: parsedResume.sectionBoundaries,
    originalPreview: parsedResume.originalPreview,
    generatedLatex: generateStructuredLatex(parsedResume.structuredResume),
    generatedHtml: generateStructuredHtml(parsedResume.structuredResume),
    sourceFile: {
        name: file.name,
        size: file.size,
        type: file.type || format,
        format,
        uploadedAt: new Date().toISOString(),
    },
});

const structuredExperienceToJobs = (experience = []) =>
    experience.map((entry, index) => ({
        id: `job-${Date.now()}-${index}`,
        company: entry.company || entry.organization || "",
        title: entry.title || "",
        duration: entry.dates || "",
        included: true,
        selectedVariantId: "parsed",
        variants: [
            {
                id: "parsed",
                label: "Parsed",
                bullets: (entry.bullets || []).join("\n"),
            },
        ],
    }));
