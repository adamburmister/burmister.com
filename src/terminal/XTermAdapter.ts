/**
 * XTermAdapter - Integrates xterm.js with the TerminalText renderer
 *
 * This adapter connects xterm.js (which handles input/output and terminal state)
 * to our custom TerminalText renderer (which applies CRT shader effects).
 *
 * The xterm.js terminal is used for:
 * - Handling keyboard input
 * - Managing terminal buffer state
 * - Cursor positioning
 * - Scrollback
 *
 * The output from xterm.js is extracted and rendered through our shaders.
 */

import { type IDisposable, Terminal } from "@xterm/xterm";
import type { TerminalText } from "cool-retro-term-renderer";
import { isMobileDevice } from "../utils";
import { BiosBootSequence } from "./BiosBootSequence";
import { CommandLineSession } from "./CommandLineSession";
import { MobileTerminalFallback } from "./MobileTerminalFallback";
import type { KeyHandler, KeyHandlerOptions, TerminalIO } from "./shellTypes";
import { TerminalPointerController } from "./TerminalPointerController";
import { TerminalRendererSync } from "./TerminalRendererSync";

// Audio controls interface
interface AudioControls {
  startBackgroundMusic: () => void;
  startGameMusic: () => void;
  stopGameMusic: () => void;
  playDialupAudio: () => Promise<void>;
  stopDialupAudio: () => void;
}

interface InputCapture {
  handler: KeyHandler;
  allowScroll: boolean;
  allowSelection: boolean;
}

export class XTermAdapter {
  private xterm: Terminal;
  private terminalText: TerminalText;
  private hiddenContainer: HTMLDivElement;
  private isCommandRunning: boolean = false;
  private biosComplete: boolean = false;
  private bootComplete: boolean = false;
  private audioControls: AudioControls | null = null;
  private biosBootSequence: BiosBootSequence;
  private commandLineSession: CommandLineSession;
  private mobileTerminalFallback = new MobileTerminalFallback();
  private pointerController: TerminalPointerController | null = null;
  private rendererSync: TerminalRendererSync;
  private xtermDisposables: IDisposable[] = [];

  private activeInputCapture: InputCapture | null = null;

  // Bound keyboard handler for active input capture (so we can remove it later)
  private boundInputCaptureKeyboardHandler:
    | ((event: KeyboardEvent) => void)
    | null = null;

  // Buffer for accumulating output before rendering
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: property is used via this.outputBuffer
  private outputBuffer: string = "";

  // Document-level keyboard handler for fullscreen mode
  private boundFullscreenKeyHandler: ((event: KeyboardEvent) => void) | null =
    null;

  constructor(
    terminalText: TerminalText,
    cols: number = 80,
    rows: number = 24,
    audioControls?: AudioControls,
  ) {
    this.terminalText = terminalText;
    this.audioControls = audioControls || null;

    // Create a hidden container for xterm (we don't display it directly)
    this.hiddenContainer = document.createElement("div");
    this.hiddenContainer.style.position = "absolute";
    this.hiddenContainer.style.left = "-9999px";
    this.hiddenContainer.style.top = "-9999px";
    this.hiddenContainer.style.width = "800px";
    this.hiddenContainer.style.height = "600px";
    document.body.appendChild(this.hiddenContainer);

    // Get actual dimensions from TerminalText (which calculates based on screen size)
    const gridSize = terminalText.getGridSize();
    const actualCols = gridSize.cols > 0 ? gridSize.cols : cols;
    const actualRows = gridSize.rows > 0 ? gridSize.rows : rows;

    // Create xterm instance with calculated dimensions
    this.xterm = new Terminal({
      cols: actualCols,
      rows: actualRows,
      cursorBlink: false, // We handle blinking ourselves in TerminalText
      cursorStyle: "block",
      scrollback: 1000,
      fontSize: 12,
    });

    // Open terminal in hidden container
    this.xterm.open(this.hiddenContainer);
    this.rendererSync = new TerminalRendererSync(this.xterm, this.terminalText);
    this.commandLineSession = new CommandLineSession({
      appendOutput: (text: string) => {
        this.outputBuffer += text;
      },
      createTerminalIO: () => this.createTerminalIO(),
      isReady: () =>
        this.bootComplete && this.biosComplete && !this.isCommandRunning,
      setCommandRunning: (isRunning: boolean) => {
        this.isCommandRunning = isRunning;
      },
      terminalText: this.terminalText,
      updateTerminalText: () => this.updateTerminalText(),
      xterm: this.xterm,
    });
    this.biosBootSequence = new BiosBootSequence({
      appendOutput: (text: string) => {
        this.outputBuffer += text;
      },
      createTerminalIO: () => this.createTerminalIO(),
      updateTerminalText: () => this.updateTerminalText(),
      write: (text: string) => this.writeXterm(text),
    });

    // Boot prompt is shown via showBootPrompt() called from index.ts
    // after terminal is fully initialized and resized

    // Attach keyboard listener to intercept arrow keys BEFORE xterm processes them
    // This allows us to use Up/Down for command history instead of cursor movement
    // Also forwards keys when an interactive command captures input
    this.xterm.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      // Block all keyboard input on mobile devices
      if (isMobileDevice()) {
        return false;
      }

      // If input capture is active, forward ALL keys to it (both keydown and keyup)
      if (this.activeInputCapture) {
        // Ignore repeated keydown events from key being held - we track key state ourselves
        // This prevents event accumulation which causes input lag
        if (event.type === "keydown" && event.repeat) {
          return false;
        }
        const eventType = event.type as "keydown" | "keyup";
        this.activeInputCapture.handler(event.key, eventType);
        return false; // Prevent xterm from processing
      }

      // Arrow Up - handle history navigation, prevent xterm from moving cursor
      if (event.key === "ArrowUp") {
        if (event.type === "keydown") {
          this.handleArrowUp();
        }
        return false; // Prevent xterm from processing this key
      }

      // Arrow Down - handle history navigation, prevent xterm from moving cursor
      if (event.key === "ArrowDown") {
        if (event.type === "keydown") {
          this.handleArrowDown();
        }
        return false; // Prevent xterm from processing this key
      }

      // Arrow Left/Right - block entirely to keep cursor at end of input
      // This simplifies the input model and prevents prompt editing
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        return false; // Block cursor movement within line
      }

      // Home/End keys - block to keep cursor at end
      if (event.key === "Home" || event.key === "End") {
        return false;
      }

      // Tab key - handle autocompletion
      if (event.key === "Tab") {
        if (event.type === "keydown") {
          this.commandLineSession.handleTab();
        }
        event.preventDefault();
        return false;
      }

      // Backspace - handle ourselves to protect the prompt
      if (event.key === "Backspace") {
        if (event.type === "keydown") {
          this.handleBackspace();
        }
        event.preventDefault();
        return false;
      }

      // Enter key - handle command execution consistently
      if (event.key === "Enter") {
        if (event.type === "keydown") {
          this.handleEnter();
        }
        event.preventDefault();
        return false; // Prevent xterm from processing this key
      }

      // Let xterm handle all other keys
      return true;
    });

    // Handle keyboard input for other keys
    this.xtermDisposables.push(
      this.xterm.onKey(({ key, domEvent }) => {
        // Block all keyboard input on mobile devices
        if (isMobileDevice()) {
          return;
        }
        this.handleKey(key, domEvent);
      }),
    );

    // Handle data (paste, etc.)
    this.xtermDisposables.push(
      this.xterm.onData((data) => {
        // Block all input on mobile devices
        if (isMobileDevice()) {
          return;
        }
        // Only handle paste events (multi-character data) when not running a command
        if (
          !this.isCommandRunning &&
          data.length > 1 &&
          !data.includes("\r") &&
          !data.includes("\n")
        ) {
          this.commandLineSession.appendInput(data);
          this.xterm.write(data);
          this.updateTerminalText();
        }
      }),
    );

    // Mouse wheel scrolling is handled natively by xterm.js
    // We just need to update our renderer when the viewport scrolls
    this.xtermDisposables.push(
      this.xterm.onScroll(() => {
        this.updateTerminalText();
      }),
    );

    // Setup document-level keyboard handler for fullscreen mode
    // xterm's hidden container loses keyboard focus in fullscreen
    this.boundFullscreenKeyHandler = (event: KeyboardEvent) => {
      // Only intercept when in fullscreen mode
      if (!document.fullscreenElement) {
        return;
      }

      // Block all keyboard input on mobile devices
      if (isMobileDevice()) {
        return;
      }

      // Skip if an interactive command has captured input.
      if (this.activeInputCapture) {
        return;
      }

      // Forward the event to xterm by simulating focus and re-dispatching
      // We handle special keys ourselves, let xterm handle printable chars
      const key = event.key;
      if (event.type === "keydown") {
        // Handle special keys
        if (key === "Enter") {
          this.handleEnter();
          event.preventDefault();
        } else if (key === "Backspace") {
          this.handleBackspace();
          event.preventDefault();
        } else if (key === "ArrowUp") {
          this.handleArrowUp();
          event.preventDefault();
        } else if (key === "ArrowDown") {
          this.handleArrowDown();
          event.preventDefault();
        } else if (key === "Tab") {
          this.commandLineSession.handleTab();
          event.preventDefault();
        } else if (
          key.length === 1 &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey
        ) {
          // Printable character - add to current line
          this.handlePrintableKey(key);
          event.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", this.boundFullscreenKeyHandler, true);

    const container = document.getElementById("container");
    if (container) {
      this.pointerController = new TerminalPointerController({
        container,
        xterm: this.xterm,
        terminalText: this.terminalText,
        mobileFallback: this.mobileTerminalFallback,
        isMobileDevice,
        shouldBlockScroll: () =>
          Boolean(
            this.activeInputCapture && !this.activeInputCapture.allowScroll,
          ),
        canPaste: () =>
          !isMobileDevice() &&
          this.bootComplete &&
          this.biosComplete &&
          !this.isCommandRunning &&
          !this.activeInputCapture,
        canSelect: () =>
          !isMobileDevice() &&
          (!this.activeInputCapture || this.activeInputCapture.allowSelection),
        appendInput: (text: string) => {
          this.commandLineSession.appendInput(text);
        },
        downloadFile: (url: string, filename: string) => {
          this.downloadFile(url, filename);
        },
        navigateTo: (url: string) => {
          window.location.href = url;
        },
        updateTerminalText: () => this.updateTerminalText(),
      });
    }
  }

  /**
   * Show the initial boot prompt (or mobile message if on mobile device)
   * Called from index.ts after terminal is fully initialized
   */
  public showBootPrompt(): void {
    if (isMobileDevice()) {
      const mobileMessage = this.mobileTerminalFallback.render(this.xterm);
      this.xterm.write(mobileMessage, () => {
        this.updateTerminalText();
      });
      return;
    }
    this.mobileTerminalFallback.clear();
    const bootMessage = "Press ENTER to initiate the BIOS boot sequence... ";
    this.xterm.write(bootMessage, () => {
      this.updateTerminalText();
    });
  }

  private writeXterm(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.xterm.write(text, () => resolve());
    });
  }

  /**
   * Create TerminalIO interface for commands to write output
   */
  private createTerminalIO(): TerminalIO {
    return {
      write: (text: string) => {
        this.outputBuffer += text;
        this.xterm.write(text.replace(/\n/g, "\r\n"), () => {
          this.updateTerminalText();
        });
      },
      writeln: (text: string) => {
        this.outputBuffer += `${text}\n`;
        this.xterm.write(`${text.replace(/\n/g, "\r\n")}\r\n`, () => {
          this.updateTerminalText();
        });
      },
      clear: () => {
        this.xterm.clear();
        this.outputBuffer = "";
        this.updateTerminalText();
      },
      setKeyHandler: (handler: KeyHandler, options?: KeyHandlerOptions) => {
        const allowScroll = options?.allowScroll ?? false;
        this.activeInputCapture = {
          handler,
          allowScroll,
          allowSelection: allowScroll,
        };
        this.boundInputCaptureKeyboardHandler = (event: KeyboardEvent) => {
          if (this.activeInputCapture) {
            // Ignore repeated keydown events from key being held - we track key state ourselves
            // This prevents event accumulation which causes input lag
            if (event.type === "keydown" && event.repeat) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            const eventType = event.type as "keydown" | "keyup";
            this.activeInputCapture.handler(
              event.key,
              eventType,
              event.ctrlKey,
            );
            event.preventDefault();
            event.stopPropagation();
          }
        };
        document.addEventListener(
          "keydown",
          this.boundInputCaptureKeyboardHandler,
          true,
        );
        document.addEventListener(
          "keyup",
          this.boundInputCaptureKeyboardHandler,
          true,
        );
      },
      clearKeyHandler: () => {
        this.clearInputCapture();
      },
      hideCursor: () => {
        this.rendererSync.hideCursor();
      },
      showCursor: () => {
        this.rendererSync.showCursor();
      },
      getSize: () => {
        return this.terminalText.getGridSize();
      },
      // Game music methods
      startGameMusic: () => {
        if (this.audioControls) {
          this.audioControls.startGameMusic();
        }
      },
      stopGameMusic: () => {
        if (this.audioControls) {
          this.audioControls.stopGameMusic();
        }
      },
      playDialupAudio: () => {
        return this.audioControls?.playDialupAudio() ?? Promise.resolve();
      },
      stopDialupAudio: () => {
        if (this.audioControls) {
          this.audioControls.stopDialupAudio();
        }
      },
      downloadFile: (url: string, filename: string) => {
        this.downloadFile(url, filename);
      },
    };
  }

  private downloadFile(url: string, filename: string): void {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Handle Arrow Up key - navigate to previous command in history
   */
  private handleArrowUp(): void {
    if (this.activeInputCapture) {
      return;
    }

    this.commandLineSession.handleArrowUp();
  }

  /**
   * Handle Arrow Down key - navigate to next command in history
   */
  private handleArrowDown(): void {
    if (this.activeInputCapture) {
      return;
    }

    this.commandLineSession.handleArrowDown();
  }

  /**
   * Handle printable character key (for fullscreen mode)
   */
  private handlePrintableKey(key: string): void {
    this.commandLineSession.handlePrintableKey(key);
  }

  /**
   * Handle Backspace key - simple delete from end of currentLine
   * @returns false always since we handle it ourselves
   */
  private handleBackspace(): boolean {
    return this.commandLineSession.handleBackspace();
  }

  /**
   * Handle Enter key - execute current command or boot sequence
   */
  private handleEnter(): void {
    // Block all input on mobile devices
    if (isMobileDevice()) {
      return;
    }

    // Clear selection when pressing Enter
    this.terminalText.clearSelection();

    // Reset cursor blink on any keypress
    this.terminalText.resetCursorBlink();

    // If waiting for boot, start the boot sequence
    if (!this.bootComplete) {
      this.bootComplete = true;

      // Trigger the audio controls to start background music
      if (this.audioControls) {
        this.audioControls.startBackgroundMusic();
      }

      // Clear screen completely (including the boot prompt message)
      // \x1b[2J clears the entire screen, \x1b[H moves cursor to home position
      this.xterm.write("\x1b[2J\x1b[H");
      this.xterm.clear();
      this.outputBuffer = "";
      this.updateTerminalText();

      this.biosBootSequence.print().then(async () => {
        this.biosComplete = true;
        this.isCommandRunning = true;

        try {
          await this.biosBootSequence.autoExecuteDialerCommand();
        } finally {
          this.isCommandRunning = false;
          this.updateTerminalText();
        }
      });
      return;
    }

    // Ignore if BIOS not complete or command running
    if (!this.biosComplete || this.isCommandRunning) {
      return;
    }

    this.commandLineSession.executeCommand();
  }

  /**
   * Handle keyboard input
   */
  private handleKey(key: string, domEvent: KeyboardEvent): void {
    // Reset cursor blink on any keypress (shows cursor immediately)
    this.terminalText.resetCursorBlink();

    // If boot sequence not started, ignore all input (Enter is handled separately)
    if (!this.bootComplete) {
      return;
    }

    // If BIOS sequence is not complete, ignore input
    if (!this.biosComplete) {
      return;
    }

    // If input capture is active, forward key to it
    // (Note: most keys are already handled by attachCustomKeyEventHandler,
    // but this catches any that slip through onKey)
    if (this.activeInputCapture) {
      this.activeInputCapture.handler(key, "keydown");
      return;
    }

    // If a command is running, ignore most input (except Ctrl+C potentially)
    if (this.isCommandRunning) {
      // TODO: Could implement Ctrl+C to cancel running commands
      return;
    }

    // Enter key is now handled by attachCustomKeyEventHandler

    // Backspace is now handled by attachCustomKeyEventHandler
    if (key === "Backspace") {
      return; // Skip - already handled
    }

    // Arrow Up/Down are handled by attachCustomKeyEventHandler

    // Page Up - scroll up one page (mouse wheel handles normal scroll)
    if (key === "PageUp") {
      this.scrollUp(this.xterm.rows);
      domEvent.preventDefault();
      return;
    }

    // Page Down - scroll down one page (mouse wheel handles normal scroll)
    if (key === "PageDown") {
      this.scrollDown(this.xterm.rows);
      domEvent.preventDefault();
      return;
    }

    // Regular printable characters - simple append to currentLine
    if (
      key.length === 1 &&
      !domEvent.ctrlKey &&
      !domEvent.altKey &&
      !domEvent.metaKey
    ) {
      this.commandLineSession.handlePrintableKey(key);
    }
  }

  /**
   * Scroll up in the terminal buffer
   * @param lines Number of lines to scroll (default 1)
   */
  private scrollUp(lines: number = 1): void {
    this.xterm.scrollLines(-lines);
    this.updateTerminalText();
  }

  /**
   * Scroll down in the terminal buffer
   * @param lines Number of lines to scroll (default 1)
   */
  private scrollDown(lines: number = 1): void {
    this.xterm.scrollLines(lines);
    this.updateTerminalText();
  }

  /**
   * Extract text content from xterm buffer and update TerminalText
   */
  private updateTerminalText(): void {
    this.rendererSync.sync();
  }

  /**
   * Focus the terminal for keyboard input
   */
  focus(): void {
    this.xterm.focus();
  }

  /**
   * Resize the terminal
   */
  resize(cols: number, rows: number): void {
    this.xterm.resize(cols, rows);
    this.updateTerminalText();
  }

  /**
   * Get the xterm instance (for advanced usage)
   */
  getXTerm(): Terminal {
    return this.xterm;
  }

  /**
   * Check if a command is currently running
   */
  isRunning(): boolean {
    return this.isCommandRunning;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.pointerController?.dispose();
    this.pointerController = null;
    this.clearInputCapture();
    for (const disposable of this.xtermDisposables) {
      disposable.dispose();
    }
    this.xtermDisposables = [];
    if (this.boundFullscreenKeyHandler) {
      document.removeEventListener(
        "keydown",
        this.boundFullscreenKeyHandler,
        true,
      );
      this.boundFullscreenKeyHandler = null;
    }
    this.xterm.dispose();
    if (this.hiddenContainer.parentNode) {
      this.hiddenContainer.parentNode.removeChild(this.hiddenContainer);
    }
  }

  private clearInputCapture(): void {
    if (!this.boundInputCaptureKeyboardHandler) {
      this.activeInputCapture = null;
      return;
    }

    document.removeEventListener(
      "keydown",
      this.boundInputCaptureKeyboardHandler,
      true,
    );
    document.removeEventListener(
      "keyup",
      this.boundInputCaptureKeyboardHandler,
      true,
    );
    this.boundInputCaptureKeyboardHandler = null;
    this.activeInputCapture = null;
  }
}
