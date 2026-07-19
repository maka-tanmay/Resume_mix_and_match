// Client for the write-variant Supabase Edge Function. Sends one item's real
// bullets (+ the pasted JD when present) and receives an alternative wording
// variant of the same facts. The Anthropic key stays server-side; requires a
// signed-in session.

const writeVariantWithAI = async (supabaseClient, item, jobDescription) => {
    if (!supabaseClient) {
        throw new Error("Sign in to use AI variants — they run on the backend, not in your browser.");
    }
    const activeVariant = (item.variants || []).find((variant) => variant.id === item.selectedVariantId) || (item.variants || [])[0];
    const bullets = activeVariant ? activeVariant.bullets.split("\n").map((text) => text.trim()).filter(Boolean) : [];
    if (!bullets.length) {
        throw new Error("This entry has no bullets yet — write a few first, then let AI reword them.");
    }

    const { data, error } = await supabaseClient.functions.invoke("write-variant", {
        body: {
            item: {
                title: item.title || item.name || "",
                company: item.company || "",
                dates: item.dates || "",
                bullets,
            },
            jobDescription: String(jobDescription || "").trim() || undefined,
        },
    });

    if (error) {
        const status = error?.context?.status;
        if (status === 404) {
            throw new Error("AI variants aren't set up on the backend yet — deploy the write-variant Edge Function (see README).");
        }
        if (status === 401) {
            throw new Error("Your session expired — sign in again to use AI variants.");
        }
        throw new Error(error.message || "AI variant writing failed.");
    }

    if (!data?.result || !Array.isArray(data.result.bullets) || !data.result.bullets.length) {
        throw new Error(data?.error || "AI variant writing returned no usable result.");
    }
    return data.result;
};
