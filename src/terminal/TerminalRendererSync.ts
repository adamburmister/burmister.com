import type { IBufferCell, Terminal } from "@xterm/xterm";
import type { TerminalText } from "cool-retro-term-renderer";
import {
  type StyledTerminalCell,
  type StyledTerminalLine,
  setStyledTerminalText,
} from "./TerminalTextAnsiColor";

export class TerminalRendererSync {
  private cursorExplicitlyHidden = false;

  public constructor(
    private readonly xterm: Terminal,
    private readonly terminalText: TerminalText,
  ) {}

  public sync(): void {
    const buffer = this.xterm.buffer.active;
    const lines: string[] = [];
    const styledLines: StyledTerminalLine[] = [];
    const totalLines = buffer.length;
    const viewportStart = buffer.viewportY;
    const rows = this.xterm.rows;

    this.terminalText.updateSelectionViewport(viewportStart);

    for (let i = 0; i < rows; i++) {
      const lineIndex = viewportStart + i;
      if (lineIndex < totalLines) {
        const line = buffer.getLine(lineIndex);
        if (line) {
          lines.push(line.translateToString(true));
          const styledLine: StyledTerminalLine = [];
          for (let col = 0; col < this.xterm.cols; col++) {
            styledLine.push(this.createStyledTerminalCell(line.getCell(col)));
          }
          styledLines.push(styledLine);
        } else {
          lines.push("");
          styledLines.push([]);
        }
      } else {
        lines.push("");
        styledLines.push([]);
      }
    }

    setStyledTerminalText(this.terminalText, lines.join("\n"), styledLines);
    this.syncCursor(buffer.viewportY, rows);
  }

  public hideCursor(): void {
    this.cursorExplicitlyHidden = true;
    this.terminalText.setCursorVisible(false);
  }

  public showCursor(): void {
    this.cursorExplicitlyHidden = false;
    this.terminalText.setCursorVisible(true);
  }

  private syncCursor(viewportStart: number, rows: number): void {
    if (this.cursorExplicitlyHidden) {
      return;
    }

    const buffer = this.xterm.buffer.active;
    const cursorActualLine = buffer.baseY + buffer.cursorY;
    const viewportEnd = viewportStart + rows - 1;
    const isScrolledAway =
      cursorActualLine < viewportStart || cursorActualLine > viewportEnd;

    if (isScrolledAway) {
      this.terminalText.setCursorVisible(false);
      return;
    }

    this.terminalText.setCursorVisible(true);
    this.terminalText.setCursorPosition(
      buffer.cursorX,
      cursorActualLine - viewportStart,
    );
  }

  private createStyledTerminalCell(
    cell: IBufferCell | undefined,
  ): StyledTerminalCell {
    if (!cell || cell.isInvisible()) {
      return {
        char: "",
        foreground: null,
        background: null,
        bold: false,
        dim: false,
        inverse: false,
      };
    }

    const foreground = this.decodeCellColor(cell, "foreground");
    const background = this.decodeCellColor(cell, "background");

    return {
      char: cell.getChars(),
      foreground: cell.isInverse() ? background : foreground,
      background: cell.isInverse() ? foreground : background,
      bold: Boolean(cell.isBold()),
      dim: Boolean(cell.isDim()),
      inverse: Boolean(cell.isInverse()),
    };
  }

  private decodeCellColor(
    cell: IBufferCell,
    target: "foreground" | "background",
  ): string | null {
    const isDefault =
      target === "foreground" ? cell.isFgDefault() : cell.isBgDefault();
    if (isDefault) {
      return null;
    }

    const isRgb = target === "foreground" ? cell.isFgRGB() : cell.isBgRGB();
    const color =
      target === "foreground" ? cell.getFgColor() : cell.getBgColor();
    if (isRgb) {
      return `#${color.toString(16).padStart(6, "0")}`;
    }

    return this.decodePaletteColor(color);
  }

  private decodePaletteColor(index: number): string | null {
    const ansiPalette = [
      "#000000",
      "#aa0000",
      "#00aa00",
      "#aa5500",
      "#0000aa",
      "#aa00aa",
      "#00aaaa",
      "#aaaaaa",
      "#555555",
      "#ff5555",
      "#55ff55",
      "#ffff55",
      "#5555ff",
      "#ff55ff",
      "#55ffff",
      "#ffffff",
    ];

    if (index >= 0 && index < ansiPalette.length) {
      return ansiPalette[index];
    }

    if (index >= 16 && index <= 231) {
      const colorIndex = index - 16;
      const red = Math.floor(colorIndex / 36);
      const green = Math.floor((colorIndex % 36) / 6);
      const blue = colorIndex % 6;
      return this.rgbToHex(
        red === 0 ? 0 : 55 + red * 40,
        green === 0 ? 0 : 55 + green * 40,
        blue === 0 ? 0 : 55 + blue * 40,
      );
    }

    if (index >= 232 && index <= 255) {
      const gray = 8 + (index - 232) * 10;
      return this.rgbToHex(gray, gray, gray);
    }

    return null;
  }

  private rgbToHex(red: number, green: number, blue: number): string {
    return `#${red.toString(16).padStart(2, "0")}${green
      .toString(16)
      .padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
  }
}
