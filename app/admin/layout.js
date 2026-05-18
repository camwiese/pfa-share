import { createClient } from "../../lib/supabase/server";
import { getAdminEmails } from "../../lib/admin";
import AdminTopNav from "../../components/admin/AdminTopNav";
import AdminLoginInline from "../../components/admin/AdminLoginInline";
import "../styles/admin.css";

export const dynamic = "force-dynamic";

async function getAdminViewer() {
  const bypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";
  if (bypass) {
    const adminEmails = getAdminEmails();
    return { email: adminEmails[0] || "dev@example.com", isGP: true };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return null;
    const email = user.email.toLowerCase();
    const adminEmails = getAdminEmails();
    if (adminEmails.includes(email)) return { email, isGP: true };
    return null;
  } catch (err) {
    console.error("[admin/layout] auth check failed:", err?.message);
    return null;
  }
}

export default async function AdminLayout({ children }) {
  const viewer = await getAdminViewer();
  if (!viewer) {
    return <AdminLoginInline />;
  }

  return (
    <div className="admin-shell">
      <AdminTopNav adminEmail={viewer.email} />
      <div className="admin-content">{children}</div>
    </div>
  );
}
