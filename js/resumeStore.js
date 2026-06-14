const loadRemoteResumeState = async (supabaseClient, userId) => {
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("resume_state")
        .eq("uid", userId)
        .maybeSingle();

    if (error) throw error;
    return data?.resume_state || null;
};

const saveRemoteResumeState = async (supabaseClient, userId, resumeState) => {
    const { error } = await supabaseClient.from("profiles").upsert({
        uid: userId,
        resume_state: resumeState,
        updated_at: new Date().toISOString(),
    });

    if (error) throw error;
};

const clearRemoteResumeState = async (supabaseClient, userId) => {
    const { error } = await supabaseClient
        .from("profiles")
        .delete()
        .eq("uid", userId);

    if (error) throw error;
};
