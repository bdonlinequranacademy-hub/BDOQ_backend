"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTodaySessionPhases = refreshTodaySessionPhases;
exports.refreshSessionPhaseForClass = refreshSessionPhaseForClass;
const SessionSlot_1 = require("../models/SessionSlot");
const scheduleUtils_1 = require("../utils/scheduleUtils");
async function refreshTodaySessionPhases() {
    const today = (0, scheduleUtils_1.getTodayScheduleDay)();
    const now = new Date();
    const slots = await SessionSlot_1.SessionSlot.find({ day: today, isActive: true });
    let updated = 0;
    for (const slot of slots) {
        const startsAt = (0, scheduleUtils_1.getSessionInstant)(slot.day, slot.startTime);
        if (!startsAt)
            continue;
        const phase = (0, scheduleUtils_1.getSessionPhase)(startsAt, slot.durationMinutes, now);
        if (slot.sessionPhase !== phase) {
            slot.sessionPhase = phase;
            await slot.save();
            updated += 1;
        }
    }
    return updated;
}
async function refreshSessionPhaseForClass(classId) {
    const today = (0, scheduleUtils_1.getTodayScheduleDay)();
    const now = new Date();
    const slots = await SessionSlot_1.SessionSlot.find({
        class: classId,
        day: today,
        isActive: true,
    });
    for (const slot of slots) {
        const startsAt = (0, scheduleUtils_1.getSessionInstant)(slot.day, slot.startTime);
        if (!startsAt)
            continue;
        slot.sessionPhase = (0, scheduleUtils_1.getSessionPhase)(startsAt, slot.durationMinutes, now);
        await slot.save();
    }
}
