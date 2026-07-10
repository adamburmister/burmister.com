# Terminal Inline Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compile `<img>` tags in terminal source pages into pixelated, true-colour ANSI artwork before Astro serves the site.

**Architecture:** A Node build module parses `*.source.ans`, resolves local PNGs, converts them into half-block ANSI cells, and writes `*.generated.ans` files next to their sources. Package lifecycle scripts run the compiler before development, production build, and preview; the browser and xterm continue to handle only ordinary ANSI output.

**Tech Stack:** Node.js ESM, `pngjs`, TypeScript/Astro, xterm.js, Node test runner, Playwright.

## Global Constraints

- Directives are complete lines in the form `<img src="./path.png" width="32" alt="optional">`.
- Accept local PNGs only; reject remote URLs and paths outside `public/`.
- Use nearest-neighbour scaling and two source pixels per terminal cell.
- Emit true-colour ANSI, one reset per generated row, and no browser-runtime image loading.
- Map `*.source.ans` to `*.generated.ans`; generated outputs are ignored by Git.
- Preserve existing non-generated ANSI assets and existing user changes.

---

### Task 1: ANSI image compiler module and tests

**Files:**
- Create: `scripts/terminal-assets.mjs`
- Create: `tests/scripts/terminal-assets.test.mjs`

**Interfaces:**
- Produces `parseImageDirective(line, sourcePath)`, `renderPngAsAnsi(png, columns)`, and `compileTerminalAssets({ sourceRoot, publicRoot })`.
- `compileTerminalAssets` returns `{ compiledFiles: string[] }` and writes one output for each source file.

- [ ] **Step 1: Write failing parser and renderer tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { parseImageDirective, renderPngAsAnsi } from "../../scripts/terminal-assets.mjs";

test("parses a complete-line img directive", () => {
  assert.deepEqual(parseImageDirective('<img src="./logo.png" width="2" alt="Logo">', "/tmp/page.source.ans"), {
    src: "./logo.png", width: 2, alt: "Logo",
  });
});

test("converts two opaque pixels into a true-colour half-block cell", () => {
  const png = new PNG({ width: 1, height: 2 });
  png.data.set([255, 0, 0, 255, 0, 0, 255, 255]);
  assert.equal(renderPngAsAnsi(png, 1), "\x1b[38;2;255;0;0;48;2;0;0;255m▀\x1b[0m\n");
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node --test tests/scripts/terminal-assets.test.mjs`

Expected: failure because `scripts/terminal-assets.mjs` does not exist.

- [ ] **Step 3: Implement the compiler module**

```js
export function parseImageDirective(line, sourcePath) { /* require entire line; parse src, width, optional alt; throw file-aware Error */ }
export function renderPngAsAnsi(png, columns) { /* nearest-neighbour scale, then emit ▀/▄/space ANSI rows */ }
export function compileTerminalAssets({ sourceRoot, publicRoot }) { /* recursively transform .source.ans into .generated.ans */ }
```

Use `PNG.sync.read` and `PNG.sync.write` only where necessary; do not add dependencies. Resolve the directive path relative to the source file and reject a resolved path outside `publicRoot`. For each cell pair, emit `▀` with foreground/top and background/bottom when both pixels are opaque, `▀` when only the top is opaque, `▄` when only the bottom is opaque, or a space when both are transparent. Reset each generated row with `\x1b[0m`.

- [ ] **Step 4: Extend tests for transparent pixels and full-file compilation**

```js
test("writes a generated page while preserving surrounding ANSI text", () => {
  // Create a temp public/ansi/page.source.ans and logo.png fixture,
  // run compileTerminalAssets, and assert page.generated.ans contains
  // the original adjacent text and a true-colour ANSI sequence.
});
```

- [ ] **Step 5: Run the focused test and confirm it passes**

Run: `node --test tests/scripts/terminal-assets.test.mjs`

Expected: all parser, transparency, conversion, and compilation tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/terminal-assets.mjs tests/scripts/terminal-assets.test.mjs
git commit -m "feat: compile terminal images to ANSI"
```

### Task 2: CLI entry points and build integration

**Files:**
- Create: `scripts/build-terminal-assets.mjs`
- Create: `scripts/pixelate-image.mjs`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes `compileTerminalAssets` and `renderPngAsAnsi` from `scripts/terminal-assets.mjs`.
- Provides `npm run build-terminal-assets` and `npm run pixelate-image -- input.png output.ans --width 32`.

- [ ] **Step 1: Write failing CLI tests**

```js
test("pixelate-image rejects a missing width", () => {
  // spawn node scripts/pixelate-image.mjs fixture.png out.ans
  // assert exit status is 1 and stderr contains "--width".
});
```

- [ ] **Step 2: Run the CLI tests and confirm failure**

Run: `node --test tests/scripts/terminal-assets.test.mjs`

Expected: failure because the CLI entry points do not exist.

- [ ] **Step 3: Implement CLIs and package scripts**

`build-terminal-assets.mjs` calls `compileTerminalAssets({ sourceRoot: "public/ansi", publicRoot: "public" })` and logs the generated file count. `pixelate-image.mjs` requires exactly two paths plus `--width <positive integer>`, reads the PNG, writes `renderPngAsAnsi` output, and reports argument or decode errors on stderr with exit code 1.

Add these package scripts:

```json
"build-terminal-assets": "node scripts/build-terminal-assets.mjs",
"pixelate-image": "node scripts/pixelate-image.mjs",
"test:unit": "node --test tests/scripts/terminal-assets.test.mjs",
"predev": "npm run build-terminal-assets",
"prebuild": "npm run build-terminal-assets",
"prepreview": "npm run build-terminal-assets"
```

Add `public/ansi/*.generated.ans` to `.gitignore`.

- [ ] **Step 4: Run compiler and CLI tests**

Run: `npm run test:unit && npm run build-terminal-assets`

Expected: tests pass and the compiler reports zero source files before the sample page is added.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-terminal-assets.mjs scripts/pixelate-image.mjs package.json .gitignore tests/scripts/terminal-assets.test.mjs
git commit -m "build: generate terminal ANSI assets"
```

### Task 3: Add a BBS sample page that uses a compiled image

**Files:**
- Create: `public/ansi/welcome.source.ans`
- Create: `public/ansi/images/portrait.png`
- Modify: `src/terminal/dialer.ts`
- Modify: `tests/e2e/homepage.spec.ts`

**Interfaces:**
- `public/ansi/welcome.source.ans` contains an `<img>` tag and compiles to `public/ansi/welcome.generated.ans`.
- `dialer.ts` loads `/ansi/welcome.generated.ans`.

- [ ] **Step 1: Create a failing e2e assertion**

```ts
test("generated welcome ANSI asset is served", async ({ request }) => {
  const response = await request.get("/ansi/welcome.generated.ans");
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("\x1b[38;2;");
});
```

- [ ] **Step 2: Run it and confirm failure**

Run: `npm run test:e2e -- --grep "generated welcome ANSI asset"`

Expected: 404 because no generated source page exists yet.

- [ ] **Step 3: Add source content and wire it into the BBS**

Copy the current welcome artwork to `welcome.source.ans`. Add a complete-line directive near the top referencing `./images/portrait.png` at a width that fits the 80-column menu (32 columns). Copy the existing `public/adam-burmister.png` to `public/ansi/images/portrait.png` as the PNG source; compilation itself performs the pixelation. Update `WELCOME_ANSI_URL` in `src/terminal/dialer.ts` to `/ansi/welcome.generated.ans`.

- [ ] **Step 4: Generate and test the sample**

Run: `npm run build-terminal-assets && npm run test:e2e -- --grep "generated welcome ANSI asset"`

Expected: compiler writes `public/ansi/welcome.generated.ans`; the request succeeds and includes true-colour foreground ANSI.

- [ ] **Step 5: Run project checks**

Run: `npm run check && npm run build && npm run test:unit && npm run test:e2e`

Expected: every command exits 0.

- [ ] **Step 6: Commit**

```bash
git add public/ansi/welcome.source.ans public/ansi/images/portrait.png src/terminal/dialer.ts tests/e2e/homepage.spec.ts
git commit -m "feat: render pixel image in BBS welcome screen"
```
