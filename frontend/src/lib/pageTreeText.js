export const formatTreeLabel = (title, depth = 0) => {
  if (depth <= 0) return title;
  const indent = "\u00A0\u00A0\u00A0".repeat(depth - 1);
  return `${indent}└\u00A0\u00A0${title}`;
};

export const flattenPageTreeToOptions = (nodes) => {
  const bucket = [];

  const walk = (list, depth = 0) => {
    const validNodes = Array.isArray(list) ? list.filter((node) => node?.id) : [];

    validNodes.forEach((node) => {
      bucket.push({
        id: node.id,
        label: formatTreeLabel(node.title, depth),
      });

      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children, depth + 1);
      }
    });
  };

  walk(nodes);
  return bucket;
};
