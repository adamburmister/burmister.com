# Terminal inline images

## Goal

Allow terminal-visible text files to include a pixelated image with an HTML-like
tag, while ensuring production browser code receives only ordinary ANSI text. The
image must become coloured xterm cells so it scrolls, selects, and receives the
existing CRT effect exactly like all other terminal output.

## Authoring interface

Content files may contain a complete-line image directive:

```text
<img src="./images/logo.png" width="32" alt="[ Adam Burmister logo ]">
```

- `src` is a relative PNG path, resolved from the content file that contains the
  directive.
- `width` is the image width in terminal columns. It is required and must be a
  positive integer.
- `alt` is optional and exists for authoring clarity; it is used in build errors
  when supplied.
- Each directive must occupy a complete line. A directive mixed with ordinary text
  is rejected at build time, rather than being partly parsed as an image.

For example, an ANSI page at `public/ansi/about.source.ans` may refer to
`public/ansi/images/logo.png`. The compiler emits
`public/ansi/about.generated.ans` with the tag replaced by ANSI true-colour block
characters. Generated files are never hand-edited.

## Build-time compiler

Add `scripts/build-terminal-assets.mjs`, using the existing `pngjs` dependency. It
scans configured terminal source files, copies ordinary ANSI/text content, and
expands every image directive into a coloured text fragment.

Each PNG is read at build time, resized with nearest-neighbour sampling to the
requested column width, and converted into two vertical pixels per character cell
using `▀` plus ANSI true-colour foreground and background sequences. The height is
calculated from the source aspect ratio and an explicit 2:1 terminal-cell aspect
ratio. Fully transparent source pixels are represented by spaces; half-transparent
pixels are flattened against the default terminal background.

The compiler writes generated files beside their sources in `public/ansi/`. It
maintains a predictable mapping: `*.source.ans` becomes `*.generated.ans`; paths
and ordinary ANSI escape sequences are otherwise preserved byte-for-byte. The
command or asset definition that loads a compiled page points at the generated path.
Existing non-generated ANSI files continue to work unchanged. The compiler reports
file and line numbers for malformed directives, invalid widths, missing images, and
image decode failures, then exits non-zero.

`package.json` exposes two scripts:

```text
npm run build-terminal-assets
npm run pixelate-image -- input.png output.ans --width 32
```

`pixelate-image` is the focused one-image version for previewing or creating a
reusable ANSI fragment. `build-terminal-assets` scans source content and powers the
site lifecycle. `build`, `dev`, and `preview` invoke the asset build first, ensuring
generated files exist and are current. `*.generated.ans` files are ignored by Git;
the source pages and PNG assets are committed. During a development session, authors
rerun `npm run build-terminal-assets` after changing a source page or PNG.

## Runtime behaviour

No browser image parsing, fetching, canvas decoding, output buffering, or custom
terminal output API is added. All terminal programs and file viewers continue to
write strings through `TerminalIO`; when they load a generated ANSI/text file, the
embedded escape sequences flow through xterm normally.

The xterm buffer remains the single source of truth. `TerminalRendererSync` already
extracts true-colour foreground and background values, so no CRT-renderer changes
are necessary. The feature therefore works consistently in BBS screens, virtual
files, `cat`, `less`, static commands, scrollback, and selection.

## Error handling and limits

- Only local PNG paths within the terminal-content source directory are allowed;
  remote URLs and path traversal are build errors.
- The compiler validates tag syntax and fails clearly before Astro starts.
- Requested widths are capped at the supported terminal maximum; the compiler tells
  authors to choose a smaller width rather than silently changing the art.
- A maximum converted height prevents an image from producing an excessive number
  of terminal rows.
- Each generated row ends with an ANSI reset, so image colours do not bleed into
  subsequent text.

## Verification

- Unit-test directive parsing, path resolution, invalid syntax, and error messages.
- Unit-test pixel-to-ANSI conversion for opaque, transparent, and odd-height PNGs.
- Unit-test the compiler against a small source-page fixture and assert that it
  preserves adjacent text and expands the directive.
- Run `npm run build-terminal-assets`, `npm run check`, the focused tests, and
  `npm run build`.
- Manually launch the BBS page containing a fixture image and verify that coloured
  xterm cells reach the existing renderer sync path and inherit the CRT effect.

## Out of scope

- JPEG, GIF, SVG, animation, remote images, browser-runtime image loading, DOM or
  canvas overlays, and directives embedded mid-line.
- Replacing existing ANSI artwork. The feature is introduced with one small fixture
  or example page only.
