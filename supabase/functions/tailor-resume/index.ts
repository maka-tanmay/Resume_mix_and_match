// Supabase Edge Function: tailor-resume (PRD P1 — paste-a-JD tailoring).
//
// Deploy:   supabase functions deploy tailor-resume
// Secret:   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   (shared with parse-resume)
//
// Input: a job description plus a condensed library (see js/tailor.js).
// Output: which item IDs to include, which wording variant per item, a section
// order, and an honest match report — all guaranteed by a structured-outputs
// schema. JWT verification is on by default (signed-in users only).
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

const TAILOR_SCHEMA = {
    type: "object",
    properties: {
        includedItemIds: { type: "array", items: { type: "string" } },
        variantChoices: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    itemId: { type: "string" },
                    variantId: { type: "string" },
                },
                required: ["itemId", "variantId"],
                additionalProperties: false,
            },
        },
        sectionOrder: {
            type: "array",
            items: {
                type: "string",
                enum: ["education", "experience", "projects", "research", "leadership", "skills"],
            },
        },
        matchReport: {
            type: "object",
            properties: {
                score: { type: "integer" },
                summary: { type: "string" },
                matchedKeywords: { type: "array", items: { type: "string" } },
                missingKeywords: { type: "array", items: { type: "string" } },
                suggestions: { type: "array", items: { type: "string" } },
            },
            required: ["score", "summary", "matchedKeywords", "missingKeywords", "suggestions"],
            additionalProperties: false,
        },
    },
    required: ["includedItemIds", "variantChoices", "sectionOrder", "matchReport"],
    additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You tailor a resume library to a specific job description. The library is a list of items (jobs, projects, education, research, leadership, skills rows), each with an id and optional wording variants.

Rules:
- includedItemIds: pick the items most relevant to this job. Use ONLY ids that appear in the library — never invent ids. Include education unless clearly irrelevant, and at least one skills row when any exists. Prefer a one-page-sized selection (roughly 3-5 entry items plus education and skills) over including everything.
- variantChoices: for items with multiple variants, pick the variant whose wording best matches the job's emphasis. Omit items with a single variant.
- sectionOrder: order sections so the most job-relevant content comes first. Early-career candidates usually lead with education; experienced candidates lead with experience. Skills may move up for keyword-heavy technical roles.
- matchReport.score: an honest 0-100 estimate of how well the SELECTED content covers the job's requirements. Do not flatter.
- matchedKeywords: skills/technologies/qualifications that appear in BOTH the job description and the selected items.
- missingKeywords: important requirements from the job description that the library does not credibly cover. Never suggest fabricating them.
- suggestions: 2-4 specific, actionable edits the candidate could make (e.g. "Your TestCo bullets don't mention Kubernetes, which this role requires three times — add it if you genuinely used it").
- summary: two sentences, plain language, honest.`;

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { jobDescription, library, sectionOrder } = await req.json().catch(() => ({}));
        if (!jobDescription || typeof jobDescription !== "string" || !jobDescription.trim()) {
            return jsonResponse(400, { error: "jobDescription (string) is required." });
        }
        if (!Array.isArray(library) || library.length === 0) {
            return jsonResponse(400, { error: "library (non-empty array) is required." });
        }

        const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (!apiKey) {
            return jsonResponse(500, { error: "ANTHROPIC_API_KEY is not configured on the function." });
        }

        const anthropic = new Anthropic({ apiKey });
        const response = await anthropic.messages.create({
            model: "claude-opus-4-8",
            max_tokens: 6_000,
            thinking: { type: "adaptive" },
            system: SYSTEM_PROMPT,
            output_config: { format: { type: "json_schema", schema: TAILOR_SCHEMA } },
            messages: [
                {
                    role: "user",
                    content: `<job_description>\n${jobDescription.slice(0, 20_000)}\n</job_description>\n\n<library>\n${JSON.stringify(library).slice(0, 60_000)}\n</library>\n\n<current_section_order>${JSON.stringify(sectionOrder || [])}</current_section_order>\n\nTailor the resume to this job.`,
                },
            ],
        });

        if (response.stop_reason === "refusal") {
            return jsonResponse(422, { error: "The model declined to process this job description." });
        }
        if (response.stop_reason === "max_tokens") {
            return jsonResponse(422, { error: "The input is too long for tailoring — trim the job description and retry." });
        }

        const textBlock = response.content.find((block) => block.type === "text");
        if (!textBlock || !("text" in textBlock)) {
            return jsonResponse(500, { error: "The model returned no text output." });
        }

        const tailoring = JSON.parse(textBlock.text);
        // Safety: drop any ids the model invented despite instructions.
        const knownIds = new Set(library.map((item: { id: string }) => item.id));
        tailoring.includedItemIds = (tailoring.includedItemIds || []).filter((id: string) => knownIds.has(id));
        tailoring.variantChoices = (tailoring.variantChoices || []).filter((choice: { itemId: string }) => knownIds.has(choice.itemId));

        return jsonResponse(200, { tailoring });
    } catch (error) {
        const message = error instanceof Error ? error.message : "AI tailoring failed.";
        return jsonResponse(500, { error: message });
    }
});
