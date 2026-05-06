import type { Terminal } from "@xterm/xterm";
import type { TerminalText } from "cool-retro-term-renderer";
import type { MobileTerminalFallback } from "./MobileTerminalFallback";

interface GridPosition {
  col: number;
  row: number;
}

interface TerminalPointerControllerOptions {
  container: HTMLElement;
  xterm: Terminal;
  terminalText: TerminalText;
  mobileFallback: MobileTerminalFallback;
  isMobileDevice: () => boolean;
  shouldBlockScroll: () => boolean;
  canPaste: () => boolean;
  canSelect: () => boolean;
  appendInput: (text: string) => void;
  downloadFile: (url: string, filename: string) => void;
  navigateTo: (url: string) => void;
  updateTerminalText: () => void;
}

const PASTE_COOLDOWN_MS = 500;

export class TerminalPointerController {
  private readonly container: HTMLElement;
  private readonly xterm: Terminal;
  private readonly terminalText: TerminalText;
  private readonly mobileFallback: MobileTerminalFallback;
  private readonly isMobileDevice: () => boolean;
  private readonly shouldBlockScroll: () => boolean;
  private readonly canPaste: () => boolean;
  private readonly canSelect: () => boolean;
  private readonly appendInput: (text: string) => void;
  private readonly downloadFile: (url: string, filename: string) => void;
  private readonly navigateTo: (url: string) => void;
  private readonly updateTerminalText: () => void;
  private isSelecting = false;
  private selectionStart: GridPosition | null = null;
  private lastPasteTime = 0;

  public constructor(options: TerminalPointerControllerOptions) {
    this.container = options.container;
    this.xterm = options.xterm;
    this.terminalText = options.terminalText;
    this.mobileFallback = options.mobileFallback;
    this.isMobileDevice = options.isMobileDevice;
    this.shouldBlockScroll = options.shouldBlockScroll;
    this.canPaste = options.canPaste;
    this.canSelect = options.canSelect;
    this.appendInput = options.appendInput;
    this.downloadFile = options.downloadFile;
    this.navigateTo = options.navigateTo;
    this.updateTerminalText = options.updateTerminalText;

    this.attach();
  }

  public dispose(): void {
    this.container.removeEventListener("wheel", this.handleWheel);
    this.container.removeEventListener("pointerup", this.handlePointerUp);
    this.container.removeEventListener("contextmenu", this.handleContextMenu);
    this.container.removeEventListener("mousedown", this.handleMouseDown);
    this.container.removeEventListener("mousemove", this.handleMouseMove);
    this.container.removeEventListener("mouseup", this.handleMouseUp);
    this.container.removeEventListener("mouseleave", this.handleMouseLeave);
  }

  private attach(): void {
    this.container.addEventListener("wheel", this.handleWheel, {
      passive: false,
    });
    this.container.addEventListener("pointerup", this.handlePointerUp);
    this.container.addEventListener("contextmenu", this.handleContextMenu);
    this.container.addEventListener("mousedown", this.handleMouseDown);
    this.container.addEventListener("mousemove", this.handleMouseMove);
    this.container.addEventListener("mouseup", this.handleMouseUp);
    this.container.addEventListener("mouseleave", this.handleMouseLeave);
  }

  private readonly handleWheel = (event: WheelEvent): void => {
    if (this.shouldBlockScroll()) {
      event.preventDefault();
      return;
    }

    const lines =
      Math.sign(event.deltaY) *
      Math.max(1, Math.floor(Math.abs(event.deltaY) / 50));
    this.xterm.scrollLines(lines);
    this.updateTerminalText();
    event.preventDefault();
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.isMobileDevice()) {
      return;
    }

    const gridPos = this.getGridPositionFromPointer(event);

    if (
      this.mobileFallback.isDownloadHit(
        gridPos,
        this.xterm.buffer.active.viewportY,
      )
    ) {
      event.preventDefault();
      const navigationTarget = this.mobileFallback.getNavigationTarget();
      this.navigateTo(navigationTarget.url);
    }
  };

  private readonly handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();

    if (!this.canPaste()) {
      return;
    }

    const selection = this.terminalText.getSelection();
    if (selection.start && selection.end) {
      return;
    }

    const now = Date.now();
    if (now - this.lastPasteTime < PASTE_COOLDOWN_MS) {
      return;
    }
    this.lastPasteTime = now;

    navigator.clipboard
      .readText()
      .then((text) => {
        const cleanText = text.replace(/[\r\n]/g, "");
        if (cleanText.length > 0) {
          this.appendInput(cleanText);
          this.xterm.write(cleanText, () => {
            this.updateTerminalText();
            this.xterm.focus();
          });
        }
      })
      .catch((err) => {
        console.warn("Could not read clipboard:", err);
      });
  };

  private readonly handleMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0 || !this.canSelect()) {
      return;
    }

    const gridPos = this.getGridPositionFromPointer(event);
    const viewportY = this.xterm.buffer.active.viewportY;
    const absPos = { col: gridPos.col, row: gridPos.row + viewportY };

    this.isSelecting = true;
    this.selectionStart = absPos;
    this.terminalText.setSelection(absPos, absPos, viewportY);
    event.preventDefault();
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.isSelecting || !this.selectionStart) {
      return;
    }

    const gridPos = this.getGridPositionFromPointer(event);
    const viewportY = this.xterm.buffer.active.viewportY;
    const absPos = { col: gridPos.col, row: gridPos.row + viewportY };

    this.terminalText.setSelection(this.selectionStart, absPos, viewportY);
  };

  private readonly handleMouseUp = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }

    if (this.isSelecting && this.selectionStart) {
      const gridPos = this.getGridPositionFromPointer(event);
      const viewportY = this.xterm.buffer.active.viewportY;
      const absPos = { col: gridPos.col, row: gridPos.row + viewportY };

      if (
        absPos.col === this.selectionStart.col &&
        absPos.row === this.selectionStart.row
      ) {
        this.terminalText.clearSelection();
      } else {
        this.terminalText.setSelection(this.selectionStart, absPos, viewportY);
        this.copySelectionToClipboard();
      }
    }

    this.isSelecting = false;
    this.selectionStart = null;
    this.xterm.focus();
  };

  private readonly handleMouseLeave = (): void => {
    this.isSelecting = false;
    this.selectionStart = null;
  };

  private getGridPositionFromPointer(
    event: MouseEvent | PointerEvent,
  ): GridPosition {
    const rect = this.container.getBoundingClientRect();
    const scaleX = rect.width > 0 ? this.container.offsetWidth / rect.width : 1;
    const scaleY =
      rect.height > 0 ? this.container.offsetHeight / rect.height : 1;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    return this.terminalText.pixelToGrid(x, y);
  }

  private copySelectionToClipboard(): void {
    const selection = this.terminalText.getSelection();
    if (!selection.start || !selection.end) {
      return;
    }

    const buffer = this.xterm.buffer.active;
    let startRow = selection.start.row;
    let startCol = selection.start.col;
    let endRow = selection.end.row;
    let endCol = selection.end.col;

    if (startRow > endRow || (startRow === endRow && startCol > endCol)) {
      [startRow, endRow] = [endRow, startRow];
      [startCol, endCol] = [endCol, startCol];
    }

    const selectedLines: string[] = [];
    for (let row = startRow; row <= endRow; row++) {
      const line = buffer.getLine(row);
      if (!line) {
        selectedLines.push("");
        continue;
      }

      const lineText = line.translateToString(true);
      let lineStart = 0;
      let lineEnd = lineText.length;

      if (row === startRow) {
        lineStart = startCol;
      }
      if (row === endRow) {
        lineEnd = endCol + 1;
      }

      selectedLines.push(lineText.slice(lineStart, lineEnd));
    }

    const selectedText = selectedLines.join("\n");
    if (selectedText) {
      navigator.clipboard.writeText(selectedText).catch((err) => {
        console.warn("Could not copy to clipboard:", err);
      });
    }
  }
}
