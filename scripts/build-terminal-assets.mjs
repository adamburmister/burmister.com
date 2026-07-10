import { compileTerminalAssets } from "./terminal-assets.mjs";

const { compiledFiles } = compileTerminalAssets({
  sourceRoot: new URL("../public/ansi", import.meta.url).pathname,
  publicRoot: new URL("../public", import.meta.url).pathname,
});
console.log(`Generated ${compiledFiles.length} terminal asset(s).`);
