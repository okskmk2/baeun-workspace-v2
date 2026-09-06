export const formatAdminDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatAdminDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export const formatAdminMoney = (value, currency = "KRW") => {
  const amount = Number(value || 0);
  const locale = currency === "KRW" ? "ko-KR" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(amount);
};

export const approvalLabel = (status) => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "PENDING") return "대기";
  if (normalized === "APPROVED") return "승인";
  if (normalized === "REJECTED") return "거절";
  return normalized || "-";
};

export const approvalTone = (status) => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "PENDING") return "warn";
  if (normalized === "APPROVED") return "ok";
  if (normalized === "REJECTED") return "danger";
  return "muted";
};
