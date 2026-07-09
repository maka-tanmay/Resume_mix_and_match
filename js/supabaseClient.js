const SUPABASE_CONFIG_KEY = "resume_mix_match_supabase_config";

const normalizeSupabaseConfig = (config) => {
    if (!config) return null;

    const cleanValue = (value) =>
        String(value || "")
            .trim()
            .replace(/^Bearer\s+/i, "")
            .replace(/^["']|["']$/g, "");

    return {
        supabaseUrl: cleanValue(config.supabaseUrl).replace(/\/+$/, ""),
        supabaseAnonKey: cleanValue(config.supabaseAnonKey),
    };
};

const loadSupabaseConfig = () => {
    try {
        return normalizeSupabaseConfig(JSON.parse(localStorage.getItem(SUPABASE_CONFIG_KEY)));
    } catch (error) {
        console.error("Error loading Supabase config:", error);
        return null;
    }
};

const saveSupabaseConfig = (config) => {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(normalizeSupabaseConfig(config)));
};

const clearSupabaseConfig = () => {
    localStorage.removeItem(SUPABASE_CONFIG_KEY);
};

const createSupabaseClient = (config) => {
    const normalizedConfig = normalizeSupabaseConfig(config);

    if (!window.supabase?.createClient) {
        throw new Error("Supabase client library failed to load.");
    }

    if (!normalizedConfig?.supabaseUrl || !normalizedConfig?.supabaseAnonKey) {
        throw new Error("Supabase URL and anon public key are required.");
    }

    if (!normalizedConfig.supabaseAnonKey.startsWith("eyJ")) {
        throw new Error("Supabase anon public key looks invalid. It should start with eyJ.");
    }

    return window.supabase.createClient(normalizedConfig.supabaseUrl, normalizedConfig.supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            detectSessionInUrl: true,
            persistSession: true,
        },
    });
};
