import astroWorker from "@astrojs/cloudflare/entrypoints/server";
import { discoveryLinks, homepageMarkdown } from "./agentDiscovery";

export { GuestbookDurableObject } from "./durable-objects/GuestbookDurableObject";

type AstroFetch = typeof astroWorker.fetch;
type AstroEnvironment = Parameters<AstroFetch>[1];
type AstroExecutionContext = Parameters<AstroFetch>[2];

function wantsMarkdown(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .some(
      (entry) =>
        entry === "text/markdown" || entry.startsWith("text/markdown;"),
    );
}

function withDiscoveryHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  for (const link of discoveryLinks) {
    headers.append("link", link);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(
    request: Request,
    env: AstroEnvironment,
    ctx: AstroExecutionContext,
  ) {
    const url = new URL(request.url);
    const isHomepage = url.pathname === "/";

    if (isHomepage && wantsMarkdown(request)) {
      const headers = new Headers({
        "content-type": "text/markdown; charset=utf-8",
        "x-markdown-tokens": String(homepageMarkdown.split(/\s+/).length),
      });

      for (const link of discoveryLinks) {
        headers.append("link", link);
      }

      return new Response(homepageMarkdown, {
        headers,
      });
    }

    const response = await astroWorker.fetch(request, env, ctx);
    return isHomepage ? withDiscoveryHeaders(response) : response;
  },
};
