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
      claims_supported: [],
      subject_types_supported: [],
      id_token_signing_alg_values_supported: [],
      metadata_note:
        "burmister.com does not currently provide OpenID Connect sign-in. Public APIs do not require authentication.",
    },
    {
      headers: {
        "cache-control": "public, max-age=3600",
      },
    },
  );
};
