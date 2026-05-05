import type { CommandHandler } from "./ShellEmulator";

export interface TerminalCommandDefinition {
  names: string[];
  handler: CommandHandler;
  parent?: string;
  helpName: string;
  description: string;
  helpVisible?: boolean;
  helpAliases?: string[];
  helpOrder?: number;
}

export interface TerminalFileDefinition {
  path: string;
  statPath: string;
  permissions?: string;
  assetUrl?: string;
  contentErrorMessage?: string;
}

export interface TerminalModule {
  commands?: TerminalCommandDefinition[];
  files?: TerminalFileDefinition[];
}

export interface TerminalModuleExport {
  terminalModule?: TerminalModule;
}

export function defineTerminalModule(module: TerminalModule): TerminalModule {
  return module;
}
