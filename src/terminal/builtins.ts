import { registerCoreCommand } from "./commandRegistry";
import type { CommandContext } from "./shellTypes";
import { sleep } from "./shellTypes";
import {
  getCurrentDirectory,
  getFilesInDirectory,
  getVirtualFile,
  isValidDirectory,
  resolvePath,
  setCurrentDirectory,
} from "./virtualFileSystem";

export function registerBuiltInCommands(): void {
  registerCdCommand();
  registerClearCommand();
  registerLsCommand();
  registerCatCommand();
}

function registerCdCommand(): void {
  registerCoreCommand(
    "cd",
    (ctx) => {
      if (ctx.args.length < 2) {
        setCurrentDirectory("");
        return;
      }

      const targetPath = ctx.args[1];

      if (targetPath === "~" || targetPath === "/") {
        setCurrentDirectory("");
        return;
      }

      if (targetPath === "-") {
        setCurrentDirectory("");
        return;
      }

      const resolvedPath = resolvePath(targetPath);

      if (!isValidDirectory(resolvedPath)) {
        ctx.terminal.writeln(`cd: ${targetPath}: No such file or directory`);
        return;
      }

      setCurrentDirectory(resolvedPath);
    },
    {
      helpName: "cd",
      description: "Change directory",
      helpOrder: 40,
    },
  );
}

function registerClearCommand(): void {
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
}

function registerLsCommand(): void {
  registerCoreCommand(
    "ls",
    (ctx) => {
      const hasLongFormat =
        ctx.args.includes("-l") ||
        ctx.args.includes("-la") ||
        ctx.args.includes("-al");

      let targetDir = getCurrentDirectory();

      for (let i = 1; i < ctx.args.length; i++) {
        if (!ctx.args[i].startsWith("-")) {
          targetDir = resolvePath(ctx.args[i]);
          break;
        }
      }

      if (targetDir !== "" && !isValidDirectory(targetDir)) {
        const file = getVirtualFile(targetDir);
        if (file && !file.isDirectory) {
          writeLsFile(ctx, file, hasLongFormat);
          return;
        }
        ctx.terminal.writeln(
          `ls: cannot access '${ctx.args[1] || targetDir}': No such file or directory`,
        );
        return;
      }

      const files = getFilesInDirectory(targetDir);
      if (files.length === 0) {
        return;
      }

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
}

function registerCatCommand(): void {
  registerCoreCommand(
    "cat",
    async (ctx) => {
      if (ctx.args.length < 2) {
        ctx.terminal.writeln("cat: missing file operand");
        return;
      }

      const inputPath = ctx.args[1];
      const resolvedPath = resolvePath(inputPath);
      const file = getVirtualFile(resolvedPath);

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
        const content =
          typeof file.content === "function"
            ? await file.content()
            : file.content;
        await writeCatContent(ctx, content);
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
}

async function writeCatContent(
  ctx: CommandContext,
  content: string,
): Promise<void> {
  const lines = content.split("\n");
  const hasDelimiters = lines.some((line) => line.trim() === "@@@");

  if (!hasDelimiters) {
    for (const line of lines) {
      ctx.terminal.writeln(line);
    }
    return;
  }

  const batches: string[][] = [];
  let currentBatch: string[] = [];

  for (const line of lines) {
    if (line.trim() === "@@@") {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
      }
    } else {
      currentBatch.push(line);
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  for (let i = 0; i < batches.length; i++) {
    for (const line of batches[i]) {
      ctx.terminal.writeln(line);
    }

    if (i < batches.length - 1) {
      await sleep(500);
    }
  }
}

function writeLsFile(
  ctx: CommandContext,
  file: {
    name: string;
    isDirectory: boolean;
    size: number;
    permissions: string;
    modified: string;
  },
  hasLongFormat: boolean,
): void {
  if (hasLongFormat) {
    ctx.terminal.writeln(
      `${file.permissions}  1 guest guest ${file.size.toString().padStart(8)} ${file.modified} ${file.name}`,
    );
  } else {
    ctx.terminal.writeln(file.name);
  }
}
