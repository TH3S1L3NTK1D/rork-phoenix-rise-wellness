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
    const hostUri = Constants.expoConfig?.hostUri ?? Constants.executionEnvironment;
    if (typeof hostUri === "string" && hostUri.includes(":")) {
      const host = hostUri.split(":")[0];
      const proto = host.includes("localhost") || host.match(/^\d+\.\d+\.\d+\.\d+$/) ? "http" : "https";
      console.warn(`[tRPC] Derived base URL from hostUri: ${proto}://${host}`);
      return `${proto}://${host}`;
    }
  }

  console.warn("[tRPC] No base URL found. Falling back to http://localhost:3000");
  return "http://localhost:3000";
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});