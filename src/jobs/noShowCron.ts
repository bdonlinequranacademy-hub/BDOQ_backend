import cron from "node-cron";
import { runNoShowChecks } from "../services/noShowService";

export function startNoShowCron(): void {
  cron.schedule("* * * * *", () => {
    runNoShowChecks().catch((err) => {
      console.warn("[cron] no-show checks failed:", err);
    });
  });

  console.log("No-show monitoring cron started (every minute)");
}
