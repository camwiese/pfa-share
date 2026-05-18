const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.warn(`⚠ Missing environment variable: ${key} — auth features will not work until set.`);
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // The optimized image set never mutates in place — every variant is
        // generated from the original source and uniquely named. Mark it
        // immutable so Vercel's edge AND Cloudflare cache hard for a year.
        // If we ever regenerate with a different naming scheme, the new
        // filenames will sidestep the cache automatically.
        source: "/images/opt/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Other /images/* assets (signatures, favicon source, etc.) — softer
        // cache so we can swap them by name and trust SWR to pick it up.
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
