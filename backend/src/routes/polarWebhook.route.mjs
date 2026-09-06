import logger from "../logger.mjs";
import pool from "../db.mjs";
import { verifyPolarWebhook, WebhookVerificationError } from "../lib/polar.client.mjs";
import {
  applyPaidOrder,
  applyRefundedOrder,
  applySubscriptionState,
  markCheckoutCanceled,
} from "../lib/polar.fulfillment.mjs";

const eventIdFrom = (req, event) => {
  const headerId = req.headers["webhook-id"] || req.headers["svix-id"];
  if (headerId) return String(headerId);
  const type = event?.type || "unknown";
  const dataId = event?.data?.id || "none";
  const timestamp = event?.timestamp || Date.now();
  return `${type}:${dataId}:${timestamp}`;
};

export const handlePolarWebhook = async (req, res) => {
  let event;
  try {
    event = verifyPolarWebhook(req.body, req.headers);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      logger.warn("Polar webhook signature rejected", { message: error.message });
      return res.status(403).send("");
    }
    logger.error("Polar webhook verification failed", { err: error?.message });
    return res.status(400).send("");
  }

  const eventId = eventIdFrom(req, event);
  const eventType = event?.type;

  try {
    const inserted = await pool.query(
      `INSERT INTO polar_webhook_event (event_id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [eventId, eventType]
    );
    if (inserted.rowCount === 0) {
      return res.status(202).send("");
    }

    switch (eventType) {
      case "order.paid":
        await applyPaidOrder(event.data);
        break;
      case "order.refunded":
        await applyRefundedOrder(event.data);
        break;
      case "checkout.expired":
        await markCheckoutCanceled(event.data);
        break;
      case "subscription.updated":
      case "subscription.canceled":
      case "subscription.uncanceled":
      case "subscription.revoked":
      case "subscription.past_due":
      case "subscription.active":
      case "subscription.paused":
      case "subscription.resumed":
        await applySubscriptionState(event.data);
        break;
      default:
        break;
    }

    return res.status(202).send("");
  } catch (error) {
    await pool.query("DELETE FROM polar_webhook_event WHERE event_id = $1", [eventId]).catch(() => {});
    logger.error("Polar webhook handler failed", {
      eventType,
      eventId,
      err: error?.message,
      stack: error?.stack,
    });
    return res.status(500).send("");
  }
};
