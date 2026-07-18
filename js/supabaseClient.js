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

// Supabase issues legacy JWT anon keys ("eyJ...") and, since 2025, publishable
// keys ("sb_publishable_..."). Both are safe for the browser; secret keys are not.
const validateSupabasePublicKey = (key) => {
    if (!key) return "Enter your Supabase anon or publishable API key.";
    if (key.startsWith("sb_secret_") || /^service_role/i.test(key)) {
        return "That looks like a secret key. Use the anon/publishable key — secret keys must never be used in a browser.";
    }
    if (!key.startsWith("eyJ") && !key.startsWith("sb_publishable_")) {
        return "That key looks invalid. Use the anon public key (starts with eyJ) or publishable key (starts with sb_publishable_).";
    }
    return "";
};

const createSupabaseClient = (config) => {
    const normalizedConfig = normalizeSupabaseConfig(config);

    if (!window.supabase?.createClient) {
        throw new Error("Supabase client library failed to load.");
    }

    if (!normalizedConfig?.supabaseUrl || !normalizedConfig?.supabaseAnonKey) {
        throw new Error("Supabase URL and API key are required.");
    }

    const keyError = validateSupabasePublicKey(normalizedConfig.supabaseAnonKey);
    if (keyError) {
        throw new Error(keyError);
    }

    return window.supabase.createClient(normalizedConfig.supabaseUrl, normalizedConfig.supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            detectSessionInUrl: true,
            persistSession: true,
        },
    });
};
