import type { CommandHandler } from "./shellTypes";
import type {
  TerminalCommandDefinition,
  TerminalModuleExport,
} from "./terminalModule";
import { registerVirtualFile } from "./virtualFileSystem";

const commandRegistry: Map<string, CommandHandler> = new Map();

const discoveredTerminalModules = import.meta.glob<TerminalModuleExport>(
  [
    "./*.ts",
    /* TODO: This is messy. Probably best if we extract the discoverable
    commands into a sub directory and just glob that directory here, rather than having to explicitly exclude all the non-command files in the terminal directory. For now, this works and is explicit about what's being included as a terminal module.
    A ./bin/ directory would fit the idea.
    */
    "!./*.d.ts",
    "!./ShellEmulator.ts",
    "!./TerminalTextAnsiColor.ts",
    "!./XTermAdapter.ts",
    "!./builtins.ts",
    "!./commandRegistry.ts",
    "!./shellParser.ts",
    "!./shellRunner.ts",
    "!./shellTypes.ts",
    "!./terminalModule.ts",
    "!./virtualFileSystem.ts",
    /* BiosBootSequence imports ShellEmulator, which imports this module,
       so eagerly globbing it would create a circular dependency that leaves
       its module namespace undefined under the current bundler. It is not a
       terminal module and is imported directly by XTermAdapter. */
    "!./BiosBootSequence.ts",
  ],
  { eager: true },
);

export interface HelpEntry {
  name: string;
  parent: string;
  description: string;
  aliases: string[];
  order: number;
}

const helpRegistry: Map<string, HelpEntry> = new Map();

export function registerCommand(name: string, handler: CommandHandler): void {
  commandRegistry.set(name.toLowerCase(), handler);
}

export function getCommandHandler(name: string): CommandHandler | undefined {
  return commandRegistry.get(name.toLowerCase());
}

export function hasRegisteredCommand(name: string): boolean {
  return commandRegistry.has(name.toLowerCase());
}

export function getRegisteredCommandNames(): string[] {
  return [...commandRegistry.keys()];
}

export function registerCoreCommand(
  name: string,
  handler: CommandHandler,
  help: Omit<TerminalCommandDefinition, "names" | "handler">,
): void {
  registerCommand(name, handler);
  registerHelpEntry({
    names: [name],
    handler,
    ...help,
  });
}

export function registerDiscoveredTerminalModules(): void {
  for (const definition of Object.values(discoveredTerminalModules)) {
    registerTerminalModule(definition);
  }
}

export function getVisibleHelpEntries(): HelpEntry[] {
  return [...helpRegistry.values()].sort((a, b) => {
    if (a.parent !== b.parent) {
      if (a.parent === "") {
        return -1;
      }
      if (b.parent === "") {
        return 1;
      }

      return a.parent.localeCompare(b.parent);
    }

    if (a.order !== b.order) {
      return a.order - b.order;
    }

    return a.name.localeCompare(b.name);
  });
}

function registerTerminalModule(definition: TerminalModuleExport): void {
  const terminalModule = definition.terminalModule;
  if (!terminalModule) {
    return;
  }

  for (const file of terminalModule.files ?? []) {
    registerVirtualFile(file);
  }

  for (const command of terminalModule.commands ?? []) {
    registerCommandDefinition(command);
  }
}

function registerCommandDefinition(
  definition: TerminalCommandDefinition,
): void {
  for (const name of definition.names) {
    registerCommand(name, definition.handler);
  }

  registerHelpEntry(definition);
}

function registerHelpEntry(definition: TerminalCommandDefinition): void {
  if (definition.helpVisible === false) {
    return;
  }

  helpRegistry.set(definition.helpName, {
    name: definition.helpName,
    parent: definition.parent ?? "",
    description: definition.description,
    aliases: definition.helpAliases ?? [],
    order: definition.helpOrder ?? 1000,
  });
}
