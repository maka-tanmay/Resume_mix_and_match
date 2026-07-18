// Client for the tailor-resume Supabase Edge Function (PRD P1). Sends a
// condensed view of the library plus the job description; receives a
// selection (item IDs, variant choices, section order) and a match report.
// The Anthropic key stays server-side; requires a signed-in session.

// Condensed, token-friendly view of the library for the model. IDs are the
// contract: the function must only ever reference these.
const buildTailorLibraryPayload = (library) =>
    RESUME_SECTION_KEYS.flatMap((section) => (library?.[section] || []).map((item) => {
        const payload = {
            id: item.id,
            section,
            title: item.title || item.name || item.school || item.category || "",
            organization: item.company || "",
            dates: item.dates || "",
        };
        if (item.degree) payload.degree = item.degree;
        if ((item.technologies || []).length) payload.technologies = item.technologies;
        if ((item.items || []).length) payload.skills = item.items;
        const variants = (item.variants || []).map((variant) => ({
            id: variant.id,
            label: variant.label,
            bullets: variant.bullets.split("\n").map((bullet) => bullet.trim()).filter(Boolean).slice(0, 12),
        }));
        if (variants.length) payload.variants = variants;
        return payload;
    }));

const tailorResume = async (supabaseClient, jobDescription, library, sectionOrder) => {
    if (!supabaseClient) {
        throw new Error("Sign in to use AI tailoring — it runs on the backend, not in your browser.");
    }
    const description = String(jobDescription || "").trim();
    if (description.length < 40) {
        throw new Error("Paste the full job description (at least a few sentences).");
    }

    const { data, error } = await supabaseClient.functions.invoke("tailor-resume", {
        body: {
            jobDescription: description,
            library: buildTailorLibraryPayload(library),
            sectionOrder,
        },
    });

    if (error) {
        const status = error?.context?.status;
        if (status === 404) {
            throw new Error("AI tailoring isn't set up on the backend yet — deploy the tailor-resume Edge Function (see README).");
        }
        if (status === 401) {
            throw new Error("Your session expired — sign in again to use AI tailoring.");
        }
        throw new Error(error.message || "AI tailoring failed.");
    }

    if (!data?.tailoring || !Array.isArray(data.tailoring.includedItemIds)) {
        throw new Error(data?.error || "AI tailoring returned no usable result.");
    }
    return data.tailoring;
};
