export type KeyHandler = (
  key: string,
  eventType: "keydown" | "keyup",
  ctrlKey?: boolean,
) => void;

export interface KeyHandlerOptions {
  allowScroll?: boolean;
}

export interface TerminalIO {
  write(text: string): void;
  writeln(text: string): void;
  clear(): void;
  setKeyHandler?(handler: KeyHandler, options?: KeyHandlerOptions): void;
  clearKeyHandler?(): void;
  hideCursor?(): void;
  showCursor?(): void;
  getSize?(): { cols: number; rows: number };
  startGameMusic?(): void;
  stopGameMusic?(): void;
  playDialupAudio?(): Promise<void>;
  stopDialupAudio?(): void;
  downloadFile?(url: string, filename: string): void;
}

export interface CommandContext {
  command: string;
  args: string[];
  terminal: TerminalIO;
}

export type CommandHandler = (ctx: CommandContext) => void | Promise<void>;

export interface RunCommandOptions {
  suppressPrompt?: boolean;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
