// Maps raw PostgREST errors to messages a user can act on.
const friendlyStoreError = (error) => {
    if (error?.code === "PGRST205" || /profiles.*schema cache/i.test(error?.message || "")) {
        return new Error(
            "The backend database isn't set up yet (missing 'profiles' table). Run the setup SQL from the README in the Supabase SQL Editor. Your work is still saved in this browser."
        );
    }
    return error instanceof Error ? error : new Error(error?.message || "Supabase request failed.");
};

const loadRemoteResumeState = async (supabaseClient, userId) => {
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("resume_state")
        .eq("uid", userId)
        .maybeSingle();

    if (error) throw friendlyStoreError(error);
    return data?.resume_state || null;
};

const saveRemoteResumeState = async (supabaseClient, userId, resumeState) => {
    const { error } = await supabaseClient.from("profiles").upsert({
        uid: userId,
        resume_state: resumeState,
        updated_at: new Date().toISOString(),
    });

    if (error) throw friendlyStoreError(error);
};

const clearRemoteResumeState = async (supabaseClient, userId) => {
    const { error } = await supabaseClient
        .from("profiles")
        .delete()
        .eq("uid", userId);

    if (error) throw friendlyStoreError(error);
};
