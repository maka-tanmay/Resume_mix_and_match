// Supabase Edge Function: write-variant (AI wording variant for one library item).
//
// Deploy:   supabase functions deploy write-variant
// Secret:   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   (shared with the other functions)
//
// Input: one item's real bullets (+ context fields) and optionally the job
// description being targeted. Output: an alternative wording of THE SAME
// facts as a new variant — never new employers, metrics, tools, or scope.
// JWT verification is on by default (signed-in users only).
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

const VARIANT_SCHEMA = {
    type: "object",
    properties: {
        label: { type: "string" },
        bullets: { type: "array", items: { type: "string" } },
    },
    required: ["label", "bullets"],
    additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You rewrite the bullets of ONE resume entry as an alternative wording variant.

Hard rules:
- Same facts only. Every number, technology, employer, and scope claim in your output must appear in the input bullets. Never add metrics, tools, or achievements that are not there. Never inflate ("led" only if the input says led).
- Same count ±1: produce roughly as many bullets as the input.
- Change the emphasis, not the truth: if a job description is provided, foreground the input facts most relevant to it and mirror its terminology ONLY where the input genuinely supports the term.
- Strong verb first, concrete outcome, no filler ("responsible for", "helped with", "various").
- label: 2-3 words naming the angle (e.g. "Impact-focused", "Leadership angle", "Backend emphasis", or the job's domain when targeting a JD).`;

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { item, jobDescription } = await req.json().catch(() => ({}));
        if (!item || !Array.isArray(item.bullets) || item.bullets.length === 0) {
            return jsonResponse(400, { error: "item with non-empty bullets is required." });
        }

        const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (!apiKey) {
            return jsonResponse(500, { error: "ANTHROPIC_API_KEY is not configured on the function." });
        }

        const anthropic = new Anthropic({ apiKey });
        const jdBlock = jobDescription && typeof jobDescription === "string" && jobDescription.trim()
            ? `\n\n<job_description>\n${jobDescription.slice(0, 12_000)}\n</job_description>`
            : "";
        const response = await anthropic.messages.create({
            model: "claude-opus-4-8",
            max_tokens: 2_000,
            thinking: { type: "adaptive" },
            system: SYSTEM_PROMPT,
            output_config: { format: { type: "json_schema", schema: VARIANT_SCHEMA } },
            messages: [
                {
                    role: "user",
                    content: `<entry>\n${JSON.stringify({
                        title: item.title || item.name || "",
                        organization: item.company || "",
                        dates: item.dates || "",
                        bullets: item.bullets.slice(0, 15),
                    })}\n</entry>${jdBlock}\n\nWrite one alternative wording variant.`,
                },
            ],
        });

        if (response.stop_reason === "refusal") {
            return jsonResponse(422, { error: "The model declined to process this content." });
        }

        const textBlock = response.content.find((block) => block.type === "text");
        if (!textBlock || !("text" in textBlock)) {
            return jsonResponse(500, { error: "The model returned no text output." });
        }

        return jsonResponse(200, { result: JSON.parse(textBlock.text) });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Variant writing failed.";
        return jsonResponse(500, { error: message });
    }
});
