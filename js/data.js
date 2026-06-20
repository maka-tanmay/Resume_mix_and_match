const defaultPersonalInfo = {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "(555) 123-4567",
    linkedin: "linkedin.com/in/janedoe",
};

const initialJobs = [
    {
        id: "job-1",
        company: "TechNova Solutions",
        title: "Senior Software Engineer",
        duration: "Jan 2021 - Present",
        included: true,
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
        company: "DataFlow Analytics",
        title: "Data Analyst",
        duration: "Mar 2019 - Dec 2020",
        included: true,
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
        company: "WebSphere Designs",
        title: "Frontend Developer",
        duration: "Jun 2017 - Feb 2019",
        included: false,
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
        company: "Innovate Inc",
        title: "Product Manager",
        duration: "Aug 2015 - May 2017",
        included: false,
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
        company: "StartupX",
        title: "Software Intern",
        duration: "May 2014 - Aug 2014",
        included: false,
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
];
