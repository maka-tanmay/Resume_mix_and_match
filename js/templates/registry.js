// Template registry — see PRD.md §5 for the contract.
// A template is a pure projection of structuredResume: renderHtml(resume) plus
// CSS scoped under .tpl-<id>. Registration order (index.html script order)
// controls gallery display order.
const RESUME_TEMPLATES = {};
const DEFAULT_TEMPLATE_ID = "jakes";

const registerResumeTemplate = (template) => {
    if (!template?.id || typeof template.renderHtml !== "function" || typeof template.previewCss !== "string") {
        console.error("Invalid resume template registration:", template?.id);
        return;
    }
    RESUME_TEMPLATES[template.id] = {
        atsRating: "B",
        tagline: "",
        renderLatex: null,
        ...template,
    };
};

const getResumeTemplate = (templateId) =>
    RESUME_TEMPLATES[templateId] || RESUME_TEMPLATES[DEFAULT_TEMPLATE_ID] || Object.values(RESUME_TEMPLATES)[0] || null;

const listResumeTemplates = () => Object.values(RESUME_TEMPLATES);
