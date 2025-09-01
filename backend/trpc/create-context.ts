import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit & { retry?: number; retryDelayMs?: number; timeoutMs?: number }): Promise<Response> {
  const retry = init?.retry ?? 2;
  const retryDelayMs = init?.retryDelayMs ?? 500;
  const timeoutMs = init?.timeoutMs ?? 8000;
  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(input, {
        ...init,
        signal: controller.signal,
        headers: { ...(init?.headers ?? {}), "cache-control": "no-cache", pragma: "no-cache" },
      });
      clearTimeout(id);
      if (res.status >= 500 && attempt < retry) {
        const delay = retryDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (e) {
      if (attempt >= retry) throw e as Error;
      const delay = retryDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("fetchWithRetry exhausted");
}

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  return {
    req: opts.req,
    fetch: fetchWithRetry,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;