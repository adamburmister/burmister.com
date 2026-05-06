import type { APIRoute } from "astro";

const origin = "https://burmister.com";

export const GET: APIRoute = () => {
  return Response.json(
    {
      resource: origin,
      resource_name: "burmister.com public API",
      authorization_servers: [
        `${origin}/.well-known/oauth-authorization-server`,
      ],
      scopes_supported: ["guestbook:read", "guestbook:write"],
      bearer_methods_supported: ["header"],
      resource_documentation: `${origin}/.well-known/api-docs.md`,
      resource_policy_uri: `${origin}/llms.txt`,
      metadata_note:
        "The current public guestbook API does not require OAuth tokens. This metadata is published for agent discovery and future protected API compatibility.",
    },
    {
      headers: {
        "cache-control": "public, max-age=3600",
        "content-type": "application/json; charset=utf-8",
      },
    },
  );
};
