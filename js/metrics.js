// North-star metrics instrumentation (PRD §1). A thin, fire-and-forget event
// log: events insert into the `events` table (insert-only RLS; clients cannot
// read anything back). Metrics failures must never disturb the product — every
// path here swallows errors. Guest/local mode has no client, so nothing is
// sent. Activation, time-to-wow, and W1 retention are computed server-side
// from these rows (session_id groups a funnel; created_at orders it).

const METRICS_SESSION_KEY = "resume_mix_match_metrics_session";

const getMetricsSessionId = () => {
    try {
        let sessionId = sessionStorage.getItem(METRICS_SESSION_KEY);
        if (!sessionId) {
            sessionId = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
            sessionStorage.setItem(METRICS_SESSION_KEY, sessionId);
        }
        return sessionId;
    } catch (error) {
        return "s-unavailable";
    }
};

const trackEvent = (supabaseClient, name, props = {}) => {
    try {
        if (!supabaseClient || !name) return;
        supabaseClient
            .from("events")
            .insert({ name, props, session_id: getMetricsSessionId() })
            .then(({ error }) => {
                // Table missing / RLS rejection: log once at debug level, never surface.
                if (error && typeof console !== "undefined") console.debug?.("metrics event dropped:", error.message);
            });
    } catch (error) {
        // Metrics must never break the product.
    }
};
