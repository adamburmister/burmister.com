import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { PNG } from "pngjs";

const IMAGE_TAG =
  /^<img\s+src="([^"]+)"\s+width="(\d+)"(?:\s+alt="([^"]*)")?\s*>$/;

export function parseImageDirective(line, sourcePath) {
  const match = line.match(IMAGE_TAG);
  if (!match) {
    return null;
  }
  const width = Number(match[2]);
  if (!Number.isInteger(width) || width < 1) {
    throw new Error(`${sourcePath}: image width must be a positive integer`);
  }
  return { src: match[1], width, alt: match[3] ?? "" };
}

export function renderPngAsAnsi(png, columns) {
  const rows = Math.max(1, Math.round((png.height / png.width) * columns));
  let output = "";
  for (let row = 0; row < rows; row += 2) {
    for (let col = 0; col < columns; col++) {
      const top = sample(png, col, row, columns, rows);
      const bottom = sample(png, col, row + 1, columns, rows);
      if (top.a && bottom.a) {
        output += `\x1b[38;2;${top.r};${top.g};${top.b};48;2;${bottom.r};${bottom.g};${bottom.b}m▀`;
      } else if (top.a) {
        output += `\x1b[38;2;${top.r};${top.g};${top.b}m▀`;
      } else if (bottom.a) {
        output += `\x1b[38;2;${bottom.r};${bottom.g};${bottom.b}m▄`;
      } else {
        output += " ";
      }
    }
    output += "\x1b[0m\n";
  }
  return output;
}

export function compileTerminalAssets({ sourceRoot, publicRoot }) {
  const compiledFiles = [];
  for (const sourcePath of sourceFiles(sourceRoot)) {
    const content = readFileSync(sourcePath, "utf8");
    const output = content
      .split(/\r?\n/)
      .map((line, index) =>
        compileLine(line, sourcePath, publicRoot, index + 1),
      )
      .join("\n");
    const outputPath = sourcePath.replace(/\.source\.ans$/, ".generated.ans");
    writeFileSync(outputPath, output);
    compiledFiles.push(outputPath);
  }
  return { compiledFiles };
}

function compileLine(line, sourcePath, publicRoot, lineNumber) {
  const directive = parseImageDirective(line, sourcePath);
  if (!directive) {
    if (line.includes("<img")) {
      throw new Error(`${sourcePath}:${lineNumber}: invalid image directive`);
    }
    return line;
  }
  if (!directive.src.endsWith(".png") || directive.src.startsWith("/")) {
    throw new Error(
      `${sourcePath}:${lineNumber}: image source must be a relative PNG path`,
    );
  }
  const imagePath = resolve(dirname(sourcePath), directive.src);
  if (relative(resolve(publicRoot), imagePath).startsWith("..")) {
    throw new Error(
      `${sourcePath}:${lineNumber}: image source must remain in public/`,
    );
  }
  return renderPngAsAnsi(
    PNG.sync.read(readFileSync(imagePath)),
    directive.width,
  ).trimEnd();
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return extname(path) === ".ans" && path.endsWith(".source.ans")
      ? [path]
      : [];
  });
}

function sample(png, x, y, width, height) {
  if (y >= height) return { a: 0 };
  const sourceX = Math.min(png.width - 1, Math.floor((x / width) * png.width));
  const sourceY = Math.min(
    png.height - 1,
    Math.floor((y / height) * png.height),
  );
  const offset = (sourceY * png.width + sourceX) * 4;
  return {
    r: png.data[offset],
    g: png.data[offset + 1],
    b: png.data[offset + 2],
    a: png.data[offset + 3] > 0,
  };
}
