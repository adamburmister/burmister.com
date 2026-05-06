export type KeyHandler = (
  key: string,
  eventType: "keydown" | "keyup",
  ctrlKey?: boolean,
) => void;

export interface KeyHandlerOptions {
  allowScroll?: boolean;
}

export interface TerminalOutput {
  write(text: string): void;
  writeln(text: string): void;
  clear(): void;
}

export interface TerminalInputCapture {
  setKeyHandler?(handler: KeyHandler, options?: KeyHandlerOptions): void;
  clearKeyHandler?(): void;
}

export interface TerminalScreen {
  hideCursor?(): void;
  showCursor?(): void;
  getSize?(): { cols: number; rows: number };
}

export interface TerminalAudio {
  startGameMusic?(): void;
  stopGameMusic?(): void;
  playDialupAudio?(): Promise<void>;
  stopDialupAudio?(): void;
}

export interface BrowserDownload {
  downloadFile?(url: string, filename: string): void;
}

export interface TerminalIO
  extends TerminalOutput,
    TerminalInputCapture,
    TerminalScreen,
    TerminalAudio,
    BrowserDownload {}

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
