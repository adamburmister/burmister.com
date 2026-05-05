import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import type {
  GuestbookCreateRequest,
  GuestbookListResponse,
} from "../../durable-objects/GuestbookDurableObject";

const GUESTBOOK_OBJECT_NAME = "burmister-bbs-global-guestbook";
const GUESTBOOK_OBJECT_URL = "https://guestbook.internal/entries";
const MAX_MESSAGE_LENGTH = 160;

export const GET: APIRoute = async () => {
  return forwardToGuestbook();
};

export const POST: APIRoute = async ({ request }) => {
  let body: GuestbookCreateRequest;
  try {
    body = (await request.json()) as GuestbookCreateRequest;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  if (typeof body.message !== "string" || body.message.trim().length === 0) {
    return json({ error: "message is required" }, 400);
  }

  return forwardToGuestbook({
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: body.message.slice(0, MAX_MESSAGE_LENGTH),
    }),
  });
};

function forwardToGuestbook(init?: RequestInit): Promise<Response> {
  const id = env.GUESTBOOK.idFromName(GUESTBOOK_OBJECT_NAME);
  const stub = env.GUESTBOOK.get(id);
  return stub.fetch(GUESTBOOK_OBJECT_URL, init);
}

function json<T>(body: T, status = 200): Response {
  return Response.json(body, {
    status,
  });
}

export type { GuestbookListResponse };
