import { SessionSlot } from "../models/SessionSlot";
import {
  getSessionInstant,
  getSessionPhase,
  getTodayScheduleDay,
} from "../utils/scheduleUtils";

export async function refreshTodaySessionPhases(): Promise<number> {
  const today = getTodayScheduleDay();
  const now = new Date();
  const slots = await SessionSlot.find({ day: today, isActive: true });
  let updated = 0;

  for (const slot of slots) {
    const startsAt = getSessionInstant(slot.day, slot.startTime);
    if (!startsAt) continue;

    const phase = getSessionPhase(startsAt, slot.durationMinutes, now);
    if (slot.sessionPhase !== phase) {
      slot.sessionPhase = phase;
      if (phase === "completed" && slot.repeatWeekly === false) {
        slot.isActive = false;
      }
      await slot.save();
      updated += 1;
    } else if (
      phase === "completed" &&
      slot.repeatWeekly === false &&
      slot.isActive
    ) {
      slot.isActive = false;
      await slot.save();
      updated += 1;
    }
  }

  return updated;
}

export async function refreshSessionPhaseForClass(classId: string): Promise<void> {
  const today = getTodayScheduleDay();
  const now = new Date();
  const slots = await SessionSlot.find({
    class: classId,
    day: today,
    isActive: true,
  });

  for (const slot of slots) {
    const startsAt = getSessionInstant(slot.day, slot.startTime);
    if (!startsAt) continue;
    slot.sessionPhase = getSessionPhase(startsAt, slot.durationMinutes, now);
    if (slot.sessionPhase === "completed" && slot.repeatWeekly === false) {
      slot.isActive = false;
    }
    await slot.save();
  }
}
