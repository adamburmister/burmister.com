export interface GuestbookEntry {
  id: string;
  message: string;
  createdAt: string;
}

export interface GuestbookListResponse {
  entries: GuestbookEntry[];
}

export interface GuestbookCreateRequest {
  message?: unknown;
}

export type DurableObjectIdLike = object;

export interface DurableObjectStubLike {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface DurableObjectNamespaceLike {
  idFromName(name: string): DurableObjectIdLike;
  get(id: DurableObjectIdLike): DurableObjectStubLike;
}

interface DurableObjectStorageLike {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}

interface DurableObjectStateLike {
  storage: DurableObjectStorageLike;
}

const ENTRIES_KEY = "entries";
const MAX_ENTRIES = 10;
const MAX_MESSAGE_LENGTH = 160;

export class GuestbookDurableObject {
  constructor(private readonly state: DurableObjectStateLike) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== "/entries") {
      return json({ error: "not found" }, 404);
    }

    if (request.method === "GET") {
      return json<GuestbookListResponse>({
        entries: await this.readEntries(),
      });
    }

    if (request.method === "POST") {
      let body: GuestbookCreateRequest;
      try {
        body = (await request.json()) as GuestbookCreateRequest;
      } catch {
        return json({ error: "invalid json" }, 400);
      }

      const message = normalizeMessage(body.message);
      if (!message) {
        return json({ error: "message is required" }, 400);
      }

      const entry: GuestbookEntry = {
        id: crypto.randomUUID(),
        message,
        createdAt: new Date().toISOString(),
      };
      const entries = [entry, ...(await this.readEntries())].slice(
        0,
        MAX_ENTRIES,
      );
      await this.state.storage.put(ENTRIES_KEY, entries);

      return json<GuestbookListResponse>({ entries }, 201);
    }

    return json({ error: "method not allowed" }, 405, {
      Allow: "GET, POST",
    });
  }

  private async readEntries(): Promise<GuestbookEntry[]> {
    return (await this.state.storage.get<GuestbookEntry[]>(ENTRIES_KEY)) ?? [];
  }
}

function normalizeMessage(message: unknown): string {
  if (typeof message !== "string") {
    return "";
  }

  return message
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127 ? " " : char;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

function json<T>(body: T, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(body, {
    status,
    headers,
  });
}
