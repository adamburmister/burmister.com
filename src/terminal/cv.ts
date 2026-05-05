import type { CommandContext } from "./ShellEmulator";

const RESUME_TEXT_URL = "/assets/content/resume.txt";

export async function cvCommand(ctx: CommandContext): Promise<void> {
  try {
    const response = await fetch(RESUME_TEXT_URL);
    if (!response.ok) {
      ctx.terminal.writeln("cv: unable to load resume.txt");
      return;
    }

    const cvText = await response.text();
    for (const line of cvText.split("\n")) {
      ctx.terminal.writeln(line);
    }
  } catch {
    ctx.terminal.writeln("cv: unable to load resume.txt");
  }
}
