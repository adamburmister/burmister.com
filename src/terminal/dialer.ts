import { runCommand } from "./shellRunner";
import type { CommandContext, KeyHandler } from "./shellTypes";
import { sleep } from "./shellTypes";
import { defineTerminalModule } from "./terminalModule";

const ANSI_LINE_DELAY_MS = 45;
const WELCOME_ANSI_URL = "/ansi/welcome.ans";
const MENU_ANSI_URL = "/ansi/menu.ans";
const ABOUT_ANSI_URL = "/ansi/about.ans";
const DOORS_ANSI_URL = "/ansi/doors.ans";
const RESUME_PDF_URL = "/cv.pdf";
const RESUME_PDF_FILENAME = "Adam Burmister - Full Stack Engineer - Resume.pdf";
const GUESTBOOK_API_URL = "/api/guestbook";
const MAX_GUESTBOOK_MESSAGE_LENGTH = 160;
const DIALUP_SKIP_TICK_MS = 50;

interface DialerStep {
  text: string;
  delayMs: number;
  inline?: boolean;
}

interface GuestbookEntry {
  id: string;
  message: string;
  createdAt: string;
}

interface GuestbookListResponse {
  entries: GuestbookEntry[];
}

interface DoorGame {
  command: string;
  name: string;
}

const DIALER_STEPS: DialerStep[] = [
  { text: "Hayes-compatible modem detected on COM1", delayMs: 0 },
  { text: "ATZ", delayMs: 0 },
  { text: "OK", delayMs: 100 },
  { text: "AT&F1 E0 V1 S0=0", delayMs: 100 },
  { text: "OK", delayMs: 100 },
  { text: "ATDT 03-5555-0198", delayMs: 100 },
  { text: "DIALING", delayMs: 1000 },
  { text: "RINGBACK", delayMs: 120 },
  { text: "REMOTE ANSWER", delayMs: 500 },
  { text: "CARRIER 33600", delayMs: 2000 },
  { text: "V.34 HANDSHAKE ", delayMs: 10000, inline: true },
  { text: "....", delayMs: 800, inline: true },
  { text: " locked", delayMs: 2000 },
  { text: "negotiation complete", delayMs: 420 },
  { text: "CONNECT 33600/ARQ", delayMs: 500 },
  { text: "Entering BURMISTER.COM BBS...", delayMs: 540 },
];

const DOOR_GAMES: Record<string, DoorGame> = {
  "1": { name: "Snake", command: "./snake" },
  "2": { name: "Blocks", command: "./blocks" },
  "3": { name: "Donut", command: "./donut" },
  "4": { name: "Chess", command: "./chess" },
};

export async function dialerCommand(ctx: CommandContext): Promise<void> {
  if (ctx.args.includes("--help") || ctx.args.includes("-h")) {
    ctx.terminal.writeln("Usage: dialer");
    ctx.terminal.writeln("");
    ctx.terminal.writeln("Dial the Burmister BBS.");
    return;
  }

  if (!ctx.terminal.setKeyHandler || !ctx.terminal.clearKeyHandler) {
    ctx.terminal.writeln("dialer: terminal input capture is not available");
    return;
  }

  void ctx.terminal.playDialupAudio?.().catch((error) => {
    console.warn("Could not play dial-up audio:", error);
  });

  try {
    await runDialupSequence(ctx);
    ctx.terminal.stopDialupAudio?.();
    ctx.terminal.writeln("");
    await renderAnsiFile(ctx, WELCOME_ANSI_URL);
    await showWelcomeGuestbookPost(ctx);
    await readAnyKey(ctx, "\nPress any key to enter the main board...");
    await runBbsSession(ctx);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    ctx.terminal.writeln(`dialer: connection error: ${errorMessage}`);
  } finally {
    ctx.terminal.stopDialupAudio?.();
    ctx.terminal.clearKeyHandler?.();
  }
}

export const terminalModule = defineTerminalModule({
  commands: [
    {
      names: ["dialer", "./dialer"],
      handler: dialerCommand,
      parent: "bin",
      helpName: "dialer",
      description: "Dial the Burmister BBS",
      helpAliases: ["dialer", "./dialer"],
      helpOrder: 30,
    },
  ],
  files: [
    {
      path: "bin/dialer",
      statPath: "src/terminal/dialer.ts",
    },
  ],
});

async function runDialupSequence(ctx: CommandContext): Promise<void> {
  ctx.terminal.writeln("");
  ctx.terminal.writeln("Burmister BBS Dialer v1.0");
  ctx.terminal.writeln("-------------------------");

  let skipDialupSequence = false;
  const keyHandler: KeyHandler = (key, eventType) => {
    if (eventType === "keydown" && key === "Enter") {
      skipDialupSequence = true;
    }
  };

  ctx.terminal.setKeyHandler?.(keyHandler, { allowScroll: true });

  try {
    for (const step of DIALER_STEPS) {
      if (step.inline) {
        ctx.terminal.write(step.text);
      } else {
        ctx.terminal.writeln(step.text);
      }

      if (step.delayMs > 0) {
        await sleepUntilSkipped(step.delayMs, () => skipDialupSequence);
      }
    }
  } finally {
    ctx.terminal.clearKeyHandler?.();
  }
}

async function runBbsSession(ctx: CommandContext): Promise<void> {
  let connected = true;

  while (connected) {
    await renderAnsiFile(ctx, MENU_ANSI_URL);
    const selection = (await readLine(ctx, "\nMain menu selection: ", 1))
      .trim()
      .toLowerCase();

    switch (selection) {
      case "a":
        await showAbout(ctx);
        break;
      case "g":
        await showGuestbook(ctx);
        break;
      case "c":
        await downloadResume(ctx);
        break;
      case "d":
        await showDoorGames(ctx);
        break;
      case "x":
        connected = false;
        break;
      default:
        ctx.terminal.writeln("");
        ctx.terminal.writeln(
          "Unknown command. Please choose A, G, C, D, or X to log off.",
        );
        await sleep(900);
        break;
    }
  }

  ctx.terminal.writeln("");
  ctx.terminal.writeln("NO CARRIER");
  ctx.terminal.writeln("Disconnected from BURMISTER.COM BBS.");
}

async function showAbout(ctx: CommandContext): Promise<void> {
  await renderAnsiFile(ctx, ABOUT_ANSI_URL);
  await readAnyKey(ctx, "\nPress any key to return to the main menu...");
}

async function showWelcomeGuestbookPost(ctx: CommandContext): Promise<void> {
  ctx.terminal.writeln("");
  ctx.terminal.writeln(
    "\x1b[38;5;19m╔══════════════════════════════════════════════════════════════════════════════╗\x1b[0m",
  );
  const heading = "LATEST GUESTBOOK POST :: from the last caller log";
  ctx.terminal.writeln(
    `\x1b[38;5;19m║\x1b[0m \x1b[1;38;5;201m${heading.padEnd(76, " ")}\x1b[0m \x1b[38;5;19m║\x1b[0m`,
  );
  ctx.terminal.writeln(
    "\x1b[38;5;19m╠══════════════════════════════════════════════════════════════════════════════╣\x1b[0m",
  );

  try {
    const [latestEntry] = await fetchGuestbookEntries();
    if (!latestEntry) {
      writeWelcomeBulletinLine(ctx, "No guestbook entries yet. Be the first.");
    } else {
      writeWelcomeBulletinLine(
        ctx,
        `${formatGuestbookDate(latestEntry.createdAt)} :: ${latestEntry.message}`,
      );
    }
  } catch {
    writeWelcomeBulletinLine(ctx, "Guestbook channel unavailable.");
  }

  ctx.terminal.writeln(
    "\x1b[38;5;19m╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m",
  );
}

async function showGuestbook(ctx: CommandContext): Promise<void> {
  preserveBbsScreenBeforeClear(ctx);
  ctx.terminal.writeln("\x1b[38;5;51mBURMISTER.COM BBS GUESTBOOK\x1b[0m");
  ctx.terminal.writeln("--------------------------------");
  ctx.terminal.writeln("");

  let entries: GuestbookEntry[];
  try {
    entries = await fetchGuestbookEntries();
  } catch {
    ctx.terminal.writeln("Guestbook is unavailable. Try again later.");
    await readAnyKey(ctx, "\nPress any key to return to the main menu...");
    return;
  }
  if (entries.length === 0) {
    ctx.terminal.writeln("No guestbook entries yet.");
  } else {
    for (const [index, entry] of entries.entries()) {
      ctx.terminal.writeln(
        `${(index + 1).toString().padStart(2, "0")}. ${formatGuestbookDate(
          entry.createdAt,
        )}`,
      );
      ctx.terminal.writeln(`    ${entry.message}`);
    }
  }

  ctx.terminal.writeln("");
  ctx.terminal.writeln("The board keeps the 10 most recent entries.");
  const message = (
    await readLine(
      ctx,
      `Leave a short message (${MAX_GUESTBOOK_MESSAGE_LENGTH} chars, blank to skip): `,
      MAX_GUESTBOOK_MESSAGE_LENGTH,
    )
  ).trim();

  if (message.length > 0) {
    ctx.terminal.writeln("");
    ctx.terminal.write("Saving message");
    await sleep(250);
    ctx.terminal.write(".");
    try {
      await saveGuestbookEntry(message);
      ctx.terminal.writeln("");
      ctx.terminal.writeln("Message posted. Thanks for signing the board.");
    } catch {
      ctx.terminal.writeln("");
      ctx.terminal.writeln(
        "Guestbook save failed. The carrier stayed up, at least.",
      );
    }
  } else {
    ctx.terminal.writeln("");
    ctx.terminal.writeln("No message saved.");
  }

  await readAnyKey(ctx, "\nPress any key to return to the main menu...");
}

async function downloadResume(ctx: CommandContext): Promise<void> {
  preserveBbsScreenBeforeClear(ctx);
  ctx.terminal.writeln("\x1b[38;5;226mZMODEM SEND\x1b[0m");
  ctx.terminal.writeln("------------");
  ctx.terminal.writeln("");
  ctx.terminal.writeln(`Sending "${RESUME_PDF_FILENAME}"...`);
  ctx.terminal.writeln("");

  for (let progress = 0; progress <= 100; progress += 10) {
    const filledBlocks = Math.round(progress / 10);
    const emptyBlocks = 10 - filledBlocks;
    ctx.terminal.write(
      `\r[${"▓".repeat(filledBlocks)}${" ".repeat(emptyBlocks)}] ${progress
        .toString()
        .padStart(3, " ")}%`,
    );
    await sleep(130);
  }

  ctx.terminal.writeln("");
  ctx.terminal.writeln("Transfer complete.");
  if (ctx.terminal.downloadFile) {
    ctx.terminal.downloadFile(RESUME_PDF_URL, RESUME_PDF_FILENAME);
  } else {
    ctx.terminal.writeln(`Download URL: ${RESUME_PDF_URL}`);
  }

  await readAnyKey(ctx, "\nPress any key to return to the main menu...");
}

async function showDoorGames(ctx: CommandContext): Promise<void> {
  let inDoorMenu = true;

  while (inDoorMenu) {
    await renderAnsiFile(ctx, DOORS_ANSI_URL);
    const selection = (await readLine(ctx, "\nDoor selection: ", 2))
      .trim()
      .toLowerCase();

    if (selection === "0" || selection === "x") {
      inDoorMenu = false;
      continue;
    }

    const doorGame = DOOR_GAMES[selection];
    if (!doorGame) {
      ctx.terminal.writeln("");
      ctx.terminal.writeln(
        "Unknown door. Choose a listed number, or 0 to return.",
      );
      await sleep(900);
      continue;
    }

    ctx.terminal.writeln("");
    ctx.terminal.writeln(`Opening door: ${doorGame.name}`);
    await sleep(500);
    await runCommand(doorGame.command, ctx.terminal, { suppressPrompt: true });
  }
}

async function renderAnsiFile(
  ctx: CommandContext,
  url: string,
  delayMs = ANSI_LINE_DELAY_MS,
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    ctx.terminal.writeln(`bbs: failed to load ${url} (${response.status})`);
    return;
  }

  let ansi = await response.text();
  if (ansi.startsWith("\x1b[2J\x1b[H")) {
    preserveBbsScreenBeforeClear(ctx);
    ansi = ansi.slice("\x1b[2J\x1b[H".length);
  }
  const lines = ansi.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index++) {
    ctx.terminal.write(lines[index]);
    if (index < lines.length - 1) {
      ctx.terminal.write("\n");
      await sleep(delayMs);
    }
  }

  ctx.terminal.write("\x1b[0m");
}

function readLine(
  ctx: CommandContext,
  prompt: string,
  maxLength: number,
): Promise<string> {
  ctx.terminal.write(prompt);

  return new Promise((resolve) => {
    let value = "";

    const finish = () => {
      ctx.terminal.clearKeyHandler?.();
      ctx.terminal.writeln("");
      resolve(value);
    };

    const keyHandler: KeyHandler = (
      key: string,
      eventType: "keydown" | "keyup",
    ) => {
      if (eventType !== "keydown") {
        return;
      }

      if (key === "Enter") {
        finish();
        return;
      }

      if (key === "Backspace") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          ctx.terminal.write("\b \b");
        }
        return;
      }

      if (key.length === 1 && value.length < maxLength) {
        value += key;
        ctx.terminal.write(key);
      }
    };

    ctx.terminal.setKeyHandler?.(keyHandler, { allowScroll: true });
  });
}

function readAnyKey(ctx: CommandContext, prompt: string): Promise<void> {
  ctx.terminal.write(prompt);

  return new Promise((resolve) => {
    const keyHandler: KeyHandler = (_key, eventType) => {
      if (eventType !== "keydown") {
        return;
      }

      ctx.terminal.clearKeyHandler?.();
      ctx.terminal.writeln("");
      resolve();
    };

    ctx.terminal.setKeyHandler?.(keyHandler, { allowScroll: true });
  });
}

function preserveBbsScreenBeforeClear(ctx: CommandContext): void {
  const rows = ctx.terminal.getSize?.().rows ?? 24;
  ctx.terminal.write(`${"\n".repeat(rows)}\x1b[2J\x1b[H`);
}

async function sleepUntilSkipped(
  delayMs: number,
  shouldSkip: () => boolean,
): Promise<void> {
  let elapsedMs = 0;

  while (elapsedMs < delayMs && !shouldSkip()) {
    const tickMs = Math.min(DIALUP_SKIP_TICK_MS, delayMs - elapsedMs);
    await sleep(tickMs);
    elapsedMs += tickMs;
  }
}

function writeWelcomeBulletinLine(ctx: CommandContext, message: string): void {
  const lines = wrapTerminalLine(message, 76);
  for (const line of lines) {
    ctx.terminal.writeln(
      `\x1b[38;5;19m║\x1b[0m \x1b[38;5;250m${line.padEnd(76, " ")}\x1b[0m \x1b[38;5;19m║\x1b[0m`,
    );
  }
}

function wrapTerminalLine(message: string, width: number): string[] {
  const words = message.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (word.length > width) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      for (let index = 0; index < word.length; index += width) {
        lines.push(word.slice(index, index + width));
      }
      continue;
    }

    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > width) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

async function fetchGuestbookEntries(): Promise<GuestbookEntry[]> {
  const response = await fetch(GUESTBOOK_API_URL);
  if (!response.ok) {
    throw new Error(`guestbook list failed: ${response.status}`);
  }

  const body = (await response.json()) as GuestbookListResponse;
  return Array.isArray(body.entries)
    ? body.entries.filter(isGuestbookEntry).slice(0, 10)
    : [];
}

async function saveGuestbookEntry(message: string): Promise<void> {
  const response = await fetch(GUESTBOOK_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error(`guestbook save failed: ${response.status}`);
  }
}

function isGuestbookEntry(entry: unknown): entry is GuestbookEntry {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "id" in entry &&
    "message" in entry &&
    "createdAt" in entry &&
    typeof entry.id === "string" &&
    typeof entry.message === "string" &&
    typeof entry.createdAt === "string"
  );
}

function formatGuestbookDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
