import astroWorker from "@astrojs/cloudflare/entrypoints/server";

export { GuestbookDurableObject } from "./durable-objects/GuestbookDurableObject";

export default astroWorker;
