import { Request, Response } from "express";
import { getAdminEarningsOverview, getTeacherEarnings } from "../services/earningsService";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }
  return currentMonth();
}

export const getTeacherEarningsReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const month = parseMonth(req.query.month);
    const data = await getTeacherEarnings(req.user!._id, month);

    res.status(200).json({
      success: true,
      message: "Earnings report fetched successfully",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch earnings report",
      data: null,
    });
  }
};

export const getAdminEarningsReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const month = parseMonth(req.query.month);
    const data = await getAdminEarningsOverview(month);

    res.status(200).json({
      success: true,
      message: "Earnings overview fetched successfully",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch earnings overview",
      data: null,
    });
  }
};
