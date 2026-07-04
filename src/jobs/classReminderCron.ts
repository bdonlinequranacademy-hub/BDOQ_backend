import cron from "node-cron";
import { runClassReminders } from "../services/classReminderService";

export function startClassReminderCron(): void {
  cron.schedule("* * * * *", () => {
    runClassReminders().catch((err) => {
      console.warn("[cron] class reminders failed:", err);
    });
  });

  console.log("Class reminder cron started (every minute, 10 min before class)");
}
