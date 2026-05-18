const BOT_RE = /bot|crawl|spider|preview|slack|whatsapp|telegram|facebookexternalhit|linkedinbot|discordbot/i;

function detectBrowser(ua) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\/[\d.]+/.test(ua) && !/Edg\//.test(ua)) return "Chrome";
  if (/Firefox\/[\d.]+/.test(ua)) return "Firefox";
  if (/Safari\/[\d.]+/.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  if (/OPR\//.test(ua)) return "Opera";
  return "Unknown";
}

function detectOS(ua) {
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown";
}

export function parseUA(uaString) {
  const ua = uaString || "";
  const mobile = /Mobi|Android|iPhone|iPad|iPod/.test(ua);
  return {
    ua,
    browser: detectBrowser(ua),
    os: detectOS(ua),
    mobile,
    bot: BOT_RE.test(ua),
  };
}

export function describeDevice({ ua, screen, tz }) {
  const parsed = parseUA(ua);
  return { ...parsed, screen: screen || null, tz: tz || null };
}
