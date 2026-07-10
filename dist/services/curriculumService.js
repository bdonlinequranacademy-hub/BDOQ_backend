"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFullCurriculumTree = getFullCurriculumTree;
exports.findProgram = findProgram;
exports.findUnit = findUnit;
exports.findTopic = findTopic;
exports.filterTreeForAssignments = filterTreeForAssignments;
exports.getCurriculumOptionsForClass = getCurriculumOptionsForClass;
exports.resolveCurriculumLabels = resolveCurriculumLabels;
exports.attachCurriculumLabels = attachCurriculumLabels;
exports.mapProgressDocsWithLabels = mapProgressDocsWithLabels;
exports.mapAssignmentLabels = mapAssignmentLabels;
exports.isValidCurriculumPath = isValidCurriculumPath;
exports.isCurriculumPathComplete = isCurriculumPathComplete;
exports.pathAllowedForAssignments = pathAllowedForAssignments;
exports.validateHomeworkCurriculumForClass = validateHomeworkCurriculumForClass;
exports.validateCurriculumForStudent = validateCurriculumForStudent;
exports.parseCurriculumAssignments = parseCurriculumAssignments;
const mongoose_1 = require("mongoose");
const curriculumIds_1 = require("../data/curriculumIds");
const Class_1 = require("../models/Class");
const User_1 = require("../models/User");
const curriculumStore_1 = require("./curriculumStore");
function getFullCurriculumTree() {
    return (0, curriculumStore_1.getActiveCurriculumTree)();
}
function findProgram(programId) {
    const normalized = (0, curriculumIds_1.normalizeProgramId)(programId);
    return (0, curriculumStore_1.getActiveCurriculumTree)().find((p) => p.id === normalized || p.id === programId);
}
function findUnit(programId, unitId) {
    return findProgram(programId)?.children?.find((u) => u.id === unitId);
}
function findTopic(programId, unitId, topicId) {
    return findUnit(programId, unitId)?.children?.find((t) => t.id === topicId);
}
function cloneNode(node) {
    return {
        id: node.id,
        label: node.label,
        labelBn: node.labelBn,
        children: node.children?.map(cloneNode),
    };
}
function assignmentProgramMatches(assignmentProgramId, pathProgramId) {
    return (assignmentProgramId === pathProgramId ||
        (0, curriculumIds_1.normalizeProgramId)(assignmentProgramId) === (0, curriculumIds_1.normalizeProgramId)(pathProgramId));
}
function filterProgramByAssignment(program, assignment) {
    if (!assignmentProgramMatches(assignment.programId, program.id))
        return null;
    if (!assignment.unitId) {
        return cloneNode(program);
    }
    const unit = program.children?.find((u) => u.id === assignment.unitId);
    if (!unit)
        return null;
    if (!assignment.topicId) {
        return {
            ...unit,
            id: program.id,
            label: program.label,
            labelBn: program.labelBn,
            children: [cloneNode(unit)],
        };
    }
    const topic = unit.children?.find((t) => t.id === assignment.topicId);
    if (!topic)
        return null;
    return {
        id: program.id,
        label: program.label,
        labelBn: program.labelBn,
        children: [
            {
                ...unit,
                children: [cloneNode(topic)],
            },
        ],
    };
}
function filterTreeForAssignments(assignments) {
    if (!assignments?.length) {
        return getFullCurriculumTree();
    }
    const merged = new Map();
    for (const assignment of assignments) {
        const program = findProgram(assignment.programId);
        if (!program)
            continue;
        const filtered = filterProgramByAssignment(program, assignment);
        if (!filtered)
            continue;
        const existing = merged.get(program.id);
        if (!existing) {
            merged.set(program.id, filtered);
            continue;
        }
        const unitMap = new Map();
        for (const unit of existing.children ?? []) {
            unitMap.set(unit.id, cloneNode(unit));
        }
        for (const unit of filtered.children ?? []) {
            const prev = unitMap.get(unit.id);
            if (!prev) {
                unitMap.set(unit.id, cloneNode(unit));
                continue;
            }
            const topicMap = new Map();
            for (const t of prev.children ?? [])
                topicMap.set(t.id, cloneNode(t));
            for (const t of unit.children ?? [])
                topicMap.set(t.id, cloneNode(t));
            unitMap.set(unit.id, { ...prev, children: Array.from(topicMap.values()) });
        }
        merged.set(program.id, { ...existing, children: Array.from(unitMap.values()) });
    }
    return Array.from(merged.values());
}
async function getCurriculumOptionsForClass(classId) {
    if (!mongoose_1.Types.ObjectId.isValid(classId))
        return getFullCurriculumTree();
    const classDoc = await Class_1.Class.findById(classId).select("students");
    if (!classDoc?.students?.length)
        return getFullCurriculumTree();
    const students = await User_1.User.find({
        _id: { $in: classDoc.students },
        role: "student",
    }).select("curriculumAssignments");
    if (students.length === 0)
        return getFullCurriculumTree();
    const trees = students.map((s) => filterTreeForAssignments(s.curriculumAssignments ?? []));
    const programMap = new Map();
    for (const tree of trees) {
        for (const program of tree) {
            const existing = programMap.get(program.id);
            if (!existing) {
                programMap.set(program.id, cloneNode(program));
                continue;
            }
            const unitMap = new Map();
            for (const u of existing.children ?? [])
                unitMap.set(u.id, cloneNode(u));
            for (const u of program.children ?? []) {
                const prev = unitMap.get(u.id);
                if (!prev) {
                    unitMap.set(u.id, cloneNode(u));
                    continue;
                }
                const topicMap = new Map();
                for (const t of prev.children ?? [])
                    topicMap.set(t.id, cloneNode(t));
                for (const t of u.children ?? [])
                    topicMap.set(t.id, cloneNode(t));
                unitMap.set(u.id, { ...prev, children: Array.from(topicMap.values()) });
            }
            programMap.set(program.id, { ...existing, children: Array.from(unitMap.values()) });
        }
    }
    const merged = Array.from(programMap.values());
    return merged.length ? merged : getFullCurriculumTree();
}
function resolveCurriculumLabels(programId, unitId, topicId) {
    if (!programId)
        return {};
    const normalized = (0, curriculumIds_1.normalizeProgramId)(programId);
    const program = findProgram(normalized);
    const unit = unitId ? findUnit(normalized, unitId) : undefined;
    const topic = unitId && topicId ? findTopic(normalized, unitId, topicId) : undefined;
    return {
        program: program?.label,
        unit: unit?.label,
        topic: topic?.label,
    };
}
function attachCurriculumLabels(record) {
    return {
        ...record,
        curriculumLabels: resolveCurriculumLabels(record.curriculumProgram, record.curriculumUnit, record.curriculumTopic),
    };
}
function mapProgressDocsWithLabels(docs) {
    return docs.map((doc) => {
        const plain = typeof doc.toObject === "function"
            ? doc.toObject()
            : doc;
        return attachCurriculumLabels(plain);
    });
}
function mapAssignmentLabels(assignments) {
    if (!assignments?.length)
        return [];
    return assignments.map((a) => ({
        programId: a.programId,
        unitId: a.unitId,
        topicId: a.topicId,
        completed: Boolean(a.completed),
        completedAt: a.completedAt?.toISOString(),
        curriculumLabels: resolveCurriculumLabels(a.programId, a.unitId, a.topicId),
    }));
}
function isValidCurriculumPath(programId, unitId, topicId) {
    const normalized = (0, curriculumIds_1.normalizeProgramId)(programId);
    const program = findProgram(normalized);
    if (!program)
        return false;
    if (!unitId)
        return true;
    const unit = findUnit(normalized, unitId);
    if (!unit)
        return false;
    if (!topicId)
        return true;
    return Boolean(findTopic(normalized, unitId, topicId));
}
/** Requires unit/topic when the tree has deeper levels (matches portal pathReadyToSave). */
function isCurriculumPathComplete(programId, unitId, topicId) {
    const program = findProgram(programId);
    if (!program)
        return false;
    const units = program.children ?? [];
    if (units.length > 0 && !unitId)
        return false;
    if (!unitId)
        return true;
    const unit = findUnit(programId, unitId);
    if (!unit)
        return false;
    const topics = unit.children ?? [];
    if (topics.length > 0 && !topicId)
        return false;
    return true;
}
function pathAllowedForAssignments(programId, unitId, topicId, assignments) {
    if (!isValidCurriculumPath(programId, unitId, topicId))
        return false;
    if (!assignments?.length)
        return true;
    return assignments.some((a) => {
        if (!assignmentProgramMatches(a.programId, programId))
            return false;
        if (a.topicId)
            return a.topicId === topicId;
        if (a.unitId) {
            if (a.unitId !== unitId)
                return false;
            return !topicId || Boolean(findTopic(programId, unitId, topicId));
        }
        return true;
    });
}
async function validateHomeworkCurriculumForClass(classId, programId, unitId, topicId) {
    if (!isCurriculumPathComplete(programId, unitId, topicId))
        return false;
    if (!isValidCurriculumPath(programId, unitId, topicId))
        return false;
    const classDoc = await Class_1.Class.findById(classId).select("students");
    if (!classDoc?.students?.length)
        return true;
    const students = await User_1.User.find({
        _id: { $in: classDoc.students },
        role: "student",
    }).select("curriculumAssignments");
    if (students.every((s) => !(s.curriculumAssignments?.length)))
        return true;
    return students.every((s) => pathAllowedForAssignments(programId, unitId, topicId, s.curriculumAssignments));
}
async function validateCurriculumForStudent(studentId, programId, unitId, topicId) {
    if (!isValidCurriculumPath(programId, unitId, topicId))
        return false;
    const student = await User_1.User.findOne({ _id: studentId, role: "student" }).select("curriculumAssignments");
    if (!student)
        return false;
    if (!student.curriculumAssignments?.length)
        return true;
    return pathAllowedForAssignments(programId, unitId, topicId, student.curriculumAssignments);
}
function parseCurriculumAssignments(raw) {
    if (raw === undefined)
        return null;
    if (!Array.isArray(raw))
        return null;
    const parsed = [];
    for (const item of raw) {
        if (!item || typeof item !== "object")
            continue;
        const programId = item.programId;
        if (typeof programId !== "string" || !findProgram(programId))
            continue;
        const normalizedProgram = (0, curriculumIds_1.normalizeProgramId)(programId);
        const unitId = item.unitId;
        const topicId = item.topicId;
        if (unitId && !findUnit(normalizedProgram, unitId))
            continue;
        if (topicId && (!unitId || !findTopic(normalizedProgram, unitId, topicId)))
            continue;
        parsed.push({
            programId: normalizedProgram,
            unitId: unitId || undefined,
            topicId: topicId || undefined,
            completed: Boolean(item.completed),
            completedAt: item.completedAt
                ? new Date(item.completedAt)
                : undefined,
        });
    }
    return parsed;
}
