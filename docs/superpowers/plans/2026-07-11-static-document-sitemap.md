# Static Document Sitemap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Include the public PDF and text résumé URLs in the canonical generated sitemap.

**Architecture:** Keep `@astrojs/sitemap` responsible for Astro page routes and pass it an explicit static-document URL list for the two résumé files. Verify the generated sitemap artifact directly so the test covers the deployed discovery document, rather than only the integration configuration.

**Tech Stack:** Astro 6, `@astrojs/sitemap`, Node.js test runner, Playwright build pipeline.

## Global Constraints

- Sitemap URL scope is exactly `/`, `/cv.pdf`, and `/resume.txt`.
- Do not include terminal ANSI files, audio files, APIs, `llms.txt`, `agents.txt`, or `.well-known` resources.
- Keep `sitemap-index.xml` as the canonical sitemap and the `/sitemap.xml` redirect intact.
- No new runtime dependency.

---

### Task 1: Add public résumé URLs to the sitemap

**Files:**
- Modify: `astro.config.js:108`
- Modify: `tests/e2e/homepage.spec.ts:26-36`

**Interfaces:**
- Consumes: `@astrojs/sitemap` accepts `customPages: string[]` containing absolute canonical URLs.
- Produces: `dist/client/sitemap-0.xml` contains `<loc>` entries for `https://burmister.com/cv.pdf` and `https://burmister.com/resume.txt` after `npm run build`.

- [ ] **Step 1: Write the failing sitemap-content test**

Add this test below the existing PDF response test in `tests/e2e/homepage.spec.ts`:

```ts
test("the generated sitemap includes public resume documents", async ({ request }) => {
  const response = await request.get("/sitemap-index.xml");

  expect(response.ok()).toBe(true);
  const sitemapIndex = await response.text();
  expect(sitemapIndex).toContain("https://burmister.com/sitemap-0.xml");

  const sitemap = await request.get("/sitemap-0.xml");
  expect(sitemap.ok()).toBe(true);
  const sitemapXml = await sitemap.text();
  expect(sitemapXml).toContain("https://burmister.com/");
  expect(sitemapXml).toContain("https://burmister.com/cv.pdf");
  expect(sitemapXml).toContain("https://burmister.com/resume.txt");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:e2e -- tests/e2e/homepage.spec.ts --grep "generated sitemap"`

Expected: FAIL because `sitemap-0.xml` does not contain the PDF or text résumé URL.

- [ ] **Step 3: Configure the sitemap's explicit static-document URLs**

Replace the sitemap integration entry in `astro.config.js` with:

```js
  integrations: [
    sitemap({
      customPages: [
        "https://burmister.com/cv.pdf",
        "https://burmister.com/resume.txt",
      ],
    }),
  ],
```

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm run test:e2e -- tests/e2e/homepage.spec.ts --grep "generated sitemap"`

Expected: PASS with the sitemap index and all three public URLs available.

- [ ] **Step 5: Run the project checks**

Run: `npm run check && npm run build`

Expected: both commands exit with status 0; `dist/client/sitemap-0.xml` contains the homepage, `/cv.pdf`, and `/resume.txt` URLs.

- [ ] **Step 6: Commit the implementation**

```bash
git add astro.config.js tests/e2e/homepage.spec.ts
git commit -m "feat: add resume documents to sitemap"
```
