import {
  getCommandHandler,
  getRegisteredCommandNames,
  hasRegisteredCommand,
} from "./commandRegistry";
import { parseArgs } from "./shellParser";
import type {
  CommandContext,
  RunCommandOptions,
  TerminalIO,
} from "./shellTypes";
import {
  getCurrentDirectory,
  getFilesInDirectory,
  getVirtualFile,
  resolvePath,
} from "./virtualFileSystem";

export const SHELL_HOST = "guest@burmister.com";

export function getPrompt(): string {
  const currentDirectory = getCurrentDirectory();
  const dirDisplay = currentDirectory ? `~/${currentDirectory}` : "~";
  return `[033[92m${SHELL_HOST}:[033[37m${dirDisplay}$ `;
}

export function getInitialOutput(): string {
  return getPrompt();
}

export async function runCommand(
  command: string,
  terminal: TerminalIO,
  options: RunCommandOptions = {},
): Promise<void> {
  const trimmedCommand = command.trim();

  if (trimmedCommand === "") {
    if (!options.suppressPrompt) {
      terminal.write(getPrompt());
    }
    return;
  }

  const args = parseArgs(trimmedCommand);
  if (args.length === 0) {
    if (!options.suppressPrompt) {
      terminal.write(getPrompt());
    }
    return;
  }

  let commandName = args[0].toLowerCase();

  if (args[0].startsWith("./")) {
    const pathAfterDotSlash = args[0].slice(2);
    const executablePath = resolvePath(pathAfterDotSlash);
    const file = getVirtualFile(executablePath);
    const isExecutable =
      file && !file.isDirectory && file.permissions.includes("x");

    if (!isExecutable && !hasRegisteredCommand(args[0].toLowerCase())) {
      terminal.writeln(`zsh: no such file or directory: ${args[0]}`);
      if (!options.suppressPrompt) {
        terminal.write(getPrompt());
      }
      return;
    }

    if (file) {
      commandName = `./${file.name}`;
    }
  }

  const handler = getCommandHandler(commandName);

  if (handler) {
    const ctx: CommandContext = {
      command: trimmedCommand,
      args,
      terminal,
    };

    try {
      await handler(ctx);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      terminal.writeln(`Error: ${errorMessage}`);
    }
  } else {
    terminal.writeln(`${commandName}: command not found`);
  }

  if (!options.suppressPrompt) {
    terminal.write(getPrompt());
  }
}

export function getTabCompletions(partialInput: string): {
  completions: string[];
  prefix: string;
  isCommand: boolean;
} {
  const args = parseArgs(partialInput);

  if (args.length === 0) {
    return { completions: [], prefix: "", isCommand: true };
  }

  const lastArg = args[args.length - 1];
  const isCompletingCommand = args.length === 1 && !partialInput.endsWith(" ");

  if (isCompletingCommand) {
    if (lastArg.startsWith("./")) {
      return completeExecutablePath(lastArg);
    }

    const matchingCommands = getRegisteredCommandNames().filter((cmdName) =>
      cmdName.startsWith(lastArg.toLowerCase()),
    );
    return {
      completions: matchingCommands.sort(),
      prefix: lastArg,
      isCommand: true,
    };
  }

  return completeFilePath(partialInput, lastArg);
}

function completeExecutablePath(lastArg: string): {
  completions: string[];
  prefix: string;
  isCommand: boolean;
} {
  const pathAfterDotSlash = lastArg.slice(2);
  let searchDir: string;
  let partialName: string;

  if (pathAfterDotSlash.includes("/")) {
    const lastSlash = pathAfterDotSlash.lastIndexOf("/");
    const dirPart = pathAfterDotSlash.slice(0, lastSlash);
    partialName = pathAfterDotSlash.slice(lastSlash + 1);
    searchDir = resolvePath(dirPart);
  } else {
    searchDir = getCurrentDirectory();
    partialName = pathAfterDotSlash;
  }

  const matchingFiles = getFilesInDirectory(searchDir).filter((f) =>
    f.name.toLowerCase().startsWith(partialName.toLowerCase()),
  );

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

function completeFilePath(
  partialInput: string,
  lastArg: string,
): {
  completions: string[];
  prefix: string;
  isCommand: boolean;
} {
  const pathToComplete = partialInput.endsWith(" ") ? "" : lastArg;
  let searchDir: string;
  let partialName: string;

  if (pathToComplete.includes("/")) {
    const lastSlash = pathToComplete.lastIndexOf("/");
    const dirPart = pathToComplete.slice(0, lastSlash + 1);
    partialName = pathToComplete.slice(lastSlash + 1);

    if (dirPart === "/" || dirPart === "~/") {
      searchDir = "";
    } else if (dirPart.startsWith("~/")) {
      searchDir = dirPart.slice(2, -1);
    } else if (dirPart.startsWith("./")) {
      searchDir = resolvePath(dirPart.slice(0, -1));
    } else {
      searchDir = resolvePath(dirPart.slice(0, -1));
    }
  } else {
    searchDir = getCurrentDirectory();
    partialName = pathToComplete;
  }

  const matchingFiles = getFilesInDirectory(searchDir).filter((f) =>
    f.name.startsWith(partialName),
  );

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
