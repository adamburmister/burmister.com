import type { APIRoute } from "astro";

export const ALL: APIRoute = () => {
  return Response.json(
    {
      error: "mcp_transport_not_enabled",
      message:
        "burmister.com publishes an MCP server card for discovery, but does not currently expose a full MCP transport.",
    },
    {
      status: 501,
    },
  );
};
