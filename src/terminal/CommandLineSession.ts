import type { Terminal } from "@xterm/xterm";
import type { TerminalText } from "cool-retro-term-renderer";
import { getTabCompletions, runCommand } from "./ShellEmulator";
import type { TerminalIO } from "./shellTypes";

interface CommandLineSessionOptions {
  appendOutput: (text: string) => void;
  createTerminalIO: () => TerminalIO;
  isReady: () => boolean;
  setCommandRunning: (isRunning: boolean) => void;
  updateTerminalText: () => void;
  xterm: Terminal;
  terminalText: TerminalText;
}

export class CommandLineSession {
  private currentLine = "";
  private commandHistory: string[] = [];
  private historyIndex = -1;
  private savedCurrentLine = "";

  public constructor(private readonly options: CommandLineSessionOptions) {}

  public appendInput(text: string): void {
    this.currentLine += text;
  }

  public handleTab(): void {
    this.options.terminalText.resetCursorBlink();

    if (!this.options.isReady()) {
      return;
    }

    const { completions, prefix } = getTabCompletions(this.currentLine);

    if (completions.length === 0) {
      return;
    }

    if (completions.length === 1) {
      const completion = completions[0];
      const suffix = completion.slice(prefix.length);
      const addSpace = !completion.endsWith("/") ? " " : "";
      const textToAdd = suffix + addSpace;
      this.currentLine += textToAdd;
      this.options.xterm.write(textToAdd);
      this.options.updateTerminalText();
      return;
    }

    const commonPrefix = this.findCommonPrefix(completions);

    if (commonPrefix.length > prefix.length) {
      const suffix = commonPrefix.slice(prefix.length);
      this.currentLine += suffix;
      this.options.xterm.write(suffix);
      this.options.updateTerminalText();
      return;
    }

    this.options.xterm.write("\r\n");

    const maxWidth = Math.max(...completions.map((c) => c.length)) + 2;
    const cols = Math.floor(80 / maxWidth) || 1;

    for (let i = 0; i < completions.length; i += cols) {
      const row = completions.slice(i, i + cols);
      const line = row.map((c) => c.padEnd(maxWidth)).join("");
      this.options.xterm.write(`${line}\r\n`);
    }

    this.options.xterm.write(this.getPromptString() + this.currentLine);
    this.options.updateTerminalText();
  }

  public handleArrowUp(): void {
    this.options.terminalText.resetCursorBlink();

    if (!this.options.isReady()) {
      return;
    }

    this.navigateHistoryUp();
  }

  public handleArrowDown(): void {
    this.options.terminalText.resetCursorBlink();

    if (!this.options.isReady()) {
      return;
    }

    this.navigateHistoryDown();
  }

  public handlePrintableKey(key: string): void {
    this.options.terminalText.resetCursorBlink();

    if (!this.options.isReady()) {
      return;
    }

    this.options.terminalText.clearSelection();
    this.currentLine += key;
    this.options.xterm.write(key, () => {
      this.options.updateTerminalText();
    });
  }

  public handleBackspace(): boolean {
    this.options.terminalText.resetCursorBlink();
    this.options.terminalText.clearSelection();

    if (!this.options.isReady()) {
      return false;
    }

    if (this.currentLine.length > 0) {
      this.currentLine = this.currentLine.slice(0, -1);
      this.options.xterm.write("\b \b", () => {
        this.options.updateTerminalText();
      });
    }

    return false;
  }

  public async executeCommand(): Promise<void> {
    const command = this.currentLine;
    this.currentLine = "";

    if (
      command.trim() !== "" &&
      (this.commandHistory.length === 0 ||
        this.commandHistory[this.commandHistory.length - 1] !== command)
    ) {
      this.commandHistory.push(command);
    }

    this.historyIndex = -1;
    this.savedCurrentLine = "";

    this.options.xterm.write("\r\n");
    this.options.appendOutput("\n");
    this.options.updateTerminalText();
    this.options.setCommandRunning(true);

    try {
      await runCommand(command, this.options.createTerminalIO());
    } finally {
      this.options.setCommandRunning(false);
      this.options.updateTerminalText();
    }
  }

  private findCommonPrefix(strings: string[]): string {
    if (strings.length === 0) {
      return "";
    }
    if (strings.length === 1) {
      return strings[0];
    }

    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
      while (!strings[i].startsWith(prefix) && prefix.length > 0) {
        prefix = prefix.slice(0, -1);
      }
    }
    return prefix;
  }

  private getPromptString(): string {
    const buffer = this.options.xterm.buffer.active;
    const line = buffer.getLine(buffer.cursorY);
    if (line) {
      const lineText = line.translateToString(true);
      const promptEnd = lineText.indexOf(" $ ");
      if (promptEnd !== -1) {
        return lineText.slice(0, promptEnd + 3);
      }
    }

    return "guest@burmister.com:~$ ";
  }

  private navigateHistoryUp(): void {
    if (this.commandHistory.length === 0) {
      return;
    }

    if (this.historyIndex === -1) {
      this.savedCurrentLine = this.currentLine;
    }

    if (this.historyIndex < this.commandHistory.length - 1) {
      this.historyIndex++;
    }

    const historyCommand =
      this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
    this.replaceCurrentLine(historyCommand);
  }

  private navigateHistoryDown(): void {
    if (this.historyIndex === -1) {
      return;
    }

    this.historyIndex--;

    if (this.historyIndex === -1) {
      this.replaceCurrentLine(this.savedCurrentLine);
      this.savedCurrentLine = "";
      return;
    }

    const historyCommand =
      this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
    this.replaceCurrentLine(historyCommand);
  }

  private replaceCurrentLine(newLine: string): void {
    const clearLength = this.currentLine.length;

    if (clearLength > 0) {
      this.options.xterm.write("\b".repeat(clearLength));
      this.options.xterm.write(" ".repeat(clearLength));
      this.options.xterm.write("\b".repeat(clearLength));
    }

    this.currentLine = newLine;
    this.options.xterm.write(newLine, () => {
      this.options.updateTerminalText();
    });
  }
}
