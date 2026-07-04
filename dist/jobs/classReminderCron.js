"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startClassReminderCron = startClassReminderCron;
const node_cron_1 = __importDefault(require("node-cron"));
const classReminderService_1 = require("../services/classReminderService");
function startClassReminderCron() {
    node_cron_1.default.schedule("* * * * *", () => {
        (0, classReminderService_1.runClassReminders)().catch((err) => {
            console.warn("[cron] class reminders failed:", err);
        });
    });
    console.log("Class reminder cron started (every minute, 10 min before class)");
}
