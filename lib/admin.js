/**
 * Admin email helpers. GP_EMAIL supports comma-separated values for multiple admins.
 * Example: GP_EMAIL=daniel@pugetsoundtx.com,camwiese@gmail.com
 */
export function getAdminEmails() {
  const raw = process.env.GP_EMAIL || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email) {
  if (!email || typeof email !== "string") return false;
  const admins = getAdminEmails();
  return admins.includes(email.trim().toLowerCase());
}
