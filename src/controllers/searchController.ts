import { Request, Response } from "express";
import { globalSearch } from "../services/searchService";

export const searchPortal = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const results = await globalSearch(req.user!._id, req.user!.role, q);

    res.status(200).json({
      success: true,
      message: "Search completed",
      data: results,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Search failed",
      data: null,
    });
  }
};
