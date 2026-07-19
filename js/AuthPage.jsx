// Logged-out view: a real landing page. The template strip renders the actual
// template registry against the sample resume — the marketing is the product.
const LANDING_SAMPLE_RESUME = (() => {
    try {
        return createResumeStateFromSample().structuredResume;
    } catch (error) {
        return null;
    }
})();

const LandingTemplateCard = ({ template, onTry }) => (
    <button
        type="button"
        onClick={onTry}
        title={`${template.tagline} — click to try it`}
        className="group text-left shrink-0 focus:outline-none"
    >
        <div className="w-[220px] h-[285px] overflow-hidden rounded-xl border border-app-border bg-white shadow-xl group-hover:border-white/60 group-hover:shadow-2xl transition-all">
            <style>{template.previewCss}</style>
            <div
                className={`tpl-${template.id}`}
                style={{ width: "850px", transform: "scale(0.2588)", transformOrigin: "top left", pointerEvents: "none" }}
                dangerouslySetInnerHTML={{ __html: LANDING_SAMPLE_RESUME ? template.renderHtml(LANDING_SAMPLE_RESUME) : "" }}
            />
        </div>
        <div className="flex items-center gap-2 mt-2 px-1">
            <span className="text-sm font-medium text-white">{template.name}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${ATS_BADGE_STYLES[template.atsRating] || ATS_BADGE_STYLES.B}`}>
                ATS {template.atsRating}
            </span>
        </div>
    </button>
);

const AuthPage = ({ supabaseClient, onShowSetup, onLocalMode }) => {
    const [error, setError] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [email, setEmail] = React.useState("");
    const [sendingLink, setSendingLink] = React.useState(false);
    const [linkSentTo, setLinkSentTo] = React.useState("");

    const handleGoogleSignIn = async () => {
        setError("");
        setLoading(true);

        try {
            const { error: signInError } = await supabaseClient.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        access_type: "offline",
                        prompt: "select_account",
                    },
                },
            });

            if (signInError) throw signInError;
        } catch (authError) {
            setError(authError.message || "Google sign-in failed.");
            setLoading(false);
        }
    };

    const handleMagicLink = async (event) => {
        event.preventDefault();
        const cleanEmail = email.trim();
        if (!cleanEmail) return;

        setError("");
        setSendingLink(true);
        try {
            const { error: otpError } = await supabaseClient.auth.signInWithOtp({
                email: cleanEmail,
                options: { emailRedirectTo: window.location.origin },
            });
            if (otpError) throw otpError;
            setLinkSentTo(cleanEmail);
        } catch (otpFailure) {
            setError(otpFailure.message || "Could not send the sign-in link.");
        } finally {
            setSendingLink(false);
        }
    };

    const authCard = (
        <div className="bg-app-card border border-app-border w-full max-w-md p-8 rounded-2xl space-y-5 shadow-2xl">
            <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
            >
                <span className="h-5 w-5 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">G</span>
                {loading ? "Redirecting..." : "Continue with Google"}
            </button>

            <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-app-border"></div>
                <span className="text-xs text-app-textMuted uppercase tracking-wider">or</span>
                <div className="flex-1 border-t border-app-border"></div>
            </div>

            {linkSentTo ? (
                <div className="text-center space-y-2 bg-[#0a0a0a] border border-app-border rounded-xl p-4">
                    <p className="text-sm text-white font-medium">Check your inbox</p>
                    <p className="text-xs text-app-textMuted">
                        We sent a sign-in link to <span className="text-white">{linkSentTo}</span>. Opening it signs you in here.
                    </p>
                    <button type="button" onClick={() => setLinkSentTo("")} className="text-xs text-app-textMuted hover:text-white underline">
                        Use a different email
                    </button>
                </div>
            ) : (
                <form onSubmit={handleMagicLink} className="space-y-2">
                    <input
                        required
                        type="email"
                        placeholder="you@example.com"
                        className="w-full bg-[#0a0a0a] border border-app-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors"
                        value={email}
                        onChange={(event) => {
                            setEmail(event.target.value);
                            setError("");
                        }}
                    />
                    <button
                        type="submit"
                        disabled={sendingLink}
                        className="w-full bg-[#0a0a0a] border border-app-border text-white font-semibold py-3 rounded-xl hover:bg-app-cardHover transition-colors disabled:opacity-50"
                    >
                        {sendingLink ? "Sending link..." : "Email me a sign-in link"}
                    </button>
                </form>
            )}

            {error && <p className="text-xs text-red-400 font-medium text-center">{error}</p>}

            <button
                type="button"
                onClick={onLocalMode}
                className="w-full text-sm text-app-textMuted hover:text-white border border-app-border rounded-xl py-2.5 transition-colors"
            >
                Try without an account
            </button>
            <p className="text-[11px] text-app-textMuted text-center -mt-2">
                No sign-up needed — your resume stays in this browser. You can sign in later to sync.
            </p>
        </div>
    );

    return (
        <div className="h-screen overflow-y-auto bg-app-bg">
            <div className="max-w-6xl mx-auto px-6">
                {/* Hero */}
                <div className="grid md:grid-cols-2 gap-10 items-center pt-16 pb-12 min-h-[70vh]">
                    <div className="space-y-6">
                        <h1 className="text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
                            Your career, compiled.
                        </h1>
                        <p className="text-lg text-app-textMuted leading-relaxed">
                            Upload any resume once — it becomes a <span className="text-white">library</span> of everything
                            you've done. Every application <span className="text-white">compiles</span> from it: tailored to
                            the job, rendered in a professional template, exported ATS-clean.
                        </p>
                        <ul className="space-y-2.5 text-sm text-app-textMuted">
                            <li className="flex gap-2.5"><span>📄</span><span><span className="text-white">Import anything</span> — PDF, DOCX, LaTeX, LinkedIn export, or pasted text</span></li>
                            <li className="flex gap-2.5"><span>🎯</span><span><span className="text-white">Tailor per job</span> — paste a JD, get the best items and wording plus an honest match score</span></li>
                            <li className="flex gap-2.5"><span>📋</span><span><span className="text-white">Track outcomes</span> — every application snapshots the exact version you sent, so you learn what works</span></li>
                            <li className="flex gap-2.5"><span>🔒</span><span><span className="text-white">AI that never invents</span> — it only rewords and selects from facts you provided</span></li>
                        </ul>
                    </div>
                    <div className="flex justify-center md:justify-end">{authCard}</div>
                </div>

                {/* Template strip — the real renderer, not screenshots */}
                <div className="pb-14">
                    <div className="flex items-baseline justify-between mb-4">
                        <h2 className="text-2xl font-bold text-white">One library. Every template.</h2>
                        <p className="text-xs text-app-textMuted">Live previews — switching never touches your content</p>
                    </div>
                    <div className="flex gap-5 overflow-x-auto pb-3">
                        {typeof listResumeTemplates === "function" && LANDING_SAMPLE_RESUME
                            ? listResumeTemplates().map((template) => (
                                <LandingTemplateCard key={template.id} template={template} onTry={onLocalMode} />
                            ))
                            : null}
                    </div>
                </div>

                {/* How it stays honest */}
                <div className="grid md:grid-cols-3 gap-4 pb-14">
                    {[
                        ["Honest ATS grades", "Every template carries a real A/B/C grade for applicant-tracking parsers. The stylish two-column one says C on the label — we don't hide known risks."],
                        ["Parse confidence flags", "Imported items that parsed below confidence get an amber dot and a one-click review flow. You always see what the machine wasn't sure about."],
                        ["Real LaTeX underneath", "The engineer-standard Jake's template exports genuine .tex — edit it, apply changes back, or compile the real PDF in Overleaf with one click."],
                    ].map(([title, body]) => (
                        <div key={title} className="bg-app-card border border-app-border rounded-2xl p-5 space-y-2">
                            <h3 className="text-white font-semibold text-sm">{title}</h3>
                            <p className="text-xs text-app-textMuted leading-relaxed">{body}</p>
                        </div>
                    ))}
                </div>

                <div className="border-t border-app-border py-6 flex items-center justify-between text-[11px] text-app-textMuted">
                    <span>Free while in beta · your data is scoped to your account</span>
                    <button type="button" onClick={onShowSetup} className="hover:text-white underline">
                        Self-hosting? Use your own Supabase
                    </button>
                </div>
            </div>
        </div>
    );
};
