import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  filterTreeForAssignments,
  getCurriculumOptionsForClass,
  getFullCurriculumTree,
} from "../services/curriculumService";
import { User } from "../models/User";

export const getCurriculumTree = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { studentId, classId } = req.query;

    if (typeof classId === "string" && classId) {
      const tree = await getCurriculumOptionsForClass(classId);
      res.status(200).json({
        success: true,
        message: "Curriculum options fetched",
        data: tree,
      });
      return;
    }

    if (typeof studentId === "string" && studentId) {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        res.status(400).json({
          success: false,
          message: "Invalid student ID",
          data: null,
        });
        return;
      }
      const student = await User.findOne({ _id: studentId, role: "student" }).select(
        "curriculumAssignments"
      );
      if (!student) {
        res.status(404).json({
          success: false,
          message: "Student not found",
          data: null,
        });
        return;
      }
      const tree = filterTreeForAssignments(student.curriculumAssignments);
      res.status(200).json({
        success: true,
        message: "Curriculum tree fetched",
        data: tree,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Curriculum tree fetched",
      data: getFullCurriculumTree(),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch curriculum",
      data: null,
    });
  }
};
