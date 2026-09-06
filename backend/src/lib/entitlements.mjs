export const FREE_SLOTS = {
  WORKSPACE: 1,
  PROJECT: 3,
  WORKSPACE_MEMBER: 5,
};

const ACTIVE_LICENSE_SQL = `
  pl.status = 'ACTIVE'
  AND (pl.end_date IS NULL OR pl.end_date > CURRENT_TIMESTAMP)
`;

const packSlot = (resource, used, purchased, free) => {
  const safeUsed = Number(used) || 0;
  const safePurchased = Number(purchased) || 0;
  const safeFree = Number(free) || 0;
  const granted = safeFree + safePurchased;
  return {
    resource,
    used: safeUsed,
    purchased: safePurchased,
    free: safeFree,
    granted,
    remaining: granted - safeUsed,
  };
};

export const monthlyPurchasePath = (resource, workspaceId) => {
  const year = new Date().getFullYear();
  const code = resource === "WORKSPACE_MEMBER" ? "WORKSPACEMEMBER" : resource;
  const params = new URLSearchParams({
    productCode: `${code}_MONTHLY_${year}`,
  });
  if (workspaceId && resource !== "WORKSPACE") {
    params.set("workspaceId", String(workspaceId));
  }
  return `/store/cart?${params.toString()}`;
};

export const slotExhaustedBody = (resource, snapshot, workspaceId) => ({
  name: "PaymentRequired",
  code: "SLOT_EXHAUSTED",
  message: `No remaining ${resource} slots. Used ${snapshot.used} of ${snapshot.granted}.`,
  resource,
  used: snapshot.used,
  granted: snapshot.granted,
  remaining: snapshot.remaining,
  purchased: snapshot.purchased,
  free: snapshot.free,
  purchase_path: monthlyPurchasePath(resource, workspaceId),
});

export const sendSlotExhausted = (res, resource, snapshot, workspaceId) =>
  res.status(402).json(slotExhaustedBody(resource, snapshot, workspaceId));

export const getWorkspaceSlotsForMember = async (db, memberId) => {
  const purchasedRes = await db.query(
    `SELECT COALESCE(SUM(pl.quantity), 0)::integer AS purchased
     FROM purchased_license pl
     JOIN license l ON l.id = pl.license_id
     WHERE pl.owner_member_id = $1
       AND ${ACTIVE_LICENSE_SQL}
       AND l.target_resource = 'WORKSPACE'`,
    [memberId]
  );
  const usedRes = await db.query(
    `SELECT COUNT(*)::integer AS used
     FROM workspace_member
     WHERE member_id = $1
       AND role_name = 'OWNER'`,
    [memberId]
  );
  return packSlot(
    "WORKSPACE",
    usedRes.rows[0]?.used,
    purchasedRes.rows[0]?.purchased,
    FREE_SLOTS.WORKSPACE
  );
};

export const getWorkspaceResourceSlots = async (db, workspaceId, resource) => {
  const purchasedRes = await db.query(
    `SELECT COALESCE(SUM(pl.quantity), 0)::integer AS purchased
     FROM purchased_license pl
     JOIN license l ON l.id = pl.license_id
     WHERE pl.target_workspace_id = $1
       AND ${ACTIVE_LICENSE_SQL}
       AND l.target_resource = $2`,
    [workspaceId, resource]
  );

  const usedRes =
    resource === "PROJECT"
      ? await db.query(
          `SELECT COUNT(*)::integer AS used
           FROM project
           WHERE workspace_id = $1`,
          [workspaceId]
        )
      : await db.query(
          `SELECT COUNT(*)::integer AS used
           FROM workspace_member
           WHERE workspace_id = $1`,
          [workspaceId]
        );

  const free = resource === "PROJECT" ? FREE_SLOTS.PROJECT : FREE_SLOTS.WORKSPACE_MEMBER;
  return packSlot(resource, usedRes.rows[0]?.used, purchasedRes.rows[0]?.purchased, free);
};

export const getWorkspaceSlotBundle = async (db, workspaceId) => {
  const [project, member] = await Promise.all([
    getWorkspaceResourceSlots(db, workspaceId, "PROJECT"),
    getWorkspaceResourceSlots(db, workspaceId, "WORKSPACE_MEMBER"),
  ]);
  return { project, member };
};

export const getMemberEntitlements = async (db, memberId) => {
  const workspace = await getWorkspaceSlotsForMember(db, memberId);
  const memberships = await db.query(
    `SELECT w.id, w.name, wm.role_name
     FROM workspace w
     JOIN workspace_member wm ON wm.workspace_id = w.id
     WHERE wm.member_id = $1
     ORDER BY w.sort_order ASC, w.id DESC`,
    [memberId]
  );

  const workspaces = [];
  for (const row of memberships.rows) {
    const bundle = await getWorkspaceSlotBundle(db, row.id);
    workspaces.push({
      workspace_id: row.id,
      name: row.name,
      role_name: row.role_name,
      project: bundle.project,
      member: bundle.member,
    });
  }

  return { workspace, workspaces };
};
