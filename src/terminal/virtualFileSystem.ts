import { terminalFileMetadata } from "virtual:terminal-file-metadata";
import type { TerminalFileDefinition } from "./terminalModule";

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  permissions: string;
  modified: string;
  content?: string | (() => Promise<string>);
  parent: string;
}

const virtualFileSystem: Map<string, FileEntry> = new Map();
let currentDirectory = "";

export function initVirtualFileSystem(): void {
  virtualFileSystem.clear();
  currentDirectory = "";

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

export function getCurrentDirectory(): string {
  return currentDirectory;
}

export function setCurrentDirectory(path: string): void {
  currentDirectory = path;
}

export function resolvePath(path: string): string {
  if (!path || path === ".") {
    return currentDirectory;
  }

  if (path === "~" || path === "/") {
    return "";
  }

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

  const baseComponents = basePath ? basePath.split("/") : [];
  const pathComponents = pathToProcess.split("/").filter((c) => c.length > 0);

  for (const component of pathComponents) {
    if (component === ".") {
    } else if (component === "..") {
      if (baseComponents.length > 0) {
        baseComponents.pop();
      }
    } else {
      baseComponents.push(component);
    }
  }

  return baseComponents.join("/");
}

export function getVirtualFile(path: string): FileEntry | undefined {
  return virtualFileSystem.get(path);
}

export function getFilesInDirectory(dirPath: string): FileEntry[] {
  const files: FileEntry[] = [];
  for (const [_path, entry] of virtualFileSystem.entries()) {
    if (entry.parent === dirPath) {
      files.push(entry);
    }
  }
  return files;
}

export function isValidDirectory(path: string): boolean {
  if (path === "") {
    return true;
  }

  return (
    virtualFileSystem.has(path) &&
    (virtualFileSystem.get(path)?.isDirectory ?? false)
  );
}

export function registerVirtualFile(definition: TerminalFileDefinition): void {
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

function getPathParts(path: string): { name: string; parent: string } {
  const parts = path.split("/");
  const name = parts.pop() ?? path;

  return {
    name,
    parent: parts.join("/"),
  };
}
