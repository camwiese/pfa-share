// Reads x-vercel-ip-* headers if present (production). Falls back to SF in dev
// so the admin dashboard has something to render.

export function geoFromHeaders(headers) {
  const get = (k) => headers.get?.(k) ?? headers[k] ?? null;
  const city = decode(get("x-vercel-ip-city"));
  const region = decode(get("x-vercel-ip-country-region"));
  const country = decode(get("x-vercel-ip-country"));
  const lat = parseNum(get("x-vercel-ip-latitude"));
  const lon = parseNum(get("x-vercel-ip-longitude"));

  if (!city && !region && !country) {
    return { city: "San Francisco", region: "CA", country: "US", lat: 37.78, lon: -122.42 };
  }
  return { city, region, country, lat, lon };
}

function decode(v) {
  if (!v) return null;
  try { return decodeURIComponent(v); } catch { return v; }
}

function parseNum(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
