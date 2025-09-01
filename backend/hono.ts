import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors());

// Add basic timeout and no-cache headers to reduce Android stale bundle issues
app.use("*", async (c, next) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  c.req.raw.signal.addEventListener?.("abort", () => controller.abort());

  try {
    await next();
  } catch (e) {
    console.error("[Hono] Unhandled error", e);
    return c.json({ error: "Internal Server Error" }, 500);
  } finally {
    clearTimeout(timeout);
  }
});

app.use("*", async (c, next) => {
  await next();
  c.header("cache-control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  c.header("pragma", "no-cache");
});

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
    onError({ error }) {
      console.error("[tRPC] Error", error);
    },
  })
);

app.get("/healthz", (c) => c.text("ok"));

// Health check & debug
app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

export default app;