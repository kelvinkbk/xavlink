/**
 * User-facing copy for axios failures during login/register/etc.
 * Hosted backends (e.g. Render free tier) can take 60s+ to cold start after idle.
 */
export function authErrorMessage(
  error,
  fallback = "Something went wrong. Please try again.",
) {
  const serverMsg = error?.response?.data?.message;
  if (typeof serverMsg === "string" && serverMsg.trim()) {
    return serverMsg;
  }
  if (
    error?.code === "ECONNABORTED" ||
    /timeout/i.test(String(error?.message || ""))
  ) {
    return "The server is starting up after idle; this can take up to a minute or two. Please wait and try again.";
  }
  if (error?.request && !error?.response) {
    return "Could not reach the server. If it was idle, wait a minute and try again.";
  }
  return fallback;
}
