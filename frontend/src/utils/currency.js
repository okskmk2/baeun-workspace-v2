const DEFAULT_CURRENCY = "USD";
const DEFAULT_LOCALE = "en-US";

/**
 * @param {number} amount
 * @param {{ currency?: string, locale?: string, maximumFractionDigits?: number }} [options]
 */
export function formatCurrency(amount, options = {}) {
  const { currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE, maximumFractionDigits = 0 } = options;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Monthly slot prices stay whole dollars; yearly equivalents may need cents. */
export function formatSlotPrice(amount, options = {}) {
  return formatCurrency(amount, { ...options, maximumFractionDigits: 2 });
}
