import type { CommandContext, HelpEntry } from "./ShellEmulator";
import { getVisibleHelpEntries } from "./ShellEmulator";
import { defineTerminalModule } from "./terminalModule";

export function helpCommand(ctx: CommandContext): void {
  const entries = getVisibleHelpEntries();
  const nameWidth = entries.reduce(
    (width, entry) => Math.max(width, getRunnableHelpName(entry).length),
    0,
  );
  let currentParent: string | null = null;

  ctx.terminal.writeln("Available commands:");
  for (const entry of entries) {
    if (entry.parent !== currentParent) {
      currentParent = entry.parent;
      ctx.terminal.writeln("");
      ctx.terminal.writeln(`${getHelpGroupName(entry.parent)}:`);
    }

    const runnableName = getRunnableHelpName(entry);
    const aliases =
      entry.aliases.length > 0 ? ` (${entry.aliases.join(", ")})` : "";
    ctx.terminal.writeln(
      `  ${runnableName.padEnd(nameWidth)}  - ${entry.description}${aliases}`,
    );
  }
}

function getRunnableHelpName(entry: HelpEntry): string {
  if (!entry.parent) {
    return entry.name;
  }

  const commandName = entry.name.replace(/^\.\//, "");
  return `./${entry.parent}/${commandName}`;
}

function getHelpGroupName(parent: string): string {
  return parent ? `~/${parent}` : "~";
}

export const terminalModule = defineTerminalModule({
  commands: [
    {
      names: ["help"],
      handler: helpCommand,
      helpName: "help",
      description: "Show this help message",
      helpOrder: 0,
    },
  ],
});
