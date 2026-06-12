"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFullCurriculumTree = exports.resetAdminCurriculumTree = exports.updateAdminCurriculumTree = exports.getAdminCurriculumTree = void 0;
const curriculumStore_1 = require("../services/curriculumStore");
const curriculumService_1 = require("../services/curriculumService");
Object.defineProperty(exports, "getFullCurriculumTree", { enumerable: true, get: function () { return curriculumService_1.getFullCurriculumTree; } });
const getAdminCurriculumTree = async (_req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: "Curriculum tree fetched",
            data: (0, curriculumStore_1.getActiveCurriculumTree)(),
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
exports.getAdminCurriculumTree = getAdminCurriculumTree;
const updateAdminCurriculumTree = async (req, res) => {
    try {
        const { tree } = req.body;
        const validated = (0, curriculumStore_1.validateCurriculumTree)(tree);
        const saved = await (0, curriculumStore_1.saveCurriculumTree)(validated);
        res.status(200).json({
            success: true,
            message: "Curriculum updated",
            data: saved,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err instanceof Error ? err.message : "Invalid curriculum tree",
            data: null,
        });
    }
};
exports.updateAdminCurriculumTree = updateAdminCurriculumTree;
const resetAdminCurriculumTree = async (_req, res) => {
    try {
        const { CURRICULUM_PROGRAMS } = await Promise.resolve().then(() => __importStar(require("../data/curriculumTree")));
        const saved = await (0, curriculumStore_1.saveCurriculumTree)(CURRICULUM_PROGRAMS);
        res.status(200).json({
            success: true,
            message: "Curriculum reset to defaults",
            data: saved,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to reset curriculum",
            data: null,
        });
    }
};
exports.resetAdminCurriculumTree = resetAdminCurriculumTree;
