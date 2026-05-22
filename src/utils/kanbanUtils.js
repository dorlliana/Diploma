// src/utils/kanbanUtils.js

// Знаходить батьківський елемент у структурі
export const findParent = (nodes, childId) => {
  return nodes.find(node => node.children?.includes(childId));
};

// Обчислює глибину вузла у дереві
export const getDepth = (nodes, nodeId, depth = 0) => {
  const parent = findParent(nodes, nodeId);
  if (!parent) return depth;
  return getDepth(nodes, parent.id, depth + 1);
};
