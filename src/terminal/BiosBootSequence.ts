import { getInitialOutput, runCommand } from "./ShellEmulator";
import type { TerminalIO } from "./shellTypes";

interface BiosBootSequenceOptions {
  appendOutput: (text: string) => void;
  createTerminalIO: () => TerminalIO;
  updateTerminalText: () => void;
  write: (text: string) => Promise<void>;
}

const BIOS_URL = "/ansi/bios.ans";
const BIOS_BATCH_DELIMITER = "@@@";
const BIOS_BATCH_DELAY_MS = 500;
const BIOS_PROGRESS_TOKEN = "%%%";
const BIOS_PROGRESS_DURATION_MS = 100;
const BIOS_PROGRESS_FRAME_MS = 20;
const BIOS_PROGRESS_BAR_WIDTH = 10;
const AUTO_COMMAND = "dialer";
const AUTO_COMMAND_KEY_DELAY_MS = 75;

export class BiosBootSequence {
  public constructor(private readonly options: BiosBootSequenceOptions) {}

  public async print(): Promise<void> {
    try {
      const response = await fetch(BIOS_URL);
      if (!response.ok) {
        console.warn("Could not load BIOS content:", response.statusText);
        return;
      }

      const batches = this.createBatches(await response.text());

      for (let i = 0; i < batches.length; i++) {
        for (const line of batches[i]) {
          if (line.includes(BIOS_PROGRESS_TOKEN)) {
            await this.printProgressLine(line);
          } else {
            this.options.appendOutput(`${line}\n`);
            await this.options.write(`${line}\r\n`);
          }
        }
        this.options.updateTerminalText();

        if (i < batches.length - 1) {
          await this.sleep(BIOS_BATCH_DELAY_MS);
        }
      }

      this.options.appendOutput("\n");
      await this.options.write("\r\n");
      this.options.updateTerminalText();
    } catch (error) {
      console.warn("Error loading BIOS content:", error);
    }
  }

  public async autoExecuteDialerCommand(): Promise<void> {
    const prompt = getInitialOutput();
    this.options.appendOutput(prompt);
    await this.options.write(prompt);
    this.options.updateTerminalText();

    for (const char of AUTO_COMMAND) {
      this.options.appendOutput(char);
      await this.options.write(char);
      this.options.updateTerminalText();
      await this.sleep(AUTO_COMMAND_KEY_DELAY_MS);
    }

    this.options.appendOutput("\n");
    await this.options.write("\r\n");
    this.options.updateTerminalText();

    await runCommand(AUTO_COMMAND, this.options.createTerminalIO());
  }

  private createBatches(content: string): string[][] {
    const batches: string[][] = [];
    let currentBatch: string[] = [];

    for (const line of content.split("\n")) {
      if (line.trim() === BIOS_BATCH_DELIMITER) {
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
          currentBatch = [];
        }
      } else {
        currentBatch.push(line);
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  private async printProgressLine(line: string): Promise<void> {
    const frameCount = Math.ceil(
      BIOS_PROGRESS_DURATION_MS / BIOS_PROGRESS_FRAME_MS,
    );

    for (let frame = 0; frame <= frameCount; frame++) {
      const progress = frame / frameCount;
      const progressLine = line.replaceAll(
        BIOS_PROGRESS_TOKEN,
        this.createProgressBar(progress),
      );

      await this.options.write(`\r${progressLine}`);
      this.options.updateTerminalText();

      if (frame < frameCount) {
        await this.sleep(BIOS_PROGRESS_FRAME_MS);
      }
    }

    const completedLine = line.replaceAll(
      BIOS_PROGRESS_TOKEN,
      this.createProgressBar(1),
    );
    this.options.appendOutput(`${completedLine}\n`);
    await this.options.write("\r\n");
    this.options.updateTerminalText();
  }

  private createProgressBar(progress: number): string {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const completedBlocks = Math.round(
      clampedProgress * BIOS_PROGRESS_BAR_WIDTH,
    );
    const remainingBlocks = BIOS_PROGRESS_BAR_WIDTH - completedBlocks;
    const percent = Math.round(clampedProgress * 100)
      .toString()
      .padStart(3, " ");

    return `[${"|".repeat(completedBlocks)}${" ".repeat(remainingBlocks)}] ${percent}%`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
