const LOCAL_USER = {
    id: "local",
    email: "Local session (this browser)",
};

const App = () => {
    const [localMode, setLocalMode] = React.useState(isLocalModeEnabled());
    const [supabaseConfig, setSupabaseConfig] = React.useState(loadSupabaseConfig());
    const [showSetup, setShowSetup] = React.useState(false);
    const [supabaseClient, setSupabaseClient] = React.useState(null);
    const [session, setSession] = React.useState(null);
    const [loadingAuth, setLoadingAuth] = React.useState(Boolean(supabaseConfig));
    const [setupError, setSetupError] = React.useState("");
    const [resumeReadyVersion, setResumeReadyVersion] = React.useState(0);
    const [resumeState, setResumeState] = React.useState(null);
    const [loadingResume, setLoadingResume] = React.useState(false);
    const [resumeChecked, setResumeChecked] = React.useState(false);
    const [resumeError, setResumeError] = React.useState("");

    const activeUser = localMode ? LOCAL_USER : session?.user || null;
    const activeUserId = activeUser?.id || null;

    React.useEffect(() => {
        if (localMode || !supabaseConfig) {
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

            client.auth
                .getSession()
                .then(({ data, error }) => {
                    if (error) throw error;
                    setSession(data.session);
                })
                .catch((error) => {
                    clearSupabaseConfig();
                    setSupabaseConfig(null);
                    setSupabaseClient(null);
                    setSetupError(error.message || "Could not check the Supabase session.");
                })
                .finally(() => setLoadingAuth(false));

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
    }, [supabaseConfig, localMode]);

    const handleConfigSaved = (config) => {
        saveSupabaseConfig(config);
        setSetupError("");
        setShowSetup(false);
        setSupabaseConfig(config);
    };

    // Drops any self-hosted override and returns to the hosted backend.
    const handleUseHostedBackend = async () => {
        if (supabaseClient && hasStoredSupabaseOverride()) {
            await supabaseClient.auth.signOut();
        }
        clearSupabaseConfig();
        setSetupError("");
        setShowSetup(false);
        setSupabaseConfig(loadSupabaseConfig());
    };

    const handleEnterLocalMode = () => {
        setLocalModeEnabled(true);
        setResumeState(null);
        setResumeChecked(false);
        setResumeError("");
        setLocalMode(true);
    };

    const handleExitLocalMode = () => {
        setLocalModeEnabled(false);
        setResumeState(null);
        setResumeChecked(false);
        setResumeError("");
        setLocalMode(false);
    };

    const handleSignOut = () => {
        if (localMode) {
            handleExitLocalMode();
            return;
        }
        supabaseClient?.auth.signOut();
    };

    React.useEffect(() => {
        if (!activeUserId || (!localMode && !supabaseClient)) {
            setResumeChecked(false);
            return;
        }

        let cancelled = false;
        const userId = activeUserId;

        const loadResume = async () => {
            setLoadingResume(true);
            setResumeChecked(false);
            setResumeError("");

            try {
                let nextResumeState;

                if (localMode) {
                    nextResumeState = loadResumeState(userId);
                } else {
                    nextResumeState = await loadRemoteResumeState(supabaseClient, userId);

                    if (!nextResumeState) {
                        const cachedState = loadResumeState(userId);
                        if (cachedState) {
                            await saveRemoteResumeState(supabaseClient, userId, cachedState);
                            nextResumeState = cachedState;
                        }
                    }
                }

                if (!cancelled) {
                    setResumeState(nextResumeState ? migrateResumeState(nextResumeState) : null);
                }
            } catch (error) {
                const cachedState = loadResumeState(userId);
                if (!cancelled) {
                    setResumeState(cachedState ? migrateResumeState(cachedState) : null);
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
    }, [localMode, supabaseClient, activeUserId, resumeReadyVersion]);

    const persistResumeState = async (nextResumeState) => {
        setResumeState(nextResumeState);
        setResumeChecked(true);
        const cached = saveResumeState(nextResumeState, activeUserId);

        if (!localMode) {
            await saveRemoteResumeState(supabaseClient, activeUserId, nextResumeState);
        } else if (!cached) {
            throw new Error("Could not save to browser storage (it is likely full). Changes exist only in this tab.");
        }
    };

    const clearCurrentResume = async () => {
        clearResumeState(activeUserId);
        setResumeState(null);
        setResumeChecked(true);

        if (!localMode) {
            try {
                await clearRemoteResumeState(supabaseClient, activeUserId);
            } catch (error) {
                setResumeError(error.message || "Could not delete the resume from Supabase.");
            }
        }
        setResumeReadyVersion((version) => version + 1);
    };

    if (!localMode) {
        if (showSetup || !supabaseConfig || setupError) {
            return (
                <SupabaseSetup
                    initialError={setupError}
                    onConfigSaved={handleConfigSaved}
                    onLocalMode={handleEnterLocalMode}
                    onUseHosted={getDefaultSupabaseConfig() ? handleUseHostedBackend : undefined}
                    usingOverride={hasStoredSupabaseOverride()}
                />
            );
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
            return <AuthPage supabaseClient={supabaseClient} onShowSetup={() => setShowSetup(true)} onLocalMode={handleEnterLocalMode} />;
        }
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

    const errorBanner = resumeError ? (
        <div className="fixed top-0 inset-x-0 z-50 bg-red-950 border-b border-red-900 text-red-200 text-xs px-4 py-2 flex items-center justify-between gap-4">
            <span className="truncate">{resumeError}</span>
            <button onClick={() => setResumeError("")} className="underline shrink-0 hover:text-white">
                Dismiss
            </button>
        </div>
    ) : null;

    const signOutLabel = localMode ? "Exit Local Mode" : "Sign Out";

    if (!resumeState) {
        return (
            <>
                {errorBanner}
                <ResumeUploadPage
                    key={`${activeUserId}:${resumeReadyVersion}`}
                    user={activeUser}
                    onResumeReady={persistResumeState}
                    onSignOut={handleSignOut}
                    signOutLabel={signOutLabel}
                />
            </>
        );
    }

    return (
        <>
            {errorBanner}
            <Dashboard
                key={activeUserId}
                user={activeUser}
                resumeState={resumeState}
                onResumeStateChange={persistResumeState}
                onReplaceResume={clearCurrentResume}
                onSignOut={handleSignOut}
                signOutLabel={signOutLabel}
                syncTargetLabel={localMode ? "Saved in this browser" : "Saved to Supabase"}
            />
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
