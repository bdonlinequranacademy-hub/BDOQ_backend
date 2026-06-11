import { CURRICULUM_PROGRAMS, CurriculumNode } from "../data/curriculumTree";
import { CurriculumConfig } from "../models/CurriculumConfig";

const CONFIG_KEY = "default";

let activeTree: CurriculumNode[] = [...CURRICULUM_PROGRAMS];

function cloneTree(nodes: CurriculumNode[]): CurriculumNode[] {
  return nodes.map((node) => ({
    id: node.id,
    label: node.label,
    labelBn: node.labelBn,
    children: node.children ? cloneTree(node.children) : undefined,
  }));
}

export function getActiveCurriculumTree(): CurriculumNode[] {
  return activeTree;
}

export async function refreshCurriculumTree(): Promise<CurriculumNode[]> {
  const doc = await CurriculumConfig.findOne({ key: CONFIG_KEY });
  if (doc?.tree?.length) {
    activeTree = cloneTree(doc.tree as CurriculumNode[]);
  } else {
    activeTree = cloneTree(CURRICULUM_PROGRAMS);
    await CurriculumConfig.findOneAndUpdate(
      { key: CONFIG_KEY },
      { tree: activeTree },
      { upsert: true, new: true }
    );
  }
  return activeTree;
}

function collectIds(nodes: CurriculumNode[], ids = new Set<string>()): Set<string> {
  for (const node of nodes) {
    if (ids.has(node.id)) {
      throw new Error(`Duplicate curriculum id: ${node.id}`);
    }
    ids.add(node.id);
    if (node.children?.length) collectIds(node.children, ids);
  }
  return ids;
}

export function validateCurriculumTree(tree: unknown): CurriculumNode[] {
  if (!Array.isArray(tree) || tree.length === 0) {
    throw new Error("Tree must be a non-empty array");
  }

  const parsed = tree as CurriculumNode[];
  collectIds(parsed);

  function walk(nodes: CurriculumNode[], depth: number) {
    if (depth > 3) throw new Error("Curriculum tree max depth is 3");
    for (const node of nodes) {
      if (!node.id || !node.label) {
        throw new Error("Each node needs id and label");
      }
      if (node.children?.length) walk(node.children, depth + 1);
    }
  }
  walk(parsed, 1);
  return cloneTree(parsed);
}

export async function saveCurriculumTree(tree: CurriculumNode[]): Promise<CurriculumNode[]> {
  const validated = validateCurriculumTree(tree);
  await CurriculumConfig.findOneAndUpdate(
    { key: CONFIG_KEY },
    { tree: validated },
    { upsert: true, new: true }
  );
  activeTree = validated;
  return activeTree;
}
