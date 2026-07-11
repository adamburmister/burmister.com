import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import { defineConfig,sessionDrivers } from "astro/config";

const rootDirectory = fileURLToPath(new URL(".", import.meta.url));
const terminalMetadataModuleId = "virtual:terminal-file-metadata";
const resolvedTerminalMetadataModuleId = `\0${terminalMetadataModuleId}`;
const terminalDateMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatTerminalDate(date) {
  const month = terminalDateMonths[date.getMonth()];
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${month} ${day} ${hours}:${minutes}`;
}

function walkFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkFiles(absolutePath));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

function collectTerminalFileMetadata() {
  const terminalSourceFiles = walkFiles(join(rootDirectory, "src/terminal"))
    .filter((filePath) => filePath.endsWith(".ts"))
    .filter((filePath) => !filePath.endsWith(".d.ts"));
  const contentAssetFiles = walkFiles(join(rootDirectory, "public/")).filter(
    (filePath) => filePath.endsWith(".txt"),
  );

  const metadata = {};

  for (const absolutePath of [...terminalSourceFiles, ...contentAssetFiles]) {
    const stats = statSync(absolutePath);
    const relativePath = relative(rootDirectory, absolutePath).replaceAll(
      "\\",
      "/",
    );

    metadata[relativePath] = {
      size: stats.size,
      modified: formatTerminalDate(stats.mtime),
    };
  }

  return metadata;
}

function terminalFileMetadataPlugin() {
  return {
    name: "terminal-file-metadata",
    resolveId(id) {
      if (id === terminalMetadataModuleId) {
        return resolvedTerminalMetadataModuleId;
      }
    },
    load(id) {
      if (id !== resolvedTerminalMetadataModuleId) {
        return;
      }

      return `export const terminalFileMetadata = ${JSON.stringify(
        collectTerminalFileMetadata(),
        null,
        2,
      )};`;
    },
  };
}

export default defineConfig({
  site: "https://burmister.com",
  output: "server",
  adapter: cloudflare({
    imageService: "compile",
  }),
  integrations: [sitemap(
    {
      customPages: [
        'https://burmister.com/cv.pdf', 
        'https://burmister.com/resume.txt'
      ]
    }
  )],
  redirects: {
    "/colophon": "/colophon.txt",
    "/sitemap.xml": "/sitemap-index.xml",
  },
  vite: {
    plugins: [terminalFileMetadataPlugin()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/three")) {
              return "three";
            }
            if (id.includes("node_modules/cool-retro-term-renderer")) {
              return "crt-renderer";
            }
            if (id.includes("node_modules/@xterm")) {
              return "xterm";
            }
            if (id.includes("src/terminal/")) {
              return "terminal-programs";
            }
          },
        },
      },
    },
  },
});
