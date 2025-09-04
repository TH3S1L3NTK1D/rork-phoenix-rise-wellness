import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export default publicProcedure
  .input(z.object({ messages: z.array(z.any()) }))
  .mutation(async ({ input }) => {
    try {
      const res = await fetch("https://toolkit.rork.com/text/llm/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: input.messages }),
      });
      if (!res.ok) {
        return { completion: "" };
      }
      const json = await res.json();
      return { completion: (json?.completion as string) ?? "" };
    } catch (e) {
      return { completion: "" };
    }
  });