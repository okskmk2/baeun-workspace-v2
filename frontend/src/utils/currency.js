const DEFAULT_CURRENCY = "USD";
const DEFAULT_LOCALE = "en-US";

/**
 * @param {number} amount
 * @param {{ currency?: string, locale?: string, maximumFractionDigits?: number }} [options]
 */
export function formatCurrency(amount, options = {}) {
  const {
    currency = DEFAULT_CURRENCY,
    locale = DEFAULT_LOCALE,
    maximumFractionDigits = 0,
    minimumFractionDigits = 0,
  } = options;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(amount);
}

/** Whole dollars stay whole; fractional amounts keep two cents. */
export function formatSlotPrice(amount, options = {}) {
  const hasFraction = !Number.isInteger(Number(amount));
  return formatCurrency(amount, {
    maximumFractionDigits: 2,
    minimumFractionDigits: hasFraction ? 2 : 0,
    ...options,
  });
}
