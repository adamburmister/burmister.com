# burmister.com

[![Validate and deploy](https://github.com/adamburmister/burmister.com/actions/workflows/validate-and-deploy.yml/badge.svg)](https://github.com/adamburmister/burmister.com/actions/workflows/validate-and-deploy.yml)

```text
▌        ▘  ▗              
▛▌▌▌▛▘▛▛▌▌▛▘▜▘█▌▛▘  ▛▘▛▌▛▛▌
▙▌▙▌▌ ▌▌▌▌▄▌▐▖▙▖▌ ▗ ▙▖▙▌▌▌▌
```

This is my personal CV and portfolio site: a retro CRT terminal, BIOS boot,
dial-up BBS, ANSI menus, guestbook, door games, and a downloadable resume.

I built it to show the kind of engineering I like doing: polished frontend
systems with a strong product instinct, careful interaction details, and enough
infrastructure discipline that the weird fun thing can still be reliable.

## About Me

I'm Adam Burmister, a Senior Product Frontend Engineer based in Melbourne with
full Australian work rights. I have 17+ years of experience building large-scale
web products at Stripe, Pinterest, Xero and BBC Worldwide.

My strongest fit is senior frontend/product engineering work with React,
TypeScript, design systems, SaaS UX, performance, and practical full-stack
delivery. I have also co-founded a venture-backed startup, worked directly with
customers as a Stripe Solutions Architect, led the bbc.com homepage rebuild, and
co-authored *IronRuby in Action* for Manning.

Useful links:

- Site: <https://burmister.com>
- PDF resume: <https://burmister.com/cv.pdf>
- Text resume: [public/resume.txt](public/resume.txt)
- Colophon: [public/colophon.txt](public/colophon.txt)
- Agent guidance: [public/llms.txt](public/llms.txt)

## What This Demonstrates

- A WebGL terminal experience rendered with Three.js and
  `cool-retro-term-renderer`.
- xterm.js-backed terminal state, scrollback, command handling and selection.
- A small shell with auto-discovered terminal commands and a virtual filesystem.
- A BBS-style dialer with ANSI art, audio, static menus, guestbook and door
  games.
- Cloudflare Worker deployment with a Durable Object-backed guestbook.
- Agent-readable metadata, `llms.txt`, API discovery docs and plain-text resume
  assets.
- Playwright smoke tests that prevent deploying a broken terminal or missing
  resume PDF.

## Stack

- Astro
- TypeScript
- Three.js / WebGL
- xterm.js
- Cloudflare Workers
- Cloudflare Durable Objects
- Bun
- Playwright
- Biome

## Development

Install dependencies:

```sh
bun install
```

Run the local dev server:

```sh
bun run dev
```

Build the site:

```sh
bun run build
```

Run typecheck and lint:

```sh
bun run check
```

Run the browser smoke tests:

```sh
bun run test:e2e
```

The Playwright suite builds the site, starts `wrangler dev`, checks that the
terminal canvas renders non-blank pixels, and confirms `/cv.pdf` serves a valid
PDF.

## Deployment

GitHub Actions runs validation on pull requests and pushes to `main`. A
successful push to `main` deploys with Wrangler.

Required repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Credit

This site is heavily inspired by Remo H. Jansen's
[`cool-retro-term-webgl`](https://github.com/remojansen/cool-retro-term-webgl),
which is based on
[`cool-retro-term`](https://github.com/Swordfish90/cool-retro-term).

More notes are in [public/colophon.txt](public/colophon.txt).

## License

GPL-3.0. See [LICENSE](LICENSE) for details.
