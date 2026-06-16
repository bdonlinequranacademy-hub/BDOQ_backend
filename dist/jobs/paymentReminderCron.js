"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPaymentReminderCron = startPaymentReminderCron;
const node_cron_1 = __importDefault(require("node-cron"));
const paymentReminderService_1 = require("../services/paymentReminderService");
function startPaymentReminderCron() {
    node_cron_1.default.schedule("0 9 * * *", () => {
        (0, paymentReminderService_1.runPaymentReminders)().catch((err) => {
            console.warn("[cron] payment reminders failed:", err);
        });
    });
    console.log("Payment reminder cron started (daily 09:00 UTC)");
}
