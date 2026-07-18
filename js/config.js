// Hosted backend for the public app. The anon key is intentionally public:
// it only grants what Row Level Security policies allow, and every user's
// resume data is scoped to their own account (see README for the policies).
// Self-hosters can point the app at their own project via the "Use your own
// Supabase" screen, which overrides this default in browser storage.
const DEFAULT_SUPABASE_CONFIG = {
    supabaseUrl: "https://phbxlymshsoptjwzuzzt.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoYnhseW1zaHNvcHRqd3p1enp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDgwMjYsImV4cCI6MjA5NzAyNDAyNn0.7wmNbG1Rvo3m2AuqzVkw5IL6vlntKegjXIJxOkNtS54",
};
