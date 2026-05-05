import { pageText } from "./less";
import type { CommandContext } from "./ShellEmulator";
import { defineTerminalModule } from "./terminalModule";

const RESUME_TEXT_URL = "/assets/content/resume.txt";

export async function cvCommand(ctx: CommandContext): Promise<void> {
  try {
    const response = await fetch(RESUME_TEXT_URL);
    if (!response.ok) {
      ctx.terminal.writeln("cv: unable to load resume.txt");
      return;
    }

    const cvText = await response.text();
    await pageText(ctx, cvText, { title: "cv" });
  } catch {
    ctx.terminal.writeln("cv: unable to load resume.txt");
  }
}

export const terminalModule = defineTerminalModule({
  commands: [
    {
      names: ["cv", "./cv"],
      handler: cvCommand,
      parent: "bin",
      helpName: "cv",
      description: "Display Adam's resume",
      helpAliases: ["cv", "./cv"],
      helpOrder: 10,
    },
  ],
  files: [
    {
      path: "bin/cv",
      statPath: "src/terminal/cv.ts",
    },
    {
      path: "docs/resume.txt",
      statPath: "public/assets/content/resume.txt",
      permissions: "-rw-r--r--",
      assetUrl: RESUME_TEXT_URL,
      contentErrorMessage: "Could not load resume file",
    },
  ],
});
