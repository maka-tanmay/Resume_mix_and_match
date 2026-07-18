const { useState, useEffect, useRef } = React;

// Per-section config for the library sidebar. `fields` are [key, placeholder, kind?]
// where kind "csv" edits an array as comma-separated text. Entry-like sections
// carry wording variants; the active variant supplies the preview/LaTeX bullets.
const SECTION_META = {
    education: {
        label: "Education",
        fields: [["school", "School"], ["degree", "Degree"], ["location", "Location"], ["dates", "Dates (e.g. Aug 2016 - May 2020)"]],
        hasVariants: false,
        summary: (item) => [item.school, item.degree].filter(Boolean).join(" — "),
        subSummary: (item) => item.dates || "",
        blank: () => ({ school: "", degree: "", location: "", dates: "" }),
    },
    experience: {
        label: "Experience",
        fields: [["title", "Job Title"], ["company", "Company"], ["location", "Location"], ["dates", "Dates (e.g. Jan 2021 - Present)"]],
        hasVariants: true,
        summary: (item) => [item.title, item.company].filter(Boolean).join(" — "),
        subSummary: (item) => item.dates || "",
        blank: () => ({ title: "", company: "", location: "", dates: "" }),
    },
    projects: {
        label: "Projects",
        fields: [["name", "Project Name"], ["technologies", "Technologies (comma separated)", "csv"], ["dates", "Dates"]],
        hasVariants: true,
        summary: (item) => item.name || "",
        subSummary: (item) => [(item.technologies || []).join(", "), item.dates].filter(Boolean).join(" • "),
        blank: () => ({ name: "", technologies: [], dates: "" }),
    },
    research: {
        label: "Research",
        fields: [["title", "Title"], ["company", "Organization / Lab"], ["location", "Location"], ["dates", "Dates"]],
        hasVariants: true,
        summary: (item) => [item.title, item.company].filter(Boolean).join(" — "),
        subSummary: (item) => item.dates || "",
        blank: () => ({ title: "", company: "", location: "", dates: "" }),
    },
    leadership: {
        label: "Leadership",
        fields: [["title", "Role"], ["company", "Organization"], ["location", "Location"], ["dates", "Dates"]],
        hasVariants: true,
        summary: (item) => [item.title, item.company].filter(Boolean).join(" — "),
        subSummary: (item) => item.dates || "",
        blank: () => ({ title: "", company: "", location: "", dates: "" }),
    },
    skills: {
        label: "Technical Skills",
        fields: [["category", "Category (e.g. Languages)"], ["items", "Items (comma separated)", "csv"]],
        hasVariants: false,
        summary: (item) => item.category || "",
        subSummary: (item) => (item.items || []).join(", "),
        blank: () => ({ category: "", items: [] }),
    },
};

// Mirrors the Jake's Resume template layout: small-caps ruled section titles,
// bold title / italic organization rows, and the same section order as the
// generated LaTeX so the preview matches the compiled PDF.
// When personalInfo + onPersonalInfoChange are provided, the header contact
// block is rendered as inline-editable inputs.
const StructuredResumePreview = ({ resume, personalInfo, onPersonalInfoChange }) => {
    const editable = Boolean(personalInfo && onPersonalInfoChange);
    const updatePersonalInfo = (field) => (event) => onPersonalInfoChange({ ...personalInfo, [field]: event.target.value });

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

    const sectionBlocks = {
        education: () => section("Education", <div>{(resume.education || []).map((item, index) => (
            <div key={index} className="mb-2">
                <div className="flex justify-between"><strong>{item.school}</strong><span className="text-sm">{item.location}</span></div>
                <div className="flex justify-between italic text-sm"><span>{item.degree}</span><span>{item.dates}</span></div>
            </div>
        ))}</div>, resume.education?.length),
        experience: () => section("Experience", <div>{(resume.experience || []).map((entry, index) => entryBlock(entry, index))}</div>, resume.experience?.length),
        projects: () => section("Projects", <div>{(resume.projects || []).map((entry, index) => entryBlock(entry, index, true))}</div>, resume.projects?.length),
        research: () => section("Research", <div>{(resume.research || []).map((entry, index) => entryBlock(entry, index))}</div>, resume.research?.length),
        leadership: () => section("Leadership", <div>{(resume.leadership || []).map((entry, index) => entryBlock(entry, index))}</div>, resume.leadership?.length),
        skills: () => section("Technical Skills", <div className="text-sm space-y-1">{(resume.skills || []).map((skill, index) => <p key={index}><strong>{skill.category}:</strong> {(skill.items || []).join(", ")}</p>)}</div>, resume.skills?.length),
    };

    const editableContactFields = [
        ["phone", "Phone", "w-32"],
        ["email", "Email", "w-44 underline"],
        ["linkedin", "LinkedIn", "w-48 underline"],
        ["github", "GitHub", "w-40 underline"],
        ["portfolio", "Portfolio", "w-40 underline"],
    ];

    return (
        <>
            <div className="text-center mb-6">
                {editable ? (
                    <input
                        className="text-4xl font-bold resume-caps w-full text-center outline-none bg-transparent hover:bg-gray-100 transition-colors"
                        value={personalInfo.name || ""}
                        placeholder="Your Name"
                        onChange={updatePersonalInfo("name")}
                    />
                ) : (
                    <h1 className="text-4xl font-bold resume-caps">{resume.basics?.name}</h1>
                )}
                {editable ? (
                    <div className="flex justify-center items-center gap-2 mt-1 text-sm flex-wrap">
                        {editableContactFields.map(([field, placeholder, className], index) => (
                            <React.Fragment key={field}>
                                {index > 0 && <span className="text-gray-400">|</span>}
                                <input
                                    className={`outline-none bg-transparent hover:bg-gray-100 text-center ${className}`}
                                    placeholder={placeholder}
                                    value={personalInfo[field] || ""}
                                    onChange={updatePersonalInfo(field)}
                                />
                            </React.Fragment>
                        ))}
                    </div>
                ) : (
                    <div className="flex justify-center items-center gap-2 mt-1 text-sm flex-wrap">
                        {[resume.basics?.phone, resume.basics?.email, resume.basics?.linkedin, resume.basics?.github, resume.basics?.portfolio].filter(Boolean).map((item, index) => (
                            <React.Fragment key={`${item}-${index}`}>
                                {index > 0 && <span>|</span>}
                                <span className={item.includes("@") || item.includes(".") ? "underline" : ""}>{item}</span>
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
            {resolveSectionOrder(resume).map((key) => (
                <React.Fragment key={key}>{sectionBlocks[key]()}</React.Fragment>
            ))}
        </>
    );
};

const OriginalResumePreview = ({ resumeState, fallbackResume }) => {
    const preview = resumeState?.originalPreview;

    if (!preview) {
        return <StructuredResumePreview resume={fallbackResume} />;
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

// Personal info edited once here, rendered by whichever template is selected.
const ContactEditor = ({ personalInfo, onChange }) => {
    const field = (key, placeholder, className = "") => (
        <input
            key={key}
            className={`bg-[#0a0a0a] border border-app-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-app-textMuted ${className}`}
            placeholder={placeholder}
            value={personalInfo[key] || ""}
            onChange={(event) => onChange({ ...personalInfo, [key]: event.target.value })}
        />
    );

    return (
        <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-app-textMuted mb-2">Contact</h2>
            <div className="grid grid-cols-2 gap-2">
                {field("name", "Full Name", "col-span-2")}
                {field("phone", "Phone")}
                {field("email", "Email")}
                {field("linkedin", "LinkedIn")}
                {field("github", "GitHub")}
                {field("portfolio", "Portfolio / Website", "col-span-2")}
            </div>
        </section>
    );
};

const ATS_BADGE_STYLES = {
    A: "bg-emerald-950 text-emerald-300 border-emerald-900",
    B: "bg-yellow-950 text-yellow-300 border-yellow-900",
    C: "bg-orange-950 text-orange-300 border-orange-900",
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

const VariantsEditor = ({ item, onPatch }) => {
    const variants = item.variants || [];

    const patchVariant = (variantId, patch) =>
        onPatch({ variants: variants.map((variant) => (variant.id === variantId ? { ...variant, ...patch } : variant)) });

    const addVariant = () => {
        const active = variants.find((variant) => variant.id === item.selectedVariantId) || variants[0];
        const variantId = createItemId("var");
        onPatch({
            variants: [...variants, { id: variantId, label: `Variant ${variants.length + 1}`, bullets: active?.bullets || "" }],
            selectedVariantId: variantId,
        });
    };

    const removeVariant = (variantId) => {
        const remaining = variants.filter((variant) => variant.id !== variantId);
        onPatch({
            variants: remaining,
            selectedVariantId: item.selectedVariantId === variantId ? remaining[0]?.id : item.selectedVariantId,
        });
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-app-textMuted uppercase tracking-wider">Variants</span>
                <button type="button" onClick={addVariant} className="text-xs text-app-text hover:text-white flex items-center gap-1">
                    <IconPlus size={12} /> Add Variant
                </button>
            </div>
            {variants.map((variant) => (
                <div
                    key={variant.id}
                    className={`p-2 rounded-lg border ${item.selectedVariantId === variant.id ? "bg-[#2C2C2E] border-app-accent/30" : "bg-[#0a0a0a] border-app-border"}`}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <input
                            type="radio"
                            checked={item.selectedVariantId === variant.id}
                            onChange={() => onPatch({ selectedVariantId: variant.id })}
                            className="accent-white cursor-pointer"
                        />
                        <input
                            className="flex-1 bg-transparent text-xs font-medium border-b border-transparent focus:border-app-border focus:outline-none py-0.5"
                            value={variant.label}
                            placeholder="Variant label"
                            onChange={(event) => patchVariant(variant.id, { label: event.target.value })}
                        />
                        {variants.length > 1 && (
                            <button type="button" onClick={() => removeVariant(variant.id)} className="text-app-textMuted hover:text-red-400 text-xs px-1">
                                ✕
                            </button>
                        )}
                    </div>
                    <textarea
                        className="w-full bg-transparent border border-app-border/60 rounded px-2 py-1 text-xs focus:outline-none focus:border-app-textMuted h-20"
                        placeholder="Bullet points (one per line)"
                        value={variant.bullets}
                        onChange={(event) => patchVariant(variant.id, { bullets: event.target.value })}
                    />
                </div>
            ))}
        </div>
    );
};

const LibraryItemCard = ({ sectionKey, item, index, total, expanded, onToggleExpanded, onPatch, onRemove, onMove, onMoveToSection, onDragStart, onDragEnd, onDrop, dragging }) => {
    const meta = SECTION_META[sectionKey];
    const summary = meta.summary(item) || "Untitled";
    const flagged = isFlaggedItem(item);
    // A field edit counts as a human review: clear the flag.
    const patchField = (patch) => onPatch(typeof item.confidence === "number" ? { ...patch, confidence: 1 } : patch);

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            className={`bg-app-card border rounded-xl transition-all ${item.included ? "border-app-accent/40" : "border-app-border opacity-70"} ${dragging ? "opacity-50" : ""}`}
        >
            <div className="p-3 flex items-start gap-2">
                <span className="mt-0.5 text-app-textMuted cursor-grab active:cursor-grabbing select-none" title="Drag to reorder">⠿</span>
                <input
                    type="checkbox"
                    checked={Boolean(item.included)}
                    onChange={() => onPatch({ included: !item.included })}
                    className="w-4 h-4 mt-0.5 rounded accent-white border-app-border cursor-pointer shrink-0"
                    title="Include in resume"
                />
                <div className="flex-1 min-w-0 cursor-pointer select-none" onClick={onToggleExpanded}>
                    <p className={`text-sm font-medium truncate ${item.included ? "text-white" : "text-app-textMuted"}`}>
                        {flagged && (
                            <span
                                className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2 align-middle"
                                title="The importer wasn't confident about this item — expand it and check the fields."
                            />
                        )}
                        {summary}
                    </p>
                    <p className="text-xs text-app-textMuted truncate">{meta.subSummary(item)}</p>
                    {item.source && <p className="text-[10px] uppercase tracking-wider text-app-textMuted/60 mt-0.5 truncate">{item.source}</p>}
                </div>
                <div className="flex flex-col shrink-0">
                    <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => onMove(-1)}
                        className="text-app-textMuted hover:text-white disabled:opacity-20 text-[10px] leading-3 px-1"
                        title="Move up"
                    >
                        ▲
                    </button>
                    <button
                        type="button"
                        disabled={index === total - 1}
                        onClick={() => onMove(1)}
                        className="text-app-textMuted hover:text-white disabled:opacity-20 text-[10px] leading-3 px-1"
                        title="Move down"
                    >
                        ▼
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="px-3 pb-3 pt-2 border-t border-app-border/50 space-y-2">
                    {meta.fields.map(([field, placeholder, kind]) => (
                        kind === "csv" ? (
                            <input
                                key={`${item.id}-${field}`}
                                defaultValue={(item[field] || []).join(", ")}
                                placeholder={placeholder}
                                onBlur={(event) => patchField({ [field]: event.target.value.split(",").map((part) => part.trim()).filter(Boolean) })}
                                className="w-full bg-[#0a0a0a] border border-app-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-app-textMuted"
                            />
                        ) : (
                            <input
                                key={`${item.id}-${field}`}
                                value={item[field] || ""}
                                placeholder={placeholder}
                                onChange={(event) => patchField({ [field]: event.target.value })}
                                className="w-full bg-[#0a0a0a] border border-app-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-app-textMuted"
                            />
                        )
                    ))}
                    {meta.hasVariants && <VariantsEditor item={item} onPatch={onPatch} />}
                    <div className="flex items-center justify-between">
                        {onMoveToSection ? (
                            <label className="text-xs text-app-textMuted flex items-center gap-1.5">
                                Section:
                                <select
                                    value={sectionKey}
                                    onChange={(event) => onMoveToSection(event.target.value)}
                                    className="bg-[#0a0a0a] border border-app-border rounded px-1.5 py-1 text-xs focus:outline-none"
                                    title="Move this item to a different section (fixes misfiled imports)"
                                >
                                    {["experience", "projects", "research", "leadership"].map((key) => (
                                        <option key={key} value={key}>{SECTION_META[key].label}</option>
                                    ))}
                                </select>
                            </label>
                        ) : <span />}
                        <button type="button" onClick={onRemove} className="text-xs text-red-400/80 hover:text-red-300">
                            Delete from library
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const Dashboard = ({ user, resumeState, onResumeStateChange, onReplaceResume, onSignOut, supabaseClient = null, signOutLabel = "Sign Out", syncTargetLabel = "Saved to Supabase" }) => {
    const [personalInfo, setPersonalInfo] = useState(resumeState?.personalInfo || { ...defaultPersonalInfo });
    const [library, setLibrary] = useState(resumeState?.library || createEmptyLibrary());
    const [sectionOrder, setSectionOrder] = useState(normalizeSectionOrder(resumeState?.sectionOrder));
    const [expandedItems, setExpandedItems] = useState({});
    const [selectedTemplateId, setSelectedTemplateId] = useState(resumeState?.selectedTemplateId || DEFAULT_TEMPLATE_ID);
    const [syncStatus, setSyncStatus] = useState("synced");
    const [previewMode, setPreviewMode] = useState(resumeState?.originalPreview ? "original" : "edited");
    const [latexDraft, setLatexDraft] = useState("");
    const [latexError, setLatexError] = useState("");
    const [importStatus, setImportStatus] = useState({ loading: false, error: "" });
    const [parseStats, setParseStats] = useState(resumeState?.parseStats || null);
    const [aiFixing, setAiFixing] = useState(false);
    const [aiError, setAiError] = useState("");
    const [draggedItem, setDraggedItem] = useState(null);
    const importInput = useRef(null);
    // Raw text of the most recent import, kept so "Fix with AI" can re-parse it.
    const lastImportRef = useRef(null);
    const initialLoad = useRef(true);
    // The debounced autosave below fires up to 1s after a render; read the
    // resume state through a ref so it merges into the *latest* saved state
    // (e.g. after Reset) instead of the render it was scheduled in.
    const resumeStateRef = useRef(resumeState);
    useEffect(() => {
        resumeStateRef.current = resumeState;
    }, [resumeState]);
    const debugMode = new URLSearchParams(window.location.search).get("debug") === "resume";

    const structuredResume = libraryToStructuredResume(personalInfo, library, sectionOrder);
    const currentLatex = generateStructuredLatex(structuredResume);
    const hasIncludedContent = RESUME_SECTION_KEYS.some((key) => (structuredResume[key] || []).length);
    const estimatedPages = estimateResumePages(structuredResume);
    const selectedTemplate = getResumeTemplate(selectedTemplateId);

    useEffect(() => {
        if (initialLoad.current) {
            initialLoad.current = false;
            return;
        }

        setSyncStatus("saving");
        const saveTimeout = setTimeout(async () => {
            try {
                const { jobs: _legacyJobs, ...latest } = resumeStateRef.current || {};
                await onResumeStateChange(buildResumeStateProjections({ ...latest, personalInfo, library, sectionOrder, selectedTemplateId, parseStats }));
                setSyncStatus("synced");
            } catch (error) {
                console.error("Error saving data:", error);
                setSyncStatus("error");
            }
        }, 1000);

        return () => clearTimeout(saveTimeout);
    }, [personalInfo, library, sectionOrder, selectedTemplateId, parseStats]);

    const toggleExpanded = (id) => setExpandedItems((expanded) => ({ ...expanded, [id]: !expanded[id] }));

    const patchItem = (sectionKey, id, patch) =>
        setLibrary((lib) => ({ ...lib, [sectionKey]: lib[sectionKey].map((item) => (item.id === id ? { ...item, ...patch } : item)) }));

    const removeItem = (sectionKey, id) =>
        setLibrary((lib) => ({ ...lib, [sectionKey]: lib[sectionKey].filter((item) => item.id !== id) }));

    const moveItem = (sectionKey, id, delta) =>
        setLibrary((lib) => {
            const items = [...lib[sectionKey]];
            const from = items.findIndex((item) => item.id === id);
            const to = from + delta;
            if (from < 0 || to < 0 || to >= items.length) return lib;
            const [moved] = items.splice(from, 1);
            items.splice(to, 0, moved);
            return { ...lib, [sectionKey]: items };
        });

    const addItem = (sectionKey) => {
        const meta = SECTION_META[sectionKey];
        const item = {
            id: createItemId(sectionKey),
            included: true,
            source: "manual",
            ...meta.blank(),
            ...(meta.hasVariants ? createVariantSet([], "Default") : {}),
        };
        setLibrary((lib) => ({ ...lib, [sectionKey]: [item, ...lib[sectionKey]] }));
        setExpandedItems((expanded) => ({ ...expanded, [item.id]: true }));
    };

    const moveSection = (sectionKey, delta) =>
        setSectionOrder((order) => {
            const next = [...order];
            const from = next.indexOf(sectionKey);
            const to = from + delta;
            if (from < 0 || to < 0 || to >= next.length) return order;
            next.splice(from, 1);
            next.splice(to, 0, sectionKey);
            return next;
        });

    const moveItemToSection = (fromSection, id, toSection) => {
        setLibrary((lib) => {
            const item = lib[fromSection].find((candidate) => candidate.id === id);
            const converted = item ? convertItemForSection(item, fromSection, toSection) : null;
            if (!converted) return lib;
            return {
                ...lib,
                [fromSection]: lib[fromSection].filter((candidate) => candidate.id !== id),
                [toSection]: [converted, ...lib[toSection]],
            };
        });
    };

    const handleItemDrop = (sectionKey, targetId) => {
        if (!draggedItem || draggedItem.sectionKey !== sectionKey || draggedItem.id === targetId) return;
        setLibrary((lib) => {
            const items = [...lib[sectionKey]];
            const from = items.findIndex((item) => item.id === draggedItem.id);
            const to = items.findIndex((item) => item.id === targetId);
            if (from < 0 || to < 0) return lib;
            const [moved] = items.splice(from, 1);
            items.splice(to, 0, moved);
            return { ...lib, [sectionKey]: items };
        });
    };

    const handleImportClick = () => {
        setImportStatus({ loading: false, error: "" });
        importInput.current?.click();
    };

    const handleImportSelected = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        setImportStatus({ loading: true, error: "" });
        try {
            const parsed = await parseUploadedResume(file, detectResumeFormat(file));
            const incoming = createLibraryFromStructuredResume(parsed.structuredResume, file.name);
            setLibrary((lib) => mergeLibraries(lib, incoming));
            setPersonalInfo((info) => fillEmptyPersonalInfo(info, parsed.structuredResume.basics || {}));
            lastImportRef.current = { source: file.name, rawText: parsed.rawText };
            setParseStats(createParseStats(incoming, file.name));
            setAiError("");
            setImportStatus({ loading: false, error: "" });
        } catch (error) {
            setImportStatus({ loading: false, error: error.message || "Could not read this resume file." });
        }
    };

    const dismissReview = () => setParseStats((stats) => (stats ? { ...stats, reviewedAt: new Date().toISOString() } : stats));

    const handleAiFix = async () => {
        if (!parseStats) return;
        const rawText = lastImportRef.current?.source === parseStats.source
            ? lastImportRef.current.rawText
            : (resumeState?.sourceFile?.name === parseStats.source ? resumeState?.rawText : null);
        if (!rawText) {
            setAiError("The original text of this import is no longer available — re-import the file to use AI parsing.");
            return;
        }

        setAiFixing(true);
        setAiError("");
        try {
            const structuredResume = await aiParseResume(supabaseClient, rawText);
            const incoming = createLibraryFromStructuredResume(structuredResume, parseStats.source);
            // The AI result replaces everything from the same import; items from
            // other sources (samples, other resumes, manual entries) are kept.
            setLibrary((lib) => Object.fromEntries(
                RESUME_SECTION_KEYS.map((key) => [key, [...incoming[key], ...lib[key].filter((item) => item.source !== parseStats.source)]])
            ));
            setPersonalInfo((info) => fillEmptyPersonalInfo(info, structuredResume.basics || {}));
            setParseStats({ ...createParseStats(incoming, parseStats.source), aiFixed: true });
        } catch (error) {
            setAiError(error.message || "AI parsing failed.");
        } finally {
            setAiFixing(false);
        }
    };

    const openLatexView = () => {
        setLatexDraft(currentLatex);
        setLatexError("");
        setPreviewMode("latex");
    };

    const handleApplyLatex = () => {
        try {
            const parsed = parseLatexSource(latexDraft);
            const parsedResume = parsed.structuredResume;
            const hasContent = RESUME_SECTION_KEYS.some((key) => (parsedResume[key] || []).length);
            if (!hasContent) {
                throw new Error("No resume sections found. Keep the \\section{...} headings so entries can be parsed.");
            }

            const incoming = createLibraryFromStructuredResume(parsedResume, "latex-edit");
            // The LaTeX document represents the current selection: parsed entries
            // replace the included items; unchecked library items are untouched.
            setLibrary((lib) => Object.fromEntries(
                RESUME_SECTION_KEYS.map((key) => [key, [...incoming[key], ...lib[key].filter((item) => !item.included)]])
            ));
            const basics = parsedResume.basics || {};
            setPersonalInfo((info) => fillEmptyPersonalInfo({
                ...info,
                name: basics.name || info.name,
                email: basics.email || info.email,
                phone: basics.phone || info.phone,
                linkedin: basics.linkedin || info.linkedin,
            }, basics));
            setLatexError("");
            setPreviewMode("edited");
        } catch (error) {
            setLatexError(error.message || "Could not parse the LaTeX source.");
        }
    };

    const exportLatex = () => (previewMode === "latex" ? latexDraft : currentLatex);

    // "Tanmay_Maka_Resume.tex" reads far better to recruiters than "resume.tex".
    const exportBaseName = () => {
        const slug = (personalInfo.name || "").trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
        return slug ? `${slug}_Resume` : "Resume";
    };

    const handleCopyLatex = () => {
        navigator.clipboard
            .writeText(exportLatex())
            .then(() => alert("LaTeX copied to clipboard!"))
            .catch((error) => alert(`Failed to copy LaTeX: ${error}`));
    };

    const handleDownloadLatex = () => {
        downloadTextFile(`${exportBaseName()}.tex`, exportLatex(), "application/x-tex;charset=utf-8");
    };

    const handleDownloadHtml = () => {
        downloadTextFile(`${exportBaseName()}.html`, generateStandaloneHtml(structuredResume, selectedTemplate), "text/html;charset=utf-8");
    };

    const handleDownloadDoc = () => {
        downloadTextFile(`${exportBaseName()}.doc`, generateDocHtml(structuredResume, selectedTemplate), "application/msword;charset=utf-8");
    };

    const handleDownloadPdf = () => {
        setPreviewMode("edited");
        setTimeout(() => window.print(), 100);
    };

    // Overleaf's "open in Overleaf" API: POST the LaTeX source as `snip` to
    // /docs and it creates a project — real compiled output in one click.
    const handleOpenOverleaf = () => {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = "https://www.overleaf.com/docs";
        form.target = "_blank";
        const snip = document.createElement("textarea");
        snip.name = "snip";
        snip.value = exportLatex();
        form.appendChild(snip);
        document.body.appendChild(form);
        form.submit();
        form.remove();
    };

    const handleReset = () => {
        const sample = createResumeStateFromSample();
        setPersonalInfo(sample.personalInfo);
        setLibrary(sample.library);
        setSectionOrder(sample.sectionOrder);
        setExpandedItems({});
        setParseStats(null);
        setAiError("");
        setPreviewMode("edited");
        onResumeStateChange(sample)
            .then(() => setSyncStatus("synced"))
            .catch((error) => {
                console.error("Error saving reset data:", error);
                setSyncStatus("error");
            });
    };

    return (
        <div className="flex h-screen w-full bg-app-bg text-app-text overflow-hidden">
            <div className="w-[480px] flex flex-col border-r border-app-border h-full bg-[#0a0a0a]">
                <div className="p-6 pb-4 border-b border-app-border flex justify-between items-center gap-3 bg-[#0a0a0a] z-10">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight text-white">Resume Library</h1>
                        <p className="text-sm text-app-textMuted mt-1">Mix and match sections across resumes</p>
                    </div>
                    <button
                        onClick={handleImportClick}
                        disabled={importStatus.loading}
                        className="shrink-0 text-xs bg-white text-black font-semibold px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        {importStatus.loading ? "Importing..." : "＋ Import Resume"}
                    </button>
                    <input
                        ref={importInput}
                        type="file"
                        accept={RESUME_ACCEPTED_FORMATS}
                        className="hidden"
                        onChange={handleImportSelected}
                    />
                </div>
                {importStatus.error && <p className="px-6 pt-2 text-xs text-red-400">{importStatus.error}</p>}

                {parseStats && !parseStats.reviewedAt && (
                    <div className="mx-6 mt-4 p-3 rounded-xl border border-amber-900/70 bg-amber-950/50 text-amber-100 text-xs space-y-2">
                        <p>
                            {parseStats.aiFixed ? "AI re-parsed " : "Imported "}
                            <strong>{parseStats.itemCount}</strong> item{parseStats.itemCount === 1 ? "" : "s"} from <strong>{parseStats.source}</strong>.{" "}
                            {parseStats.flaggedCount > 0
                                ? <>Items marked with an amber dot deserve a quick check ({parseStats.flaggedCount}) — compare with the Original tab.</>
                                : "Everything parsed confidently."}
                        </p>
                        {aiError && <p className="text-red-300">{aiError}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={dismissReview}
                                className="bg-amber-100 text-amber-950 font-semibold px-2.5 py-1 rounded-lg hover:bg-white transition-colors"
                            >
                                Looks good ✓
                            </button>
                            {!parseStats.aiFixed && (supabaseClient ? (
                                <button
                                    onClick={handleAiFix}
                                    disabled={aiFixing}
                                    className="border border-amber-700 px-2.5 py-1 rounded-lg hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                                >
                                    {aiFixing ? "Fixing with AI..." : "✨ Fix parsing with AI"}
                                </button>
                            ) : (
                                <span className="opacity-70">Sign in to use AI parsing.</span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <ContactEditor personalInfo={personalInfo} onChange={setPersonalInfo} />
                    {sectionOrder.map((sectionKey, sectionIndex) => {
                        const meta = SECTION_META[sectionKey];
                        const items = library[sectionKey] || [];
                        const includedCount = items.filter((item) => item.included).length;

                        return (
                            <section key={sectionKey}>
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-app-textMuted">
                                        {meta.label} <span className="font-normal opacity-70">({includedCount}/{items.length})</span>
                                    </h2>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            disabled={sectionIndex === 0}
                                            onClick={() => moveSection(sectionKey, -1)}
                                            className="text-app-textMuted hover:text-white disabled:opacity-20 text-[10px] px-1"
                                            title="Move section up"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            type="button"
                                            disabled={sectionIndex === sectionOrder.length - 1}
                                            onClick={() => moveSection(sectionKey, 1)}
                                            className="text-app-textMuted hover:text-white disabled:opacity-20 text-[10px] px-1"
                                            title="Move section down"
                                        >
                                            ▼
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addItem(sectionKey)}
                                            className="text-app-textMuted hover:text-white text-xs px-1 flex items-center"
                                            title={`Add ${meta.label} item`}
                                        >
                                            <IconPlus size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {items.map((item, index) => (
                                        <LibraryItemCard
                                            key={item.id}
                                            sectionKey={sectionKey}
                                            item={item}
                                            index={index}
                                            total={items.length}
                                            expanded={Boolean(expandedItems[item.id])}
                                            onToggleExpanded={() => toggleExpanded(item.id)}
                                            onPatch={(patch) => patchItem(sectionKey, item.id, patch)}
                                            onRemove={() => removeItem(sectionKey, item.id)}
                                            onMove={(delta) => moveItem(sectionKey, item.id, delta)}
                                            onMoveToSection={["experience", "projects", "research", "leadership"].includes(sectionKey)
                                                ? (toSection) => moveItemToSection(sectionKey, item.id, toSection)
                                                : undefined}
                                            onDragStart={() => setDraggedItem({ sectionKey, id: item.id })}
                                            onDragEnd={() => setDraggedItem(null)}
                                            onDrop={(event) => {
                                                event.preventDefault();
                                                handleItemDrop(sectionKey, item.id);
                                            }}
                                            dragging={draggedItem?.id === item.id}
                                        />
                                    ))}
                                    {items.length === 0 && (
                                        <p className="text-xs text-app-textMuted italic">Nothing here yet — add one or import a resume.</p>
                                    )}
                                </div>
                            </section>
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
                            Start Over
                        </button>
                        <button onClick={handleReset} className="text-xs bg-[#1C1C1E] border border-app-border hover:bg-[#2C2C2E] px-3 py-1.5 rounded-lg font-medium transition-colors">
                            Reset
                        </button>
                        <button onClick={onSignOut} className="text-xs bg-[#1C1C1E] border border-app-border hover:bg-red-950 hover:text-red-300 hover:border-red-900/50 px-3 py-1.5 rounded-lg font-medium transition-colors">
                            {signOutLabel}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-[#111111] relative">
                <div className="absolute top-6 left-6 z-10 flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-[#1C1C1E] border border-app-border px-3 py-1.5 rounded-full text-xs">
                        {syncStatus === "synced" && (
                            <>
                                <IconCloudCheck />
                                <span className="text-app-textMuted">{syncTargetLabel}</span>
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
                    {hasIncludedContent && (
                        <div
                            className="bg-[#1C1C1E] border border-app-border px-3 py-1.5 rounded-full text-xs"
                            title="Rough estimate for 11pt letter paper. One page is the safest bet for early-career resumes."
                        >
                            {estimatedPages <= 1.02 ? (
                                <span className="text-app-textMuted">≈ 1 page</span>
                            ) : (
                                <span className="text-orange-400">≈ {estimatedPages.toFixed(1)} pages — trim to 1</span>
                            )}
                        </div>
                    )}
                </div>

                <div className="absolute top-6 right-6 z-10 flex gap-3 flex-wrap justify-end max-w-[820px]">
                    <div className="bg-app-card border border-app-border rounded-xl p-1 flex">
                        {resumeState?.originalPreview && (
                            <button onClick={() => setPreviewMode("original")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${previewMode === "original" ? "bg-white text-black" : "text-app-textMuted hover:text-white"}`}>
                                Original
                            </button>
                        )}
                        <button onClick={() => setPreviewMode("edited")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${previewMode === "edited" ? "bg-white text-black" : "text-app-textMuted hover:text-white"}`}>
                            Preview
                        </button>
                        <button onClick={openLatexView} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${previewMode === "latex" ? "bg-white text-black" : "text-app-textMuted hover:text-white"}`}>
                            LaTeX
                        </button>
                    </div>
                    <button onClick={handleCopyLatex} className="bg-app-card border border-app-border text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-app-cardHover shadow-lg transition-transform active:scale-95">
                        Copy LaTeX
                    </button>
                    <button onClick={handleDownloadLatex} className="bg-app-card border border-app-border text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-app-cardHover shadow-lg">
                        .tex
                    </button>
                    <button onClick={handleDownloadHtml} className="bg-app-card border border-app-border text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-app-cardHover shadow-lg">
                        HTML
                    </button>
                    <button onClick={handleDownloadDoc} className="bg-app-card border border-app-border text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-app-cardHover shadow-lg">
                        DOC
                    </button>
                    <button onClick={handleDownloadPdf} className="bg-app-card border border-app-border text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-app-cardHover shadow-lg">
                        Print PDF
                    </button>
                    <button onClick={handleOpenOverleaf} className="bg-app-card border border-app-border text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-app-cardHover shadow-lg" title="Compile the LaTeX in Overleaf">
                        Open in Overleaf
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-12 pt-28 flex justify-center items-start">
                    {previewMode === "latex" ? (
                        <div className="w-full max-w-[850px] flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <p className="text-xs text-app-textMuted max-w-[460px]">
                                    Jake's-template LaTeX for your current selection. Edit it and click Apply —
                                    keep the <code className="text-app-text">\section{"{...}"}</code> headings so entries can be parsed.
                                    Applying replaces the currently included items; unchecked library items are kept.
                                </p>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={() => { setLatexDraft(currentLatex); setLatexError(""); }} className="text-xs bg-[#1C1C1E] border border-app-border hover:bg-[#2C2C2E] px-3 py-2 rounded-lg font-medium transition-colors">
                                        Reload Current
                                    </button>
                                    <button onClick={handleApplyLatex} className="text-xs bg-white text-black font-semibold px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                                        Apply to Resume
                                    </button>
                                </div>
                            </div>
                            {latexError && <p className="text-xs text-red-400">{latexError}</p>}
                            <textarea
                                value={latexDraft}
                                onChange={(event) => setLatexDraft(event.target.value)}
                                spellCheck={false}
                                className="w-full min-h-[850px] bg-[#0d0d0d] text-gray-200 font-mono text-xs border border-app-border rounded-xl p-4 focus:outline-none focus:border-app-textMuted"
                            />
                        </div>
                    ) : (
                        <div className="w-full max-w-[850px] flex flex-col items-center gap-4">
                        {previewMode !== "original" && (
                            <div className="flex gap-2 flex-wrap justify-center">
                                {listResumeTemplates().map((tpl) => (
                                    <button
                                        key={tpl.id}
                                        onClick={() => setSelectedTemplateId(tpl.id)}
                                        title={tpl.tagline}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedTemplateId === tpl.id ? "bg-white text-black border-white" : "bg-app-card text-app-textMuted border-app-border hover:text-white"}`}
                                    >
                                        {tpl.name}
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${ATS_BADGE_STYLES[tpl.atsRating] || ATS_BADGE_STYLES.B}`}>
                                            ATS {tpl.atsRating}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="bg-white text-black w-full max-w-[850px] min-h-[1100px] shadow-2xl p-12 resume-preview relative">
                            {previewMode === "original" && resumeState?.originalPreview ? (
                                <OriginalResumePreview resumeState={resumeState} fallbackResume={structuredResume} />
                            ) : selectedTemplateId === "jakes" || !selectedTemplate ? (
                                <>
                                    <StructuredResumePreview
                                        resume={structuredResume}
                                        personalInfo={personalInfo}
                                        onPersonalInfoChange={setPersonalInfo}
                                    />
                                    {!hasIncludedContent && (
                                        <p className="text-gray-500 italic text-center py-10">
                                            Check items in the library on the left to build your resume.
                                        </p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <style>{selectedTemplate.previewCss}</style>
                                    <div
                                        className={`tpl-${selectedTemplate.id}`}
                                        dangerouslySetInnerHTML={{ __html: selectedTemplate.renderHtml(structuredResume) }}
                                    />
                                    {!hasIncludedContent && (
                                        <p className="text-gray-500 italic text-center py-10">
                                            Check items in the library on the left to build your resume.
                                        </p>
                                    )}
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
                    )}
                </div>
            </div>
        </div>
    );
};
