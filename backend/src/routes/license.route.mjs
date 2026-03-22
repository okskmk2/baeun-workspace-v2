import express from "express";
import { randomUUID } from "crypto";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import { withPagination } from "../middlewares/pagination.middleware.mjs";
import { normalizeUpper, parseBooleanQuery, parsePositiveInt } from "../utils/parsers.mjs";

const router = express.Router();

const VALID_TARGET_RESOURCES = new Set(["WORKSPACE", "WORKSPACE_MEMBER", "PROJECT"]);
const VALID_BILLING_CYCLES = new Set(["LIFETIME", "MONTHLY", "YEARLY"]);
const VALID_CURRENCIES = new Set(["KRW", "USD"]);
const VALID_MANUAL_TARGET_TYPES = new Set(["MEMBER", "WORKSPACE"]);
const VALID_PURCHASED_LICENSE_STATUS = new Set(["ACTIVE", "EXPIRED", "CANCELED", "REFUNDED"]);

const normalizeDisplayName = (value) => {
  const normalized = String(value || "").trim();
  return normalized || null;
};

const parseDateInput = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const parseGracePeriodMonths = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
};

const attachSalesStats = async (licenseId) => {
  const statsRes = await pool.query(
    `SELECT
      COALESCE(SUM(pl.quantity), 0)::integer AS sold_quantity,
      COALESCE(SUM(CASE WHEN pl.status = 'ACTIVE' THEN pl.quantity ELSE 0 END), 0)::integer AS active_quantity,
      COALESCE(COUNT(pl.id), 0)::integer AS purchased_count
     FROM purchased_license pl
     WHERE pl.license_id = $1`,
    [licenseId]
  );

  return statsRes.rows[0] || { sold_quantity: 0, active_quantity: 0, purchased_count: 0 };
};

router.get("/", isAuth, withPagination({ defaultPageSize: 10, maxPageSize: 100 }), async (req, res) => {
  const targetResource = normalizeUpper(req.query.targetResource);
  const billingCycle = normalizeUpper(req.query.billingCycle);
  const activeOnly = parseBooleanQuery(req.query.activeOnly);
  const { hasPageQuery: hasPaginationQuery, page, pageSize } = req.pagination;

  if (targetResource && !VALID_TARGET_RESOURCES.has(targetResource)) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid targetResource." });
  }

  if (billingCycle && !VALID_BILLING_CYCLES.has(billingCycle)) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid billingCycle." });
  }

  try {
    const conditions = [];
    const values = [];

    if (targetResource) {
      values.push(targetResource);
      conditions.push(`l.target_resource = $${values.length}`);
    }

    if (billingCycle) {
      values.push(billingCycle);
      conditions.push(`l.billing_cycle = $${values.length}`);
    }

    if (activeOnly !== null) {
      values.push(activeOnly);
      conditions.push(`l.is_active = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    if (hasPaginationQuery) {
      const totalRes = await pool.query(
        `SELECT COUNT(*)::integer AS total
         FROM license l
         ${whereClause}`,
        values
      );

      const total = Number(totalRes.rows?.[0]?.total || 0);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const normalizedPage = Math.min(Math.max(page, 1), totalPages);
      const offset = (normalizedPage - 1) * pageSize;

      const pagedValues = [...values, pageSize, offset];
      const limitParam = `$${pagedValues.length - 1}`;
      const offsetParam = `$${pagedValues.length}`;

      const result = await pool.query(
        `SELECT
          l.*,
          COALESCE(NULLIF(l.name, ''), l.name_i18n_key) AS display_name,
          COALESCE(SUM(pl.quantity), 0)::integer AS sold_quantity,
          COALESCE(SUM(CASE WHEN pl.status = 'ACTIVE' THEN pl.quantity ELSE 0 END), 0)::integer AS active_quantity,
          COALESCE(COUNT(pl.id), 0)::integer AS purchased_count
        FROM license l
        LEFT JOIN purchased_license pl ON pl.license_id = l.id
        ${whereClause}
        GROUP BY l.id
        ORDER BY l.id DESC
        LIMIT ${limitParam}
        OFFSET ${offsetParam}`,
        pagedValues
      );

      return res.json({
        items: result.rows,
        pagination: {
          page: normalizedPage,
          pageSize,
          total,
          totalPages,
        },
      });
    }

    const result = await pool.query(
      `SELECT
        l.*,
        COALESCE(NULLIF(l.name, ''), l.name_i18n_key) AS display_name,
        COALESCE(SUM(pl.quantity), 0)::integer AS sold_quantity,
        COALESCE(SUM(CASE WHEN pl.status = 'ACTIVE' THEN pl.quantity ELSE 0 END), 0)::integer AS active_quantity,
        COALESCE(COUNT(pl.id), 0)::integer AS purchased_count
      FROM license l
      LEFT JOIN purchased_license pl ON pl.license_id = l.id
      ${whereClause}
      GROUP BY l.id
      ORDER BY l.id DESC`,
      values
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get(
  "/manual/users",
  isAuth,
  withPagination({ defaultPageSize: 10, maxPageSize: 100 }),
  async (req, res) => {
    const keyword = String(req.query.q || "").trim();
    const { page, pageSize } = req.pagination;

    try {
      const values = [];
      let whereClause = "";

      if (keyword) {
        values.push(`%${keyword}%`);
        whereClause = `WHERE m.name ILIKE $${values.length} OR m.email ILIKE $${values.length}`;
      }

      const totalRes = await pool.query(
        `SELECT COUNT(*)::integer AS total
         FROM member m
         ${whereClause}`,
        values
      );

      const total = Number(totalRes.rows?.[0]?.total || 0);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const normalizedPage = Math.min(Math.max(page, 1), totalPages);
      const offset = (normalizedPage - 1) * pageSize;

      const listValues = [...values, pageSize, offset];
      const limitParam = `$${listValues.length - 1}`;
      const offsetParam = `$${listValues.length}`;

      const result = await pool.query(
        `SELECT
          m.id,
          m.name,
          m.email,
          m.role_name,
          m.created_at,
          COALESCE(SUM(CASE WHEN pl.status = 'ACTIVE' THEN pl.quantity ELSE 0 END), 0)::integer AS active_license_quantity
        FROM member m
        LEFT JOIN purchased_license pl ON pl.owner_member_id = m.id
        ${whereClause}
        GROUP BY m.id
        ORDER BY m.id DESC
        LIMIT ${limitParam}
        OFFSET ${offsetParam}`,
        listValues
      );

      return res.json({
        items: result.rows,
        pagination: {
          page: normalizedPage,
          pageSize,
          total,
          totalPages,
        },
      });
    } catch (error) {
      return res.status(500).json({ name: "InternalServerError", message: error.message });
    }
  }
);

router.get(
  "/manual/workspaces",
  isAuth,
  withPagination({ defaultPageSize: 10, maxPageSize: 100 }),
  async (req, res) => {
    const keyword = String(req.query.q || "").trim();
    const { page, pageSize } = req.pagination;

    try {
      const values = [];
      let whereClause = "";

      if (keyword) {
        values.push(`%${keyword}%`);
        whereClause = `WHERE w.name ILIKE $${values.length}`;
      }

      const totalRes = await pool.query(
        `SELECT COUNT(*)::integer AS total
         FROM workspace w
         ${whereClause}`,
        values
      );

      const total = Number(totalRes.rows?.[0]?.total || 0);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const normalizedPage = Math.min(Math.max(page, 1), totalPages);
      const offset = (normalizedPage - 1) * pageSize;

      const listValues = [...values, pageSize, offset];
      const limitParam = `$${listValues.length - 1}`;
      const offsetParam = `$${listValues.length}`;

      const result = await pool.query(
        `SELECT
          w.id,
          w.name,
          w.member_id,
          owner.name AS owner_name,
          COALESCE(COUNT(DISTINCT wm.id), 0)::integer AS member_count,
          COALESCE(SUM(CASE WHEN pl.status = 'ACTIVE' THEN pl.quantity ELSE 0 END), 0)::integer AS active_license_quantity
        FROM workspace w
        LEFT JOIN member owner ON owner.id = w.member_id
        LEFT JOIN workspace_member wm ON wm.workspace_id = w.id
        LEFT JOIN purchased_license pl ON pl.target_workspace_id = w.id
        ${whereClause}
        GROUP BY w.id, owner.name
        ORDER BY w.id DESC
        LIMIT ${limitParam}
        OFFSET ${offsetParam}`,
        listValues
      );

      return res.json({
        items: result.rows,
        pagination: {
          page: normalizedPage,
          pageSize,
          total,
          totalPages,
        },
      });
    } catch (error) {
      return res.status(500).json({ name: "InternalServerError", message: error.message });
    }
  }
);

router.post("/manual/assign", isAuth, async (req, res) => {
  const licenseId = parsePositiveInt(req.body.license_id);
  const targetType = normalizeUpper(req.body.target_type);
  const targetId = parsePositiveInt(req.body.target_id);
  const quantity = parsePositiveInt(req.body.quantity) || 1;
  const status = normalizeUpper(req.body.status || "ACTIVE");
  const startDate = parseDateInput(req.body.start_date);
  const endDate = parseDateInput(req.body.end_date);

  if (!licenseId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid license_id." });
  }

  if (!VALID_MANUAL_TARGET_TYPES.has(targetType)) {
    return res.status(400).json({ name: "BadRequest", message: "target_type must be MEMBER or WORKSPACE." });
  }

  if (!targetId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid target_id." });
  }

  if (!VALID_PURCHASED_LICENSE_STATUS.has(status)) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid status." });
  }

  if (endDate && startDate && endDate.getTime() < startDate.getTime()) {
    return res.status(400).json({ name: "BadRequest", message: "end_date must be later than start_date." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const licenseRes = await client.query("SELECT * FROM license WHERE id = $1", [licenseId]);
    if (licenseRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ name: "NotFound", message: "License not found." });
    }

    const license = licenseRes.rows[0];
    if (!license.is_active) {
      await client.query("ROLLBACK");
      return res.status(400).json({ name: "BadRequest", message: "Inactive license cannot be assigned." });
    }

    const resourceType = String(license.target_resource || "").toUpperCase();
    if (targetType === "MEMBER" && resourceType !== "WORKSPACE") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        name: "BadRequest",
        message: "MEMBER assignment supports WORKSPACE resource license only.",
      });
    }

    if (targetType === "WORKSPACE" && !["PROJECT", "WORKSPACE_MEMBER"].includes(resourceType)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        name: "BadRequest",
        message: "WORKSPACE assignment supports PROJECT/WORKSPACE_MEMBER resource license only.",
      });
    }

    if (targetType === "MEMBER") {
      const memberRes = await client.query("SELECT id, name, email FROM member WHERE id = $1", [targetId]);
      if (memberRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ name: "NotFound", message: "Member not found." });
      }
    }

    if (targetType === "WORKSPACE") {
      const workspaceRes = await client.query("SELECT id, name FROM workspace WHERE id = $1", [targetId]);
      if (workspaceRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ name: "NotFound", message: "Workspace not found." });
      }
    }

    const paymentRes = await client.query(
      `INSERT INTO payment (member_id, total_amount, status, pg_transaction_id)
       VALUES ($1, 0, 'SUCCESS', $2)
       RETURNING id`,
      [req.session.userId, `MANUAL-${randomUUID()}`]
    );

    const paymentId = paymentRes.rows[0].id;
    const insertRes = await client.query(
      `INSERT INTO purchased_license (
        payment_id,
        license_id,
        owner_member_id,
        target_workspace_id,
        quantity,
        status,
        start_date,
        end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, CURRENT_TIMESTAMP), $8)
      RETURNING *`,
      [
        paymentId,
        licenseId,
        targetType === "MEMBER" ? targetId : null,
        targetType === "WORKSPACE" ? targetId : null,
        quantity,
        status,
        startDate ? startDate.toISOString() : null,
        endDate ? endDate.toISOString() : null,
      ]
    );

    await client.query("COMMIT");
    return res.status(201).json({
      message: "License assigned manually.",
      assignment: insertRes.rows[0],
      license: {
        id: license.id,
        target_resource: license.target_resource,
        billing_cycle: license.billing_cycle,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

router.get("/:licenseId", isAuth, async (req, res) => {
  const licenseId = parsePositiveInt(req.params.licenseId);
  if (!licenseId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid licenseId." });
  }

  try {
    const licenseRes = await pool.query("SELECT * FROM license WHERE id = $1", [licenseId]);
    if (licenseRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "License not found." });
    }

    const stats = await attachSalesStats(licenseId);
    res.json({
      ...licenseRes.rows[0],
      display_name:
        String(licenseRes.rows[0]?.name || "").trim() || String(licenseRes.rows[0]?.name_i18n_key || ""),
      ...stats,
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.post("/", isAuth, async (req, res) => {
  const targetResource = normalizeUpper(req.body.target_resource);
  const billingCycle = normalizeUpper(req.body.billing_cycle);
  const currency = normalizeUpper(req.body.currency || "KRW");
  const name = normalizeDisplayName(req.body.name);
  const nameI18nKey = normalizeDisplayName(req.body.name_i18n_key);
  const price = Number(req.body.price);
  const gracePeriodMonths = parseGracePeriodMonths(req.body.grace_period_months);
  const isActive = req.body.is_active === undefined ? true : Boolean(req.body.is_active);

  if (!VALID_TARGET_RESOURCES.has(targetResource)) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid target_resource." });
  }

  if (!VALID_BILLING_CYCLES.has(billingCycle)) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid billing_cycle." });
  }

  if (!VALID_CURRENCIES.has(currency)) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid currency." });
  }

  if (!name && !nameI18nKey) {
    return res.status(400).json({ name: "BadRequest", message: "Either name or name_i18n_key is required." });
  }

  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({ name: "BadRequest", message: "price must be a non-negative number." });
  }

  if (gracePeriodMonths === null) {
    return res.status(400).json({ name: "BadRequest", message: "grace_period_months must be a non-negative integer." });
  }

  try {
    const insertRes = await pool.query(
      `INSERT INTO license (
        target_resource,
        billing_cycle,
        grace_period_months,
        price,
        currency,
        name,
        name_i18n_key,
        is_active
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        targetResource,
        billingCycle,
        gracePeriodMonths,
        price,
        currency,
        name || nameI18nKey,
        nameI18nKey,
        isActive,
      ]
    );

    const created = insertRes.rows[0];
    res.status(201).json({
      ...created,
      display_name: String(created?.name || "").trim() || String(created?.name_i18n_key || ""),
      sold_quantity: 0,
      active_quantity: 0,
      purchased_count: 0,
    });
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({
        name: "Conflict",
        message: "A license with the same target_resource, billing_cycle, and currency already exists.",
      });
    }

    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.patch("/:licenseId", isAuth, async (req, res) => {
  const licenseId = parsePositiveInt(req.params.licenseId);
  if (!licenseId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid licenseId." });
  }

  const updates = [];
  const values = [];

  if (req.body.target_resource !== undefined) {
    const targetResource = normalizeUpper(req.body.target_resource);
    if (!VALID_TARGET_RESOURCES.has(targetResource)) {
      return res.status(400).json({ name: "BadRequest", message: "Invalid target_resource." });
    }
    values.push(targetResource);
    updates.push(`target_resource = $${values.length}`);
  }

  if (req.body.billing_cycle !== undefined) {
    const billingCycle = normalizeUpper(req.body.billing_cycle);
    if (!VALID_BILLING_CYCLES.has(billingCycle)) {
      return res.status(400).json({ name: "BadRequest", message: "Invalid billing_cycle." });
    }
    values.push(billingCycle);
    updates.push(`billing_cycle = $${values.length}`);
  }

  if (req.body.price !== undefined) {
    const price = Number(req.body.price);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ name: "BadRequest", message: "price must be a non-negative number." });
    }
    values.push(price);
    updates.push(`price = $${values.length}`);
  }

  if (req.body.grace_period_months !== undefined) {
    const gracePeriodMonths = parseGracePeriodMonths(req.body.grace_period_months);
    if (gracePeriodMonths === null) {
      return res.status(400).json({
        name: "BadRequest",
        message: "grace_period_months must be a non-negative integer.",
      });
    }
    values.push(gracePeriodMonths);
    updates.push(`grace_period_months = $${values.length}`);
  }

  if (req.body.currency !== undefined) {
    const currency = normalizeUpper(req.body.currency);
    if (!VALID_CURRENCIES.has(currency)) {
      return res.status(400).json({ name: "BadRequest", message: "Invalid currency." });
    }
    values.push(currency);
    updates.push(`currency = $${values.length}`);
  }

  if (req.body.name_i18n_key !== undefined) {
    const nameI18nKey = normalizeDisplayName(req.body.name_i18n_key);
    values.push(nameI18nKey);
    updates.push(`name_i18n_key = $${values.length}`);
  }

  if (req.body.name !== undefined) {
    const name = normalizeDisplayName(req.body.name);
    values.push(name);
    updates.push(`name = $${values.length}`);
  }

  if (req.body.is_active !== undefined) {
    values.push(Boolean(req.body.is_active));
    updates.push(`is_active = $${values.length}`);
  }

  if (updates.length === 0) {
    return res.status(400).json({ name: "BadRequest", message: "No fields to update." });
  }

  values.push(licenseId);

  try {
    const result = await pool.query(
      `UPDATE license
       SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "License not found." });
    }

    const stats = await attachSalesStats(licenseId);
    res.json({
      ...result.rows[0],
      display_name:
        String(result.rows[0]?.name || "").trim() || String(result.rows[0]?.name_i18n_key || ""),
      ...stats,
    });
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({
        name: "Conflict",
        message: "A license with the same target_resource, billing_cycle, and currency already exists.",
      });
    }

    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.delete("/:licenseId", isAuth, async (req, res) => {
  const licenseId = parsePositiveInt(req.params.licenseId);
  if (!licenseId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid licenseId." });
  }

  try {
    const result = await pool.query(
      `UPDATE license
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [licenseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "License not found." });
    }

    const stats = await attachSalesStats(licenseId);
    res.json({
      ...result.rows[0],
      display_name:
        String(result.rows[0]?.name || "").trim() || String(result.rows[0]?.name_i18n_key || ""),
      ...stats,
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get("/:licenseId/usage", isAuth, async (req, res) => {
  const licenseId = parsePositiveInt(req.params.licenseId);
  if (!licenseId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid licenseId." });
  }

  try {
    const licenseRes = await pool.query("SELECT * FROM license WHERE id = $1", [licenseId]);
    if (licenseRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "License not found." });
    }

    const license = licenseRes.rows[0];
    const targetResource = String(license.target_resource || "").toUpperCase();

    if (targetResource === "WORKSPACE") {
      const usageRes = await pool.query(
        `SELECT
          pl.id AS purchased_license_id,
          pl.status,
          pl.quantity,
          pl.start_date,
          pl.end_date,
          pl.created_at,
          m.id AS member_id,
          m.name AS member_name,
          m.email AS member_email
         FROM purchased_license pl
         JOIN member m ON m.id = pl.owner_member_id
         WHERE pl.license_id = $1
           AND pl.owner_member_id IS NOT NULL
         ORDER BY pl.created_at DESC`,
        [licenseId]
      );

      return res.json({ license, usage_type: "WORKSPACE_PURCHASERS", items: usageRes.rows });
    }

    if (targetResource === "PROJECT") {
      const usageRes = await pool.query(
        `SELECT
          pl.id AS purchased_license_id,
          pl.status,
          pl.quantity,
          pl.start_date,
          pl.end_date,
          pl.created_at,
          w.id AS workspace_id,
          w.name AS workspace_name,
          owner.id AS owner_member_id,
          owner.name AS owner_name,
          owner.email AS owner_email
        FROM purchased_license pl
        JOIN workspace w ON w.id = pl.target_workspace_id
        LEFT JOIN member owner ON owner.id = w.member_id
        WHERE pl.license_id = $1
          AND pl.target_workspace_id IS NOT NULL
        ORDER BY pl.created_at DESC`,
        [licenseId]
      );

      return res.json({ license, usage_type: "PROJECT_WORKSPACE_PURCHASERS", items: usageRes.rows });
    }

    if (targetResource === "WORKSPACE_MEMBER") {
      const usageRes = await pool.query(
        `SELECT
          pl.id AS purchased_license_id,
          pl.status,
          pl.quantity,
          pl.start_date,
          pl.end_date,
          pl.created_at,
          w.id AS workspace_id,
          w.name AS workspace_name,
          owner.id AS owner_member_id,
          owner.name AS owner_name,
          owner.email AS owner_email
        FROM purchased_license pl
        JOIN workspace w ON w.id = pl.target_workspace_id
        LEFT JOIN member owner ON owner.id = w.member_id
        WHERE pl.license_id = $1
          AND pl.target_workspace_id IS NOT NULL
        ORDER BY pl.created_at DESC`,
        [licenseId]
      );

      return res.json({ license, usage_type: "WORKSPACE_MEMBER_WORKSPACE_PURCHASERS", items: usageRes.rows });
    }

    return res.status(400).json({ name: "BadRequest", message: "Unsupported target_resource." });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

export default router;
