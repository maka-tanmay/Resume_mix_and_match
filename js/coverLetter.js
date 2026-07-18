// Client for the cover-letter Supabase Edge Function (PRD P1). Reuses the
// condensed library payload from tailor.js (loaded before this file); the
// Anthropic key stays server-side. Requires a signed-in session.

const generateCoverLetter = async (supabaseClient, jobDescription, candidateName, library) => {
    if (!supabaseClient) {
        throw new Error("Sign in to generate a cover letter — it runs on the backend, not in your browser.");
    }
    const description = String(jobDescription || "").trim();
    if (description.length < 40) {
        throw new Error("Paste the full job description (at least a few sentences).");
    }

    const { data, error } = await supabaseClient.functions.invoke("cover-letter", {
        body: {
            jobDescription: description,
            candidateName: candidateName || "",
            library: buildTailorLibraryPayload(library),
        },
    });

    if (error) {
        const status = error?.context?.status;
        if (status === 404) {
            throw new Error("Cover letters aren't set up on the backend yet — deploy the cover-letter Edge Function (see README).");
        }
        if (status === 401) {
            throw new Error("Your session expired — sign in again to generate a cover letter.");
        }
        throw new Error(error.message || "Cover letter generation failed.");
    }

    if (!data?.result?.coverLetter) {
        throw new Error(data?.error || "Cover letter generation returned no usable result.");
    }
    return data.result;
};
