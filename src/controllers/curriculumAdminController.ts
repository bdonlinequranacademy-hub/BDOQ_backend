import { Request, Response } from "express";
import { getActiveCurriculumTree, saveCurriculumTree, validateCurriculumTree } from "../services/curriculumStore";
import { getFullCurriculumTree } from "../services/curriculumService";
import type { CurriculumNode } from "../data/curriculumTree";

export const getAdminCurriculumTree = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: "Curriculum tree fetched",
      data: getActiveCurriculumTree(),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch curriculum",
      data: null,
    });
  }
};

export const updateAdminCurriculumTree = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tree } = req.body;
    const validated = validateCurriculumTree(tree) as CurriculumNode[];
    const saved = await saveCurriculumTree(validated);
    res.status(200).json({
      success: true,
      message: "Curriculum updated",
      data: saved,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Invalid curriculum tree",
      data: null,
    });
  }
};

export const resetAdminCurriculumTree = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const { CURRICULUM_PROGRAMS } = await import("../data/curriculumTree");
    const saved = await saveCurriculumTree(CURRICULUM_PROGRAMS);
    res.status(200).json({
      success: true,
      message: "Curriculum reset to defaults",
      data: saved,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to reset curriculum",
      data: null,
    });
  }
};

// Re-export for curriculum routes (non-admin read)
export { getFullCurriculumTree };
