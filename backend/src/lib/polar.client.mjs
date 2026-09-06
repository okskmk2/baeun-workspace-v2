import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";

const POLAR_SERVERS = {
  production: "https://api.polar.sh/v1",
  sandbox: "https://sandbox-api.polar.sh/v1",
};

export class PolarApiError extends Error {
  constructor(status, body) {
    const detail = Array.isArray(body?.detail)
      ? body.detail.map((item) => item?.msg || item?.message).filter(Boolean).join("; ")
      : body?.detail || body?.message || body?.error;
    super(detail || `Polar API error (${status})`);
    this.name = "PolarApiError";
    this.status = status;
    this.body = body;
  }
}

export const getPolarEnvironment = () => {
  const value = String(process.env.POLAR_ENVIRONMENT || "sandbox").trim().toLowerCase();
  return value === "production" ? "production" : "sandbox";
};

export const getPolarAccessToken = () => String(process.env.POLAR_ACCESS_TOKEN || "").trim();

export const getPolarWebhookSecret = () => String(process.env.POLAR_WEBHOOK_SECRET || "").trim();

export const getAppPublicUrl = () =>
  String(process.env.APP_PUBLIC_URL || process.env.PUBLIC_APP_URL || "http://localhost:8081").replace(/\/$/, "");

export const isPolarConfigured = () => Boolean(getPolarAccessToken());

const polarRequest = async (path, { method = "GET", body } = {}) => {
  const token = getPolarAccessToken();
  if (!token) {
    throw new PolarApiError(503, { message: "POLAR_ACCESS_TOKEN is not configured." });
  }

  const response = await fetch(`${POLAR_SERVERS[getPolarEnvironment()]}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    throw new PolarApiError(response.status, payload || { message: response.statusText });
  }

  return payload;
};

export const polar = {
  checkouts: {
    create: (payload) => polarRequest("/checkouts/", { method: "POST", body: payload }),
    get: (checkoutId) => polarRequest(`/checkouts/${checkoutId}`),
  },
  orders: {
    get: (orderId) => polarRequest(`/orders/${orderId}`),
    listByCheckout: (checkoutId) =>
      polarRequest(`/orders/?checkout_id=${encodeURIComponent(checkoutId)}&limit=10`),
  },
  products: {
    list: () => polarRequest("/products/?limit=100"),
    create: (payload) => polarRequest("/products/", { method: "POST", body: payload }),
    update: (productId, payload) => polarRequest(`/products/${productId}`, { method: "PATCH", body: payload }),
  },
  subscriptions: {
    get: (subscriptionId) => polarRequest(`/subscriptions/${subscriptionId}`),
  },
  customerSessions: {
    create: (payload) => polarRequest("/customer-sessions/", { method: "POST", body: payload }),
  },
  refunds: {
    create: (payload) => polarRequest("/refunds/", { method: "POST", body: payload }),
  },
};

export const verifyPolarWebhook = (rawBody, headers) => {
  const secret = getPolarWebhookSecret();
  if (!secret) {
    throw new WebhookVerificationError("POLAR_WEBHOOK_SECRET is not configured.");
  }

  const normalized = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (typeof value === "string") normalized[key] = value;
    else if (Array.isArray(value) && value[0]) normalized[key] = String(value[0]);
  }

  return validateEvent(rawBody, normalized, secret);
};

export { WebhookVerificationError };
