import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import { renderPngAsAnsi } from "./terminal-assets.mjs";

const [input, output, flag, widthValue] = process.argv.slice(2);
if (
  !input ||
  !output ||
  flag !== "--width" ||
  !/^\d+$/.test(widthValue ?? "") ||
  Number(widthValue) < 1
) {
  console.error(
    "Usage: pixelate-image <input.png> <output.ans> --width <positive integer>",
  );
  process.exit(1);
}
try {
  writeFileSync(
    output,
    renderPngAsAnsi(PNG.sync.read(readFileSync(input)), Number(widthValue)),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
