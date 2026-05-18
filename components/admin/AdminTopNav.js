"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const LINKS = [
  { href: "/admin", label: "Activity" },
  { href: "/admin/links", label: "Links" },
  { href: "/admin/approvals", label: "Approvals" },
  { href: "/admin/settings", label: "Settings" },
];

function isActive(pathname, href) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminTopNav({ adminEmail, showApprovals = true }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = useMemo(
    () => LINKS.filter((l) => l.href !== "/admin/approvals" || showApprovals),
    [showApprovals]
  );

  useEffect(() => {
    links.forEach((l) => router.prefetch(l.href));
  }, [links, router]);

  const activeLabel = useMemo(() => {
    const a = links.find((l) => isActive(pathname || "", l.href));
    return a?.label || "Admin";
  }, [pathname, links]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <header className="admin-nav">
      <div className="admin-nav__inner">
        <div className="admin-nav__brand">PFA · {activeLabel}</div>

        <nav className="admin-nav__tabs">
          {links.map((link) => {
            const active = isActive(pathname || "", link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`admin-nav__tab${active ? " is-active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {adminEmail ? (
          <button onClick={handleLogout} className="admin-nav__logout" title={adminEmail}>
            Sign out
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setMenuOpen((p) => !p)}
          aria-expanded={menuOpen}
          aria-label="Toggle admin navigation"
          className="admin-nav__menu-btn"
        >
          Menu
        </button>

        {menuOpen && (
          <div className="admin-nav__menu-overlay" onClick={() => setMenuOpen(false)}>
            <div className="admin-nav__menu" onClick={(e) => e.stopPropagation()}>
              {links.map((link) => {
                const active = isActive(pathname || "", link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`admin-nav__tab${active ? " is-active" : ""}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              {adminEmail ? (
                <button onClick={handleLogout} className="btn btn--ghost btn--small" style={{ marginTop: 6 }}>
                  Sign out {adminEmail}
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
