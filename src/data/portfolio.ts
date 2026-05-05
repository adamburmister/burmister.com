// TODO: Delete this file

export interface SocialLink {
  label: string;
  url: string;
}

export interface WorkExperience {
  company: string;
  role: string;
  period: string;
  location: string;
  summary: string;
}

export interface Project {
  name: string;
  summary: string;
  url?: string;
  technologies: string[];
}

export interface PortfolioData {
  name: string;
  title: string;
  domain: string;
  description: string;
  resumePdfPath: string;
  imagePath: string;
  social: SocialLink[];
  skills: string[];
  experience: WorkExperience[];
  projects: Project[];
  colophon: {
    originalAuthor: string;
    originalProjectUrl: string;
    license: string;
  };
}

export const portfolio: PortfolioData = {
  name: "Adam Burmister",
  title: "Full Stack Engineer",
  domain: "burmister.com",
  description:
    "Adam Burmister is a full-stack engineer focused on practical systems, polished web products, TypeScript, React, Node.js, and cloud infrastructure.",
  resumePdfPath: "/assets/Adam Burmister - Full Stack Engineer - Resume.pdf",
  imagePath: "/assets/adam-burmister.png",
  social: [
    {
      label: "Website",
      url: "https://burmister.com",
    },
    {
      label: "GitHub",
      url: "https://github.com/aburmister",
    },
    {
      label: "LinkedIn",
      url: "https://www.linkedin.com/in/aburmister/",
    },
  ],
  skills: [
    "TypeScript",
    "React",
    "Node.js",
    "Astro",
    "Vite",
    "Cloudflare",
    "API design",
    "Product engineering",
    "Frontend architecture",
    "Technical leadership",
  ],
  experience: [
    {
      company: "Portfolio details pending",
      role: "Full Stack Engineer",
      period: "Update with current timeline",
      location: "Remote / Australia",
      summary:
        "Replace this placeholder with Adam's current role, highlights, and measurable outcomes.",
    },
  ],
  projects: [
    {
      name: "burmister.com",
      summary:
        "A retro terminal portfolio rebuilt with Astro, Vite, WebGL, xterm.js, and Cloudflare.",
      url: "https://burmister.com",
      technologies: ["Astro", "Vite", "TypeScript", "Three.js", "Cloudflare"],
    },
  ],
  colophon: {
    originalAuthor: "Remo H. Jansen",
    originalProjectUrl:
      "https://github.com/remojansen/cool-retro-term-webgl/tree/main",
    license: "GPL-3.0",
  },
};
