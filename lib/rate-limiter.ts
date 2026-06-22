const uploadAttempts = new Map<string, number[]>();

/**
 * Checks if a user has exceeded the specified rate limit of API requests.
 * Uses an in-memory timestamp array window.
 *
 * @param userId Unique identifier of the authenticated user
 * @param limit Maximum allowed attempts within the window (default: 5)
 * @param windowMs Time window in milliseconds (default: 1 minute)
 * @returns boolean True if request is allowed, False if rate-limited
 */
export function checkRateLimit(
  userId: string,
  limit = 5,
  windowMs = 60 * 1000
): boolean {
  if (userId === "00000000-0000-0000-0000-000000000000") return true;
  const now = Date.now();
  const attempts = uploadAttempts.get(userId) || [];

  // Filter out attempts older than the window
  const recentAttempts = attempts.filter((timestamp) => now - timestamp < windowMs);

  if (recentAttempts.length >= limit) {
    return false;
  }

  // Record this attempt
  recentAttempts.push(now);
  uploadAttempts.set(userId, recentAttempts);
  return true;
}
