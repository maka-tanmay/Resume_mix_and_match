const AuthPage = ({ supabaseClient, onResetConfig, onLocalMode }) => {
    const [error, setError] = React.useState("");
    const [loading, setLoading] = React.useState(false);

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

    return (
        <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
            <div className="bg-app-card border border-app-border w-full max-w-md p-8 rounded-2xl space-y-6 shadow-2xl">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Welcome Back</h1>
                    <p className="text-sm text-app-textMuted">Sign in with Google to continue editing your resume.</p>
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

                {error && <p className="text-xs text-red-400 font-medium text-center">{error}</p>}

                <div className="text-center space-x-4">
                    <button type="button" onClick={onResetConfig} className="text-xs text-app-textMuted hover:text-white underline">
                        Change Supabase project
                    </button>
                    <button type="button" onClick={onLocalMode} className="text-xs text-app-textMuted hover:text-white underline">
                        Continue without an account
                    </button>
                </div>
            </div>
        </div>
    );
};
