import cron from "node-cron";
import { runPaymentReminders } from "../services/paymentReminderService";

export function startPaymentReminderCron(): void {
  cron.schedule("0 9 * * *", () => {
    runPaymentReminders().catch((err) => {
      console.warn("[cron] payment reminders failed:", err);
    });
  });

  console.log("Payment reminder cron started (daily 09:00 UTC)");
}
