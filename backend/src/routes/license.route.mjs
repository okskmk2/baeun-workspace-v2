import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import { withPagination } from "../middlewares/pagination.middleware.mjs";
import { normalizeUpper, parseBooleanQuery, parsePositiveInt } from "../utils/parsers.mjs";

const router = express.Router();

const VALID_TARGET_RESOURCES = new Set(["WORKSPACE", "WORKSPACE_MEMBER", "PROJECT"]);
const VALID_BILLING_CYCLES = new Set(["LIFETIME", "MONTHLY", "YEARLY"]);
const VALID_CURRENCIES = new Set(["KRW", "USD"]);

const normalizeDisplayName = (value) => {
  const normalized = String(value || "").trim();
  return normalized || null;
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

  try {
    const insertRes = await pool.query(
      `INSERT INTO license (target_resource, billing_cycle, price, currency, name, name_i18n_key, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [targetResource, billingCycle, price, currency, name || nameI18nKey, nameI18nKey, isActive]
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
          pl.owner_member_id,
          m.name AS owner_name,
          pl.target_workspace_id,
          w.name AS workspace_name
         FROM purchased_license pl
         LEFT JOIN member m ON m.id = pl.owner_member_id
         LEFT JOIN workspace w ON w.id = pl.target_workspace_id
         WHERE pl.license_id = $1
         ORDER BY pl.created_at DESC`,
        [licenseId]
      );

      return res.json({ license, usage_type: "WORKSPACE", items: usageRes.rows });
    }

    if (targetResource === "PROJECT") {
      const usageRes = await pool.query(
        `WITH workspace_capacity AS (
          SELECT
            pl.target_workspace_id AS workspace_id,
            COALESCE(SUM(pl.quantity), 0)::integer AS slot_capacity
          FROM purchased_license pl
          WHERE pl.license_id = $1
            AND pl.status = 'ACTIVE'
            AND pl.target_workspace_id IS NOT NULL
          GROUP BY pl.target_workspace_id
        ), ranked_projects AS (
          SELECT
            p.id AS project_id,
            p.name AS project_name,
            p.summary,
            p.workspace_id,
            w.name AS workspace_name,
            wc.slot_capacity,
            ROW_NUMBER() OVER (PARTITION BY p.workspace_id ORDER BY p.created_at ASC, p.id ASC) AS usage_order
          FROM project p
          JOIN workspace w ON w.id = p.workspace_id
          JOIN workspace_capacity wc ON wc.workspace_id = p.workspace_id
        )
        SELECT
          project_id,
          project_name,
          summary,
          workspace_id,
          workspace_name,
          slot_capacity,
          usage_order,
          (usage_order <= slot_capacity) AS is_covered
        FROM ranked_projects
        ORDER BY workspace_id ASC, usage_order ASC`,
        [licenseId]
      );

      return res.json({ license, usage_type: "PROJECT", items: usageRes.rows });
    }

    if (targetResource === "WORKSPACE_MEMBER") {
      const usageRes = await pool.query(
        `WITH workspace_capacity AS (
          SELECT
            pl.target_workspace_id AS workspace_id,
            COALESCE(SUM(pl.quantity), 0)::integer AS slot_capacity
          FROM purchased_license pl
          WHERE pl.license_id = $1
            AND pl.status = 'ACTIVE'
            AND pl.target_workspace_id IS NOT NULL
          GROUP BY pl.target_workspace_id
        ), ranked_members AS (
          SELECT
            wm.id AS workspace_member_id,
            wm.workspace_id,
            w.name AS workspace_name,
            wm.member_id,
            m.name AS member_name,
            wm.role_name,
            wc.slot_capacity,
            ROW_NUMBER() OVER (PARTITION BY wm.workspace_id ORDER BY wm.created_at ASC, wm.id ASC) AS usage_order
          FROM workspace_member wm
          JOIN workspace w ON w.id = wm.workspace_id
          JOIN member m ON m.id = wm.member_id
          JOIN workspace_capacity wc ON wc.workspace_id = wm.workspace_id
        )
        SELECT
          workspace_member_id,
          workspace_id,
          workspace_name,
          member_id,
          member_name,
          role_name,
          slot_capacity,
          usage_order,
          (usage_order <= slot_capacity) AS is_covered
        FROM ranked_members
        ORDER BY workspace_id ASC, usage_order ASC`,
        [licenseId]
      );

      return res.json({ license, usage_type: "WORKSPACE_MEMBER", items: usageRes.rows });
    }

    return res.status(400).json({ name: "BadRequest", message: "Unsupported target_resource." });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

export default router;
