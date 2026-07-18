if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

const SECTION_ALIASES = {
    education: [/^education$/i],
    skills: [/^(technical skills|skills|technologies|technical proficiencies)$/i],
    experience: [/^(experience|work experience|professional experience|employment)$/i],
    projects: [/^(projects|selected projects|technical projects)$/i],
    research: [/^(research|publications|research experience)$/i],
    leadership: [/^(leadership|activities|leadership & activities|leadership and activities)$/i],
    awards: [/^(awards|certifications|honors|achievements)$/i],
};

const DATE_PATTERN = /((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?)\s*(-{1,3}|–|—|to)\s*((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|Present|Current|\d{4})|Expected\s+(May|Jun|Dec|August|December)?\s*\d{4}|\b(20\d{2}|19\d{2})\s*(-{1,3}|–|—|to)\s*((20\d{2}|19\d{2})|Present|Current)\b|\b(20\d{2}|19\d{2})\b/i;
const BULLET_PATTERN = /^([•●▪◦*-])\s*/;

const emptyStructuredResume = () => ({
    basics: {
        name: "",
        headline: "",
        phone: "",
        email: "",
        linkedin: "",
        github: "",
        portfolio: "",
    },
    education: [],
    skills: [],
    experience: [],
    projects: [],
    research: [],
    leadership: [],
    customSections: [],
    confidence: {},
});

const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });

const getPdfItemGeometry = (item, pageNumber) => {
    const transform = item.transform || [1, 0, 0, 1, 0, 0];
    const x0 = transform[4] || 0;
    const y0 = transform[5] || 0;
    const fontSize = Math.abs(transform[0] || transform[3] || item.height || 10);
    return {
        text: item.str,
        x0,
        y0,
        x1: x0 + (item.width || 0),
        y1: y0 + (item.height || fontSize),
        fontSize,
        fontName: item.fontName || "",
        page: pageNumber,
    };
};

// Row-groups geometry items into text lines, page by page. Reused by the
// normal single-column path and by the LinkedIn preset's per-column passes.
const groupPdfItemsIntoLines = (items) => {
    const lines = [];
    const pageNumbers = [...new Set(items.map((item) => item.page))].sort((a, b) => a - b);

    pageNumbers.forEach((pageNumber) => {
        const pageItems = items.filter((item) => item.page === pageNumber);
        const rows = [];
        pageItems.forEach((item) => {
            const row = rows.find((candidate) => Math.abs(candidate.y0 - item.y0) <= Math.max(2, item.fontSize * 0.35));
            if (row) {
                row.items.push(item);
                row.y0 = (row.y0 + item.y0) / 2;
            } else {
                rows.push({ y0: item.y0, items: [item] });
            }
        });

        rows
            .sort((a, b) => b.y0 - a.y0)
            .forEach((row) => {
                const sortedItems = row.items.sort((a, b) => a.x0 - b.x0);
                // A wide horizontal gap is a column boundary (company ⇤⇥ location,
                // title ⇤⇥ dates) — mark it with "|" so splitLocation can split on it.
                const text = sortedItems
                    .map((item, itemIndex) => {
                        if (!itemIndex) return item.text;
                        const gap = item.x0 - sortedItems[itemIndex - 1].x1;
                        return `${gap > 40 ? "| " : ""}${item.text}`;
                    })
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim();
                if (!text) return;
                lines.push({
                    text,
                    x0: Math.min(...sortedItems.map((item) => item.x0)),
                    y0: row.y0,
                    x1: Math.max(...sortedItems.map((item) => item.x1)),
                    y1: Math.max(...sortedItems.map((item) => item.y1)),
                    fontSize: Math.max(...sortedItems.map((item) => item.fontSize)),
                    bold: sortedItems.some((item) => /bold|black|heavy/i.test(item.fontName)),
                    page: pageNumber,
                });
            });
    });

    return lines;
};

const extractPdfLines = async (file) => {
    if (!window.pdfjsLib) {
        throw new Error("PDF parser failed to load. Refresh and try again.");
    }

    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const allItems = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        content.items
            .map((item) => getPdfItemGeometry(item, pageNumber))
            .filter((item) => item.text.trim())
            .forEach((item) => allItems.push(item));
    }

    const lines = normalizeExtractedLines(groupPdfItemsIntoLines(allItems));
    // LinkedIn "Save profile to PDF" exports are two-column with a known
    // structure — rebuild them per column instead of parsing merged rows.
    if (isLinkedInExport(lines)) {
        return buildLinkedInProfileLines(allItems);
    }
    return lines;
};

// ---------------------------------------------------------------------------
// LinkedIn "Save profile to PDF" preset (PRD P1). These exports have a fixed
// shape: a narrow sidebar (Contact / Top Skills / Languages / Certifications /
// Honors-Awards) beside a main column (Name / Headline / Summary / Experience /
// Education), plus "Page N of M" footers. The two columns are separated by x
// position, parsed with LinkedIn's known line patterns, and re-emitted as
// plain resume-shaped lines for the generic section parser.
// ---------------------------------------------------------------------------

const isLinkedInExport = (lines) =>
    lines.some((line) => /^Page \d+ of \d+$/i.test(line.text.trim())) &&
    lines.some((line) => /linkedin\.com\/in\//i.test(line.text));

const LINKEDIN_SIDEBAR_MAX_X = 180;
const LINKEDIN_SIDEBAR_HEADER = /^(Contact|Top Skills|Languages|Certifications|Honors-Awards|Publications|Patents)$/i;
const LINKEDIN_DATE_LINE = /^([A-Z][a-z]+ )?\d{4} ?[-–] ?(([A-Z][a-z]+ )?\d{4}|Present)( ?\(.*\))?$/;
const LINKEDIN_DURATION_LINE = /^((\d+ years?)( \d+ months?)?|\d+ months?|less than a year)$/i;
const LINKEDIN_PAGE_FOOTER = /^Page \d+ of \d+$/i;

// ponytail: sidebar detection is page-1-only; a sidebar spilling onto page 2
// (very long certification lists) mixes into the main column.
const buildLinkedInProfileLines = (items) => {
    const isSidebarItem = (item) => item.page === 1 && item.x0 < LINKEDIN_SIDEBAR_MAX_X;
    const sidebarLines = normalizeExtractedLines(groupPdfItemsIntoLines(items.filter(isSidebarItem)))
        .map((line) => line.text);
    const mainLines = normalizeExtractedLines(groupPdfItemsIntoLines(items.filter((item) => !isSidebarItem(item))))
        .map((line) => line.text);
    return normalizeTextLines(transformLinkedInProfile(sidebarLines, mainLines).join("\n"));
};

const parseLinkedInSidebar = (sidebarLines) => {
    const sections = {};
    let currentKey = null;
    sidebarLines
        .filter((text) => !LINKEDIN_PAGE_FOOTER.test(text.trim()))
        .forEach((text) => {
            const trimmed = text.trim();
            if (LINKEDIN_SIDEBAR_HEADER.test(trimmed)) {
                currentKey = trimmed.toLowerCase();
                sections[currentKey] = [];
            } else if (currentKey) {
                sections[currentKey].push(trimmed);
            }
        });
    return sections;
};

const isLinkedInLocationLine = (text) =>
    text.length <= 60 && !LINKEDIN_DATE_LINE.test(text) && !LINKEDIN_DURATION_LINE.test(text) &&
    (text.includes(",") || text.split(/\s+/).length <= 4) && !/[.!?]$/.test(text);

// Company names are short and don't end like sentences — the check that keeps
// description lines from being mistaken for the next entry's company.
const isLinkedInCompanyish = (text) =>
    text.length <= 60 && !/[.!?]$/.test(text) && text.split(/\s+/).length <= 8;

// A line is an entry boundary when it is a company/title line: the line after
// it is a dates/company-total-duration line, or it is a company-shaped line
// sitting directly above a "Title / dates" pair (company of the next entry).
const isLinkedInEntryStart = (lines, index) => {
    const next = lines[index + 1] || "";
    const nextNext = lines[index + 2] || "";
    if (LINKEDIN_DATE_LINE.test(next) || LINKEDIN_DURATION_LINE.test(next)) return true;
    return LINKEDIN_DATE_LINE.test(nextNext) && !LINKEDIN_DATE_LINE.test(next) && isLinkedInCompanyish(lines[index] || "");
};

const parseLinkedInExperience = (expLines) => {
    const entries = [];
    let company = "";
    let index = 0;

    while (index < expLines.length) {
        const text = expLines[index];
        const next = expLines[index + 1] || "";
        const nextNext = expLines[index + 2] || "";

        if (LINKEDIN_DURATION_LINE.test(text)) {
            index += 1;
            continue;
        }
        // Company line in a multi-role block: "Company / <total duration> / Title / dates".
        if (LINKEDIN_DURATION_LINE.test(next)) {
            company = text;
            index += 2;
            continue;
        }
        // Company line directly above a title line: "Company / Title / dates".
        if (LINKEDIN_DATE_LINE.test(nextNext) && !LINKEDIN_DATE_LINE.test(next) && isLinkedInCompanyish(text)) {
            company = text;
            index += 1;
            continue;
        }
        if (LINKEDIN_DATE_LINE.test(next)) {
            const dates = next.replace(/\s*\(.*\)\s*$/, "").trim();
            let cursor = index + 2;
            let location = "";
            if (cursor < expLines.length && !isLinkedInEntryStart(expLines, cursor) && isLinkedInLocationLine(expLines[cursor])) {
                location = expLines[cursor];
                cursor += 1;
            }
            const bullets = [];
            while (cursor < expLines.length && !isLinkedInEntryStart(expLines, cursor)) {
                bullets.push(expLines[cursor]);
                cursor += 1;
            }
            entries.push({ title: text, company, dates, location, bullets });
            index = cursor;
            continue;
        }
        index += 1;
    }

    return entries;
};

const parseLinkedInEducation = (eduLines) => {
    const entries = [];
    let index = 0;
    while (index < eduLines.length) {
        const school = eduLines[index];
        const detail = eduLines[index + 1] || "";
        // Degree lines look like "Bachelor's degree, Computer Science · (2016 - 2020)".
        const isDetail = detail && !isLinkedInEntryStart(eduLines, index + 1) && (detail.includes("·") || /\(\s*\d{4}/.test(detail));
        const dates = detail.match(/\(([^)]*\d{4}[^)]*)\)/)?.[1]?.trim() || "";
        const degree = isDetail ? detail.replace(/·?\s*\([^)]*\)\s*$/, "").replace(/\s*·\s*$/, "").trim() : "";
        entries.push({ school, degree, dates });
        index += isDetail ? 2 : 1;
    }
    return entries;
};

// Re-emit the parsed profile as generic resume lines: "Title | dates" over
// "Company | Location" entries, "Category: items" skills rows, bullet lists.
const transformLinkedInProfile = (sidebarLines, mainLines) => {
    const out = [];
    const main = mainLines.filter((text) => !LINKEDIN_PAGE_FOOTER.test(text.trim()));
    const sections = parseLinkedInSidebar(sidebarLines);

    const contact = sections.contact || [];
    const contactJoined = contact.join(" ");
    const email = contactJoined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
    const linkedinUrl = contactJoined.match(/(www\.)?linkedin\.com\/in\/[^\s|(]+/i)?.[0] || "";
    const phone = contactJoined.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0] || "";

    const name = main[0] || "";
    const headline = main[1] || "";
    out.push(name);
    const contactLine = [phone, email, linkedinUrl].filter(Boolean).join(" | ");
    if (contactLine) out.push(contactLine);
    if (headline && !/^(Summary|Experience|Education)$/i.test(headline)) out.push(headline);

    const experienceIndex = main.findIndex((text) => /^Experience$/i.test(text));
    const educationIndex = main.findIndex((text, index) => /^Education$/i.test(text) && index > experienceIndex);

    if (experienceIndex !== -1) {
        const expEnd = educationIndex === -1 ? main.length : educationIndex;
        const entries = parseLinkedInExperience(main.slice(experienceIndex + 1, expEnd));
        if (entries.length) {
            out.push("Experience");
            entries.forEach((entry) => {
                out.push(`${entry.title} | ${entry.dates}`);
                const orgLine = [entry.company, entry.location].filter(Boolean).join(" | ");
                if (orgLine) out.push(orgLine);
                entry.bullets.forEach((bullet) => out.push(`• ${bullet}`));
            });
        }
    }

    if (educationIndex !== -1) {
        const entries = parseLinkedInEducation(main.slice(educationIndex + 1));
        if (entries.length) {
            out.push("Education");
            entries.forEach((entry) => {
                out.push(entry.dates ? `${entry.school} | ${entry.dates}` : entry.school);
                if (entry.degree) out.push(entry.degree);
            });
        }
    }

    const skillRows = [];
    if ((sections["top skills"] || []).length) skillRows.push(`Top Skills: ${sections["top skills"].join(", ")}`);
    if ((sections.languages || []).length) skillRows.push(`Languages: ${sections.languages.join(", ")}`);
    if ((sections.certifications || []).length) skillRows.push(`Certifications: ${sections.certifications.join(", ")}`);
    if (skillRows.length) {
        out.push("Technical Skills");
        skillRows.forEach((row) => out.push(row));
    }

    if ((sections["honors-awards"] || []).length) {
        out.push("Leadership");
        sections["honors-awards"].forEach((honor) => out.push(`• ${honor}`));
    }

    return out.filter(Boolean);
};

const extractDocLines = async (file) => {
    if (!file.name.toLowerCase().endsWith(".docx")) {
        throw new Error("Legacy .doc files cannot be parsed in this browser. Upload PDF, DOCX, or LaTeX.");
    }
    if (!window.mammoth?.extractRawText) {
        throw new Error("DOCX parser failed to load. Refresh and try again.");
    }
    const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return normalizeTextLines(result.value || "");
};

const createOriginalPreview = async (file, format) => {
    if (format === "pdf") {
        return {
            kind: "pdf",
            dataUrl: await readFileAsDataUrl(file),
        };
    }

    if (format === "doc") {
        if (!file.name.toLowerCase().endsWith(".docx")) {
            return {
                kind: "unsupported",
                message: "Legacy .doc preview is not supported in the browser. Upload DOCX or PDF for preview.",
            };
        }
        if (!window.mammoth?.convertToHtml) {
            return {
                kind: "unsupported",
                message: "DOCX preview library failed to load.",
            };
        }
        const result = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
        return {
            kind: "html",
            html: result.value || "<p>No previewable content found.</p>",
        };
    }

    if (format === "latex") {
        return {
            kind: "text",
            text: await readFileAsText(file),
        };
    }

    return {
        kind: "unsupported",
        message: "Preview is not available for this file type.",
    };
};

const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

const stripLatex = (source) =>
    source
        // Strip comments, but keep escaped percents (\% is a literal % in LaTeX).
        .replace(/(^|[^\\])%.*$/gm, "$1")
        // Drop the preamble and everything after \end{document} — otherwise
        // "article", "document", package names, etc. leak in as resume text
        // (and the preamble's first junk line gets parsed as the name).
        .replace(/^[\s\S]*?\\begin\{document\}/, "")
        .replace(/\\end\{document\}[\s\S]*$/, "")
        .replace(/\\(begin|end)\{[^}]*\}(?:\[[^\]]*\])?/g, "\n")
        .replace(/\\(documentclass|usepackage|input|pagestyle|urlstyle|vspace|hspace|addtolength|setlength|titleformat|fancyhf|fancyfoot|color)\*?(?:\[[^\]]*\])?\{[^}]*\}/g, "\n")
        // Section titles become standalone lines; inline styling keeps its text in place
        // (so "\textbf{Languages}{: Python}" stays one parseable line).
        .replace(/\\(section|subsection)\*?\{([^}]*)\}/g, "\n$2\n")
        .replace(/\\(textbf|textit|emph|underline)\*?\{([^}]*)\}/g, "$2")
        .replace(/\\href\{[^}]*\}\{([^}]*)\}/g, "$1")
        // Jake's-template heading macros → the two-line "title | dates" /
        // "org | location" shape the section parsers expect. Runs after inline
        // styling so the arguments no longer contain nested braces.
        .replace(/\\resumeSubheading\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}/g, "\n$1 | $2\n$3 | $4\n")
        .replace(/\\resumeProjectHeading\s*\{([^}]*)\}\s*\{([^}]*)\}/g, "\n$1 $2\n")
        // Jake's-template bullet macros (this app's own .tex export) and plain \item.
        .replace(/\\(resumeItem|resumeSubItem)\s*\{/g, "\n• {")
        .replace(/\\item\s*/g, "\n• ")
        .replace(/\\\\/g, "\n")
        .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, " ")
        // Preserve escaped dollars through math-delimiter removal ($|$, $...$).
        .replace(/\\\$/g, "\u0001")
        .replace(/[{}$~]/g, " ")
        .replace(/\u0001/g, "$")
        // Remaining LaTeX escapes become their literal characters.
        .replace(/\\([%&#_])/g, "$1")
        // LaTeX en/em dashes back to a single en dash ("May 2025 -- Aug 2025").
        .replace(/ -{2,3} /g, " – ");

// Text sources have no geometry, but wrapped bullets still need merging —
// mergeWrappedBullets has a text-mode heuristic for x0 === 0 lines.
const normalizeTextLines = (text) =>
    mergeWrappedBullets(
        text
            .split(/\r?\n/)
            .map((line, index) => ({
                text: line.replace(/\s+/g, " ").trim(),
                x0: 0,
                y0: -index,
                x1: 0,
                y1: -index,
                fontSize: 10,
                bold: false,
                page: 1,
            }))
            // Drop empty lines and orphaned bullet markers (LaTeX stripping can
            // leave a lone "•" when \item wraps a group rather than text).
            .filter((line) => line.text && line.text !== "•")
    );

// Small-caps fonts extract with the leading capital as a separate glyph
// ("E XPERIENCE", "T ANMAY M AKA") — rejoin, but only on all-caps lines so
// normal sentence text is never touched.
const rejoinSmallCaps = (text) =>
    text === text.toUpperCase() ? text.replace(/\b([A-Z])\s+(?=[A-Z]{2,}\b)/g, "$1") : text;

const normalizeExtractedLines = (lines) => {
    const normalized = lines
        .map((line) => ({
            ...line,
            // Zero-width characters (Google Docs / Word exports) aren't matched by \s.
            text: rejoinSmallCaps(
                line.text.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").replace(/\s+/g, " ").replace(/[|]{2,}/g, "|").trim()
            ),
        }))
        .filter((line) => line.text);

    const merged = [];
    normalized.forEach((line) => {
        const previous = merged[merged.length - 1];
        const isContinuation = previous && !isSectionHeader(line) && !BULLET_PATTERN.test(line.text) && !DATE_PATTERN.test(previous.text) && line.x0 > previous.x0 + 12 && previous.text.length < 90;
        if (isContinuation) {
            previous.text = `${previous.text} ${line.text}`.replace(/\s+/g, " ");
            previous.x1 = Math.max(previous.x1, line.x1);
        } else {
            merged.push({ ...line });
        }
    });

    return mergeWrappedBullets(merged);
};

const isBulletContinuation = (previous, line) => {
    if (!previous?.isBullet) return false;
    if (BULLET_PATTERN.test(line.text) || isSectionHeader(line)) return false;
    // PDF lines carry geometry: a continuation is indented past the bullet marker.
    if (previous.x0 !== 0 || line.x0 !== 0) return line.x0 > previous.x0 + 6;
    // Plain-text lines (x0 === 0) have no geometry. Merge when the bullet
    // clearly continues mid-sentence and the next line doesn't start a new
    // entry (entry headers carry dates or "name | tech" pipes).
    if (/[.!?]$/.test(previous.text)) return false;
    if (DATE_PATTERN.test(line.text) || line.text.includes(" | ")) return false;
    return true;
};

const mergeWrappedBullets = (lines) => {
    const merged = [];
    lines.forEach((line) => {
        const previous = merged[merged.length - 1];
        if (isBulletContinuation(previous, line)) {
            previous.text = `${previous.text} ${line.text}`.replace(/\s+/g, " ");
        } else {
            merged.push({
                ...line,
                isBullet: BULLET_PATTERN.test(line.text),
                text: line.text.replace(BULLET_PATTERN, "• "),
            });
        }
    });
    return merged;
};

// Heading-shaped: short, few words, no bullets/dates/pipes, not a "Label: data"
// row, and either ALL CAPS or Title Case. Combined with the keyword patterns
// below this auto-identifies headings the strict aliases don't list, e.g.
// "SELECTED SOFTWARE PROJECTS" or "VOLUNTEER EXPERIENCE".
const SECTION_HEADING_STOPWORDS = new Set(["and", "&", "of", "the", "in", "to"]);

const looksLikeSectionHeading = (text) => {
    if (!text || text.length > 45) return false;
    if (BULLET_PATTERN.test(text) || DATE_PATTERN.test(text)) return false;
    if (text.includes("|") || /:\s*\S/.test(text) || /[.!?;]$/.test(text)) return false;
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return false;
    const isAllCaps = text === text.toUpperCase() && /[A-Z]/.test(text);
    if (isAllCaps) return words.length <= 5;
    const contentWords = words.filter((word) => !SECTION_HEADING_STOPWORDS.has(word.toLowerCase()));
    return words.length <= 4 && contentWords.length > 0 && contentWords.every((word) => /^[A-Z]/.test(word));
};

// Checked in order — first match wins, so specific sections (research,
// projects, leadership) are tested before the catch-all "experience"
// ("PROJECT EXPERIENCE" → projects, "VOLUNTEER EXPERIENCE" → leadership).
const SECTION_KEYWORD_PATTERNS = [
    ["education", /\beducation\b|\bacademic (background|history|qualifications)\b/i],
    ["research", /\bresearch\b|\bpublications?\b/i],
    ["projects", /\bprojects?\b/i],
    ["leadership", /\bleadership\b|\bactivities\b|\bvolunteer(ing|s)?\b|\bextracurriculars?\b|\binvolvement\b/i],
    ["skills", /\bskills?\b|\btechnologies\b|\bcompetenc(y|ies)\b|\bproficienc(y|ies)\b|\btech stack\b/i],
    ["awards", /\bawards?\b|\bhono(u)?rs?\b|\bcertifications?\b|\bachievements?\b|\bcertificates?\b/i],
    ["experience", /\bexperience\b|\bemployment\b|\bwork history\b|\binternships?\b|\bcareer\b/i],
];

const getSectionKey = (text) => {
    const trimmed = String(text || "").trim().replace(/:$/, "").trim();
    if (!trimmed) return null;
    for (const [key, patterns] of Object.entries(SECTION_ALIASES)) {
        if (patterns.some((pattern) => pattern.test(trimmed))) return key;
    }
    if (!looksLikeSectionHeading(trimmed)) return null;
    for (const [key, pattern] of SECTION_KEYWORD_PATTERNS) {
        if (pattern.test(trimmed)) return key;
    }
    return null;
};

const isSectionHeader = (line) => getSectionKey(line.text) !== null;

const splitIntoSections = (lines) => {
    const sections = { header: [] };
    let current = "header";

    lines.forEach((line) => {
        const sectionKey = getSectionKey(line.text);
        if (sectionKey) {
            current = sectionKey;
            if (!sections[current]) sections[current] = [];
            return;
        }
        if (!sections[current]) sections[current] = [];
        sections[current].push(line);
    });

    return sections;
};

const extractDates = (text) => {
    const match = text.match(DATE_PATTERN);
    return match?.[0]?.trim() || "";
};

const removeDates = (text) => text.replace(DATE_PATTERN, "").replace(/\s*\|\s*$/, "").trim();

const splitLocation = (text) => {
    const parts = text.split(/\s+\|\s+| {3,}/).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) return { main: parts[0], location: parts.slice(1).join(" | ") };
    // "City, ST" / "City, USA" / "City, Country" at end of line — city capped at
    // three words so it can't swallow the company name ahead of it.
    const locationMatch = text.match(/((?:[A-Z][A-Za-z.]*\s){0,2}[A-Z][A-Za-z.]*,\s*(?:[A-Z]{2,3}|[A-Z][a-z]+(?:\s[A-Z][a-z]+)?))$/);
    if (locationMatch) return { main: text.replace(locationMatch[0], "").trim(), location: locationMatch[0] };
    return { main: text.trim(), location: "" };
};

const parseHeader = (lines) => {
    const resume = emptyStructuredResume();
    const textLines = lines.map((line) => line.text);
    const joined = textLines.join(" | ");
    resume.basics.email = joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
    resume.basics.phone = joined.match(/(\+?\(?\d[\d\s().-]{7,}\d)/)?.[0] || "";
    resume.basics.linkedin = joined.match(/linkedin\.com\/[^\s|,]+/i)?.[0] || "";
    resume.basics.github = joined.match(/github\.com\/[^\s|,]+/i)?.[0] || "";
    resume.basics.portfolio = joined.match(/https?:\/\/(?!.*linkedin|.*github)[^\s|,]+/i)?.[0] || "";

    const isContactLine = (line) =>
        line.includes("@") || /linkedin|github|https?:\/\//i.test(line) || /\d{3}/.test(line);
    const nameLine = textLines.find((line) => line.length <= 80 && !isContactLine(line) && /[A-Za-z]/.test(line));
    resume.basics.name = nameLine || defaultPersonalInfo.name;
    resume.basics.headline = textLines.find((line) => line !== nameLine && !isContactLine(line) && line.length < 100) || "";
    return resume.basics;
};

const collectBullets = (lines, startIndex) => {
    const bullets = [];
    let index = startIndex;
    while (index < lines.length && BULLET_PATTERN.test(lines[index].text)) {
        bullets.push(lines[index].text.replace(BULLET_PATTERN, "").trim());
        index += 1;
    }
    return { bullets, nextIndex: index };
};

// Wrapped project headers arrive as two lines from PDF extraction, e.g.
// "Name | Python, NLP," + "LLMs, Gradio" — merge continuations back into the
// header before splitting it into name | technologies.
const isProjectHeaderContinuation = (headerText, nextText) => {
    if (!nextText || BULLET_PATTERN.test(nextText) || DATE_PATTERN.test(nextText)) return false;
    if (!headerText.includes("|") || nextText.includes("|")) return false;
    if (getSectionKey(nextText)) return false;
    if (/,\s*$/.test(headerText)) return true;
    return nextText.length <= 40 && nextText.split(/\s+/).length <= 5;
};

const parseExperienceLike = (lines, type) => {
    const entries = [];
    let index = 0;

    while (index < lines.length) {
        // Bullets with no header above them (e.g. a "Leadership and Accomplishments"
        // section that is just a list) become a title-less entry instead of being dropped.
        if (BULLET_PATTERN.test(lines[index].text)) {
            const { bullets: orphanBullets, nextIndex: afterOrphans } = collectBullets(lines, index);
            if (orphanBullets.length) {
                entries.push({
                    ...(type === "projects" ? { name: "", technologies: [] } : { title: "", company: "", organization: "", location: "" }),
                    dates: "",
                    bullets: orphanBullets,
                    confidence: 0.5,
                });
            }
            index = Math.max(afterOrphans, index + 1);
            continue;
        }

        if (type === "projects") {
            let headerText = lines[index].text;
            let consumed = 1;
            while (index + consumed < lines.length && isProjectHeaderContinuation(headerText, lines[index + consumed].text)) {
                headerText = `${headerText} ${lines[index + consumed].text}`.replace(/\s+/g, " ");
                consumed += 1;
            }

            const dates = extractDates(headerText);
            // Split on the raw header: splitLocation would consume "| tech list"
            // as a location and drop it.
            const [namePart, ...techParts] = removeDates(headerText).split(/\s+\|\s+/);
            const { bullets, nextIndex } = collectBullets(lines, index + consumed);
            entries.push({
                name: (namePart || "").trim(),
                technologies: techParts.join(", ").split(/,\s*/).map((item) => item.trim()).filter(Boolean),
                dates,
                bullets,
                confidence: bullets.length ? 0.75 : 0.45,
            });
            index = Math.max(nextIndex, index + consumed);
            continue;
        }

        const firstLine = lines[index]?.text || "";
        const secondLine = lines[index + 1]?.text || "";
        const hasSecondHeaderLine = Boolean(secondLine) && !BULLET_PATTERN.test(secondLine);
        const dates = extractDates(firstLine) || (hasSecondHeaderLine ? extractDates(secondLine) : "");
        const firstNoDates = removeDates(firstLine);
        const secondNoDates = hasSecondHeaderLine ? removeDates(secondLine) : "";
        const firstSplit = splitLocation(firstNoDates);
        const secondSplit = splitLocation(secondNoDates);
        const bulletStart = index + (hasSecondHeaderLine ? 2 : 1);
        const { bullets, nextIndex } = collectBullets(lines, bulletStart);

        // Two layouts exist: "title+dates / company+location" (Jake's template) and
        // "company+location / title+dates". The dates sit on the title line, so use
        // them to decide which line is which.
        const companyFirst = hasSecondHeaderLine && !extractDates(firstLine) && Boolean(extractDates(secondLine));
        const titleSplit = companyFirst ? secondSplit : firstSplit;
        const companySplit = companyFirst ? firstSplit : secondSplit;

        entries.push({
            title: titleSplit.main,
            company: companySplit.main || "",
            organization: companySplit.main || "",
            location: companySplit.location || titleSplit.location,
            dates,
            bullets,
            confidence: bullets.length && dates ? 0.8 : 0.5,
        });
        index = Math.max(nextIndex, index + 1);
    }

    return entries.filter((entry) =>
        entry.bullets.length || entry.dates || (type === "projects" ? entry.name : entry.title || entry.company));
};

const parseEducation = (lines) => {
    const entries = [];
    let index = 0;
    while (index < lines.length) {
        // Detail bullets under a school aren't a new entry — skip them.
        if (BULLET_PATTERN.test(lines[index].text)) {
            index += 1;
            continue;
        }
        const first = lines[index].text;
        const secondLine = lines[index + 1];
        const hasSecond = Boolean(secondLine) && !BULLET_PATTERN.test(secondLine.text);
        const second = hasSecond ? secondLine.text : "";
        const firstSplit = splitLocation(removeDates(first));
        entries.push({
            school: firstSplit.main,
            location: firstSplit.location,
            degree: removeDates(second),
            dates: extractDates(first) || extractDates(second),
            confidence: second ? 0.75 : 0.45,
        });
        index += hasSecond ? 2 : 1;
    }
    return entries;
};

const parseSkills = (lines) =>
    lines.flatMap((line) => {
        const parts = line.text.split(":");
        if (parts.length < 2) {
            return [{ category: "Skills", items: line.text.split(/,\s*/).filter(Boolean), confidence: 0.45 }];
        }
        return [{
            category: parts[0].trim(),
            items: parts.slice(1).join(":").split(/,\s*|[;|]/).map((item) => item.trim()).filter(Boolean),
            confidence: 0.8,
        }];
    });

const validateStructuredResume = (resume) => {
    const warnings = [];
    if (!resume.basics.name) warnings.push("Missing candidate name.");
    ["education", "skills", "experience", "projects", "research", "leadership", "customSections"].forEach((key) => {
        if (!Array.isArray(resume[key])) warnings.push(`${key} must be an array.`);
    });
    if (resume.experience.length === 1 && /imported resume/i.test(resume.experience[0].company || "")) {
        warnings.push("Raw import fallback is not allowed as a single experience entry.");
    }
    resume.confidence = {
        score: warnings.length ? 0.45 : 0.82,
        warnings,
    };
    return resume;
};

const extractResumeLines = async (file, format) => {
    if (format === "pdf") return extractPdfLines(file);
    if (format === "doc") return extractDocLines(file);
    if (format === "latex") return normalizeTextLines(stripLatex(await readFileAsText(file)));
    return normalizeTextLines(await readFileAsText(file));
};

// Core pipeline shared by file uploads and the editable-LaTeX loop.
const parseResumeLines = (lines) => {
    const sections = splitIntoSections(lines);
    const structuredResume = emptyStructuredResume();
    structuredResume.basics = parseHeader(sections.header || []);
    structuredResume.education = parseEducation(sections.education || []);
    structuredResume.skills = parseSkills(sections.skills || []);
    structuredResume.experience = parseExperienceLike(sections.experience || [], "experience");
    structuredResume.projects = parseExperienceLike(sections.projects || [], "projects");
    structuredResume.research = parseExperienceLike(sections.research || [], "research");
    structuredResume.leadership = parseExperienceLike(sections.leadership || [], "leadership");
    structuredResume.customSections = Object.entries(sections)
        .filter(([key]) => !["header", "education", "skills", "experience", "projects", "research", "leadership"].includes(key))
        .map(([title, sectionLines]) => ({ title, lines: sectionLines.map((line) => line.text) }));

    return {
        structuredResume: validateStructuredResume(structuredResume),
        rawText: lines.map((line) => line.text).join("\n"),
        sectionBoundaries: Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, value.map((line) => line.text)])),
    };
};

// Parses LaTeX source (e.g. the user's edits in the LaTeX panel) back into
// structured resume JSON. Best-effort: works reliably on the Jake's-template
// dialect this app generates.
const parseLatexSource = (source) => parseResumeLines(normalizeTextLines(stripLatex(String(source || ""))));

// Parses resume text pasted by the user (no file involved) into the same
// shape parseUploadedResume returns, so imports can share one code path.
const parsePastedResumeText = (text) => {
    const lines = normalizeTextLines(String(text || ""));
    if (!lines.length) {
        throw new Error("Paste some resume text first.");
    }
    return {
        ...parseResumeLines(lines),
        rawLines: lines,
        originalPreview: { kind: "text", text: String(text) },
    };
};

const parseUploadedResume = async (file, format) => {
    if (file.size > 10 * 1024 * 1024) {
        throw new Error("Resume file is too large. Upload a file under 10 MB.");
    }

    const [lines, originalPreview] = await Promise.all([
        extractResumeLines(file, format),
        createOriginalPreview(file, format),
    ]);
    if (!lines.length) {
        throw new Error("No readable text was found in this file. Try a text-based PDF, DOCX, or LaTeX file.");
    }

    return {
        ...parseResumeLines(lines),
        rawLines: lines,
        originalPreview,
    };
};
