/**
 * Async admin authentication helpers for partner admin support.
 * Checks both GP_EMAIL env var and partner_admins database table.
 */
import { getAdminEmails, isAdminEmail } from "./admin";
import { createServiceClient } from "./supabase/server";

/**
 * Check if an email is a GP (primary admin from GP_EMAIL env var).
 */
export function isGPEmail(email) {
  return isAdminEmail(email);
}

/**
 * Verify admin access for a Supabase auth user.
 * Returns { user, email, isGP, partner } on success, or { error, status } on failure.
 */
export async function requireAdminAccess(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const email = user.email?.toLowerCase()?.trim();
  if (!email) return { error: "Unauthorized", status: 401 };

  if (isAdminEmail(email)) {
    return { user, email, isGP: true, partner: null };
  }

  const serviceClient = createServiceClient();
  const { data: partner } = await serviceClient
    .from("partner_admins")
    .select("email, name, notify_on_own_invites, can_edit_content")
    .eq("email", email)
    .maybeSingle();

  if (partner) {
    return { user, email, isGP: false, partner };
  }

  return { error: "Unauthorized", status: 403 };
}

/**
 * Check if an email is any kind of admin (GP or partner), using the database.
 */
export async function isAnyAdmin(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (isAdminEmail(normalized)) return true;

  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("partner_admins")
    .select("email")
    .eq("email", normalized)
    .maybeSingle();

  return !!data;
}

/**
 * Get the right notification recipients for a given investor email.
 * GP always gets notifications. Partner admins get notifications only
 * for investors they invited (if they have notifications enabled).
 */
export async function getNotificationRecipientsForInvestor(investorEmail, serviceClient) {
  const gpEmails = getAdminEmails();

  try {
    const { data: allowed } = await serviceClient
      .from("allowed_emails")
      .select("invited_by_email")
      .eq("email", investorEmail.toLowerCase())
      .maybeSingle();

    if (!allowed?.invited_by_email) return gpEmails;

    const inviterEmail = allowed.invited_by_email.toLowerCase();

    // If inviter is already a GP, no need to add
    if (gpEmails.includes(inviterEmail)) return gpEmails;

    // Check if inviter is a partner with notifications on
    const { data: partner } = await serviceClient
      .from("partner_admins")
      .select("notify_on_own_invites")
      .eq("email", inviterEmail)
      .maybeSingle();

    if (partner?.notify_on_own_invites) {
      return [...gpEmails, inviterEmail];
    }
  } catch (err) {
    console.error("[getNotificationRecipientsForInvestor] Error:", err?.message);
  }

  return gpEmails;
}
