const RESUME_ACCEPTED_FORMATS = ".pdf,.doc,.docx,.tex,.latex,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/x-tex";

const detectResumeFormat = (file) => {
    const name = file.name.toLowerCase();

    if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
    if (
        name.endsWith(".doc") ||
        name.endsWith(".docx") ||
        file.type === "application/msword" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        return "doc";
    }
    if (name.endsWith(".tex") || name.endsWith(".latex") || file.type === "application/x-tex") return "latex";

    return "resume";
};

const ResumeUploadPage = ({ user, onResumeReady, onSignOut }) => {
    const fileInput = React.useRef(null);
    const [error, setError] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    const handleUploadClick = () => {
        setError("");
        fileInput.current?.click();
    };

    const handleFileSelected = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        const format = detectResumeFormat(file);
        setError("");
        setLoading(true);

        try {
            const parsedResume = await parseUploadedResume(file, format);
            const resumeState = createResumeStateFromUpload(file, format, parsedResume);
            await onResumeReady(resumeState);
        } catch (uploadError) {
            setError(uploadError.message || "Could not read this resume file.");
        } finally {
            setLoading(false);
        }
    };

    const handleStartFromSample = () => {
        onResumeReady({ personalInfo: defaultPersonalInfo, jobs: initialJobs });
    };

    return (
        <div className="min-h-screen bg-app-bg text-app-text flex items-center justify-center p-6">
            <div className="w-full max-w-4xl space-y-8">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight">Upload Your Resume</h1>
                        <p className="text-sm text-app-textMuted mt-2">Choose the format you already have. You can refine and rebuild the resume after upload.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-app-textMuted hidden sm:inline">{user.email}</span>
                        <button onClick={onSignOut} className="text-xs bg-[#1C1C1E] border border-app-border hover:bg-red-950 hover:text-red-300 hover:border-red-900/50 px-3 py-1.5 rounded-lg font-medium transition-colors">
                            Sign Out
                        </button>
                    </div>
                </div>

                <div className="bg-app-card border border-app-border rounded-2xl p-6 space-y-5">
                    <div>
                        <h2 className="text-xl font-bold">Resume File</h2>
                        <p className="text-sm text-app-textMuted mt-2">Upload one resume file in PDF, DOC/DOCX, or LaTeX format.</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleUploadClick}
                        disabled={loading}
                        className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Reading Resume..." : "Upload Resume"}
                    </button>
                    <input
                        ref={fileInput}
                        type="file"
                        accept={RESUME_ACCEPTED_FORMATS}
                        className="hidden"
                        onChange={handleFileSelected}
                    />
                </div>

                {error && <p className="text-sm text-red-400 font-medium">{error}</p>}

                <div className="border border-app-border bg-[#0a0a0a] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="font-semibold">No resume file ready?</h2>
                        <p className="text-sm text-app-textMuted mt-1">Start from the sample resume and replace it with your own content.</p>
                    </div>
                    <button onClick={handleStartFromSample} className="bg-app-card border border-app-border hover:bg-app-cardHover text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                        Start with Sample
                    </button>
                </div>
            </div>
        </div>
    );
};
