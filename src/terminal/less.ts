import type { CommandContext, KeyHandler } from "./shellTypes";
import { sleep } from "./shellTypes";
import { defineTerminalModule } from "./terminalModule";
import { loadVirtualFileContent } from "./virtualFileSystem";

const PAGER_FRAME_DELAY_MS = 50;

interface PagerState {
  lines: string[];
  scrollOffset: number;
  running: boolean;
  needsRender: boolean;
}

interface PagerOptions {
  title: string;
}

export async function lessCommand(ctx: CommandContext): Promise<void> {
  if (ctx.args.length < 2) {
    ctx.terminal.writeln("less: missing file operand");
    ctx.terminal.writeln("Usage: less <file>");
    return;
  }

  const inputPath = ctx.args[1];

  try {
    const content = await loadVirtualFileContent(inputPath);
    await pageText(ctx, content, { title: inputPath });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    ctx.terminal.writeln(`less: ${inputPath}: ${errorMessage}`);
  }
}

export async function pageText(
  ctx: CommandContext,
  text: string,
  options: PagerOptions,
): Promise<void> {
  if (!ctx.terminal.setKeyHandler || !ctx.terminal.clearKeyHandler) {
    for (const line of text.split("\n")) {
      ctx.terminal.writeln(line);
    }
    return;
  }

  const state: PagerState = {
    lines: text.replace(/\r\n/g, "\n").split("\n"),
    scrollOffset: 0,
    running: true,
    needsRender: true,
  };

  const getVisibleLineCount = () => Math.max(1, getTerminalRows(ctx) - 2);
  const getMaxOffset = () =>
    Math.max(0, state.lines.length - getVisibleLineCount());
  const setScrollOffset = (offset: number) => {
    state.scrollOffset = Math.min(Math.max(0, offset), getMaxOffset());
    state.needsRender = true;
  };

  const keyHandler: KeyHandler = (key, eventType, ctrlKey) => {
    if (eventType !== "keydown") {
      return;
    }

    const visibleLineCount = getVisibleLineCount();

    if (ctrlKey && key.toLowerCase() === "c") {
      state.running = false;
      return;
    }

    if (key.toLowerCase() === "q" || key === "Escape") {
      state.running = false;
      return;
    }

    if (key === "ArrowUp" || key.toLowerCase() === "k") {
      setScrollOffset(state.scrollOffset - 1);
    } else if (key === "ArrowDown" || key.toLowerCase() === "j") {
      setScrollOffset(state.scrollOffset + 1);
    } else if (key === "PageUp" || key.toLowerCase() === "b") {
      setScrollOffset(state.scrollOffset - visibleLineCount);
    } else if (key === "PageDown" || key === " " || key.toLowerCase() === "f") {
      setScrollOffset(state.scrollOffset + visibleLineCount);
    } else if (key === "Home" || key === "g") {
      setScrollOffset(0);
    } else if (key === "End" || key === "G") {
      setScrollOffset(getMaxOffset());
    }
  };

  ctx.terminal.hideCursor?.();
  ctx.terminal.setKeyHandler(keyHandler);

  try {
    while (state.running) {
      if (state.needsRender) {
        renderPager(ctx, state, options);
        state.needsRender = false;
      }
      await sleep(PAGER_FRAME_DELAY_MS);
    }
  } finally {
    ctx.terminal.clearKeyHandler();
    ctx.terminal.showCursor?.();
    ctx.terminal.clear();
  }
}

function renderPager(
  ctx: CommandContext,
  state: PagerState,
  options: PagerOptions,
): void {
  const cols = getTerminalCols(ctx);
  const visibleLineCount = Math.max(1, getTerminalRows(ctx) - 3);
  const maxOffset = Math.max(0, state.lines.length - visibleLineCount);
  const visibleLines = state.lines.slice(
    state.scrollOffset,
    state.scrollOffset + visibleLineCount,
  );

  ctx.terminal.clear();
  for (const line of visibleLines) {
    ctx.terminal.writeln(truncateLine(line, cols));
  }
  for (let index = visibleLines.length; index < visibleLineCount; index++) {
    ctx.terminal.writeln("");
  }

  const percent =
    maxOffset === 0 ? 100 : Math.round((state.scrollOffset / maxOffset) * 100);
  const status = `${options.title} ${state.scrollOffset + 1}-${Math.min(
    state.scrollOffset + visibleLineCount,
    state.lines.length,
  )}/${state.lines.length} ${percent}% | arrows/page up/down, space, home/end, [q] quit`;

  ctx.terminal.writeln("");
  ctx.terminal.writeln(truncateLine(status, cols));
}

function getTerminalRows(ctx: CommandContext): number {
  return ctx.terminal.getSize?.().rows ?? 24;
}

function getTerminalCols(ctx: CommandContext): number {
  return ctx.terminal.getSize?.().cols ?? 80;
}

function truncateLine(line: string, maxLength: number): string {
  if (line.length <= maxLength) {
    return line;
  }

  return line.slice(0, Math.max(0, maxLength));
}

export const terminalModule = defineTerminalModule({
  commands: [
    {
      names: ["less", "./less"],
      handler: lessCommand,
      parent: "bin",
      helpName: "less",
      description: "Page through a text file",
      helpAliases: ["less"],
      helpOrder: 15,
    },
  ],
  files: [
    {
      path: "bin/less",
      statPath: "src/terminal/less.ts",
    },
  ],
});
