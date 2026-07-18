const defaultPersonalInfo = {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "(555) 123-4567",
    linkedin: "linkedin.com/in/janedoe",
    github: "",
    portfolio: "",
};

// Sample library shown on "Start with Sample" / "Reset". Every item follows the
// v2 library shape: included + source, and entry-like items carry variants.
const sampleLibrary = {
    education: [
        {
            id: "edu-1",
            school: "State University",
            degree: "B.S. Computer Science",
            location: "San Jose, CA",
            dates: "Aug 2016 - May 2020",
            included: true,
            source: "sample",
        },
    ],
    experience: [
        {
            id: "job-1",
            title: "Senior Software Engineer",
            company: "TechNova Solutions",
            location: "",
            dates: "Jan 2021 - Present",
            included: true,
            source: "sample",
            selectedVariantId: "v1",
            variants: [
                {
                    id: "v1",
                    label: "Backend Heavy",
                    bullets: "Architected microservices using Node.js and AWS, improving system scalability by 40%.\nOptimized database queries, reducing load times by 200ms.",
                },
                {
                    id: "v2",
                    label: "Leadership",
                    bullets: "Led a team of 5 engineers to deliver the core product rewrite ahead of schedule.\nMentored junior developers and established code review best practices.",
                },
            ],
        },
        {
            id: "job-2",
            title: "Data Analyst",
            company: "DataFlow Analytics",
            location: "",
            dates: "Mar 2019 - Dec 2020",
            included: true,
            source: "sample",
            selectedVariantId: "v1",
            variants: [
                {
                    id: "v1",
                    label: "Technical",
                    bullets: "Developed complex SQL pipelines to aggregate daily metrics for the dashboard.\nAutomated reporting using Python and Pandas.",
                },
                {
                    id: "v2",
                    label: "Business Focus",
                    bullets: "Presented weekly actionable insights to stakeholders, driving a 15% increase in user retention.\nCollaborated with marketing to identify key customer segments.",
                },
            ],
        },
        {
            id: "job-3",
            title: "Frontend Developer",
            company: "WebSphere Designs",
            location: "",
            dates: "Jun 2017 - Feb 2019",
            included: false,
            source: "sample",
            selectedVariantId: "v1",
            variants: [
                {
                    id: "v1",
                    label: "React Focus",
                    bullets: "Built responsive web applications using React and Redux.\nMigrated legacy jQuery codebase to modern component-based architecture.",
                },
                {
                    id: "v2",
                    label: "Design/UX",
                    bullets: "Implemented pixel-perfect UI designs from Figma.\nImproved accessibility scores to 100% across all pages.",
                },
            ],
        },
        {
            id: "job-4",
            title: "Product Manager",
            company: "Innovate Inc",
            location: "",
            dates: "Aug 2015 - May 2017",
            included: false,
            source: "sample",
            selectedVariantId: "v1",
            variants: [
                {
                    id: "v1",
                    label: "Agile",
                    bullets: "Managed the backlog and sprint planning for 3 cross-functional teams.\nDefined product roadmap based on user feedback and market research.",
                },
                {
                    id: "v2",
                    label: "Go-to-market",
                    bullets: "Spearheaded the launch of 2 major features, resulting in $500k ARR increase.\nConducted competitive analysis to position the product effectively.",
                },
            ],
        },
        {
            id: "job-5",
            title: "Software Intern",
            company: "StartupX",
            location: "",
            dates: "May 2014 - Aug 2014",
            included: false,
            source: "sample",
            selectedVariantId: "v1",
            variants: [
                {
                    id: "v1",
                    label: "General",
                    bullets: "Assisted in developing internal tools using Python and Flask.\nWrote unit tests to increase code coverage by 15%.",
                },
                {
                    id: "v2",
                    label: "DevOps",
                    bullets: "Helped set up CI/CD pipelines using Jenkins.\nCreated Dockerfiles for local development environments.",
                },
            ],
        },
    ],
    projects: [
        {
            id: "proj-1",
            name: "Metrics Dashboard",
            technologies: ["React", "D3.js", "Flask"],
            dates: "2020",
            included: false,
            source: "sample",
            selectedVariantId: "v1",
            variants: [
                {
                    id: "v1",
                    label: "Default",
                    bullets: "Built an internal analytics dashboard used by 3 teams daily.\nVisualized funnel metrics with interactive D3 charts.",
                },
            ],
        },
    ],
    research: [],
    leadership: [],
    skills: [
        {
            id: "skill-1",
            category: "Languages",
            items: ["JavaScript", "Python", "SQL"],
            included: true,
            source: "sample",
        },
        {
            id: "skill-2",
            category: "Frameworks",
            items: ["React", "Node.js", "Flask"],
            included: true,
            source: "sample",
        },
    ],
};
