import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PNG } from "pngjs";
import {
  compileTerminalAssets,
  parseImageDirective,
  renderPngAsAnsi,
} from "../../scripts/terminal-assets.mjs";

test("parses a complete-line image directive", () => {
  assert.deepEqual(
    parseImageDirective(
      '<img src="./logo.png" width="2" alt="Logo">',
      "/tmp/page.source.ans",
    ),
    { src: "./logo.png", width: 2, alt: "Logo" },
  );
});

test("renders two opaque pixels as a true-colour half-block", () => {
  const png = new PNG({ width: 1, height: 2 });
  png.data.set([255, 0, 0, 255, 0, 0, 255, 255]);
  assert.equal(
    renderPngAsAnsi(png, 1),
    "\x1b[38;2;255;0;0;48;2;0;0;255m▀\x1b[0m\n",
  );
});

test("compiles a source page and preserves adjacent text", () => {
  const root = mkdtempSync(join(tmpdir(), "terminal-assets-"));
  const publicRoot = join(root, "public");
  const ansiRoot = join(publicRoot, "ansi");
  mkdirSync(ansiRoot, { recursive: true });
  const png = new PNG({ width: 1, height: 2 });
  png.data.set([255, 0, 0, 255, 0, 0, 255, 255]);
  writeFileSync(join(ansiRoot, "logo.png"), PNG.sync.write(png));
  writeFileSync(
    join(ansiRoot, "page.source.ans"),
    'before\n<img src="./logo.png" width="1">\nafter\n',
  );

  compileTerminalAssets({ sourceRoot: ansiRoot, publicRoot });

  const output = readFileSync(join(ansiRoot, "page.generated.ans"), "utf8");
  assert.match(output, /before/);
  assert.ok(output.includes("\x1b[38;2;255;0;0;48;2;0;0;255m▀"));
  assert.match(output, /after/);
});
