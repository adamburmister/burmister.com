# Static document sitemap design

## Goal

Make the public résumé documents discoverable to search engines through the
site's canonical sitemap, without exposing internal or machine-facing assets as
search-result candidates.

## Scope

The sitemap will list these canonical URLs:

- `https://burmister.com/`
- `https://burmister.com/cv.pdf`
- `https://burmister.com/resume.txt`

It will not list terminal ANSI files, audio, API routes, `llms.txt`,
`agents.txt`, or `.well-known` resources. These resources can remain directly
accessible where needed but are not intended as visitor-facing search results.

## Design

Keep `@astrojs/sitemap` as the source for Astro page URLs and supply a small,
explicit list of static document URLs through its configuration. Continue
publishing `sitemap-index.xml` as the canonical sitemap and keep the existing
`/sitemap.xml` compatibility redirect.

## Validation

Add a test that inspects the production sitemap output and asserts it contains
the homepage, PDF résumé, and text résumé URLs. The existing end-to-end check
continues to verify that the PDF itself is served correctly.
