# AGENTS.md

## Project Overview

This is Adam Burmister's retro terminal CV/portfolio site. It is a browser-based terminal experience built with Astro, TypeScript, Three.js, xterm.js, and `cool-retro-term-renderer`.

The app is mostly static: portfolio content, terminal text, ANSI screens, audio, and downloadable files live under `public/assets`. The BBS guestbook currently persists in browser `localStorage`; there is no shared backend for it yet.

## Architecture

- `src/index.ts` boots the browser experience: Three.js scene, `TerminalText`, `TerminalFrame`, audio controls, resize/focus handling, and the animation loop.
- `src/terminal/XTermAdapter.ts` bridges xterm.js to the CRT renderer. It handles BIOS playback, `%%%` progress bars, auto-running `dialer`, keyboard input, selection, ANSI color extraction, browser downloads, and terminal I/O methods.
- `src/terminal/ShellEmulator.ts` owns the virtual shell, virtual filesystem, command registry, command execution, prompt behavior, and the `TerminalIO` interface.
- `src/terminal/TerminalTextAnsiColor.ts` patches the local `TerminalText` instance so visible xterm cells can render ANSI foreground/background color, bold, inverse, cursor, blinking, and selection state.
- `src/terminal/dialer.ts` implements the BBS dial-up command: dial-up audio, connection sequence, slow ANSI rendering, static menus, guestbook, CV transfer, door-game launching, and logoff.
- Individual terminal programs and games live in `src/terminal/`, including Pong, Snake, Blocks, Donut, Space Invaders, Arkanoid, Flappy Bird, Chess, Minesweeper, Life, Memory, Matrix, and media commands.

## Terminal Flow

User input flows through `XTermAdapter`, into `ShellEmulator.runCommand`, then through a command handler using `TerminalIO`. Writes go to xterm first, and `XTermAdapter.updateTerminalText()` mirrors xterm's visible buffer into the CRT renderer.

The BIOS sequence is loaded from `public/assets/content/bios.txt`. `@@@` separates output batches, and `%%%` markers are rendered as animated ANSI block progress bars. After BIOS completes, the adapter prints the prompt, types `dialer` character-by-character, and executes it without adding it to user command history.

`runCommand(command, terminal, { suppressPrompt?: boolean })` supports suppressing the shell prompt. The BBS uses this when launching door games so games can return to the BBS screen instead of dropping a shell prompt in the middle of the session.

## Static Content

- `public/assets/ansi/bios.ans` drives the BIOS animation.
- `public/assets/audio/background.mp3`, `game.mp3`, `chill-game.mp3`, and `dialup.mp3` are used by the terminal experience.
- `public/cv.pdf` is the downloadable resume served by the BBS CV option. It should save as "Adam Burmister - Full Stack Engineer - Resume.pdf"

Prefer moving terminal-visible prose into `public/assets/content` when it is content rather than behavior. Keep structured metadata in `src/data/portfolio.ts` when it is used for layouts, SEO, JSON-LD, or typed data.

## BBS Behavior

The `dialer` command simulates a BBS connection, plays `dialup.mp3` layered over background music, renders ANSI files slowly with a line delay, and then enters a menu loop.

The front menu accepts a key followed by Enter:

- `a`: render `about.ans`, wait for any key, then return to the menu.
- `g`: show locally cached guestbook messages, accept a short message, store it in `localStorage`, then return to the menu.
- `c`: show a transfer animation and trigger the resume PDF download.
- `d`: render `doors.ans`, accept a number, launch the mapped local game command, then return to the doors menu.
- `b`: disconnect and return to the shell.

The doors menu is intentionally dumb and static. Keep the listed commands in `doors.ans` aligned with the mapping in `dialer.ts`; do not dynamically populate the ANSI file unless the product direction changes.

## Command Guidelines

- Commands are registered in `ShellEmulator.ts` with `registerCommand`.
- Command modules should export a named command handler and use the shared `CommandContext` shape.
- Use `ctx.terminal.write` and `ctx.terminal.writeln` for output. Use optional chaining for optional terminal capabilities such as audio, downloads, video, or key handlers.
- Interactive commands must clean up after themselves: clear key handlers, restore cursors where needed, and stop any command-specific audio.
- Key handlers receive keydown and keyup events. Filter by event type when a command should only handle one of them.
- Use `ShellEmulator.sleep` for pacing terminal output instead of inventing separate delay helpers.
- This experience targets a desktop physical-keyboard terminal interaction. Do not add mobile controls unless explicitly requested.

## Commands

- `npm run dev` starts Astro development.
- `npm run build` builds the site.
- `npm run preview` previews the built output.
- `npm run deploy` deploys with Wrangler.
- `npm run lint-and-format` runs Biome with write/unsafe fixes.
- For targeted checks, use `npm exec -- biome check <files>`.

Biome is configured for spaces and double quotes. `.astro`, `dist`, `node_modules`, and `archived-assets` are ignored by Biome. Builds may produce generated `.astro` and `dist` changes; do not clean or revert unrelated generated or user changes unless asked.

## Gotchas

- Older `.github/copilot-instructions.md` content may be stale. Prefer this file and the current code when instructions conflict.
- xterm remains the source of truth for terminal output. The CRT renderer is a visual mirror of the visible xterm buffer.
- ANSI color visibility depends on the local `TerminalTextAnsiColor` extension and `XTermAdapter` cell extraction.
- Static text commands should fail with a concise load error rather than rebuilding output from structured data.
- The BBS guestbook is local-only pending future backend/API work.
- The repo may be dirty during agent work. Never revert unrelated changes.
