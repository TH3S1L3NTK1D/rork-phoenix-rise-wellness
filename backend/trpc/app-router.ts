import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import chatRoute from "./routes/ai/chat/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  ai: createTRPCRouter({
    chat: chatRoute,
  }),
});

export type AppRouter = typeof appRouter;