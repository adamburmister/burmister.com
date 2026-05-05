declare module "cloudflare:workers" {
  export const env: {
    GUESTBOOK: import("./durable-objects/GuestbookDurableObject").DurableObjectNamespaceLike;
  };
}
