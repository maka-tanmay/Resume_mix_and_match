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

const DATE_PATTERN = /((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?)\s*(-|–|—|to)\s*((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|Present|Current|\d{4})|Expected\s+(May|Jun|Dec|August|December)?\s*\d{4}|\b(20\d{2}|19\d{2})\b/i;
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

const extractPdfLines = async (file) => {
    if (!window.pdfjsLib) {
        throw new Error("PDF parser failed to load. Refresh and try again.");
    }

    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const lines = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const items = content.items
            .map((item) => getPdfItemGeometry(item, pageNumber))
            .filter((item) => item.text.trim());

        const rows = [];
        items.forEach((item) => {
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
                const text = sortedItems.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
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
    }

    return normalizeExtractedLines(lines);
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
        .replace(/%.*$/gm, "")
        .replace(/\\(section|subsection|textbf|textit|emph)\*?\{([^}]*)\}/g, "\n$2\n")
        .replace(/\\href\{[^}]*\}\{([^}]*)\}/g, "$1")
        .replace(/\\item\s*/g, "\n• ")
        .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, " ")
        .replace(/[{}]/g, " ")
        .replace(/\\\\/g, "\n");

const normalizeTextLines = (text) =>
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
        .filter((line) => line.text);

const normalizeExtractedLines = (lines) => {
    const normalized = lines
        .map((line) => ({
            ...line,
            text: line.text.replace(/\s+/g, " ").replace(/[|]{2,}/g, "|").trim(),
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

const mergeWrappedBullets = (lines) => {
    const merged = [];
    lines.forEach((line) => {
        const previous = merged[merged.length - 1];
        if (previous?.isBullet && !BULLET_PATTERN.test(line.text) && !isSectionHeader(line) && line.x0 > previous.x0 + 6) {
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

const isSectionHeader = (line) => {
    const text = line.text.trim();
    if (text.length > 45) return false;
    return Object.values(SECTION_ALIASES).flat().some((pattern) => pattern.test(text));
};

const getSectionKey = (text) => {
    for (const [key, patterns] of Object.entries(SECTION_ALIASES)) {
        if (patterns.some((pattern) => pattern.test(text.trim()))) return key;
    }
    return null;
};

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
    const locationMatch = text.match(/([A-Z][A-Za-z .]+,\s*[A-Z]{2})$/);
    if (locationMatch) return { main: text.replace(locationMatch[0], "").trim(), location: locationMatch[0] };
    return { main: text.trim(), location: "" };
};

const parseHeader = (lines) => {
    const resume = emptyStructuredResume();
    const textLines = lines.map((line) => line.text);
    const joined = textLines.join(" | ");
    resume.basics.email = joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
    resume.basics.phone = joined.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0] || "";
    resume.basics.linkedin = joined.match(/linkedin\.com\/[^\s|,]+/i)?.[0] || "";
    resume.basics.github = joined.match(/github\.com\/[^\s|,]+/i)?.[0] || "";
    resume.basics.portfolio = joined.match(/https?:\/\/(?!.*linkedin|.*github)[^\s|,]+/i)?.[0] || "";

    const nameLine = textLines.find((line) => {
        if (line.length > 80) return false;
        if (line.includes("@") || /linkedin|github|https?:\/\//i.test(line)) return false;
        if (/\d{3}/.test(line)) return false;
        return /[A-Za-z]/.test(line);
    });
    resume.basics.name = nameLine || defaultPersonalInfo.name;
    resume.basics.headline = textLines.find((line) => line !== nameLine && !joined.includes(`${line} |`) && line.length < 100) || "";
    return resume.basics;
};

const collectBullets = (lines, startIndex) => {
    const bullets = [];
    let index = startIndex;
    while (index < lines.length) {
        const text = lines[index].text;
        if (!BULLET_PATTERN.test(text) && bullets.length) break;
        if (!BULLET_PATTERN.test(text) && !bullets.length) break;
        bullets.push(text.replace(BULLET_PATTERN, "").trim());
        index += 1;
    }
    return { bullets, nextIndex: index };
};

const parseExperienceLike = (lines, type) => {
    const entries = [];
    let index = 0;

    while (index < lines.length) {
        while (index < lines.length && BULLET_PATTERN.test(lines[index].text)) index += 1;
        if (index >= lines.length) break;

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

        if (type === "projects") {
            const [namePart, techPart] = firstSplit.main.split(/\s+\|\s+/);
            entries.push({
                name: namePart || firstSplit.main,
                technologies: techPart ? techPart.split(/,\s*/).filter(Boolean) : [],
                dates,
                bullets,
                confidence: bullets.length ? 0.75 : 0.45,
            });
        } else {
            entries.push({
                title: firstSplit.main,
                company: secondSplit.main || "",
                organization: secondSplit.main || "",
                location: secondSplit.location || firstSplit.location,
                dates,
                bullets,
                confidence: bullets.length && dates ? 0.8 : 0.5,
            });
        }
        index = Math.max(nextIndex, index + 1);
    }

    return entries.filter((entry) =>
        entry.bullets.length || entry.dates || (type === "projects" ? entry.name : entry.title || entry.company));
};

const parseEducation = (lines) => {
    const entries = [];
    for (let index = 0; index < lines.length; index += 2) {
        const first = lines[index]?.text || "";
        const second = lines[index + 1]?.text || "";
        if (!first) continue;
        const firstSplit = splitLocation(removeDates(first));
        entries.push({
            school: firstSplit.main,
            location: firstSplit.location,
            degree: removeDates(second),
            dates: extractDates(first) || extractDates(second),
            confidence: second ? 0.75 : 0.45,
        });
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
        rawLines: lines,
        sectionBoundaries: Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, value.map((line) => line.text)])),
        originalPreview,
    };
};
