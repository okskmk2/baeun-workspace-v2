export const monthlyProductCode = (resource) => {
  const code = resource === "WORKSPACE_MEMBER" ? "WORKSPACEMEMBER" : resource;
  return `${code}_MONTHLY_${new Date().getFullYear()}`;
};

export const monthlyCartTo = (resource, workspaceId) => {
  const query = { productCode: monthlyProductCode(resource) };
  if (workspaceId && resource !== "WORKSPACE") {
    query.workspaceId = String(workspaceId);
  }
  return { path: "/store/cart", query };
};

export const isSlotExhausted = (error) => error?.response?.data?.code === "SLOT_EXHAUSTED";

export const slotErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (data?.code === "SLOT_EXHAUSTED") {
    return data.message || fallback;
  }
  return data?.message || fallback;
};

export const emptySlot = (resource) => ({
  resource,
  used: 0,
  purchased: 0,
  free: 0,
  granted: 0,
  remaining: 0,
});
