import type { CommandContext } from "./ShellEmulator";
import { defineTerminalModule } from "./terminalModule";

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

export const terminalModule = defineTerminalModule({
  commands: [
    {
      names: ["colophon", "./colophon"],
      handler: colophonCommand,
      parent: "bin",
      helpName: "colophon",
      description: "Show credits and build notes",
      helpAliases: ["colophon", "./colophon"],
      helpOrder: 20,
    },
  ],
  files: [
    {
      path: "bin/colophon",
      statPath: "src/terminal/colophon.ts",
    },
    {
      path: "docs/colophon.txt",
      statPath: "public/assets/content/colophon.txt",
      permissions: "-rw-r--r--",
      assetUrl: COLOPHON_TEXT_URL,
      contentErrorMessage: "Could not load colophon file",
    },
  ],
});
