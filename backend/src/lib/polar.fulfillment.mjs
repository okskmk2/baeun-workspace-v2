import pool from "../db.mjs";
import logger from "../logger.mjs";
import { polar } from "./polar.client.mjs";
import { fromPolarMinorUnits, metadataValue } from "./polar.catalog.mjs";
import { parsePositiveInt } from "../utils/parsers.mjs";

const ACTIVE_LICENSE_STATUSES = new Set(["ACTIVE"]);

const parseMetaInt = (metadata, key) => parsePositiveInt(metadataValue(metadata, key));

const orderMetadata = (order) => ({
  ...(order?.product?.metadata || {}),
  ...(order?.subscription?.metadata || {}),
  ...(order?.metadata || {}),
});

const resolveMemberId = (order, metadata) => {
  const fromExternal = parsePositiveInt(order?.customer?.external_id || order?.customer?.externalId);
  return fromExternal || parseMetaInt(metadata, "member_id");
};

const resolveLicenseId = async (client, order, metadata) => {
  const fromMeta = parseMetaInt(metadata, "license_id");
  if (fromMeta) return fromMeta;

  const productId = order?.product_id || order?.productId || order?.product?.id;
  if (!productId) return null;

  const result = await client.query(
    `SELECT id
     FROM license
     WHERE polar_product_id = $1
     LIMIT 1`,
    [productId]
  );
  return result.rows[0]?.id || null;
};

const resolveQuantity = (order, metadata) => {
  const units = Number(order?.units);
  if (Number.isInteger(units) && units > 0) return units;
  return parseMetaInt(metadata, "quantity") || 1;
};

const resolveWorkspaceId = (metadata, license) => {
  const fromMeta = parseMetaInt(metadata, "workspace_id");
  if (fromMeta) return fromMeta;
  const resource = String(license?.target_resource || "").toUpperCase();
  if (resource === "WORKSPACE") return null;
  return null;
};

const periodEndFromOrder = (order) =>
  order?.subscription?.current_period_end ||
  order?.subscription?.currentPeriodEnd ||
  order?.subscription?.ends_at ||
  null;

export const applyPaidOrder = async (order) => {
  if (!order?.id) return { skipped: true, reason: "missing_order" };
  if (order.paid === false && String(order.status || "").toLowerCase() !== "paid") {
    return { skipped: true, reason: "not_paid" };
  }

  const metadata = orderMetadata(order);
  const polarOrderId = String(order.id);
  const polarCheckoutId = order.checkout_id || order.checkoutId || null;
  const polarSubscriptionId = order.subscription_id || order.subscriptionId || null;
  const currency = String(order.currency || "usd").toUpperCase();
  const totalAmount = fromPolarMinorUnits(order.total_amount ?? order.totalAmount, currency);
  const billingReason = String(order.billing_reason || order.billingReason || "");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingOrder = await client.query(
      `SELECT id, status
       FROM payment
       WHERE polar_order_id = $1
       FOR UPDATE`,
      [polarOrderId]
    );
    if (existingOrder.rows[0] && String(existingOrder.rows[0].status).toUpperCase() === "SUCCESS") {
      await client.query("COMMIT");
      return { skipped: true, reason: "already_paid", paymentId: existingOrder.rows[0].id };
    }

    const licenseId = await resolveLicenseId(client, order, metadata);
    if (!licenseId) {
      await client.query("ROLLBACK");
      throw new Error("Unable to resolve Baeun license for Polar order.");
    }

    const licenseRes = await client.query("SELECT * FROM license WHERE id = $1", [licenseId]);
    const license = licenseRes.rows[0];
    if (!license) {
      await client.query("ROLLBACK");
      throw new Error(`License ${licenseId} not found.`);
    }

    const memberId = resolveMemberId(order, metadata);
    const quantity = resolveQuantity(order, metadata);
    const workspaceId =
      String(license.target_resource).toUpperCase() === "WORKSPACE"
        ? null
        : resolveWorkspaceId(metadata, license);
    const ownerMemberId = String(license.target_resource).toUpperCase() === "WORKSPACE" ? memberId : null;
    const targetWorkspaceId = ownerMemberId ? null : workspaceId;

    if (!memberId) {
      await client.query("ROLLBACK");
      throw new Error("Unable to resolve member for Polar order.");
    }

    if (String(license.target_resource).toUpperCase() !== "WORKSPACE" && !targetWorkspaceId) {
      await client.query("ROLLBACK");
      throw new Error("workspace_id is required for this license.");
    }

    let paymentId = existingOrder.rows[0]?.id || parseMetaInt(metadata, "payment_id");
    if (paymentId) {
      const pendingRes = await client.query(
        `SELECT id, status
         FROM payment
         WHERE id = $1
         FOR UPDATE`,
        [paymentId]
      );
      if (pendingRes.rows.length === 0) paymentId = null;
    }

    let paymentRow;
    if (paymentId) {
      const updated = await client.query(
        `UPDATE payment
         SET status = 'SUCCESS',
             total_amount = $2,
             currency = $3,
             provider = 'POLAR',
             polar_checkout_id = COALESCE($4, polar_checkout_id),
             polar_order_id = $5,
             polar_subscription_id = COALESCE($6, polar_subscription_id),
             pg_transaction_id = $5,
             member_id = COALESCE(member_id, $7),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [paymentId, totalAmount, currency, polarCheckoutId, polarOrderId, polarSubscriptionId, memberId]
      );
      paymentRow = updated.rows[0];
    } else {
      const inserted = await client.query(
        `INSERT INTO payment (
           member_id,
           total_amount,
           status,
           provider,
           polar_checkout_id,
           polar_order_id,
           polar_subscription_id,
           pg_transaction_id,
           currency
         ) VALUES ($1, $2, 'SUCCESS', 'POLAR', $3, $4, $5, $4, $6)
         RETURNING *`,
        [memberId, totalAmount, polarCheckoutId, polarOrderId, polarSubscriptionId, currency]
      );
      paymentRow = inserted.rows[0];
      paymentId = paymentRow.id;
    }

    const endDate =
      String(license.billing_cycle).toUpperCase() === "LIFETIME" ? null : periodEndFromOrder(order);
    const startDate = order?.subscription?.current_period_start || order?.subscription?.currentPeriodStart || null;

    if (polarSubscriptionId) {
      const existingLicense = await client.query(
        `SELECT id
         FROM purchased_license
         WHERE polar_subscription_id = $1
         FOR UPDATE`,
        [polarSubscriptionId]
      );

      if (existingLicense.rows.length > 0) {
        await client.query(
          `UPDATE purchased_license
           SET payment_id = $2,
               quantity = $3,
               status = 'ACTIVE',
               polar_order_id = $4,
               cancel_at_period_end = false,
               start_date = COALESCE($5::timestamptz, start_date),
               end_date = $6,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [
            existingLicense.rows[0].id,
            paymentId,
            quantity,
            polarOrderId,
            startDate,
            endDate,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO purchased_license (
             payment_id,
             license_id,
             owner_member_id,
             target_workspace_id,
             quantity,
             status,
             start_date,
             end_date,
             polar_subscription_id,
             polar_order_id
           ) VALUES (
             $1, $2, $3, $4, $5, 'ACTIVE',
             COALESCE($6::timestamptz, CURRENT_TIMESTAMP),
             $7, $8, $9
           )`,
          [
            paymentId,
            licenseId,
            ownerMemberId,
            targetWorkspaceId,
            quantity,
            startDate,
            endDate,
            polarSubscriptionId,
            polarOrderId,
          ]
        );
      }
    } else {
      const existingOneTime = await client.query(
        `SELECT id FROM purchased_license WHERE polar_order_id = $1`,
        [polarOrderId]
      );
      if (existingOneTime.rows.length === 0) {
        await client.query(
          `INSERT INTO purchased_license (
             payment_id,
             license_id,
             owner_member_id,
             target_workspace_id,
             quantity,
             status,
             end_date,
             polar_order_id
           ) VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, $7)`,
          [paymentId, licenseId, ownerMemberId, targetWorkspaceId, quantity, endDate, polarOrderId]
        );
      }
    }

    await client.query("COMMIT");
    logger.info("Polar order fulfilled", {
      polarOrderId,
      paymentId,
      licenseId,
      billingReason,
      quantity,
    });
    return { skipped: false, paymentId, licenseId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const markCheckoutCanceled = async (checkout) => {
  const checkoutId = checkout?.id;
  if (!checkoutId) return { skipped: true };

  const result = await pool.query(
    `UPDATE payment
     SET status = 'CANCELED', updated_at = CURRENT_TIMESTAMP
     WHERE polar_checkout_id = $1
       AND status = 'PENDING'
     RETURNING id`,
    [checkoutId]
  );
  return { updated: result.rowCount, paymentId: result.rows[0]?.id || null };
};

export const applyRefundedOrder = async (order) => {
  const polarOrderId = order?.id;
  if (!polarOrderId) return { skipped: true };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const paymentRes = await client.query(
      `SELECT id, status
       FROM payment
       WHERE polar_order_id = $1
       FOR UPDATE`,
      [polarOrderId]
    );
    if (paymentRes.rows.length === 0) {
      await client.query("COMMIT");
      return { skipped: true, reason: "payment_not_found" };
    }

    const paymentId = paymentRes.rows[0].id;
    await client.query(
      `UPDATE payment
       SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [paymentId]
    );
    await client.query(
      `UPDATE purchased_license
       SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP
       WHERE payment_id = $1 OR polar_order_id = $2`,
      [paymentId, polarOrderId]
    );
    await client.query("COMMIT");
    return { skipped: false, paymentId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const applySubscriptionState = async (subscription) => {
  const subscriptionId = subscription?.id;
  if (!subscriptionId) return { skipped: true };

  const status = String(subscription.status || "").toLowerCase();
  const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end ?? subscription.cancelAtPeriodEnd);
  const currentPeriodEnd = subscription.current_period_end || subscription.currentPeriodEnd || null;
  const quantity = Number(subscription.units) > 0 ? Number(subscription.units) : null;

  let licenseStatus = "ACTIVE";
  if (["canceled", "unpaid", "incomplete_expired"].includes(status) && !cancelAtPeriodEnd) {
    licenseStatus = "CANCELED";
  }
  if (status === "revoked") licenseStatus = "CANCELED";

  const keepActive = ACTIVE_LICENSE_STATUSES.has(licenseStatus) || (status === "canceled" && cancelAtPeriodEnd);

  const result = await pool.query(
    `UPDATE purchased_license
     SET status = $2,
         cancel_at_period_end = $3,
         end_date = COALESCE($4::timestamptz, end_date),
         quantity = COALESCE($5, quantity),
         updated_at = CURRENT_TIMESTAMP
     WHERE polar_subscription_id = $1
     RETURNING id`,
    [subscriptionId, keepActive ? "ACTIVE" : licenseStatus, cancelAtPeriodEnd, currentPeriodEnd, quantity]
  );

  return { updated: result.rowCount, licenseStatus: keepActive ? "ACTIVE" : licenseStatus };
};

export const fulfillCheckoutById = async (checkoutId) => {
  const checkout = await polar.checkouts.get(checkoutId);
  const status = String(checkout?.status || "").toLowerCase();
  if (status === "expired" || status === "failed") {
    await markCheckoutCanceled(checkout);
    return { checkout, fulfilled: false, reason: status };
  }
  if (status !== "succeeded" && status !== "confirmed") {
    return { checkout, fulfilled: false, reason: status || "open" };
  }

  let order = null;
  const orderId = checkout.order_id || checkout.orderId;
  if (orderId) {
    order = await polar.orders.get(orderId);
  } else {
    const listed = await polar.orders.listByCheckout(checkoutId);
    order = listed?.items?.[0] || listed?.[0] || null;
  }

  if (!order) {
    return { checkout, fulfilled: false, reason: "order_pending" };
  }

  const result = await applyPaidOrder(order);
  return { checkout, order, fulfilled: !result.skipped || result.reason === "already_paid", result };
};
