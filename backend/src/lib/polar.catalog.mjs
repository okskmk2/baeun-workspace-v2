const PRODUCT_CODE_KEYS = {
  WORKSPACE: "WORKSPACE",
  WORKSPACEMEMBER: "WORKSPACE_MEMBER",
  PROJECT: "PROJECT",
};

const BILLING_CYCLES = new Set(["MONTHLY", "YEARLY", "LIFETIME"]);

const UNIT_NOUNS = {
  WORKSPACE: { singular: "workspace", plural: "workspaces" },
  PROJECT: { singular: "project", plural: "projects" },
  WORKSPACE_MEMBER: { singular: "member", plural: "members" },
};

const ZERO_DECIMAL_CURRENCIES = new Set(["KRW", "JPY", "VND"]);

export const KNOWN_POLAR_PRODUCTS = {
  WORKSPACE_MONTHLY: "1653d178-3ca1-45a9-8fbc-6123d9efac7b",
  PROJECT_MONTHLY: "9078ff60-72fe-4441-9ca5-47bf23bee732",
  WORKSPACE_MEMBER_MONTHLY: "f436c934-d43b-468e-9b05-49c87a8d6345",
};

export const SLOT_UNIT_PRICES_USD = {
  WORKSPACE: 10,
  PROJECT: 3,
  WORKSPACE_MEMBER: 1,
};

export const YEARLY_DISCOUNT = 0.15;
export const LIFETIME_MONTHS = 36;

export const catalogPriceUsd = (resource, cycle) => {
  const monthly = SLOT_UNIT_PRICES_USD[resource];
  if (!monthly) return null;
  if (cycle === "MONTHLY") return monthly;
  if (cycle === "YEARLY") return Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT) * 100) / 100;
  if (cycle === "LIFETIME") return monthly * LIFETIME_MONTHS;
  return null;
};

export const parseProductCode = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  const parts = raw.split("_");
  if (parts.length < 3) return null;

  const yearPart = parts.at(-1);
  const billingPart = String(parts.at(-2) || "").toUpperCase();
  const productPart = parts.slice(0, -2).join("_").toUpperCase();
  const targetResource = PRODUCT_CODE_KEYS[productPart];
  if (!targetResource || !BILLING_CYCLES.has(billingPart)) return null;

  const year = Number(yearPart);
  return {
    targetResource,
    billingCycle: billingPart,
    year: Number.isInteger(year) ? year : new Date().getFullYear(),
    productCode: `${productPart}_${billingPart}_${Number.isInteger(year) ? year : new Date().getFullYear()}`,
  };
};

export const unitNoun = (targetResource) => UNIT_NOUNS[targetResource] || { singular: "unit", plural: "units" };

export const toPolarMinorUnits = (amount, currency = "USD") => {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value < 0) return 0;
  if (ZERO_DECIMAL_CURRENCIES.has(String(currency).toUpperCase())) return Math.round(value);
  return Math.round(value * 100);
};

export const fromPolarMinorUnits = (amount, currency = "USD") => {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return 0;
  if (ZERO_DECIMAL_CURRENCIES.has(String(currency).toUpperCase())) return value;
  return Math.round((value / 100) * 100) / 100;
};

export const polarUnitPriceCreate = (unitAmount, targetResource, currency = "usd") => {
  const noun = unitNoun(targetResource);
  return {
    amount_type: "unit_based",
    price_currency: String(currency || "usd").toLowerCase(),
    tiers: {
      type: "volume",
      tiers: [{ max_units: null, unit_amount: unitAmount }],
    },
    unit_label: {
      en: { "=1": noun.singular, other: noun.plural },
    },
  };
};

export const metadataValue = (metadata, key) => {
  if (!metadata || typeof metadata !== "object") return null;
  const value = metadata[key];
  if (value === undefined || value === null || value === "") return null;
  return value;
};
