/**
 * ShellEmulator - public facade for the web terminal shell.
 *
 * The implementation is split across focused modules for command registry,
 * virtual filesystem, parsing, built-ins, and command execution. This file
 * keeps the public imports stable for the terminal adapter.
 */

import { registerBuiltInCommands } from "./builtins";
import { registerDiscoveredTerminalModules } from "./commandRegistry";
import { initVirtualFileSystem } from "./virtualFileSystem";

export type { HelpEntry } from "./commandRegistry";
export { getVisibleHelpEntries } from "./commandRegistry";
export {
  getInitialOutput,
  getPrompt,
  getTabCompletions,
  runCommand,
} from "./shellRunner";
export type {
  CommandContext,
  CommandHandler,
  KeyHandler,
  KeyHandlerOptions,
  RunCommandOptions,
  TerminalIO,
} from "./shellTypes";
export { sleep } from "./shellTypes";
export { loadVirtualFileContent, resolvePath } from "./virtualFileSystem";

initVirtualFileSystem();
registerBuiltInCommands();
registerDiscoveredTerminalModules();
