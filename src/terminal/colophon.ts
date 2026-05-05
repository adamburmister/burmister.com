import type { CommandContext } from "./ShellEmulator";

const COLOPHON_TEXT_URL = "/assets/content/colophon.txt";

export async function colophonCommand(ctx: CommandContext): Promise<void> {
  try {
    const response = await fetch(COLOPHON_TEXT_URL);
    if (!response.ok) {
      ctx.terminal.writeln("colophon: unable to load colophon.txt");
      return;
    }

    const colophonText = await response.text();
    for (const line of colophonText.split("\n")) {
      ctx.terminal.writeln(line);
    }
  } catch {
    ctx.terminal.writeln("colophon: unable to load colophon.txt");
  }
}
