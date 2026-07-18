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

    return (
        <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
            <div className="bg-app-card border border-app-border w-full max-w-md p-8 rounded-2xl space-y-6 shadow-2xl">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Resume Mix &amp; Match</h1>
                    <p className="text-sm text-app-textMuted">One library of everything you've done. Every resume tailored from it.</p>
                </div>

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
                <p className="text-[11px] text-app-textMuted text-center -mt-3">
                    No sign-up needed — your resume stays in this browser. You can sign in later to sync.
                </p>

                <div className="text-center">
                    <button type="button" onClick={onShowSetup} className="text-[11px] text-app-textMuted/70 hover:text-white underline">
                        Self-hosting? Use your own Supabase
                    </button>
                </div>
            </div>
        </div>
    );
};
