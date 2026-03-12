export const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

export const parseBooleanQuery = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;
  return null;
};

export const normalizeUpper = (value) => String(value || "").trim().toUpperCase();
