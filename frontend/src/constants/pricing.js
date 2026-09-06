export const FREE = { workspace: 1, project: 3, member: 5 };

export const PRICE = { workspace: 10, project: 3, member: 1, business: 50 };

export const YEARLY_DISCOUNT = 0.15;

export const STORAGE_BASE_GB = 5;
export const STORAGE_USD_PER_GB = 0.1;

export const SLOT_PRODUCT_CODES = {
  workspace: "WORKSPACE",
  project: "PROJECT",
  member: "WORKSPACEMEMBER",
};

export const CALCULATOR_SLIDERS = {
  workspaces: { min: 1, max: 10, default: 1 },
  projects: { min: 1, max: 50, default: 5 },
  members: { min: 1, max: 200, default: 15 },
  storageGb: { min: 0, max: 50, default: 4, step: 0.1 },
};

export function billableSlotCount(total, freeCount) {
  return Math.max(0, Number(total) - Number(freeCount || 0));
}

export function extraStorageGb(usedGbList) {
  const extra = usedGbList.reduce((sum, gb) => {
    const used = Number(gb);
    const n = Number.isFinite(used) ? used : 0;
    return sum + Math.max(0, n - STORAGE_BASE_GB);
  }, 0);
  return Math.round(extra * 10) / 10;
}

export function extraStorageGbUniform(workspaceCount, usedGb) {
  const extraPer = Math.max(0, (Number(usedGb) || 0) - STORAGE_BASE_GB);
  return Math.round(extraPer * Math.max(0, Number(workspaceCount) || 0) * 10) / 10;
}

export function storageUsd(usedGbList) {
  return Math.round(extraStorageGb(usedGbList) * STORAGE_USD_PER_GB * 100) / 100;
}

export function storageUsdUniform(workspaceCount, usedGb) {
  return Math.round(extraStorageGbUniform(workspaceCount, usedGb) * STORAGE_USD_PER_GB * 100) / 100;
}

export function slotUnitPrice(key) {
  const value = PRICE[key];
  return typeof value === "number" ? value : null;
}

export function buildMonthlyProductCode(key) {
  const codeName = SLOT_PRODUCT_CODES[key];
  if (!codeName) return "";
  return `${codeName}_MONTHLY_${new Date().getFullYear()}`;
}
