import type { APIRoute } from "astro";

const origin = "https://burmister.com";

export const GET: APIRoute = () => {
  return Response.json(
    {
      issuer: origin,
      service_documentation: `${origin}/.well-known/api-docs.md`,
      scopes_supported: [],
      response_types_supported: [],
      grant_types_supported: [],
      token_endpoint_auth_methods_supported: [],
      authorization_response_iss_parameter_supported: false,
      metadata_note:
        "burmister.com currently exposes only public APIs and does not issue OAuth access tokens.",
    },
    {
      headers: {
        "cache-control": "public, max-age=3600",
      },
    },
  );
};
