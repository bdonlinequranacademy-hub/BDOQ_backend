"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSessionStatusCron = startSessionStatusCron;
const node_cron_1 = __importDefault(require("node-cron"));
const sessionStatusService_1 = require("../services/sessionStatusService");
function startSessionStatusCron() {
    node_cron_1.default.schedule("* * * * *", () => {
        (0, sessionStatusService_1.refreshTodaySessionPhases)().catch((err) => {
            console.warn("[cron] session phase refresh failed:", err);
        });
    });
    (0, sessionStatusService_1.refreshTodaySessionPhases)().catch((err) => {
        console.warn("[cron] initial session phase refresh failed:", err);
    });
    console.log("Session status cron started (every minute)");
}
