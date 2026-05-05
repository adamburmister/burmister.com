import {
  type CommandContext,
  type KeyHandler,
  runCommand,
  sleep,
} from "./ShellEmulator";

const ANSI_LINE_DELAY_MS = 45;
const WELCOME_ANSI_URL = "/assets/content/bbs/welcome.ans";
const MENU_ANSI_URL = "/assets/content/bbs/menu.ans";
const ABOUT_ANSI_URL = "/assets/content/bbs/about.ans";
const DOORS_ANSI_URL = "/assets/content/bbs/doors.ans";
const RESUME_PDF_URL =
  "/assets/Adam Burmister - Full Stack Engineer - Resume.pdf";
const RESUME_PDF_FILENAME = "Adam Burmister - Full Stack Engineer - Resume.pdf";
const GUESTBOOK_STORAGE_KEY = "burmister-bbs-guestbook";
const MAX_GUESTBOOK_MESSAGE_LENGTH = 160;

interface DialerStep {
  text: string;
  delayMs: number;
  inline?: boolean;
}

interface GuestbookEntry {
  message: string;
  createdAt: string;
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
  "1": { name: "Pong", command: "./pong" },
  "2": { name: "Snake", command: "./snake" },
  "3": { name: "Blocks", command: "./blocks" },
  "4": { name: "Donut", command: "./donut" },
  "5": { name: "Space Invaders", command: "./space-invaders" },
  "6": { name: "Arkanoid", command: "./arkanoid" },
  "7": { name: "Flappy Bird", command: "./flappybird" },
  "8": { name: "Chess", command: "./chess" },
  "9": { name: "Minesweeper", command: "./minesweeper" },
  "10": { name: "Life", command: "./life" },
  "11": { name: "Memory", command: "./memory" },
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
    await runBbsSession(ctx);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    ctx.terminal.writeln(`dialer: connection error: ${errorMessage}`);
  } finally {
    ctx.terminal.stopDialupAudio?.();
    ctx.terminal.clearKeyHandler?.();
  }
}

async function runDialupSequence(ctx: CommandContext): Promise<void> {
  ctx.terminal.writeln("");
  ctx.terminal.writeln("Burmister BBS Dialer v1.0");
  ctx.terminal.writeln("-------------------------");

  for (const step of DIALER_STEPS) {
    if (step.inline) {
      ctx.terminal.write(step.text);
    } else {
      ctx.terminal.writeln(step.text);
    }

    if (step.delayMs > 0) {
      await sleep(step.delayMs);
    }
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
      case "b":
        connected = false;
        break;
      default:
        ctx.terminal.writeln("");
        ctx.terminal.writeln(
          "Unknown command. Please choose A, G, C, D, or B.",
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

async function showGuestbook(ctx: CommandContext): Promise<void> {
  ctx.terminal.write("\x1b[2J\x1b[H");
  ctx.terminal.writeln("\x1b[38;5;51mBURMISTER.COM BBS GUESTBOOK\x1b[0m");
  ctx.terminal.writeln("--------------------------------");
  ctx.terminal.writeln("");

  const entries = readGuestbookEntries();
  if (entries.length === 0) {
    ctx.terminal.writeln("No local guestbook entries yet.");
  } else {
    for (const [index, entry] of entries.entries()) {
      ctx.terminal.writeln(
        `${(index + 1).toString().padStart(2, "0")}. ${entry.createdAt}`,
      );
      ctx.terminal.writeln(`    ${entry.message}`);
    }
  }

  ctx.terminal.writeln("");
  ctx.terminal.writeln(
    "Messages are locally cached pending future server sync.",
  );
  const message = (
    await readLine(
      ctx,
      `Leave a short message (${MAX_GUESTBOOK_MESSAGE_LENGTH} chars, blank to skip): `,
      MAX_GUESTBOOK_MESSAGE_LENGTH,
    )
  ).trim();

  if (message.length > 0) {
    entries.push({
      message,
      createdAt: new Date().toLocaleString(),
    });
    writeGuestbookEntries(entries);
    ctx.terminal.writeln("");
    ctx.terminal.writeln("Message cached. Thanks for signing the board.");
  } else {
    ctx.terminal.writeln("");
    ctx.terminal.writeln("No message saved.");
  }

  await readAnyKey(ctx, "\nPress any key to return to the main menu...");
}

async function downloadResume(ctx: CommandContext): Promise<void> {
  ctx.terminal.write("\x1b[2J\x1b[H");
  ctx.terminal.writeln("\x1b[38;5;226mZMODEM SEND\x1b[0m");
  ctx.terminal.writeln("------------");
  ctx.terminal.writeln("");
  ctx.terminal.writeln(`Sending ${RESUME_PDF_FILENAME}`);
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

    if (selection === "0" || selection === "b") {
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

  const ansi = await response.text();
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
      keyCode: number,
      eventType: "keydown" | "keyup",
    ) => {
      if (eventType !== "keydown") {
        return;
      }

      if (key === "Enter" || keyCode === 13) {
        finish();
        return;
      }

      if (key === "Backspace" || keyCode === 8) {
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

    ctx.terminal.setKeyHandler?.(keyHandler);
  });
}

function readAnyKey(ctx: CommandContext, prompt: string): Promise<void> {
  ctx.terminal.write(prompt);

  return new Promise((resolve) => {
    const keyHandler: KeyHandler = (_key, _keyCode, eventType) => {
      if (eventType !== "keydown") {
        return;
      }

      ctx.terminal.clearKeyHandler?.();
      ctx.terminal.writeln("");
      resolve();
    };

    ctx.terminal.setKeyHandler?.(keyHandler);
  });
}

function readGuestbookEntries(): GuestbookEntry[] {
  try {
    const storedEntries = window.localStorage.getItem(GUESTBOOK_STORAGE_KEY);
    if (!storedEntries) {
      return [];
    }

    const parsedEntries = JSON.parse(storedEntries);
    if (!Array.isArray(parsedEntries)) {
      return [];
    }

    return parsedEntries
      .filter(
        (entry): entry is GuestbookEntry =>
          typeof entry?.message === "string" &&
          typeof entry?.createdAt === "string",
      )
      .slice(-8);
  } catch {
    return [];
  }
}

function writeGuestbookEntries(entries: GuestbookEntry[]): void {
  try {
    window.localStorage.setItem(
      GUESTBOOK_STORAGE_KEY,
      JSON.stringify(entries.slice(-8)),
    );
  } catch {
    // Local storage can be unavailable in private browsing modes.
  }
}
