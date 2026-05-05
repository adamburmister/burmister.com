declare module "virtual:terminal-file-metadata" {
  export interface TerminalFileMetadata {
    size: number;
    modified: string;
  }

  export const terminalFileMetadata: Record<string, TerminalFileMetadata>;
}
