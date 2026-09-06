import express from "express";
import pool from "../db.mjs";
import logger from "../logger.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import { normalizeUpper, parsePositiveInt } from "../utils/parsers.mjs";
import { withPagination } from "../middlewares/pagination.middleware.mjs";
import { getMemberEntitlements } from "../lib/entitlements.mjs";
import {
  getAppPublicUrl,
  getPolarReturnUrl,
  isPolarConfigured,
  isPolarCustomerMissing,
  polarClientHttpStatus,
  PolarApiError,
  polar,
} from "../lib/polar.client.mjs";
import {
  parseProductCode,
  polarUnitPriceCreate,
  toPolarMinorUnits,
} from "../lib/polar.catalog.mjs";
import { fulfillCheckoutById } from "../lib/polar.fulfillment.mjs";

const router = express.Router();
const WORKSPACE_BILLING_ROLES = new Set(["OWNER", "ADMIN"]);

const clientIp = (req) => {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  const raw = forwarded || req.ip || req.socket?.remoteAddress || "";
  const ip = raw.replace(/^::ffff:/, "");
  if (!ip || ip === "::1" || ip === "127.0.0.1") return null;
  return ip;
};

const loadMember = async (memberId) => {
  const result = await pool.query(
    `SELECT id, name, email, locale, role_name, approval_status,
            COALESCE(account_status, 'ACTIVE') AS account_status
     FROM member
     WHERE id = $1`,
    [memberId]
  );
  return result.rows[0] || null;
};

const resolveLicense = async ({ licenseId, productCode }) => {
  if (licenseId) {
    const result = await pool.query("SELECT * FROM license WHERE id = $1", [licenseId]);
    return result.rows[0] || null;
  }

  const parsed = parseProductCode(productCode);
  if (!parsed) return null;

  const result = await pool.query(
    `SELECT *
     FROM license
     WHERE target_resource = $1
       AND billing_cycle = $2
       AND currency = 'USD'
       AND is_active = true
     ORDER BY polar_product_id NULLS LAST, id DESC
     LIMIT 1`,
    [parsed.targetResource, parsed.billingCycle]
  );
  return result.rows[0] || null;
};

const assertWorkspaceBillingAccess = async (workspaceId, memberId) => {
  const workspaceRes = await pool.query("SELECT id FROM workspace WHERE id = $1", [workspaceId]);
  if (workspaceRes.rows.length === 0) {
    return { error: { status: 404, body: { name: "NotFound", message: "Workspace not found." } } };
  }

  const roleRes = await pool.query(
    "SELECT role_name FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
    [workspaceId, memberId]
  );
  const role = String(roleRes.rows[0]?.role_name || "").toUpperCase();
  if (!WORKSPACE_BILLING_ROLES.has(role)) {
    return {
      error: {
        status: 403,
        body: { name: "Forbidden", message: "Workspace owner or admin is required to purchase this license." },
      },
    };
  }
  return { error: null };
};

router.post("/checkout", isAuth, async (req, res) => {
  if (!isPolarConfigured()) {
    return res.status(503).json({ name: "ServiceUnavailable", message: "Polar is not configured." });
  }

  const quantity = parsePositiveInt(req.body.quantity) || 1;
  const licenseId = parsePositiveInt(req.body.license_id);
  const workspaceId = parsePositiveInt(req.body.workspace_id);
  const productCode = req.body.product_code || req.body.productCode;

  try {
    const member = await loadMember(req.session.userId);
    if (!member) {
      return res.status(404).json({ name: "NotFound", message: "Member not found." });
    }
    if (String(member.account_status).toUpperCase() === "SUSPENDED") {
      return res.status(403).json({ name: "Forbidden", message: "Account is suspended." });
    }
    const approval = String(member.approval_status || "").toUpperCase();
    const isAdmin = String(member.role_name || "").toUpperCase() === "SYSTEM_ADMIN";
    if (approval !== "APPROVED" && !isAdmin) {
      return res.status(403).json({ name: "Forbidden", message: "Approved account is required to checkout." });
    }

    const license = await resolveLicense({ licenseId, productCode });
    if (!license || !license.is_active) {
      return res.status(404).json({ name: "NotFound", message: "License not found or inactive." });
    }
    if (!license.polar_product_id) {
      return res.status(409).json({
        name: "Conflict",
        message: "This license is not linked to a Polar product.",
      });
    }

    const resource = String(license.target_resource).toUpperCase();
    let assignedWorkspaceId = null;
    if (resource === "WORKSPACE") {
      if (workspaceId) {
        return res.status(400).json({
          name: "BadRequest",
          message: "Workspace slot purchases cannot target a workspace.",
        });
      }
    } else {
      if (!workspaceId) {
        return res.status(400).json({
          name: "BadRequest",
          message: "workspace_id is required for this license.",
        });
      }
      const access = await assertWorkspaceBillingAccess(workspaceId, member.id);
      if (access.error) return res.status(access.error.status).json(access.error.body);
      assignedWorkspaceId = workspaceId;
    }

    const unitAmount = toPolarMinorUnits(license.price, license.currency);
    const estimatedTotal = Number(license.price) * quantity;
    const appUrl = getAppPublicUrl(req);
    const successUrl = `${appUrl}/settings/billing?checkout=success&checkout_id={CHECKOUT_ID}`;
    const returnUrl = `${appUrl}/store/cart`;

    const client = await pool.connect();
    let paymentId;
    try {
      await client.query("BEGIN");
      const paymentRes = await client.query(
        `INSERT INTO payment (
           member_id, total_amount, status, provider, currency
         ) VALUES ($1, $2, 'PENDING', 'POLAR', $3)
         RETURNING id`,
        [member.id, estimatedTotal, String(license.currency || "USD").toUpperCase()]
      );
      paymentId = paymentRes.rows[0].id;
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const metadata = {
      payment_id: String(paymentId),
      license_id: String(license.id),
      quantity,
      member_id: String(member.id),
    };
    if (assignedWorkspaceId) metadata.workspace_id = String(assignedWorkspaceId);

    const polarPayload = {
      products: [license.polar_product_id],
      units: quantity,
      prices: {
        [license.polar_product_id]: [
          polarUnitPriceCreate(unitAmount, resource, String(license.currency || "USD").toLowerCase()),
        ],
      },
      external_customer_id: String(member.id),
      customer_email: member.email,
      locale: String(member.locale || "en").startsWith("ko") ? "ko" : "en",
      success_url: successUrl,
      return_url: returnUrl,
      metadata,
    };
    if (member.name) polarPayload.customer_name = member.name;
    const ip = clientIp(req);
    if (ip) polarPayload.customer_ip_address = ip;

    let checkout;
    try {
      checkout = await polar.checkouts.create(polarPayload);
    } catch (error) {
      await pool.query(
        `UPDATE payment
         SET status = 'FAILED', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [paymentId]
      );
      throw error;
    }

    await pool.query(
      `UPDATE payment
       SET polar_checkout_id = $2,
           pg_transaction_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [paymentId, checkout.id]
    );

    return res.status(201).json({
      url: checkout.url,
      checkout_id: checkout.id,
      payment_id: paymentId,
      expires_at: checkout.expires_at,
    });
  } catch (error) {
    if (error instanceof PolarApiError) {
      logger.error("Polar checkout failed", { status: error.status, body: error.body });
      return res.status(polarClientHttpStatus(error.status)).json({
        name: "BadGateway",
        message: error.message,
      });
    }
    logger.error("Checkout failed", { err: error?.message, stack: error?.stack });
    return res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get("/entitlements", isAuth, async (req, res) => {
  try {
    const entitlements = await getMemberEntitlements(pool, req.session.userId);
    return res.json(entitlements);
  } catch (error) {
    logger.error("Entitlements failed", { err: error?.message, stack: error?.stack });
    return res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get("/me", isAuth, withPagination({ defaultPageSize: 10, maxPageSize: 100 }), async (req, res) => {
  const workspaceId = parsePositiveInt(req.query.workspaceId);
  const { page, pageSize } = req.pagination;
  const memberId = req.session.userId;

  try {
    const conditions = ["p.member_id = $1"];
    const values = [memberId];
    if (workspaceId) {
      values.push(workspaceId);
      conditions.push(
        `EXISTS (
           SELECT 1 FROM purchased_license pl_filter
           WHERE pl_filter.payment_id = p.id
             AND pl_filter.target_workspace_id = $${values.length}
         )`
      );
    }
    const status = normalizeUpper(req.query.status);
    if (["PENDING", "SUCCESS", "FAILED", "CANCELED", "REFUNDED"].includes(status)) {
      values.push(status);
      conditions.push(`p.status = $${values.length}`);
    }
    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const totalRes = await pool.query(
      `SELECT COUNT(*)::integer AS total
       FROM payment p
       ${whereClause}`,
      values
    );
    const total = Number(totalRes.rows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    const normalizedPage = Math.min(Math.max(page, 1), totalPages);
    const offset = (normalizedPage - 1) * pageSize;
    const listValues = [...values, pageSize, offset];

    const paymentsRes = await pool.query(
      `SELECT
         p.id,
         p.total_amount,
         p.currency,
         p.status,
         p.provider,
         p.polar_checkout_id,
         p.polar_order_id,
         p.polar_subscription_id,
         p.created_at,
         COALESCE(
           json_agg(
             json_build_object(
               'id', pl.id,
               'license_id', pl.license_id,
               'quantity', pl.quantity,
               'status', pl.status,
               'start_date', pl.start_date,
               'end_date', pl.end_date,
               'cancel_at_period_end', pl.cancel_at_period_end,
               'target_resource', l.target_resource,
               'billing_cycle', l.billing_cycle,
               'license_name', COALESCE(NULLIF(l.name, ''), l.name_i18n_key),
               'target_workspace_id', pl.target_workspace_id
             )
           ) FILTER (WHERE pl.id IS NOT NULL),
           '[]'
         ) AS licenses
       FROM payment p
       LEFT JOIN purchased_license pl ON pl.payment_id = p.id
       LEFT JOIN license l ON l.id = pl.license_id
       ${whereClause}
       GROUP BY p.id
       ORDER BY p.id DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      listValues
    );

    const licensesRes = await pool.query(
      `SELECT
         pl.id,
         pl.quantity,
         pl.status,
         pl.start_date,
         pl.end_date,
         pl.cancel_at_period_end,
         pl.target_workspace_id,
         pl.polar_subscription_id,
         l.target_resource,
         l.billing_cycle,
         COALESCE(NULLIF(l.name, ''), l.name_i18n_key) AS license_name
       FROM purchased_license pl
       JOIN license l ON l.id = pl.license_id
       WHERE pl.owner_member_id = $1
          OR pl.target_workspace_id IN (
            SELECT workspace_id FROM workspace_member WHERE member_id = $1 AND role_name IN ('OWNER', 'ADMIN')
          )
       ORDER BY pl.id DESC
       LIMIT 100`,
      [memberId]
    );

    return res.json({
      payments: paymentsRes.rows,
      licenses: licensesRes.rows,
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
});

router.get("/sync", isAuth, async (req, res) => {
  const checkoutId = String(req.query.checkout_id || req.query.checkoutId || "").trim();
  if (!checkoutId) {
    return res.status(400).json({ name: "BadRequest", message: "checkout_id is required." });
  }

  try {
    const owned = await pool.query(
      `SELECT id, status
       FROM payment
       WHERE polar_checkout_id = $1 AND member_id = $2`,
      [checkoutId, req.session.userId]
    );
    if (owned.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Checkout not found." });
    }

    const result = await fulfillCheckoutById(checkoutId);
    return res.json({
      payment_status: owned.rows[0].status,
      checkout_status: result.checkout?.status || null,
      fulfilled: Boolean(result.fulfilled),
      reason: result.reason || result.result?.reason || null,
    });
  } catch (error) {
    if (error instanceof PolarApiError) {
      logger.error("Polar checkout sync failed", { status: error.status, body: error.body });
      return res.status(polarClientHttpStatus(error.status)).json({
        name: "BadGateway",
        message: error.message,
      });
    }
    logger.error("Checkout sync failed", { err: error?.message, stack: error?.stack });
    return res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

const missingPolarCustomer = () => ({
  name: "NotFound",
  message: "No Polar customer exists yet. Complete a purchase first.",
});

const createPolarCustomerSession = async (payload) => {
  const session = await polar.customerSessions.create(payload);
  return session.customer_portal_url || session.customerPortalUrl || null;
};

router.post("/portal", isAuth, async (req, res) => {
  if (!isPolarConfigured()) {
    return res.status(503).json({ name: "ServiceUnavailable", message: "Polar is not configured." });
  }

  try {
    const externalCustomerId = String(req.session.userId);
    const returnUrl = getPolarReturnUrl(req, "/settings/billing");
    const sessionPayload = { external_customer_id: externalCustomerId };
    if (returnUrl) sessionPayload.return_url = returnUrl;

    let url = null;
    try {
      url = await createPolarCustomerSession(sessionPayload);
    } catch (error) {
      if (!(error instanceof PolarApiError) || !isPolarCustomerMissing(error)) throw error;

      const member = await loadMember(req.session.userId);
      const email = String(member?.email || "").trim();
      if (!email) throw error;

      const listed = await polar.customers.listByEmail(email);
      const customer = (listed?.items || listed?.data || []).find((item) => item?.id);
      if (!customer?.id) throw error;

      const byCustomerId = { customer_id: customer.id };
      if (returnUrl) byCustomerId.return_url = returnUrl;
      url = await createPolarCustomerSession(byCustomerId);
    }

    if (!url) {
      logger.error("Polar customer session missing portal url");
      return res.status(503).json({
        name: "ServiceUnavailable",
        message: "Polar did not return a customer portal URL.",
      });
    }
    return res.json({ url });
  } catch (error) {
    if (error instanceof PolarApiError) {
      logger.error("Polar customer portal failed", { status: error.status, body: error.body });
      if (isPolarCustomerMissing(error)) {
        return res.status(404).json(missingPolarCustomer());
      }
      if (error.status === 401 || error.status === 403) {
        return res.status(503).json({
          name: "ServiceUnavailable",
          message:
            "Polar customer portal is unavailable. The Polar access token may be missing the customer_sessions:write scope.",
        });
      }
      return res.status(polarClientHttpStatus(error.status)).json({
        name: error.status === 409 ? "Conflict" : "BadGateway",
        message: error.message,
      });
    }
    logger.error("Customer portal failed", { err: error?.message, stack: error?.stack });
    return res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

export default router;
