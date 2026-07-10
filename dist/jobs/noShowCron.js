"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startNoShowCron = startNoShowCron;
const node_cron_1 = __importDefault(require("node-cron"));
const noShowService_1 = require("../services/noShowService");
function startNoShowCron() {
    node_cron_1.default.schedule("* * * * *", () => {
        (0, noShowService_1.runNoShowChecks)().catch((err) => {
            console.warn("[cron] no-show checks failed:", err);
        });
    });
    console.log("No-show monitoring cron started (every minute)");
}
