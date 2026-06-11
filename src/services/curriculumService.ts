import { Types } from "mongoose";
import { CurriculumNode } from "../data/curriculumTree";
import { Class } from "../models/Class";
import { User, ICurriculumAssignment } from "../models/User";
import { getActiveCurriculumTree } from "./curriculumStore";

export function getFullCurriculumTree(): CurriculumNode[] {
  return getActiveCurriculumTree();
}

export function findProgram(programId: string): CurriculumNode | undefined {
  return getActiveCurriculumTree().find((p) => p.id === programId);
}

export function findUnit(programId: string, unitId: string): CurriculumNode | undefined {
  return findProgram(programId)?.children?.find((u) => u.id === unitId);
}

export function findTopic(
  programId: string,
  unitId: string,
  topicId: string
): CurriculumNode | undefined {
  return findUnit(programId, unitId)?.children?.find((t) => t.id === topicId);
}

function cloneNode(node: CurriculumNode): CurriculumNode {
  return {
    id: node.id,
    label: node.label,
    labelBn: node.labelBn,
    children: node.children?.map(cloneNode),
  };
}

function filterProgramByAssignment(
  program: CurriculumNode,
  assignment: ICurriculumAssignment
): CurriculumNode | null {
  if (assignment.programId !== program.id) return null;

  if (!assignment.unitId) {
    return cloneNode(program);
  }

  const unit = program.children?.find((u) => u.id === assignment.unitId);
  if (!unit) return null;

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
  if (!topic) return null;

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

export function filterTreeForAssignments(
  assignments: ICurriculumAssignment[] | undefined | null
): CurriculumNode[] {
  if (!assignments?.length) {
    return getFullCurriculumTree();
  }

  const merged = new Map<string, CurriculumNode>();

  for (const assignment of assignments) {
    const program = findProgram(assignment.programId);
    if (!program) continue;

    const filtered = filterProgramByAssignment(program, assignment);
    if (!filtered) continue;

    const existing = merged.get(program.id);
    if (!existing) {
      merged.set(program.id, filtered);
      continue;
    }

    const unitMap = new Map<string, CurriculumNode>();
    for (const unit of existing.children ?? []) {
      unitMap.set(unit.id, cloneNode(unit));
    }
    for (const unit of filtered.children ?? []) {
      const prev = unitMap.get(unit.id);
      if (!prev) {
        unitMap.set(unit.id, cloneNode(unit));
        continue;
      }
      const topicMap = new Map<string, CurriculumNode>();
      for (const t of prev.children ?? []) topicMap.set(t.id, cloneNode(t));
      for (const t of unit.children ?? []) topicMap.set(t.id, cloneNode(t));
      unitMap.set(unit.id, { ...prev, children: Array.from(topicMap.values()) });
    }
    merged.set(program.id, { ...existing, children: Array.from(unitMap.values()) });
  }

  return Array.from(merged.values());
}

export async function getCurriculumOptionsForClass(
  classId: string
): Promise<CurriculumNode[]> {
  if (!Types.ObjectId.isValid(classId)) return getFullCurriculumTree();

  const classDoc = await Class.findById(classId).select("students");
  if (!classDoc?.students?.length) return getFullCurriculumTree();

  const students = await User.find({
    _id: { $in: classDoc.students },
    role: "student",
  }).select("curriculumAssignments");

  if (students.length === 0) return getFullCurriculumTree();

  const trees = students.map((s) =>
    filterTreeForAssignments(s.curriculumAssignments ?? [])
  );

  const programMap = new Map<string, CurriculumNode>();
  for (const tree of trees) {
    for (const program of tree) {
      const existing = programMap.get(program.id);
      if (!existing) {
        programMap.set(program.id, cloneNode(program));
        continue;
      }
      const unitMap = new Map<string, CurriculumNode>();
      for (const u of existing.children ?? []) unitMap.set(u.id, cloneNode(u));
      for (const u of program.children ?? []) {
        const prev = unitMap.get(u.id);
        if (!prev) {
          unitMap.set(u.id, cloneNode(u));
          continue;
        }
        const topicMap = new Map<string, CurriculumNode>();
        for (const t of prev.children ?? []) topicMap.set(t.id, cloneNode(t));
        for (const t of u.children ?? []) topicMap.set(t.id, cloneNode(t));
        unitMap.set(u.id, { ...prev, children: Array.from(topicMap.values()) });
      }
      programMap.set(program.id, { ...existing, children: Array.from(unitMap.values()) });
    }
  }

  const merged = Array.from(programMap.values());
  return merged.length ? merged : getFullCurriculumTree();
}

export function resolveCurriculumLabels(
  programId?: string,
  unitId?: string,
  topicId?: string
): { program?: string; unit?: string; topic?: string } {
  if (!programId) return {};
  const program = findProgram(programId);
  const unit = unitId ? findUnit(programId, unitId) : undefined;
  const topic =
    unitId && topicId ? findTopic(programId, unitId, topicId) : undefined;
  return {
    program: program?.label,
    unit: unit?.label,
    topic: topic?.label,
  };
}

export function attachCurriculumLabels<
  T extends {
    curriculumProgram?: string;
    curriculumUnit?: string;
    curriculumTopic?: string;
  },
>(
  record: T
): T & { curriculumLabels: ReturnType<typeof resolveCurriculumLabels> } {
  return {
    ...record,
    curriculumLabels: resolveCurriculumLabels(
      record.curriculumProgram,
      record.curriculumUnit,
      record.curriculumTopic
    ),
  };
}

export function mapProgressDocsWithLabels<
  T extends {
    toObject?: () => Record<string, unknown>;
    curriculumProgram?: string;
    curriculumUnit?: string;
    curriculumTopic?: string;
  },
>(docs: T[]) {
  return docs.map((doc) => {
    const plain =
      typeof doc.toObject === "function"
        ? (doc.toObject() as T & Record<string, unknown>)
        : doc;
    return attachCurriculumLabels(plain);
  });
}

export function mapAssignmentLabels(
  assignments: ICurriculumAssignment[] | undefined | null
) {
  if (!assignments?.length) return [];
  return assignments.map((a) => ({
    programId: a.programId,
    unitId: a.unitId,
    topicId: a.topicId,
    completed: Boolean(a.completed),
    completedAt: a.completedAt?.toISOString(),
    curriculumLabels: resolveCurriculumLabels(a.programId, a.unitId, a.topicId),
  }));
}

export function isValidCurriculumPath(
  programId: string,
  unitId?: string,
  topicId?: string
): boolean {
  const program = findProgram(programId);
  if (!program) return false;
  if (!unitId) return true;
  const unit = findUnit(programId, unitId);
  if (!unit) return false;
  if (!topicId) return true;
  return Boolean(findTopic(programId, unitId, topicId));
}

export function pathAllowedForAssignments(
  programId: string,
  unitId: string | undefined,
  topicId: string | undefined,
  assignments: ICurriculumAssignment[] | undefined | null
): boolean {
  if (!isValidCurriculumPath(programId, unitId, topicId)) return false;
  if (!assignments?.length) return true;

  return assignments.some((a) => {
    if (a.programId !== programId) return false;
    if (a.topicId) return a.topicId === topicId;
    if (a.unitId) {
      if (a.unitId !== unitId) return false;
      return !topicId || Boolean(findTopic(programId, unitId!, topicId));
    }
    return true;
  });
}

export async function validateHomeworkCurriculumForClass(
  classId: string,
  programId: string,
  unitId?: string,
  topicId?: string
): Promise<boolean> {
  if (!isValidCurriculumPath(programId, unitId, topicId)) return false;

  const classDoc = await Class.findById(classId).select("students");
  if (!classDoc?.students?.length) return true;

  const students = await User.find({
    _id: { $in: classDoc.students },
    role: "student",
  }).select("curriculumAssignments");

  if (students.every((s) => !(s.curriculumAssignments?.length))) return true;

  return students.every((s) =>
    pathAllowedForAssignments(
      programId,
      unitId,
      topicId,
      s.curriculumAssignments
    )
  );
}

export async function validateCurriculumForStudent(
  studentId: string,
  programId: string,
  unitId?: string,
  topicId?: string
): Promise<boolean> {
  if (!isValidCurriculumPath(programId, unitId, topicId)) return false;
  const student = await User.findOne({ _id: studentId, role: "student" }).select(
    "curriculumAssignments"
  );
  if (!student) return false;
  if (!student.curriculumAssignments?.length) return true;
  return pathAllowedForAssignments(
    programId,
    unitId,
    topicId,
    student.curriculumAssignments
  );
}

export function parseCurriculumAssignments(raw: unknown): ICurriculumAssignment[] | null {
  if (raw === undefined) return null;
  if (!Array.isArray(raw)) return null;

  const parsed: ICurriculumAssignment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const programId = (item as { programId?: string }).programId;
    if (typeof programId !== "string" || !findProgram(programId)) continue;
    const unitId = (item as { unitId?: string }).unitId;
    const topicId = (item as { topicId?: string }).topicId;
    if (unitId && !findUnit(programId, unitId)) continue;
    if (topicId && (!unitId || !findTopic(programId, unitId, topicId))) continue;
    parsed.push({
      programId,
      unitId: unitId || undefined,
      topicId: topicId || undefined,
      completed: Boolean((item as { completed?: boolean }).completed),
      completedAt: (item as { completedAt?: string | Date }).completedAt
        ? new Date((item as { completedAt: string | Date }).completedAt)
        : undefined,
    });
  }
  return parsed;
}
