/**
 * Query-string parameter name used to suppress global 401 -> /login redirect.
 *
 * Use this only for bootstrap-style auth checks where unauthenticated access
 * is expected and should not force navigation.
 */
export const AUTH_SKIP_REDIRECT_PARAM = "skipAuthRedirect";

/**
 * Canonical parameter value for AUTH_SKIP_REDIRECT_PARAM.
 *
 * Example:
 * api.get("/members/me", {
 *   params: { [AUTH_SKIP_REDIRECT_PARAM]: AUTH_SKIP_REDIRECT_VALUE },
 * });
 */
export const AUTH_SKIP_REDIRECT_VALUE = "1";
