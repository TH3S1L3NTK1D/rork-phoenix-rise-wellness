import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors());

// Simple network-stability middleware: retries upstream fetches and sets no-cache for dev
app.use("*", async (c, next) => {
  c.res = new Response(c.res.body, {
    headers: {
      ...Object.fromEntries(c.res.headers),
      "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      pragma: "no-cache",
    },
  });
  try {
    await next();
  } catch (e) {
    console.error("[Hono] Unhandled error", e);
    return c.json({ error: "Internal Server Error" }, 500);
  }
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

// Health check & debug
app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

export default app;