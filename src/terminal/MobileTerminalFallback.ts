import type { Terminal } from "@xterm/xterm";

interface ButtonRange {
  row: number;
  startCol: number;
  endCol: number;
}

interface GridPosition {
  col: number;
  row: number;
}

export interface MobileDownloadTarget {
  url: string;
  filename: string;
}

const RESUME_PDF_URL = "/cv.pdf";
const RESUME_PDF_FILENAME = "Adam Burmister - Full Stack Engineer - Resume.pdf";
const CV_BUTTON_TEXT = "⇓ Download my CV as a PDF";
const MESSAGE_LINES = [
  "Sorry, this site is",
  "designed for a retro",
  "terminal experience",
  "that requires a",
  "physical keyboard.",
  "",
  "Please visit using",
  "a big screen",
  "to enjoy the full",
  "experience.",
  "",
  "♥ AB",
  "",
];

export class MobileTerminalFallback {
  private cvButtonRange: ButtonRange | null = null;

  public render(terminal: Terminal): string {
    const buttonText = ` ${CV_BUTTON_TEXT} `;
    const buttonIndent = Math.max(
      0,
      Math.floor((terminal.cols - buttonText.length) / 2),
    );
    const buttonLine = `${" ".repeat(buttonIndent)}\x1b[1;7;34m${buttonText}\x1b[0m`;
    const startRow =
      terminal.buffer.active.baseY + terminal.buffer.active.cursorY;

    this.cvButtonRange = {
      row: startRow + MESSAGE_LINES.length,
      startCol: buttonIndent,
      endCol: buttonIndent + buttonText.length - 1,
    };

    return [...MESSAGE_LINES, buttonLine].join("\r\n");
  }

  public clear(): void {
    this.cvButtonRange = null;
  }

  public isDownloadHit(gridPosition: GridPosition, viewportY: number): boolean {
    if (!this.cvButtonRange) {
      return false;
    }

    const row = gridPosition.row + viewportY;

    return (
      row === this.cvButtonRange.row &&
      gridPosition.col >= this.cvButtonRange.startCol &&
      gridPosition.col <= this.cvButtonRange.endCol
    );
  }

  public getDownloadTarget(): MobileDownloadTarget {
    return {
      url: RESUME_PDF_URL,
      filename: RESUME_PDF_FILENAME,
    };
  }
}
