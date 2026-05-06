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

export const homepageMarkdown = `---
title: Adam Burmister - Senior Frontend Engineer
description: ${siteDescription}
image: ${siteUrl}/adam-burmister.png
---

# Adam Burmister

${siteDescription}

## Profile

Senior product frontend engineer with 17+ years building large-scale web products at Stripe, Pinterest, Xero and BBC Worldwide.

## Key Links

- Website: ${siteUrl}
- Resume PDF: ${siteUrl}${resumePdfPath}
- Text resume: ${siteUrl}${resumeTextPath}
- Colophon: ${siteUrl}${colophonPath}
- Agent guidance: ${siteUrl}${agentGuidancePath}
- Agent profile: ${siteUrl}${agentsTxtPath}

## Skills

${skills.map((skill) => `- ${skill}`).join("\n")}

## API

- Guestbook API: ${siteUrl}/api/guestbook
- API catalog: ${siteUrl}/.well-known/api-catalog

## Agent Notes

The visual homepage is a retro terminal/WebGL experience. Agents should prefer the text resources above for extraction, citation, and summarisation.

\`\`\`json
${JSON.stringify(personJsonLd, null, 2)}
\`\`\`
`;

export const discoveryLinks = [
  `<${agentGuidancePath}>; rel="alternate"; type="text/plain"; title="LLM guidance"`,
  `<${agentsTxtPath}>; rel="alternate"; type="text/plain"; title="Agent guidance"`,
  `<${resumeTextPath}>; rel="alternate"; type="text/plain"; title="Text resume"`,
  `<${colophonPath}>; rel="alternate"; type="text/plain"; title="Colophon"`,
  `</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
  `</.well-known/openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"; title="OpenAPI description"`,
  `</.well-known/api-docs.md>; rel="service-doc"; type="text/markdown"; title="API documentation"`,
  `</.well-known/oauth-protected-resource>; rel="oauth-protected-resource"; type="application/json"; title="OAuth protected resource metadata"`,
  `</.well-known/agent-skills/index.json>; rel="service-desc"; type="application/json"; title="Agent skills index"`,
  `</.well-known/mcp/server-card.json>; rel="service-desc"; type="application/json"; title="MCP server card"`,
];
