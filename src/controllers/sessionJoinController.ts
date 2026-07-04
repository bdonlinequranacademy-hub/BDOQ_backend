import { Request, Response } from "express";
import { IUser } from "../models/User";
import {
  assertUserCanJoinSlot,
  recordSessionJoin,
} from "../services/sessionJoinService";

function getUser(req: Request): IUser {
  return req.user as IUser;
}

export const recordTeacherSessionJoin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slotId } = req.params;
    const user = getUser(req);
    const { role } = await assertUserCanJoinSlot(slotId, user);
    if (role !== "teacher") {
      res.status(403).json({
        success: false,
        message: "Only the assigned teacher can record this join",
        data: null,
      });
      return;
    }

    const source =
      req.body?.source === "portal" ? "portal" : ("meeting_link" as const);
    const data = await recordSessionJoin({
      sessionSlotId: slotId,
      userId: user._id.toString(),
      role: "teacher",
      source,
      sessionDate: req.body?.sessionDate,
    });

    res.status(200).json({
      success: true,
      message: data.alreadyJoined ? "Already recorded" : "Join recorded",
      data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record join";
    const status = message.includes("not found") ? 404 : 403;
    res.status(status).json({ success: false, message, data: null });
  }
};

export const recordStudentSessionJoin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slotId } = req.params;
    const user = getUser(req);
    const { role } = await assertUserCanJoinSlot(slotId, user);
    if (role !== "student") {
      res.status(403).json({
        success: false,
        message: "Only the assigned student can record this join",
        data: null,
      });
      return;
    }

    const source =
      req.body?.source === "portal" ? "portal" : ("meeting_link" as const);
    const data = await recordSessionJoin({
      sessionSlotId: slotId,
      userId: user._id.toString(),
      role: "student",
      source,
      sessionDate: req.body?.sessionDate,
    });

    res.status(200).json({
      success: true,
      message: data.alreadyJoined ? "Already recorded" : "Join recorded",
      data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record join";
    const status = message.includes("not found") ? 404 : 403;
    res.status(status).json({ success: false, message, data: null });
  }
};
