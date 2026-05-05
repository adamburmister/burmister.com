import type { TerminalText } from "cool-retro-term-renderer";

export interface StyledTerminalCell {
  char: string;
  foreground: string | null;
  background: string | null;
  bold: boolean;
  dim: boolean;
  inverse: boolean;
}

export type StyledTerminalLine = StyledTerminalCell[];

type ColorTerminalTextRuntime = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  backgroundColor: { r: number; g: number; b: number };
  charWidth: number;
  charHeight: number;
  cols: number;
  rows: number;
  fontLoaded: boolean;
  cursorCol: number;
  cursorRow: number;
  cursorVisible: boolean;
  cursorBlinkState: boolean;
  screenScaling: number;
  totalMargin: number;
  texture: { needsUpdate: boolean };
  render: () => void;
  isCellSelected: (col: number, row: number) => boolean;
  setText: (text: string) => void;
  setChromaColor: (amount: number) => void;
  __styledTerminalLines?: StyledTerminalLine[];
  __plainTerminalText?: string;
  __ansiColorPatchInstalled?: boolean;
};

const DEFAULT_FOREGROUND = "#ffffff";
const SELECTION_FOREGROUND = "#000000";
const SELECTION_BACKGROUND = "#ffffff";

export function setStyledTerminalText(
  terminalText: TerminalText,
  text: string,
  styledLines: StyledTerminalLine[],
): void {
  const runtime = terminalText as unknown as ColorTerminalTextRuntime;
  installAnsiColorPatch(runtime);
  runtime.__plainTerminalText = text;
  runtime.__styledTerminalLines = styledLines;
  runtime.setText(text);
}

function installAnsiColorPatch(runtime: ColorTerminalTextRuntime): void {
  if (runtime.__ansiColorPatchInstalled) {
    return;
  }

  runtime.__ansiColorPatchInstalled = true;
  runtime.setChromaColor(1);

  runtime.render = function renderWithAnsiColors(): void {
    const { ctx, canvas } = this;
    const pixelSize = 12;
    const fontFamily = this.fontLoaded ? '"Terminus", monospace' : "monospace";
    const plainLines = (this.__plainTerminalText ?? "").split("\n");
    const styledLines = this.__styledTerminalLines ?? [];
    const margin = this.totalMargin;

    ctx.fillStyle = rgbObjectToCss(this.backgroundColor);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${pixelSize}px ${fontFamily}`;
    ctx.textBaseline = "top";
    ctx.imageSmoothingEnabled = false;

    for (let row = 0; row < this.rows; row++) {
      const plainLine = row < plainLines.length ? plainLines[row] : "";
      const styledLine = styledLines[row] ?? [];
      const y = margin + row * this.charHeight * this.screenScaling;

      for (let col = 0; col < this.cols; col++) {
        const cell = styledLine[col];
        const char =
          cell?.char ?? (col < plainLine.length ? plainLine[col] : "");
        const x = margin + col * this.charWidth * this.screenScaling;
        const selected = this.isCellSelected(col, row);

        if (selected) {
          drawCellBackground(this, x, y, SELECTION_BACKGROUND);
        } else if (cell?.background) {
          drawCellBackground(this, x, y, cell.background);
        }

        if (!char) {
          continue;
        }

        const foreground = selected
          ? SELECTION_FOREGROUND
          : (cell?.foreground ?? DEFAULT_FOREGROUND);
        ctx.fillStyle = cell?.dim ? dimColor(foreground) : foreground;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(this.screenScaling, this.screenScaling);
        if (cell?.bold) {
          ctx.fillText(char, 0, 0);
          ctx.fillText(char, 0.45, 0);
        } else {
          ctx.fillText(char, 0, 0);
        }
        ctx.restore();
      }
    }

    drawCursor(this, plainLines, styledLines);
    this.texture.needsUpdate = true;
  };
}

function drawCellBackground(
  runtime: ColorTerminalTextRuntime,
  x: number,
  y: number,
  color: string,
): void {
  runtime.ctx.fillStyle = color;
  runtime.ctx.fillRect(
    x,
    y,
    runtime.charWidth * runtime.screenScaling,
    runtime.charHeight * runtime.screenScaling,
  );
}

function drawCursor(
  runtime: ColorTerminalTextRuntime,
  plainLines: string[],
  styledLines: StyledTerminalLine[],
): void {
  if (
    !runtime.cursorVisible ||
    !runtime.cursorBlinkState ||
    runtime.cursorRow >= runtime.rows
  ) {
    return;
  }

  const x =
    runtime.totalMargin +
    runtime.cursorCol * runtime.charWidth * runtime.screenScaling;
  const y =
    runtime.totalMargin +
    runtime.cursorRow * runtime.charHeight * runtime.screenScaling;

  drawCellBackground(runtime, x, y, DEFAULT_FOREGROUND);

  const line = plainLines[runtime.cursorRow] ?? "";
  const cell = styledLines[runtime.cursorRow]?.[runtime.cursorCol];
  const char = cell?.char ?? line[runtime.cursorCol];
  if (!char) {
    return;
  }

  runtime.ctx.fillStyle = rgbObjectToCss(runtime.backgroundColor);
  runtime.ctx.save();
  runtime.ctx.translate(x, y);
  runtime.ctx.scale(runtime.screenScaling, runtime.screenScaling);
  runtime.ctx.fillText(char, 0, 0);
  runtime.ctx.restore();
}

function rgbObjectToCss(color: { r: number; g: number; b: number }): string {
  return `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
}

function dimColor(hex: string): string {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) {
    return hex;
  }

  const r = Math.floor(((value >> 16) & 0xff) * 0.55);
  const g = Math.floor(((value >> 8) & 0xff) * 0.55);
  const b = Math.floor((value & 0xff) * 0.55);
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
