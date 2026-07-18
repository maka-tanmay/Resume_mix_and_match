const SupabaseSetup = ({ initialError, onConfigSaved, onLocalMode, onUseHosted, usingOverride }) => {
    const [supabaseUrl, setSupabaseUrl] = React.useState("");
    const [supabaseAnonKey, setSupabaseAnonKey] = React.useState("");
    const [error, setError] = React.useState(initialError || "");

    const handleSubmit = (event) => {
        event.preventDefault();
        const config = normalizeSupabaseConfig({
            supabaseUrl: supabaseUrl.trim(),
            supabaseAnonKey: supabaseAnonKey.trim(),
        });

        try {
            const parsedUrl = new URL(config.supabaseUrl);
            if (!["http:", "https:"].includes(parsedUrl.protocol)) {
                throw new Error("Invalid protocol");
            }
        } catch (urlError) {
            setError("Enter a valid Supabase project URL.");
            return;
        }

        const keyError = validateSupabasePublicKey(config.supabaseAnonKey);
        if (keyError) {
            setError(keyError);
            return;
        }

        onConfigSaved(config);
    };

    return (
        <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
            <div className="bg-app-card border border-app-border w-full max-w-lg p-8 rounded-2xl space-y-6 shadow-2xl">
                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Use your own Supabase</h1>
                    <p className="text-sm text-app-textMuted">
                        For self-hosting only — the app already ships with a hosted backend.
                        Point it at your own project by entering its URL and anon/publishable key.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-app-textMuted uppercase tracking-wider">Project URL</label>
                        <input
                            required
                            type="url"
                            placeholder="https://your-project.supabase.co"
                            className="w-full bg-[#0a0a0a] border border-app-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors"
                            value={supabaseUrl}
                            onChange={(event) => {
                                setSupabaseUrl(event.target.value);
                                setError("");
                            }}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-app-textMuted uppercase tracking-wider">Anon / Publishable Key</label>
                        <textarea
                            required
                            rows="4"
                            placeholder="eyJhbGciOiJIUzI1... or sb_publishable_..."
                            className="w-full bg-[#0a0a0a] border border-app-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors font-mono text-xs"
                            value={supabaseAnonKey}
                            onChange={(event) => {
                                setSupabaseAnonKey(event.target.value);
                                setError("");
                            }}
                        />
                    </div>

                    {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

                    <button type="submit" className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors">
                        Save and Continue
                    </button>
                </form>

                {onUseHosted && (
                    <button
                        type="button"
                        onClick={onUseHosted}
                        className="w-full bg-[#0a0a0a] border border-app-border text-white font-medium py-2.5 rounded-xl hover:bg-app-cardHover transition-colors text-sm"
                    >
                        {usingOverride ? "Remove override and use the hosted backend" : "← Back to the hosted backend"}
                    </button>
                )}

                <div className="flex items-center gap-3">
                    <div className="flex-1 border-t border-app-border"></div>
                    <span className="text-xs text-app-textMuted uppercase tracking-wider">or</span>
                    <div className="flex-1 border-t border-app-border"></div>
                </div>

                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={onLocalMode}
                        className="w-full bg-[#0a0a0a] border border-app-border text-white font-semibold py-3 rounded-xl hover:bg-app-cardHover transition-colors"
                    >
                        Continue without an account
                    </button>
                    <p className="text-xs text-app-textMuted text-center">
                        No sign-in needed. Your resume is saved only in this browser.
                    </p>
                </div>
            </div>
        </div>
    );
};
