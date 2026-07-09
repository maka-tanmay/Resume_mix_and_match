const { useState, useEffect, useRef } = React;

const syncStructuredResumeFromEditor = (resumeState, personalInfo, jobs) => {
    const structuredResume = resumeState?.structuredResume || {
        basics: {},
        education: [],
        skills: [],
        experience: [],
        projects: [],
        research: [],
        leadership: [],
        customSections: [],
    };

    return {
        ...structuredResume,
        basics: {
            ...structuredResume.basics,
            name: personalInfo.name,
            email: personalInfo.email,
            phone: personalInfo.phone,
            linkedin: personalInfo.linkedin,
        },
        experience: jobs.filter((job) => job.included).map((job) => {
            const activeVariant = job.variants.find((variant) => variant.id === job.selectedVariantId);
            return {
                title: job.title,
                company: job.company,
                location: "",
                dates: job.duration,
                bullets: activeVariant ? activeVariant.bullets.split("\n").filter(Boolean) : [],
            };
        }),
    };
};

// Mirrors the Jake's Resume template layout: small-caps ruled section titles,
// bold title / italic organization rows, and the same section order as the
// generated LaTeX so the preview matches the compiled PDF.
const StructuredResumePreview = ({ resume }) => {
    const section = (title, children, show = true) => (show ? (
        <div className="mb-4">
            <h2 className="text-xl resume-caps border-b border-black mb-2">{title}</h2>
            {children}
        </div>
    ) : null);

    const entryBlock = (entry, index, isProject = false) => (
        <div key={index} className="mb-3">
            <div className="flex justify-between items-end mb-1">
                {isProject ? (
                    <h3 className="text-md leading-tight">
                        <span className="font-bold">{entry.name}</span>
                        {(entry.technologies || []).length > 0 && <span className="italic"> | {entry.technologies.join(", ")}</span>}
                    </h3>
                ) : (
                    <h3 className="font-bold text-md leading-tight">{entry.title}</h3>
                )}
                <span className="italic text-sm">{entry.dates}</span>
            </div>
            {!isProject && (entry.company || entry.organization || entry.location) && (
                <div className="flex justify-between items-start mb-1 text-sm italic">
                    <p>{entry.company || entry.organization || ""}</p>
                    <p>{entry.location}</p>
                </div>
            )}
            <ul className="list-disc pl-5 text-sm space-y-1">
                {(entry.bullets || []).map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}
            </ul>
        </div>
    );

    return (
        <>
            <div className="text-center mb-6">
                <h1 className="text-4xl font-bold resume-caps">{resume.basics?.name}</h1>
                <div className="flex justify-center items-center gap-2 mt-1 text-sm flex-wrap">
                    {[resume.basics?.phone, resume.basics?.email, resume.basics?.linkedin, resume.basics?.github, resume.basics?.portfolio].filter(Boolean).map((item, index) => (
                        <React.Fragment key={item}>
                            {index > 0 && <span>|</span>}
                            <span className={item.includes("@") || item.includes(".") ? "underline" : ""}>{item}</span>
                        </React.Fragment>
                    ))}
                </div>
            </div>
            {section("Education", <div>{(resume.education || []).map((item, index) => (
                <div key={index} className="mb-2">
                    <div className="flex justify-between"><strong>{item.school}</strong><span className="text-sm">{item.location}</span></div>
                    <div className="flex justify-between italic text-sm"><span>{item.degree}</span><span>{item.dates}</span></div>
                </div>
            ))}</div>, resume.education?.length)}
            {section("Experience", <div>{(resume.experience || []).map((entry, index) => entryBlock(entry, index))}</div>, resume.experience?.length)}
            {section("Projects", <div>{(resume.projects || []).map((entry, index) => entryBlock(entry, index, true))}</div>, resume.projects?.length)}
            {section("Research", <div>{(resume.research || []).map((entry, index) => entryBlock(entry, index))}</div>, resume.research?.length)}
            {section("Leadership", <div>{(resume.leadership || []).map((entry, index) => entryBlock(entry, index))}</div>, resume.leadership?.length)}
            {section("Technical Skills", <div className="text-sm space-y-1">{(resume.skills || []).map((skill, index) => <p key={index}><strong>{skill.category}:</strong> {(skill.items || []).join(", ")}</p>)}</div>, resume.skills?.length)}
        </>
    );
};

const OriginalResumePreview = ({ resumeState }) => {
    const preview = resumeState?.originalPreview;

    if (!preview) {
        return <StructuredResumePreview resume={syncStructuredResumeFromEditor(resumeState, resumeState.personalInfo, resumeState.jobs || [])} />;
    }

    if (preview.kind === "pdf") {
        return (
            <iframe
                title="Original PDF Resume"
                src={preview.dataUrl}
                className="w-full min-h-[1100px] bg-white border-0"
            />
        );
    }

    if (preview.kind === "html") {
        return (
            <div className="resume-preview-sans text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: preview.html }} />
        );
    }

    if (preview.kind === "text") {
        return <pre className="resume-preview-sans text-sm whitespace-pre-wrap">{preview.text}</pre>;
    }

    return <p className="resume-preview-sans text-sm text-gray-600">{preview.message || "Original preview is not available."}</p>;
};

const downloadTextFile = (filename, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const Dashboard = ({ user, resumeState, onResumeStateChange, onReplaceResume, onSignOut }) => {
    const initialJobsForState = resumeState?.jobs || initialJobs;
    const [personalInfo, setPersonalInfo] = useState(resumeState?.personalInfo || defaultPersonalInfo);
    const [jobs, setJobs] = useState(initialJobsForState);
    const [draggedJobId, setDraggedJobId] = useState(null);
    const [syncStatus, setSyncStatus] = useState("synced");
    const initialLoad = useRef(true);

    const [isAddingJob, setIsAddingJob] = useState(false);
    const [newJob, setNewJob] = useState({ company: "", title: "", duration: "", bullets: "" });
    const [addingVariantToId, setAddingVariantToId] = useState(null);
    const [newVariant, setNewVariant] = useState({ label: "", bullets: "" });
    const [expandedJobs, setExpandedJobs] = useState(initialJobsForState.map((job) => job.id));
    const [previewMode, setPreviewMode] = useState(resumeState?.originalPreview ? "original" : "edited");
    const debugMode = new URLSearchParams(window.location.search).get("debug") === "resume";

    useEffect(() => {
        if (initialLoad.current) {
            initialLoad.current = false;
            return;
        }

        setSyncStatus("saving");
        const saveTimeout = setTimeout(async () => {
            try {
                await onResumeStateChange({
                    ...resumeState,
                    personalInfo,
                    jobs,
                    structuredResume: syncStructuredResumeFromEditor(resumeState, personalInfo, jobs),
                    generatedLatex: generateStructuredLatex(syncStructuredResumeFromEditor(resumeState, personalInfo, jobs)),
                    generatedHtml: generateStructuredHtml(syncStructuredResumeFromEditor(resumeState, personalInfo, jobs)),
                });
                setSyncStatus("synced");
            } catch (error) {
                console.error("Error saving data:", error);
                setSyncStatus("error");
            }
        }, 1000);

        return () => clearTimeout(saveTimeout);
    }, [personalInfo, jobs]);

    const toggleJobInclusion = (id) => {
        setJobs(jobs.map((job) => (job.id === id ? { ...job, included: !job.included } : job)));
    };

    const selectVariant = (jobId, variantId) => {
        setJobs(jobs.map((job) => (job.id === jobId ? { ...job, selectedVariantId: variantId } : job)));
    };

    const toggleJobExpansion = (id) => {
        if (expandedJobs.includes(id)) {
            setExpandedJobs(expandedJobs.filter((jobId) => jobId !== id));
        } else {
            setExpandedJobs([...expandedJobs, id]);
        }
    };

    const handleDragStart = (event, id) => {
        setDraggedJobId(id);
        setTimeout(() => {
            event.target.style.opacity = "0.5";
        }, 0);
    };

    const handleDragEnd = (event) => {
        event.target.style.opacity = "1";
        setDraggedJobId(null);
    };

    const handleDrop = (event, targetId) => {
        event.preventDefault();
        if (!draggedJobId || draggedJobId === targetId) return;

        const draggedIndex = jobs.findIndex((job) => job.id === draggedJobId);
        const targetIndex = jobs.findIndex((job) => job.id === targetId);
        const reorderedJobs = [...jobs];
        const [draggedItem] = reorderedJobs.splice(draggedIndex, 1);
        reorderedJobs.splice(targetIndex, 0, draggedItem);

        setJobs(reorderedJobs);
    };

    const handleAddJobSubmit = (event) => {
        event.preventDefault();
        const newId = `job-${Date.now()}`;
        const variantId = `v1-${Date.now()}`;
        const createdJob = {
            id: newId,
            company: newJob.company,
            title: newJob.title,
            duration: newJob.duration,
            included: true,
            selectedVariantId: variantId,
            variants: [{ id: variantId, label: "Default", bullets: newJob.bullets }],
        };

        setJobs([createdJob, ...jobs]);
        setExpandedJobs([...expandedJobs, newId]);
        setIsAddingJob(false);
        setNewJob({ company: "", title: "", duration: "", bullets: "" });
    };

    const handleAddVariantSubmit = (event, jobId) => {
        event.preventDefault();
        const variantId = `v-${Date.now()}`;
        const addedVariant = { id: variantId, label: newVariant.label, bullets: newVariant.bullets };

        setJobs(
            jobs.map((job) =>
                job.id === jobId
                    ? { ...job, variants: [...job.variants, addedVariant], selectedVariantId: variantId }
                    : job
            )
        );
        setAddingVariantToId(null);
        setNewVariant({ label: "", bullets: "" });
    };

    const handleCopyLatex = () => {
        const latexStr = resumeState?.structuredResume
            ? generateStructuredLatex(syncStructuredResumeFromEditor(resumeState, personalInfo, jobs))
            : generateLatex(personalInfo, jobs.filter((job) => job.included));
        navigator.clipboard
            .writeText(latexStr)
            .then(() => alert("LaTeX copied to clipboard!"))
            .catch((error) => alert(`Failed to copy LaTeX: ${error}`));
    };

    const getEditedStructuredResume = () => syncStructuredResumeFromEditor(resumeState, personalInfo, jobs);

    const handleDownloadLatex = () => {
        downloadTextFile("resume.tex", generateStructuredLatex(getEditedStructuredResume()), "application/x-tex;charset=utf-8");
    };

    const handleDownloadHtml = () => {
        downloadTextFile("resume.html", generateStandaloneHtml(getEditedStructuredResume()), "text/html;charset=utf-8");
    };

    const handleDownloadDoc = () => {
        downloadTextFile("resume.doc", generateDocHtml(getEditedStructuredResume()), "application/msword;charset=utf-8");
    };

    const handleDownloadPdf = () => {
        setPreviewMode("edited");
        setTimeout(() => window.print(), 100);
    };

    const handleReset = () => {
        setPersonalInfo(defaultPersonalInfo);
        setJobs(initialJobs);
        setExpandedJobs(initialJobs.map((job) => job.id));
        const structuredResume = syncStructuredResumeFromEditor({}, defaultPersonalInfo, initialJobs);
        onResumeStateChange({ personalInfo: defaultPersonalInfo, jobs: initialJobs, structuredResume, generatedLatex: generateStructuredLatex(structuredResume), generatedHtml: generateStructuredHtml(structuredResume) })
            .then(() => setSyncStatus("synced"))
            .catch((error) => {
                console.error("Error saving reset data:", error);
                setSyncStatus("error");
            });
    };

    const selectedJobs = jobs.filter((job) => job.included);

    return (
        <div className="flex h-screen w-full bg-app-bg text-app-text overflow-hidden">
            <div className="w-[450px] flex flex-col border-r border-app-border h-full bg-[#0a0a0a]">
                <div className="p-6 pb-4 border-b border-app-border flex justify-between items-center bg-[#0a0a0a] z-10">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">Experience Library</h1>
                        <p className="text-sm text-app-textMuted mt-1">Mix and match job history</p>
                    </div>
                    <button
                        onClick={() => setIsAddingJob(!isAddingJob)}
                        className="w-10 h-10 rounded-full bg-app-card hover:bg-app-cardHover flex items-center justify-center transition-colors border border-app-border shadow-sm"
                    >
                        <IconPlus />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {isAddingJob && (
                        <div className="bg-app-card border border-app-border p-4 rounded-2xl animate-[fadeIn_0.2s_ease-out]">
                            <h3 className="font-semibold text-lg mb-3">Add Experience</h3>
                            <form onSubmit={handleAddJobSubmit} className="space-y-3">
                                <input required placeholder="Company Name" className="w-full bg-[#0a0a0a] border border-app-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-app-textMuted" value={newJob.company} onChange={(event) => setNewJob({ ...newJob, company: event.target.value })} />
                                <input required placeholder="Job Title" className="w-full bg-[#0a0a0a] border border-app-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-app-textMuted" value={newJob.title} onChange={(event) => setNewJob({ ...newJob, title: event.target.value })} />
                                <input required placeholder="Duration (e.g. Jan 2021 - Mar 2023)" className="w-full bg-[#0a0a0a] border border-app-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-app-textMuted" value={newJob.duration} onChange={(event) => setNewJob({ ...newJob, duration: event.target.value })} />
                                <textarea required placeholder="Bullet points (one per line)" className="w-full bg-[#0a0a0a] border border-app-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-app-textMuted h-24" value={newJob.bullets} onChange={(event) => setNewJob({ ...newJob, bullets: event.target.value })} />
                                <div className="flex justify-end space-x-2 pt-2">
                                    <button type="button" onClick={() => setIsAddingJob(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-[#38383a]">Cancel</button>
                                    <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-white text-black font-medium hover:bg-gray-200">Save</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {jobs.map((job) => {
                        const isExpanded = expandedJobs.includes(job.id);
                        const activeVariant = job.variants.find((variant) => variant.id === job.selectedVariantId);
                        const firstBullet = activeVariant ? activeVariant.bullets.split("\n")[0] : "";

                        return (
                            <div
                                key={job.id}
                                draggable
                                onDragStart={(event) => handleDragStart(event, job.id)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => handleDrop(event, job.id)}
                                className={`bg-app-card border rounded-2xl transition-all duration-200 ${job.included ? "border-app-accent/50 shadow-md" : "border-app-border opacity-70"} ${draggedJobId === job.id ? "opacity-50" : ""}`}
                            >
                                <div className="p-4 flex items-start gap-3">
                                    <div className="mt-1 cursor-grab active:cursor-grabbing">
                                        <IconDrag />
                                    </div>
                                    <div className="pt-1">
                                        <input type="checkbox" checked={job.included} onChange={() => toggleJobInclusion(job.id)} className="w-5 h-5 rounded accent-white border-app-border cursor-pointer" />
                                    </div>
                                    <div className="flex-1 cursor-pointer select-none" onClick={() => toggleJobExpansion(job.id)}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className={`font-semibold text-lg ${job.included ? "text-white" : "text-app-textMuted"}`}>{job.company}</h3>
                                                <p className="text-sm text-app-textMuted">{job.title} &bull; {job.duration}</p>
                                            </div>
                                            <div className="text-app-textMuted">{isExpanded ? <IconChevronUp /> : <IconChevronDown />}</div>
                                        </div>
                                        {!isExpanded && activeVariant && (
                                            <p className="text-sm text-app-textMuted mt-2 line-clamp-1 italic">"{firstBullet}"</p>
                                        )}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-4 pt-0 border-t border-app-border/50 mt-2">
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-app-textMuted uppercase tracking-wider">Variants</span>
                                            <button onClick={() => setAddingVariantToId(addingVariantToId === job.id ? null : job.id)} className="text-xs flex items-center gap-1 text-app-text hover:text-white">
                                                <IconPlus size={14} /> Add Variant
                                            </button>
                                        </div>

                                        <div className="mt-3 space-y-2">
                                            {job.variants.map((variant) => (
                                                <div
                                                    key={variant.id}
                                                    onClick={() => selectVariant(job.id, variant.id)}
                                                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${job.selectedVariantId === variant.id ? "bg-[#2C2C2E] border-app-accent/30" : "bg-[#0a0a0a] border-app-border hover:border-app-textMuted/50"}`}
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <input type="radio" checked={job.selectedVariantId === variant.id} onChange={() => selectVariant(job.id, variant.id)} className="accent-white cursor-pointer" />
                                                        <span className="font-medium text-sm">{variant.label}</span>
                                                    </div>
                                                    <ul className="text-xs text-app-textMuted space-y-1 list-disc pl-5">
                                                        {variant.bullets.split("\n").map((bullet, index) => bullet.trim() && <li key={index}>{bullet}</li>)}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>

                                        {addingVariantToId === job.id && (
                                            <form onSubmit={(event) => handleAddVariantSubmit(event, job.id)} className="mt-3 p-3 bg-[#0a0a0a] rounded-xl border border-app-border">
                                                <input required placeholder="Variant Label (e.g. Backend Focus)" className="w-full bg-transparent border-b border-app-border px-2 py-1 mb-2 text-sm focus:outline-none" value={newVariant.label} onChange={(event) => setNewVariant({ ...newVariant, label: event.target.value })} />
                                                <textarea required placeholder="Bullet points (one per line)" className="w-full bg-transparent border border-app-border rounded px-2 py-1 text-sm focus:outline-none h-20" value={newVariant.bullets} onChange={(event) => setNewVariant({ ...newVariant, bullets: event.target.value })} />
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button type="button" onClick={() => setAddingVariantToId(null)} className="text-xs px-3 py-1 rounded hover:bg-[#38383a]">Cancel</button>
                                                    <button type="submit" className="text-xs px-3 py-1 rounded bg-white text-black font-medium hover:bg-gray-200">Save</button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-app-border bg-[#0a0a0a] flex items-center justify-between">
                    <div className="flex flex-col truncate pr-2">
                        <span className="text-xs text-app-textMuted">Signed in as</span>
                        <span className="text-sm text-white truncate font-medium">{user?.email}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onReplaceResume} className="text-xs bg-[#1C1C1E] border border-app-border hover:bg-[#2C2C2E] px-3 py-1.5 rounded-lg font-medium transition-colors">
                            Upload New
                        </button>
                        <button onClick={handleReset} className="text-xs bg-[#1C1C1E] border border-app-border hover:bg-[#2C2C2E] px-3 py-1.5 rounded-lg font-medium transition-colors">
                            Reset
                        </button>
                        <button onClick={onSignOut} className="text-xs bg-[#1C1C1E] border border-app-border hover:bg-red-950 hover:text-red-300 hover:border-red-900/50 px-3 py-1.5 rounded-lg font-medium transition-colors">
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-[#111111] relative">
                <div className="absolute top-6 left-6 z-10 flex items-center gap-2 bg-[#1C1C1E] border border-app-border px-3 py-1.5 rounded-full text-xs">
                    {syncStatus === "synced" && (
                        <>
                            <IconCloudCheck />
                            <span className="text-app-textMuted">Saved to Supabase</span>
                        </>
                    )}
                    {syncStatus === "saving" && (
                        <>
                            <IconCloudSync />
                            <span className="text-orange-400">Saving changes...</span>
                        </>
                    )}
                    {syncStatus === "error" && <span className="text-red-500">Save Error</span>}
                </div>

                <div className="absolute top-6 right-6 z-10 flex gap-3 flex-wrap justify-end max-w-[760px]">
                    {resumeState?.originalPreview && (
                        <div className="bg-app-card border border-app-border rounded-xl p-1 flex">
                            <button onClick={() => setPreviewMode("original")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${previewMode === "original" ? "bg-white text-black" : "text-app-textMuted hover:text-white"}`}>
                                Original
                            </button>
                            <button onClick={() => setPreviewMode("edited")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${previewMode === "edited" ? "bg-white text-black" : "text-app-textMuted hover:text-white"}`}>
                                Edited
                            </button>
                        </div>
                    )}
                    <button onClick={handleCopyLatex} className="bg-app-card border border-app-border text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-app-cardHover shadow-lg flex items-center gap-2 transition-transform active:scale-95">
                        Copy as LaTeX
                    </button>
                    <button onClick={handleDownloadLatex} className="bg-app-card border border-app-border text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-app-cardHover shadow-lg">
                        Download .tex
                    </button>
                    <button onClick={handleDownloadHtml} className="bg-app-card border border-app-border text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-app-cardHover shadow-lg">
                        Download HTML
                    </button>
                    <button onClick={handleDownloadDoc} className="bg-app-card border border-app-border text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-app-cardHover shadow-lg">
                        Download DOC
                    </button>
                    <button onClick={handleDownloadPdf} className="bg-app-card border border-app-border text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-app-cardHover shadow-lg">
                        Print PDF
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-12 flex justify-center items-start">
                    <div className="bg-white text-black w-full max-w-[850px] min-h-[1100px] shadow-2xl p-12 resume-preview relative">
                        {previewMode === "original" && resumeState?.originalPreview ? (
                            <OriginalResumePreview resumeState={resumeState} />
                        ) : resumeState?.structuredResume ? (
                            <StructuredResumePreview resume={syncStructuredResumeFromEditor(resumeState, personalInfo, jobs)} />
                        ) : (
                        <>
                            <div className="text-center mb-6">
                            <input className="text-4xl font-bold resume-caps w-full text-center outline-none bg-transparent hover:bg-gray-100 transition-colors" value={personalInfo.name} onChange={(event) => setPersonalInfo({ ...personalInfo, name: event.target.value })} />
                            <div className="flex justify-center items-center gap-2 mt-1 text-sm">
                                <input className="outline-none bg-transparent hover:bg-gray-100 text-center w-32" value={personalInfo.phone} onChange={(event) => setPersonalInfo({ ...personalInfo, phone: event.target.value })} />
                                <span>|</span>
                                <input className="outline-none bg-transparent hover:bg-gray-100 text-center w-48 underline" value={personalInfo.email} onChange={(event) => setPersonalInfo({ ...personalInfo, email: event.target.value })} />
                                <span>|</span>
                                <input className="outline-none bg-transparent hover:bg-gray-100 text-center w-56 underline" value={personalInfo.linkedin} onChange={(event) => setPersonalInfo({ ...personalInfo, linkedin: event.target.value })} />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl resume-caps border-b border-black mb-2">Experience</h2>
                            <div className="space-y-4">
                                {selectedJobs.map((job) => {
                                    const activeVariant = job.variants.find((variant) => variant.id === job.selectedVariantId);
                                    const bullets = activeVariant ? activeVariant.bullets.split("\n") : [];

                                    return (
                                        <div key={`prev-${job.id}`}>
                                            <div className="flex justify-between items-end mb-1">
                                                <h3 className="font-bold text-md leading-tight">{job.title}</h3>
                                                <span className="italic text-sm">{job.duration}</span>
                                            </div>
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="italic text-sm">{job.company}</p>
                                            </div>
                                            <ul className="list-disc pl-5 text-sm space-y-1">
                                                {bullets.map((bullet, index) => bullet.trim() && <li key={index}>{bullet}</li>)}
                                            </ul>
                                        </div>
                                    );
                                })}

                                {selectedJobs.length === 0 && (
                                    <p className="text-gray-500 italic text-center py-10">Select jobs from the sidebar to populate the resume.</p>
                                )}
                            </div>
                        </div>
                        </>
                        )}
                        {debugMode && resumeState?.structuredResume && (
                            <details className="mt-8 resume-preview-sans text-xs whitespace-pre-wrap border-t border-gray-300 pt-4">
                                <summary className="cursor-pointer font-bold">Parser Debug</summary>
                                <h3 className="font-bold mt-3">Detected Sections</h3>
                                <pre>{JSON.stringify(resumeState.sectionBoundaries || {}, null, 2)}</pre>
                                <h3 className="font-bold mt-3">Structured JSON</h3>
                                <pre>{JSON.stringify(resumeState.structuredResume, null, 2)}</pre>
                                <h3 className="font-bold mt-3">Generated LaTeX</h3>
                                <pre>{resumeState.generatedLatex}</pre>
                                <h3 className="font-bold mt-3">Raw Text</h3>
                                <pre>{resumeState.rawText}</pre>
                            </details>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
