import cron from "node-cron";
import { refreshTodaySessionPhases } from "../services/sessionStatusService";

export function startSessionStatusCron(): void {
  cron.schedule("* * * * *", () => {
    refreshTodaySessionPhases().catch((err) => {
      console.warn("[cron] session phase refresh failed:", err);
    });
  });

  refreshTodaySessionPhases().catch((err) => {
    console.warn("[cron] initial session phase refresh failed:", err);
  });

  console.log("Session status cron started (every minute)");
}
