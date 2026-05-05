/**
 * ShellEmulator - A flexible mock shell for the web terminal
 *
 * This emulates a shell prompt without using a real shell process.
 * Commands can be synchronous or asynchronous, and can print output
 * progressively before returning control to the terminal.
 */

import { terminalFileMetadata } from "virtual:terminal-file-metadata";
import type {
  TerminalCommandDefinition,
  TerminalFileDefinition,
  TerminalModuleExport,
} from "./terminalModule";

/**
 * Key handler function type for games and interactive apps
 * @param key - The key string (e.g., "ArrowUp", "a")
 * @param eventType - "keydown" or "keyup"
 * @param ctrlKey - Whether Ctrl key is held
 */
export type KeyHandler = (
  key: string,
  eventType: "keydown" | "keyup",
  ctrlKey?: boolean,
) => void;

export interface KeyHandlerOptions {
  allowScroll?: boolean;
}

/**
 * Terminal interface - allows commands to interact with the terminal
 */
export interface TerminalIO {
  /** Write text to the terminal (does not include newline) */
  write(text: string): void;
  /** Write a line to the terminal (includes newline) */
  writeln(text: string): void;
  /** Clear the terminal screen */
  clear(): void;
  /** Set a key handler for capturing raw keyboard input (for games) */
  setKeyHandler?(handler: KeyHandler, options?: KeyHandlerOptions): void;
  /** Clear the key handler */
  clearKeyHandler?(): void;
  /** Hide the cursor (for games/full-screen apps) */
  hideCursor?(): void;
  /** Show the cursor */
  showCursor?(): void;
  /** Get terminal size in columns and rows */
  getSize?(): { cols: number; rows: number };
  /** Start game music (loops) */
  startGameMusic?(): void;
  /** Stop game music */
  stopGameMusic?(): void;
  /** Play dial-up connection audio once */
  playDialupAudio?(): Promise<void>;
  /** Stop dial-up connection audio */
  stopDialupAudio?(): void;
  /** Trigger a browser download for a public asset */
  downloadFile?(url: string, filename: string): void;
}

/**
 * Command context passed to command handlers
 */
export interface CommandContext {
  /** The full command string */
  command: string;
  /** Parsed arguments (command name is args[0]) */
  args: string[];
  /** Terminal IO for writing output */
  terminal: TerminalIO;
}

/**
 * Command handler function type
 * Can be synchronous (returns void) or asynchronous (returns Promise<void>)
 * The command writes output via ctx.terminal and control returns to shell when done
 */
export type CommandHandler = (ctx: CommandContext) => void | Promise<void>;

export interface RunCommandOptions {
  suppressPrompt?: boolean;
}

/**
 * Command registry - maps command names to handlers
 */
const commandRegistry: Map<string, CommandHandler> = new Map();

const discoveredTerminalModules = import.meta.glob<TerminalModuleExport>(
  [
    "./*.ts",
    "!./*.d.ts",
    "!./ShellEmulator.ts",
    "!./TerminalTextAnsiColor.ts",
    "!./XTermAdapter.ts",
    "!./terminalModule.ts",
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

/**
 * Virtual file system entry
 */
interface FileEntry {
  /** File name */
  name: string;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** File size in bytes (for display) */
  size: number;
  /** File permissions string (for ls -l) */
  permissions: string;
  /** Last modified date string */
  modified: string;
  /** File content (for regular files) - can be string or async loader */
  content?: string | (() => Promise<string>);
  /** Parent directory path */
  parent: string;
}

/**
 * Virtual file system - maps file paths to entries
 */
const virtualFileSystem: Map<string, FileEntry> = new Map();

function getPathParts(path: string): { name: string; parent: string } {
  const parts = path.split("/");
  const name = parts.pop() ?? path;

  return {
    name,
    parent: parts.join("/"),
  };
}

function registerVirtualFile(definition: TerminalFileDefinition): void {
  const metadata = terminalFileMetadata[definition.statPath];
  const { name, parent } = getPathParts(definition.path);

  virtualFileSystem.set(definition.path, {
    name,
    isDirectory: false,
    size: metadata?.size ?? 0,
    permissions: definition.permissions ?? "-rwxr-xr-x",
    modified: metadata?.modified ?? "Jan 01 00:00",
    parent,
    content: definition.assetUrl
      ? async () => {
          const response = await fetch(definition.assetUrl ?? "");
          if (!response.ok) {
            throw new Error(
              definition.contentErrorMessage ?? `Could not load ${name}`,
            );
          }

          return await response.text();
        }
      : undefined,
  });
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

function registerCommandDefinition(
  definition: TerminalCommandDefinition,
): void {
  for (const name of definition.names) {
    registerCommand(name, definition.handler);
  }

  registerHelpEntry(definition);
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

function registerDiscoveredTerminalModules(): void {
  for (const definition of Object.values(discoveredTerminalModules)) {
    registerTerminalModule(definition);
  }
}

/**
 * Current working directory (always starts and ends without /)
 */
let currentDirectory = "";

/**
 * Resolve a path relative to current directory
 * Handles . .. and absolute paths (starting with ~ or /)
 */
export function resolvePath(path: string): string {
  // Empty path means current directory
  if (!path || path === ".") {
    return currentDirectory;
  }

  // Handle home directory (~ is the root in our virtual FS)
  if (path === "~" || path === "/") {
    return "";
  }

  // Start from root if path starts with ~ or /
  let basePath: string;
  let pathToProcess: string;

  if (path.startsWith("~/")) {
    basePath = "";
    pathToProcess = path.slice(2);
  } else if (path.startsWith("/")) {
    basePath = "";
    pathToProcess = path.slice(1);
  } else {
    basePath = currentDirectory;
    pathToProcess = path;
  }

  // Split path into components
  const baseComponents = basePath ? basePath.split("/") : [];
  const pathComponents = pathToProcess.split("/").filter((c) => c.length > 0);

  // Process each component
  for (const component of pathComponents) {
    if (component === ".") {
    } else if (component === "..") {
      // Go up one level
      if (baseComponents.length > 0) {
        baseComponents.pop();
      }
    } else {
      baseComponents.push(component);
    }
  }

  return baseComponents.join("/");
}

/**
 * Get files in a specific directory
 */
function getFilesInDirectory(dirPath: string): FileEntry[] {
  const files: FileEntry[] = [];
  for (const [_path, entry] of virtualFileSystem.entries()) {
    if (entry.parent === dirPath) {
      files.push(entry);
    }
  }
  return files;
}

/**
 * Check if a path is a valid directory
 */
function isValidDirectory(path: string): boolean {
  if (path === "") return true; // Root is always valid
  return (
    virtualFileSystem.has(path) &&
    (virtualFileSystem.get(path)?.isDirectory ?? false)
  );
}

/**
 * Initialize the virtual file system with default files
 */
function initFileSystem(): void {
  virtualFileSystem.set("docs", {
    name: "docs",
    isDirectory: true,
    size: 4096,
    permissions: "drwxr-xr-x",
    modified: "Dec 10 12:00",
    parent: "",
  });
  virtualFileSystem.set("bin", {
    name: "bin",
    isDirectory: true,
    size: 4096,
    permissions: "drwxr-xr-x",
    modified: "May 06 07:46",
    parent: "",
  });
}

// Initialize the file system
initFileSystem();

/**
 * Get the shell prompt string
 */
function getPrompt(): string {
  const dirDisplay = currentDirectory ? `~/${currentDirectory}` : "~";
  return `guest@burmister.com:${dirDisplay}$ `;
}

/**
 * Register a command handler
 *
 * @param name - The command name (e.g., "help", "ls", "echo")
 * @param handler - The function to handle the command
 */
function registerCommand(name: string, handler: CommandHandler): void {
  commandRegistry.set(name.toLowerCase(), handler);
}

export async function loadVirtualFileContent(
  inputPath: string,
): Promise<string> {
  const resolvedPath = resolvePath(inputPath);
  const file = virtualFileSystem.get(resolvedPath);

  if (!file) {
    throw new Error("No such file or directory");
  }

  if (file.isDirectory) {
    throw new Error("Is a directory");
  }

  if (file.content === undefined) {
    throw new Error("Unable to read file");
  }

  return typeof file.content === "function"
    ? await file.content()
    : file.content;
}

function registerCoreCommand(
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

/**
 * Parse command string into arguments (handles quoted strings)
 */
function parseArgs(command: string): string[] {
  const args: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (const char of command) {
    if (inQuote) {
      if (char === quoteChar) {
        inQuote = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"' || char === "'") {
        inQuote = true;
        quoteChar = char;
      } else if (char === " " || char === "\t") {
        if (current.length > 0) {
          args.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }
  }

  if (current.length > 0) {
    args.push(current);
  }

  return args;
}

/**
 * Run a command asynchronously
 *
 * @param command - The command string entered by the user
 * @param terminal - Terminal IO interface for writing output
 * @returns Promise that resolves when command completes
 */
export async function runCommand(
  command: string,
  terminal: TerminalIO,
  options: RunCommandOptions = {},
): Promise<void> {
  const trimmedCommand = command.trim();

  // If no command was typed, just show prompt
  if (trimmedCommand === "") {
    if (!options.suppressPrompt) {
      terminal.write(getPrompt());
    }
    return;
  }

  // Parse command into arguments
  const args = parseArgs(trimmedCommand);
  if (args.length === 0) {
    if (!options.suppressPrompt) {
      terminal.write(getPrompt());
    }
    return;
  }

  let commandName = args[0].toLowerCase();

  // Check if this is a path-based command (starts with ./)
  if (args[0].startsWith("./")) {
    // Extract the path after ./ using original case (e.g., "./bin/blocks" -> "bin/blocks")
    const pathAfterDotSlash = args[0].slice(2);

    // Resolve the full path to check if the file exists
    const executablePath = resolvePath(pathAfterDotSlash);

    // Check if the executable exists at the resolved path
    const file = virtualFileSystem.get(executablePath);
    const isExecutable =
      file && !file.isDirectory && file.permissions.includes("x");

    if (!isExecutable && !commandRegistry.has(args[0].toLowerCase())) {
      terminal.writeln(`zsh: no such file or directory: ${args[0]}`);
      if (!options.suppressPrompt) {
        terminal.write(getPrompt());
      }
      return;
    }

    // Use the base executable name for command lookup (e.g., "./blocks")
    if (file) {
      commandName = `./${file.name}`;
    }
  }

  const handler = commandRegistry.get(commandName);

  if (handler) {
    // Create context for the command
    const ctx: CommandContext = {
      command: trimmedCommand,
      args,
      terminal,
    };

    try {
      // Execute the command (may be sync or async)
      await handler(ctx);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      terminal.writeln(`Error: ${errorMessage}`);
    }
  } else {
    // Unknown command
    terminal.writeln(`${commandName}: command not found`);
  }

  // Show prompt after command completes
  if (!options.suppressPrompt) {
    terminal.write(getPrompt());
  }
}

/**
 * Sleep utility for commands that need delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get the initial terminal output (just the prompt)
 */
export function getInitialOutput(): string {
  return getPrompt();
}

// CD command - change directory
registerCoreCommand(
  "cd",
  (ctx) => {
    // No argument - go to home directory
    if (ctx.args.length < 2) {
      currentDirectory = "";
      return;
    }

    const targetPath = ctx.args[1];

    // Handle special cases
    if (targetPath === "~" || targetPath === "/") {
      currentDirectory = "";
      return;
    }

    if (targetPath === "-") {
      // In a real shell this would go to previous directory
      // For simplicity, just go home
      currentDirectory = "";
      return;
    }

    // Resolve the path
    const resolvedPath = resolvePath(targetPath);

    // Check if the resolved path is a valid directory
    if (!isValidDirectory(resolvedPath)) {
      ctx.terminal.writeln(`cd: ${targetPath}: No such file or directory`);
      return;
    }

    currentDirectory = resolvedPath;
  },
  {
    helpName: "cd",
    description: "Change directory",
    helpOrder: 40,
  },
);

// Clear command
registerCoreCommand(
  "clear",
  (ctx) => {
    ctx.terminal.clear();
  },
  {
    helpName: "clear",
    description: "Clear the terminal screen",
    helpOrder: 50,
  },
);

// LS command - list files from virtual file system
registerCoreCommand(
  "ls",
  (ctx) => {
    // Parse flags and path argument
    const hasLongFormat =
      ctx.args.includes("-l") ||
      ctx.args.includes("-la") ||
      ctx.args.includes("-al");

    // Find the path argument (skip flags)
    let targetDir = currentDirectory;
    for (let i = 1; i < ctx.args.length; i++) {
      if (!ctx.args[i].startsWith("-")) {
        targetDir = resolvePath(ctx.args[i]);
        break;
      }
    }

    // Check if target is a valid directory
    if (targetDir !== "" && !isValidDirectory(targetDir)) {
      // Check if it's a file
      const file = virtualFileSystem.get(targetDir);
      if (file && !file.isDirectory) {
        if (hasLongFormat) {
          ctx.terminal.writeln(
            `${file.permissions}  1 guest guest ${file.size.toString().padStart(8)} ${file.modified} ${file.name}`,
          );
        } else {
          ctx.terminal.writeln(file.name);
        }
        return;
      }
      ctx.terminal.writeln(
        `ls: cannot access '${ctx.args[1] || targetDir}': No such file or directory`,
      );
      return;
    }

    // Get files in the target directory
    const files = getFilesInDirectory(targetDir);

    if (files.length === 0) {
      // Empty directory, don't print anything
      return;
    }

    // Check for -l flag
    if (hasLongFormat) {
      for (const file of files) {
        const displayName = file.isDirectory ? `${file.name}/` : file.name;
        ctx.terminal.writeln(
          `${file.permissions}  1 guest guest ${file.size.toString().padStart(8)} ${file.modified} ${displayName}`,
        );
      }
    } else {
      const displayNames = files.map((f) =>
        f.isDirectory ? `${f.name}/` : f.name,
      );
      ctx.terminal.writeln(displayNames.join("  "));
    }
  },
  {
    helpName: "ls",
    description: "List directory contents",
    helpOrder: 60,
  },
);

// Cat command - read files from virtual file system
registerCoreCommand(
  "cat",
  async (ctx) => {
    if (ctx.args.length < 2) {
      ctx.terminal.writeln("cat: missing file operand");
      return;
    }

    const inputPath = ctx.args[1];
    const resolvedPath = resolvePath(inputPath);
    const file = virtualFileSystem.get(resolvedPath);

    if (!file) {
      ctx.terminal.writeln(`cat: ${inputPath}: No such file or directory`);
      return;
    }

    if (file.isDirectory) {
      ctx.terminal.writeln(`cat: ${inputPath}: Is a directory`);
      return;
    }

    if (file.content === undefined) {
      ctx.terminal.writeln(`cat: ${inputPath}: Unable to read file`);
      return;
    }

    try {
      // Handle async content loaders
      const content =
        typeof file.content === "function"
          ? await file.content()
          : file.content;

      const lines = content.split("\n");

      // Check if content has @@@ markers for pauses
      const hasDelimiters = lines.some((line) => line.trim() === "@@@");

      if (hasDelimiters) {
        // Group lines into batches separated by @@@
        const batches: string[][] = [];
        let currentBatch: string[] = [];

        for (const line of lines) {
          if (line.trim() === "@@@") {
            // End current batch and start a new one
            if (currentBatch.length > 0) {
              batches.push(currentBatch);
              currentBatch = [];
            }
          } else {
            currentBatch.push(line);
          }
        }

        // Don't forget the last batch
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
        }

        // Print each batch with a 500ms delay between them
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];

          // Print all lines in this batch
          for (const line of batch) {
            ctx.terminal.writeln(line);
          }

          // Wait 500ms before the next batch (unless this is the last batch)
          if (i < batches.length - 1) {
            await sleep(500);
          }
        }
      } else {
        // No delimiters, print all lines immediately
        for (const line of lines) {
          ctx.terminal.writeln(line);
        }
      }
    } catch (_error) {
      ctx.terminal.writeln(`cat: ${inputPath}: Error reading file`);
    }
  },
  {
    helpName: "cat",
    description: "Display file contents",
    helpOrder: 70,
  },
);

registerDiscoveredTerminalModules();

/**
 * Get tab completions for a partial path
 * @param partialInput - The current input being typed (may include command)
 * @returns Object with completions array and the prefix to replace
 */
export function getTabCompletions(partialInput: string): {
  completions: string[];
  prefix: string;
  isCommand: boolean;
} {
  const args = parseArgs(partialInput);

  // If no args or just typing the first word, complete commands
  if (args.length === 0) {
    return { completions: [], prefix: "", isCommand: true };
  }

  // Get the last argument (the one being typed)
  const lastArg = args[args.length - 1];

  // Check if we're completing the command itself (first arg) or a path argument
  const isCompletingCommand = args.length === 1 && !partialInput.endsWith(" ");

  if (isCompletingCommand) {
    // If it starts with ./, treat it as a path completion, not command completion
    if (lastArg.startsWith("./")) {
      // Complete file/directory paths for executable-style paths
      const pathAfterDotSlash = lastArg.slice(2);

      // Determine the directory to search and the partial filename
      let searchDir: string;
      let partialName: string;

      if (pathAfterDotSlash.includes("/")) {
        // Path contains directory separator (e.g., "./bin/te")
        const lastSlash = pathAfterDotSlash.lastIndexOf("/");
        const dirPart = pathAfterDotSlash.slice(0, lastSlash);
        partialName = pathAfterDotSlash.slice(lastSlash + 1);
        searchDir = resolvePath(dirPart);
      } else {
        // No directory separator - search current directory (e.g., "./te")
        searchDir = currentDirectory;
        partialName = pathAfterDotSlash;
      }

      // Get files in the search directory
      const files = getFilesInDirectory(searchDir);

      // Filter by partial name (case-insensitive for better UX)
      const matchingFiles = files.filter((f) =>
        f.name.toLowerCase().startsWith(partialName.toLowerCase()),
      );

      // Build the prefix that includes the directory path
      let dirPrefix = "./";
      if (pathAfterDotSlash.includes("/")) {
        const lastSlash = pathAfterDotSlash.lastIndexOf("/");
        dirPrefix = `./${pathAfterDotSlash.slice(0, lastSlash + 1)}`;
      }

      const completions = matchingFiles.map((f) =>
        f.isDirectory ? `${dirPrefix}${f.name}/` : `${dirPrefix}${f.name}`,
      );

      return {
        completions: completions.sort(),
        prefix: lastArg,
        isCommand: true,
      };
    }

    // Complete command names
    const matchingCommands: string[] = [];
    for (const cmdName of commandRegistry.keys()) {
      if (cmdName.startsWith(lastArg.toLowerCase())) {
        matchingCommands.push(cmdName);
      }
    }
    return {
      completions: matchingCommands.sort(),
      prefix: lastArg,
      isCommand: true,
    };
  }

  // Complete file/directory paths
  const pathToComplete = partialInput.endsWith(" ") ? "" : lastArg;

  // Determine the directory to search and the partial filename
  let searchDir: string;
  let partialName: string;

  if (pathToComplete.includes("/")) {
    // Path contains directory separator
    const lastSlash = pathToComplete.lastIndexOf("/");
    const dirPart = pathToComplete.slice(0, lastSlash + 1);
    partialName = pathToComplete.slice(lastSlash + 1);

    // Resolve the directory path
    if (dirPart === "/" || dirPart === "~/") {
      searchDir = "";
    } else if (dirPart.startsWith("~/")) {
      searchDir = dirPart.slice(2, -1); // Remove ~/ and trailing /
    } else if (dirPart.startsWith("./")) {
      const resolved = resolvePath(dirPart.slice(0, -1));
      searchDir = resolved;
    } else {
      const resolved = resolvePath(dirPart.slice(0, -1));
      searchDir = resolved;
    }
  } else {
    // No directory separator - search current directory
    searchDir = currentDirectory;
    partialName = pathToComplete;
  }

  // Get files in the search directory
  const files = getFilesInDirectory(searchDir);

  // Filter by partial name (case-sensitive)
  const matchingFiles = files.filter((f) => f.name.startsWith(partialName));

  // Format completions with directory suffix
  // If pathToComplete includes a directory, we need to preserve that prefix
  // so that completion.slice(prefix.length) works correctly
  let dirPrefix = "";
  if (pathToComplete.includes("/")) {
    const lastSlash = pathToComplete.lastIndexOf("/");
    dirPrefix = pathToComplete.slice(0, lastSlash + 1);
  }

  const completions = matchingFiles.map((f) =>
    f.isDirectory ? `${dirPrefix}${f.name}/` : `${dirPrefix}${f.name}`,
  );

  return {
    completions: completions.sort(),
    prefix: pathToComplete,
    isCommand: false,
  };
}
