// Reference template implementation — see PRD.md §5.
// Jake's Resume: the engineering standard. Reuses the existing generators so the
// HTML, LaTeX, and editable preview stay in lockstep.
registerResumeTemplate({
    id: "jakes",
    name: "Jake's",
    tagline: "The engineering standard — Computer Modern, ruled sections",
    atsRating: "A",
    renderHtml: (resume) => generateStructuredHtml(resume),
    renderLatex: (resume) => generateStructuredLatex(resume),
    previewCss: `
.tpl-jakes { font-family: "CMU Serif", Georgia, "Times New Roman", serif; font-size: 11pt; color: #111; line-height: 1.3; }
.tpl-jakes h1 { text-align: center; margin: 0 0 2px; font-variant: small-caps; font-size: 28pt; letter-spacing: 0.5px; font-weight: 700; }
.tpl-jakes main > header p { text-align: center; margin: 2px 0 0; font-size: 10pt; }
.tpl-jakes h2 { font-variant: small-caps; font-weight: normal; border-bottom: 1px solid #111; font-size: 14pt; margin: 16px 0 6px; padding-bottom: 1px; }
.tpl-jakes article { margin: 6px 0; }
.tpl-jakes article header, .tpl-jakes .subheader { display: flex; justify-content: space-between; gap: 24px; }
.tpl-jakes .subheader { font-size: 10pt; }
.tpl-jakes ul { margin: 3px 0 0; padding-left: 22px; font-size: 10pt; }
.tpl-jakes li { margin-bottom: 1px; }
.tpl-jakes .skill-row { margin: 2px 0; font-size: 10pt; }
@media print {
    .tpl-jakes { line-height: 1.25; }
}
`,
});
