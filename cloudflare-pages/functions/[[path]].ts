import app from "../server/index.js";

interface PagesContext {
  request: Request;
  env: Record<string, unknown>;
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Adapts vinext's generated Cloudflare Worker to a Pages Function. Keeping
 * this as a catch-all route lets Pages provide the nsosyal.pages.dev hostname
 * while the app retains server rendering and its static-asset handling.
 */
export async function onRequest(context: PagesContext): Promise<Response> {
  return app.fetch(context.request, context.env, {
    waitUntil: context.waitUntil,
    passThroughOnException() {},
  });
}
