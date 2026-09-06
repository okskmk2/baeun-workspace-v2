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

const LOCAL_APP_URL = "http://localhost:8081";
const PRODUCTION_APP_URL = "https://workspace.baeun.com";

const isLoopbackHost = (value) => {
  try {
    const hostname = new URL(value.includes("://") ? value : `http://${value}`).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
};

// Cloud Run/App Engine do not always set NODE_ENV=production.
const isCloudRuntime = () =>
  Boolean(
    process.env.K_SERVICE ||
      process.env.K_REVISION ||
      process.env.CLOUD_RUN_JOB ||
      process.env.GAE_ENV ||
      process.env.GAE_SERVICE
  );

const isProductionRuntime = () => process.env.NODE_ENV === "production" || isCloudRuntime();

const originFromRequest = (req) => {
  if (!req) return "";
  const forwardedProto = String(req.headers?.["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const proto = forwardedProto || req.protocol || (isProductionRuntime() ? "https" : "http");
  const forwardedHost = String(req.headers?.["x-forwarded-host"] || "")
    .split(",")[0]
    .trim();
  const host = forwardedHost || req.get?.("host") || req.headers?.host || "";
  if (!host) return "";
  return `${proto}://${host}`.replace(/\/$/, "");
};

export const getAppPublicUrl = (req) => {
  const configured = String(process.env.APP_PUBLIC_URL || process.env.PUBLIC_APP_URL || "")
    .trim()
    .replace(/\/$/, "");
  const requestOrigin = originFromRequest(req);
  const production = isProductionRuntime();

  // Never send Polar back to localhost when this process is serving production.
  if (configured && !(production && isLoopbackHost(configured))) return configured;
  if (requestOrigin && !(production && isLoopbackHost(requestOrigin))) return requestOrigin;
  return production ? PRODUCTION_APP_URL : LOCAL_APP_URL;
};

export const getPolarReturnUrl = (req, pathname) => {
  const origin = getAppPublicUrl(req);
  if (!origin || isLoopbackHost(origin)) return null;
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${path}`;
};

// Cloudflare treats origin 502 as its own gateway failure and replaces the JSON body.
export const polarClientHttpStatus = (status) => {
  const code = Number(status) || 500;
  if (code === 401 || code === 403) return 503;
  if (code === 404 || code === 409 || code === 422) return code;
  if (code >= 400 && code < 500) return 400;
  return 503;
};

export const isPolarCustomerMissing = (error) => {
  if (Number(error?.status) === 404) return true;
  const text = `${error?.message || ""} ${JSON.stringify(error?.body || {})}`.toLowerCase();
  return text.includes("not found") || text.includes("does not exist") || text.includes("no customer");
};

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
  customers: {
    listByEmail: (email) => polarRequest(`/customers/?email=${encodeURIComponent(email)}&limit=10`),
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
