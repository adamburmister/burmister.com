export const siteUrl = "https://burmister.com";
export const personName = "Adam Burmister";
export const roleTitle = "Senior Frontend Engineer";
export const resumePdfPath = "/cv.pdf";
export const resumeTextPath = "/resume.txt";
export const colophonPath = "/colophon.txt";
export const agentGuidancePath = "/llms.txt";
export const agentsTxtPath = "/agents.txt";

export const siteDescription =
  "Adam Burmister is a senior frontend engineer focused on React, TypeScript, design systems, SaaS UX, polished web products and practical full-stack delivery.";

export const skills = [
  "TypeScript",
  "React",
  "Node.js",
  "Astro",
  "Vite",
  "Cloudflare",
  "API design",
  "Product engineering",
  "Design systems",
  "SaaS UX",
  "Frontend architecture",
  "Technical leadership",
];

export const sameAs = [
  "https://github.com/adamburmister",
  "https://www.linkedin.com/in/adamburmister/",
];

export const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: personName,
  jobTitle: roleTitle,
  url: siteUrl,
  image: `${siteUrl}/adam-burmister.png`,
  description: siteDescription,
  sameAs,
  knowsAbout: skills,
  subjectOf: [
    {
      "@type": "CreativeWork",
      name: "Resume PDF",
      url: `${siteUrl}${resumePdfPath}`,
      encodingFormat: "application/pdf",
    },
    {
      "@type": "CreativeWork",
      name: "Text resume",
      url: `${siteUrl}${resumeTextPath}`,
      encodingFormat: "text/plain",
    },
  ],
};
