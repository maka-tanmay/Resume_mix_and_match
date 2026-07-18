// Supabase Edge Function: cover-letter (PRD P1 — cover letter from library + JD).
//
// Deploy:   supabase functions deploy cover-letter
// Secret:   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   (shared with parse-resume)
//
// Input: a job description, the candidate's name, and a condensed library
// (same payload shape as tailor-resume). Output: a plain-text cover letter and
// an email subject line, guaranteed by a structured-outputs schema. JWT
// verification is on by default (signed-in users only).
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

const COVER_LETTER_SCHEMA = {
    type: "object",
    properties: {
        coverLetter: { type: "string" },
        subject: { type: "string" },
    },
    required: ["coverLetter", "subject"],
    additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You write a cover letter for a specific job from a candidate's resume library. The library is a list of items (jobs, projects, education, research, leadership, skills rows) with their real accomplishments.

Rules:
- Use ONLY facts present in the library. Never invent employers, titles, metrics, technologies, or dates. If the library doesn't cover a job requirement, do not pretend it does.
- Structure: 3-4 short paragraphs, 220-320 words total. Opening names the role and why the candidate fits in one concrete sentence; middle paragraphs connect 2-3 of the candidate's strongest, most relevant accomplishments to the job's actual needs; closing is brief and specific, no groveling.
- Voice: first person, plain confident language. No cliches ("I am writing to express", "fast-paced environment", "passionate about"), no adjectives without evidence, no restating the resume bullet-for-bullet.
- Address: use the hiring manager's name only if the job description names one; otherwise "Dear Hiring Team,". Sign off with the candidate's name.
- Company/role: use the company and role names exactly as the job description states them. If the company name is not in the job description, write the letter without naming it rather than guessing.
- Output plain text only — no markdown, no placeholders like [Company].
- subject: an email subject line of the form "<Role> — <Candidate Name>" (adjust naturally if the role name is long).`;

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { jobDescription, library, candidateName } = await req.json().catch(() => ({}));
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
            max_tokens: 4_000,
            thinking: { type: "adaptive" },
            system: SYSTEM_PROMPT,
            output_config: { format: { type: "json_schema", schema: COVER_LETTER_SCHEMA } },
            messages: [
                {
                    role: "user",
                    content: `<job_description>\n${jobDescription.slice(0, 20_000)}\n</job_description>\n\n<candidate_name>${String(candidateName || "").slice(0, 200)}</candidate_name>\n\n<library>\n${JSON.stringify(library).slice(0, 60_000)}\n</library>\n\nWrite the cover letter.`,
                },
            ],
        });

        if (response.stop_reason === "refusal") {
            return jsonResponse(422, { error: "The model declined to process this job description." });
        }
        if (response.stop_reason === "max_tokens") {
            return jsonResponse(422, { error: "The input is too long — trim the job description and retry." });
        }

        const textBlock = response.content.find((block) => block.type === "text");
        if (!textBlock || !("text" in textBlock)) {
            return jsonResponse(500, { error: "The model returned no text output." });
        }

        return jsonResponse(200, { result: JSON.parse(textBlock.text) });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Cover letter generation failed.";
        return jsonResponse(500, { error: message });
    }
});
