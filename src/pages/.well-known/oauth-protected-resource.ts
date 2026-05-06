import type { APIRoute } from "astro";

const origin = "https://burmister.com";

export const GET: APIRoute = () => {
  return Response.json(
    {
      resource: origin,
      authorization_servers: [],
      scopes_supported: [],
      bearer_methods_supported: [],
      resource_documentation: `${origin}/.well-known/api-docs.md`,
      metadata_note:
        "No protected resources are currently exposed. The guestbook API is public and does not require OAuth.",
    },
    {
      headers: {
        "cache-control": "public, max-age=3600",
      },
    },
  );
};
