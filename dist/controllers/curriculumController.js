"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurriculumTree = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const curriculumService_1 = require("../services/curriculumService");
const User_1 = require("../models/User");
const getCurriculumTree = async (req, res) => {
    try {
        const { studentId, classId } = req.query;
        if (typeof classId === "string" && classId) {
            const tree = await (0, curriculumService_1.getCurriculumOptionsForClass)(classId);
            res.status(200).json({
                success: true,
                message: "Curriculum options fetched",
                data: tree,
            });
            return;
        }
        if (typeof studentId === "string" && studentId) {
            if (!mongoose_1.default.Types.ObjectId.isValid(studentId)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid student ID",
                    data: null,
                });
                return;
            }
            const student = await User_1.User.findOne({ _id: studentId, role: "student" }).select("curriculumAssignments");
            if (!student) {
                res.status(404).json({
                    success: false,
                    message: "Student not found",
                    data: null,
                });
                return;
            }
            const tree = (0, curriculumService_1.filterTreeForAssignments)(student.curriculumAssignments);
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
            data: (0, curriculumService_1.getFullCurriculumTree)(),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch curriculum",
            data: null,
        });
    }
};
exports.getCurriculumTree = getCurriculumTree;
