import type { APIRoute } from "astro";

const origin = "https://burmister.com";

export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify(
      {
        linkset: [
          {
            anchor: `${origin}/api/guestbook`,
            "service-desc": [
              {
                href: `${origin}/.well-known/openapi.json`,
                type: "application/vnd.oai.openapi+json",
              },
            ],
            "service-doc": [
              {
                href: `${origin}/.well-known/api-docs.md`,
                type: "text/markdown",
              },
            ],
            status: [
              {
                href: `${origin}/api/health`,
                type: "application/json",
              },
            ],
          },
        ],
      },
      null,
      2,
    ),
    {
      headers: {
        "content-type": "application/linkset+json; charset=utf-8",
      },
    },
  );
};
