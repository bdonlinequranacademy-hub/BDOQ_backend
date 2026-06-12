"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveCurriculumTree = getActiveCurriculumTree;
exports.refreshCurriculumTree = refreshCurriculumTree;
exports.validateCurriculumTree = validateCurriculumTree;
exports.saveCurriculumTree = saveCurriculumTree;
const curriculumTree_1 = require("../data/curriculumTree");
const CurriculumConfig_1 = require("../models/CurriculumConfig");
const CONFIG_KEY = "default";
let activeTree = [...curriculumTree_1.CURRICULUM_PROGRAMS];
function cloneTree(nodes) {
    return nodes.map((node) => ({
        id: node.id,
        label: node.label,
        labelBn: node.labelBn,
        children: node.children ? cloneTree(node.children) : undefined,
    }));
}
function getActiveCurriculumTree() {
    return activeTree;
}
async function refreshCurriculumTree() {
    const doc = await CurriculumConfig_1.CurriculumConfig.findOne({ key: CONFIG_KEY });
    if (doc?.tree?.length) {
        activeTree = cloneTree(doc.tree);
    }
    else {
        activeTree = cloneTree(curriculumTree_1.CURRICULUM_PROGRAMS);
        await CurriculumConfig_1.CurriculumConfig.findOneAndUpdate({ key: CONFIG_KEY }, { tree: activeTree }, { upsert: true, new: true });
    }
    return activeTree;
}
function collectIds(nodes, ids = new Set()) {
    for (const node of nodes) {
        if (ids.has(node.id)) {
            throw new Error(`Duplicate curriculum id: ${node.id}`);
        }
        ids.add(node.id);
        if (node.children?.length)
            collectIds(node.children, ids);
    }
    return ids;
}
function validateCurriculumTree(tree) {
    if (!Array.isArray(tree) || tree.length === 0) {
        throw new Error("Tree must be a non-empty array");
    }
    const parsed = tree;
    collectIds(parsed);
    function walk(nodes, depth) {
        if (depth > 3)
            throw new Error("Curriculum tree max depth is 3");
        for (const node of nodes) {
            if (!node.id || !node.label) {
                throw new Error("Each node needs id and label");
            }
            if (node.children?.length)
                walk(node.children, depth + 1);
        }
    }
    walk(parsed, 1);
    return cloneTree(parsed);
}
async function saveCurriculumTree(tree) {
    const validated = validateCurriculumTree(tree);
    await CurriculumConfig_1.CurriculumConfig.findOneAndUpdate({ key: CONFIG_KEY }, { tree: validated }, { upsert: true, new: true });
    activeTree = validated;
    return activeTree;
}
