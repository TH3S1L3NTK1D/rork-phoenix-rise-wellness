import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";
import Constants from "expo-constants";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = (): string => {
  const env = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (env && typeof env === "string") {
    return env;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    console.warn("[tRPC] Using window.location.origin as base URL");
    return window.location.origin;
  }

  if (Platform.OS !== "web") {
    const hostUri = (Constants.expoConfig as any)?.hostUri ?? (Constants as any).manifest2?.extra?.expoGo?.developer?.host ?? (Constants as any).debuggerHost;
    if (typeof hostUri === "string" && hostUri.includes(":")) {
      const [host, portRaw] = hostUri.split(":");
      const port = parseInt(portRaw || "", 10);
      const isLanIp = /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes("localhost");
      const proto = isLanIp ? "http" : "https";
      const finalPort = Number.isFinite(port) ? port : 8081;
      const base = `${proto}://${host}:${finalPort}`;
      console.warn(`[tRPC] Derived base URL from hostUri: ${base}`);
      return base;
    }
  }

  console.warn("[tRPC] No base URL found. Falling back to http://localhost:3000");
  return "http://localhost:3000";
};

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit & { retry?: number; retryDelayMs?: number; timeoutMs?: number }): Promise<Response> {
  const retry = init?.retry ?? 3;
  const retryDelayMs = init?.retryDelayMs ?? 700;
  const timeoutMs = init?.timeoutMs ?? 8000;

  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(input, {
        ...init,
        cache: "no-store",
        keepalive: true,
        signal: controller.signal,
        headers: {
          ...(init?.headers ?? {}),
          "cache-control": "no-cache",
          pragma: "no-cache",
        },
      });
      clearTimeout(id);
      if ((res.status >= 500 || res.status === 429 || res.status === 408) && attempt < retry) {
        const jitter = Math.random() * 100;
        const delay = retryDelayMs * Math.pow(2, attempt) + jitter;
        console.warn(`[tRPC] ${res.status} response, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retry})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (e) {
      if (attempt >= retry) throw e as Error;
      const jitter = Math.random() * 100;
      const delay = retryDelayMs * Math.pow(2, attempt) + jitter;
      console.warn(`[tRPC] Network error, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retry})`, e);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error("[tRPC] fetchWithRetry exhausted");
}

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      fetch: (url, init) => fetchWithRetry(url, init as any),
    }),
  ],
});