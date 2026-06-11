import { Request, Response } from "express";
import {
  getAcademyWeeklyRoutine,
  resyncAllClasses,
} from "../services/scheduleService";

export const getAdminWeeklyRoutine = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const teacherId =
      typeof req.query.teacherId === "string" && req.query.teacherId.trim()
        ? req.query.teacherId.trim()
        : undefined;

    const sessions = await getAcademyWeeklyRoutine(
      teacherId as Parameters<typeof getAcademyWeeklyRoutine>[0]
    );

    res.status(200).json({
      success: true,
      message: "Academy routine fetched successfully",
      data: sessions,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch academy routine",
      data: null,
    });
  }
};

export const resyncAdminSchedule = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const count = await resyncAllClasses();

    res.status(200).json({
      success: true,
      message: `Resynced ${count} active class${count === 1 ? "" : "es"}`,
      data: { classesSynced: count },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to resync schedule",
      data: null,
    });
  }
};
