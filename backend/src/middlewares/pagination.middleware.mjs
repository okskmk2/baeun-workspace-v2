import { parsePositiveInt } from "../utils/parsers.mjs";

const resolvePositiveInt = (value, fallback) => {
  const parsed = parsePositiveInt(value);
  return parsed || fallback;
};

export const withPagination = (options = {}) => {
  const {
    pageKey = "page",
    pageSizeKey = "pageSize",
    limitKey = "limit",
    defaultPage = 1,
    defaultPageSize = 10,
    maxPageSize = 100,
    defaultLimit = 30,
    maxLimit = 100,
  } = options;

  return (req, _res, next) => {
    const hasPageQuery =
      req.query?.[pageKey] !== undefined || req.query?.[pageSizeKey] !== undefined;
    const hasLimitQuery = req.query?.[limitKey] !== undefined;

    const page = resolvePositiveInt(req.query?.[pageKey], defaultPage);
    const pageSize = Math.min(
      resolvePositiveInt(req.query?.[pageSizeKey], defaultPageSize),
      maxPageSize
    );
    const limit = Math.min(resolvePositiveInt(req.query?.[limitKey], defaultLimit), maxLimit);

    req.pagination = {
      hasPageQuery,
      hasLimitQuery,
      page,
      pageSize,
      offset: (page - 1) * pageSize,
      limit,
    };

    next();
  };
};
