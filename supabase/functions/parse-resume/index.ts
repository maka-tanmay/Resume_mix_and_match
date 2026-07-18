// Supabase Edge Function: parse-resume (PRD P0.5 — LLM parse fallback).
//
// Deploy:   supabase functions deploy parse-resume
// Secret:   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// JWT verification is on by default, so only signed-in app users can call it;
// the Anthropic key never reaches the browser. Input is raw extracted resume
// text; output is the app's structuredResume JSON, guaranteed by a structured
// outputs schema.
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

const stringProps = (...keys: string[]) =>
    Object.fromEntries(keys.map((key) => [key, { type: "string" }]));

const entrySchema = (headerKeys: string[]) => ({
    type: "array",
    items: {
        type: "object",
        properties: {
            ...stringProps(...headerKeys),
            bullets: { type: "array", items: { type: "string" } },
        },
        required: [...headerKeys, "bullets"],
        additionalProperties: false,
    },
});

// Mirrors the app's structuredResume shape (see js/storage.js).
const RESUME_SCHEMA = {
    type: "object",
    properties: {
        basics: {
            type: "object",
            properties: stringProps("name", "headline", "phone", "email", "linkedin", "github", "portfolio"),
            required: ["name", "headline", "phone", "email", "linkedin", "github", "portfolio"],
            additionalProperties: false,
        },
        education: {
            type: "array",
            items: {
                type: "object",
                properties: stringProps("school", "degree", "location", "dates"),
                required: ["school", "degree", "location", "dates"],
                additionalProperties: false,
            },
        },
        skills: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    category: { type: "string" },
                    items: { type: "array", items: { type: "string" } },
                },
                required: ["category", "items"],
                additionalProperties: false,
            },
        },
        experience: entrySchema(["title", "company", "location", "dates"]),
        projects: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    technologies: { type: "array", items: { type: "string" } },
                    dates: { type: "string" },
                    bullets: { type: "array", items: { type: "string" } },
                },
                required: ["name", "technologies", "dates", "bullets"],
                additionalProperties: false,
            },
        },
        research: entrySchema(["title", "company", "location", "dates"]),
        leadership: entrySchema(["title", "company", "location", "dates"]),
    },
    required: ["basics", "education", "skills", "experience", "projects", "research", "leadership"],
    additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You convert raw resume text into structured JSON for a resume builder.

Rules:
- Preserve the original wording of every bullet exactly as written. Never invent, embellish, or summarize content.
- Repair extraction artifacts: merge lines that are clearly wrapped continuations of a bullet or a header, and split lines that contain two different fields.
- File every entry under the correct section. Volunteer work belongs in leadership; publications belong in research; personal/side projects belong in projects even if listed under an unusual heading.
- Keep dates exactly as written (e.g. "May 2025 – Aug 2025"). Use empty strings for fields that are not present.
- Contact fields: bare domains are fine (e.g. "linkedin.com/in/x"); do not fabricate missing contact details.
- Skills: group by the categories used in the resume; if uncategorized, use a single "Skills" category.
- Sections that do not appear in the resume are empty arrays.`;

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { rawText } = await req.json().catch(() => ({}));
        if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
            return jsonResponse(400, { error: "rawText (string) is required." });
        }

        const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (!apiKey) {
            return jsonResponse(500, { error: "ANTHROPIC_API_KEY is not configured on the function." });
        }

        const clipped = rawText.slice(0, 30_000);
        const anthropic = new Anthropic({ apiKey });

        const response = await anthropic.messages.create({
            model: "claude-opus-4-8",
            max_tokens: 8_000,
            thinking: { type: "adaptive" },
            system: SYSTEM_PROMPT,
            output_config: { format: { type: "json_schema", schema: RESUME_SCHEMA } },
            messages: [
                {
                    role: "user",
                    content: `Convert this extracted resume text into the structured JSON format.\n\n<resume_text>\n${clipped}\n</resume_text>`,
                },
            ],
        });

        if (response.stop_reason === "refusal") {
            return jsonResponse(422, { error: "The model declined to process this text." });
        }
        if (response.stop_reason === "max_tokens") {
            return jsonResponse(422, { error: "The resume is too long for AI parsing — trim it and retry." });
        }

        const textBlock = response.content.find((block) => block.type === "text");
        if (!textBlock || !("text" in textBlock)) {
            return jsonResponse(500, { error: "The model returned no text output." });
        }

        const structuredResume = JSON.parse(textBlock.text);
        return jsonResponse(200, { structuredResume });
    } catch (error) {
        const message = error instanceof Error ? error.message : "AI parsing failed.";
        return jsonResponse(500, { error: message });
    }
});
