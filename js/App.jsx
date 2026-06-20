const App = () => {
    const [supabaseConfig, setSupabaseConfig] = React.useState(loadSupabaseConfig());
    const [supabaseClient, setSupabaseClient] = React.useState(null);
    const [session, setSession] = React.useState(null);
    const [loadingAuth, setLoadingAuth] = React.useState(Boolean(supabaseConfig));
    const [setupError, setSetupError] = React.useState("");
    const [resumeReadyVersion, setResumeReadyVersion] = React.useState(0);
    const [resumeState, setResumeState] = React.useState(null);
    const [loadingResume, setLoadingResume] = React.useState(false);
    const [resumeChecked, setResumeChecked] = React.useState(false);
    const [resumeError, setResumeError] = React.useState("");

    React.useEffect(() => {
        if (!supabaseConfig) {
            setSupabaseClient(null);
            setSession(null);
            setLoadingAuth(false);
            return;
        }

        let authSubscription;

        try {
            const client = createSupabaseClient(supabaseConfig);
            setSupabaseClient(client);
            setLoadingAuth(true);
            setSetupError("");

            client.auth.getSession().then(({ data, error }) => {
                if (error) {
                    clearSupabaseConfig();
                    setSupabaseConfig(null);
                    setSupabaseClient(null);
                    setSetupError(error.message);
                } else {
                    setSession(data.session);
                }
                setLoadingAuth(false);
            });

            const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
                setSession((currentSession) => {
                    const currentUserId = currentSession?.user?.id || null;
                    const nextUserId = nextSession?.user?.id || null;

                    if (currentUserId !== nextUserId) {
                        setResumeState(null);
                        setResumeChecked(false);
                        setResumeError("");
                    }

                    return nextSession;
                });
            });
            authSubscription = data.subscription;
        } catch (error) {
            clearSupabaseConfig();
            setSetupError(error.message || "Unable to initialize Supabase.");
            setSupabaseConfig(null);
            setSupabaseClient(null);
            setSession(null);
            setLoadingAuth(false);
        }

        return () => {
            authSubscription?.unsubscribe();
        };
    }, [supabaseConfig]);

    const handleConfigSaved = (config) => {
        saveSupabaseConfig(config);
        setSupabaseConfig(config);
    };

    const handleResetConfig = async () => {
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        clearSupabaseConfig();
        setSupabaseConfig(null);
        setSupabaseClient(null);
        setSession(null);
        setSetupError("");
    };

    React.useEffect(() => {
        if (!supabaseClient || !session?.user?.id) {
            setResumeChecked(false);
            return;
        }

        let cancelled = false;
        const userId = session.user.id;

        const loadResume = async () => {
            setLoadingResume(true);
            setResumeChecked(false);
            setResumeError("");

            try {
                let nextResumeState = await loadRemoteResumeState(supabaseClient, userId);

                if (!nextResumeState) {
                    const cachedState = loadResumeState(userId);
                    if (cachedState) {
                        await saveRemoteResumeState(supabaseClient, userId, cachedState);
                        nextResumeState = cachedState;
                    }
                }

                if (!cancelled) {
                    setResumeState(nextResumeState);
                }
            } catch (error) {
                const cachedState = loadResumeState(userId);
                if (!cancelled) {
                    setResumeState(cachedState);
                    setResumeError(error.message || "Could not load resume data from Supabase.");
                }
            } finally {
                if (!cancelled) {
                    setLoadingResume(false);
                    setResumeChecked(true);
                }
            }
        };

        loadResume();

        return () => {
            cancelled = true;
        };
    }, [supabaseClient, session?.user?.id, resumeReadyVersion]);

    const persistResumeState = async (nextResumeState) => {
        const userId = session.user.id;
        setResumeState(nextResumeState);
        setResumeChecked(true);
        saveResumeState(nextResumeState, userId);
        await saveRemoteResumeState(supabaseClient, userId, nextResumeState);
    };

    const clearCurrentResume = async () => {
        const userId = session.user.id;
        clearResumeState(userId);
        setResumeState(null);
        setResumeChecked(true);
        await clearRemoteResumeState(supabaseClient, userId);
        setResumeReadyVersion((version) => version + 1);
    };

    if (!supabaseConfig || setupError) {
        return <SupabaseSetup initialError={setupError} onConfigSaved={handleConfigSaved} />;
    }

    if (loadingAuth || !supabaseClient) {
        return (
            <div className="min-h-screen bg-app-bg flex items-center justify-center">
                <div className="text-center space-y-3">
                    <IconCloudSync />
                    <p className="text-sm text-app-textMuted">Checking authentication...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return <AuthPage supabaseClient={supabaseClient} onResetConfig={handleResetConfig} />;
    }

    if (loadingResume || !resumeChecked) {
        return (
            <div className="min-h-screen bg-app-bg flex items-center justify-center">
                <div className="text-center space-y-3">
                    <IconCloudSync />
                    <p className="text-sm text-app-textMuted">Loading resume data...</p>
                </div>
            </div>
        );
    }

    if (!resumeState) {
        return (
            <ResumeUploadPage
                key={`${session.user.id}:${resumeReadyVersion}`}
                user={session.user}
                onResumeReady={persistResumeState}
                onSignOut={() => supabaseClient.auth.signOut()}
            />
        );
    }

    return (
        <Dashboard
            key={session.user.id}
            user={session.user}
            resumeState={resumeState}
            onResumeStateChange={persistResumeState}
            onReplaceResume={clearCurrentResume}
            onSignOut={() => supabaseClient.auth.signOut()}
        />
    );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
