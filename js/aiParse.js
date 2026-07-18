// Client for the parse-resume Supabase Edge Function (PRD P0.5). The function
// holds the Anthropic API key server-side; the client only ever sends raw
// resume text and requires a signed-in session (JWT-gated).
const aiParseResume = async (supabaseClient, rawText) => {
    if (!supabaseClient) {
        throw new Error("Sign in to use AI parsing — it runs on the backend, not in your browser.");
    }
    const text = String(rawText || "").trim();
    if (!text) {
        throw new Error("There is no extracted text to re-parse.");
    }

    const { data, error } = await supabaseClient.functions.invoke("parse-resume", {
        body: { rawText: text },
    });

    if (error) {
        const status = error?.context?.status;
        if (status === 404) {
            throw new Error("AI parsing isn't set up on the backend yet — deploy the parse-resume Edge Function (see README).");
        }
        if (status === 401) {
            throw new Error("Your session expired — sign in again to use AI parsing.");
        }
        throw new Error(error.message || "AI parsing failed.");
    }

    if (!data?.structuredResume || typeof data.structuredResume !== "object") {
        throw new Error(data?.error || "AI parsing returned no usable result.");
    }
    return data.structuredResume;
};
