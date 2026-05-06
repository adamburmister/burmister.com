# burmister.com public API

The site exposes a small public API for the BBS guestbook and health checks.
No OAuth access token is required.

## Endpoints

- `GET /api/guestbook`: returns the latest public BBS guestbook entries.
- `POST /api/guestbook`: accepts `{ "message": "..." }` and stores a short
  guestbook entry.
- `GET /api/health`: returns service health.

## Limits

Guestbook messages are capped at 160 characters. The backing Durable Object
keeps the latest 10 entries.

## Discovery

- API catalog: `/.well-known/api-catalog`
- OpenAPI description: `/.well-known/openapi.json`
