// In-memory demo data for the admin dashboard. Used when LOCAL_DEV_ADMIN_BYPASS
// is on but Supabase isn't configured — lets the user click through the admin
// flows before wiring real keys.
//
// Mutable: links/approvals/settings can be added/edited and persist for the
// life of the dev server.

const PERSONAS = {
  bouncer:  () => makeDwells({ stop: rand(3, 8),   tailBoost: false }),
  engaged:  () => makeDwells({ stop: rand(12, 20), tailBoost: false }),
  champion: () => makeDwells({ stop: 27,           tailBoost: true }),
};

function rand(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function makeDwells({ stop, tailBoost }) {
  const out = {};
  for (let i = 0; i <= stop; i++) {
    let base;
    if (i < 5) base = rand(8, 18);
    else if (i < 15) base = rand(5, 14);
    else if (i < 25) base = rand(3, 10);
    else base = rand(15, 60);
    out[String(i)] = base;
  }
  if (tailBoost) out["27"] = rand(40, 90);
  return out;
}

function totalOf(d) { return Object.values(d).reduce((a, v) => a + (Number(v) || 0), 0); }
function maxSlide(d) { return Math.max(0, ...Object.keys(d).map(Number)); }

const CITIES = [
  { city: "San Francisco", region: "CA", country: "US", lat: 37.78, lon: -122.42, tz: "America/Los_Angeles" },
  { city: "Palo Alto",     region: "CA", country: "US", lat: 37.44, lon: -122.14, tz: "America/Los_Angeles" },
  { city: "New York",      region: "NY", country: "US", lat: 40.71, lon: -74.00,  tz: "America/New_York" },
  { city: "Los Angeles",   region: "CA", country: "US", lat: 34.05, lon: -118.24, tz: "America/Los_Angeles" },
  { city: "London",        region: "ENG", country: "GB", lat: 51.51, lon: -0.13,  tz: "Europe/London" },
  { city: "Tokyo",         region: "13",  country: "JP", lat: 35.68, lon: 139.69, tz: "Asia/Tokyo" },
  { city: "Austin",        region: "TX", country: "US", lat: 30.27, lon: -97.74,  tz: "America/Chicago" },
  { city: "Boston",        region: "MA", country: "US", lat: 42.36, lon: -71.06,  tz: "America/New_York" },
];
const DEVICES = [
  { browser: "Safari", os: "macOS",   mobile: false, screen: { w: 1512, h: 982 } },
  { browser: "Chrome", os: "macOS",   mobile: false, screen: { w: 1440, h: 900 } },
  { browser: "Safari", os: "iOS",     mobile: true,  screen: { w: 390, h: 844 } },
  { browser: "Chrome", os: "Android", mobile: true,  screen: { w: 412, h: 915 } },
  { browser: "Edge",   os: "Windows", mobile: false, screen: { w: 1920, h: 1080 } },
];

function uuid() {
  return "demo-" + Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36).slice(-4);
}

// ---- Seeded initial state ----

function buildLinks() {
  return [
    { token: "x7q2k9", name: "Jane @ Sequoia",        persona: "champion", fps: ["fp-jane-1"],                                inactive: false },
    { token: "a3m8b2", name: "Marc Benioff",          persona: "engaged",  fps: ["fp-marc-1", "fp-marc-2"],                   inactive: false },
    { token: "j5n7c4", name: "SF Mayor's Office",     persona: "engaged",  fps: ["fp-mayor-1", "fp-mayor-2", "fp-mayor-3"],   inactive: false },
    { token: "p9q4r2", name: "Demo — Cam test",       persona: "champion", fps: ["fp-cam-1"],                                 inactive: false, live: true },
    { token: "f6h3w5", name: "Anonymous — link only", persona: "bouncer",  fps: ["fp-anon-1"],                                inactive: false },
    { token: "k8d2v7", name: "Disabled — old VC",     persona: "engaged",  fps: ["fp-olv-1"],                                 inactive: true },
    { token: "z3b9m4", name: "Cold outreach 1",       persona: "bouncer",  fps: ["fp-cold1-1"],                               inactive: false },
    { token: "t5w7g2", name: "Cold outreach 2",       persona: "engaged",  fps: ["fp-cold2-1"],                               inactive: false, live: true },
  ];
}

function buildSessions(linkRows) {
  const sessions = [];
  const adjustView = {};

  linkRows.forEach((link, idx) => {
    const spec = SEED_LINKS_BY_TOKEN[link.token];
    let viewCount = 0;
    let lastViewed = null;

    spec.fps.forEach((fp, fpIdx) => {
      const sessionsForFp = rand(1, spec.fps.length >= 3 ? 2 : 3);
      // 2-fp same city; 3-fp mixed cities; 1-fp single city
      let city;
      if (spec.fps.length === 2) city = CITIES[0];
      else if (spec.fps.length >= 3) city = CITIES[fpIdx % CITIES.length];
      else city = CITIES[idx % CITIES.length];

      const device = DEVICES[(idx + fpIdx) % DEVICES.length];

      for (let i = 0; i < sessionsForFp; i++) {
        const dwells = PERSONAS[spec.persona]();
        const total = totalOf(dwells);
        const maxR = maxSlide(dwells);
        const startedAt = Date.now() - rand(5 * 3600_000, 30 * 86_400_000);
        let lastTick = startedAt + total * 1000;
        const isLiveOne = spec.live && fpIdx === 0 && i === 0;
        if (isLiveOne) lastTick = Date.now() - rand(5_000, 60_000);

        const endedAt = isLiveOne ? null : new Date(lastTick + 90_000).toISOString();

        sessions.push({
          id: uuid(),
          link_id: link.id,
          viewer_email: null,
          started_at: new Date(startedAt).toISOString(),
          last_tick_at: new Date(lastTick).toISOString(),
          ended_at: endedAt,
          total_seconds: total,
          slide_dwells: dwells,
          max_slide_reached: maxR,
          device: { ...device, ua: "demo", tz: city.tz },
          geo: city,
          fp_hash: fp,
          ip_hash: null,
          is_bot: false,
          summary_sent_at: endedAt && Math.random() > 0.4 ? new Date(lastTick + 100_000).toISOString() : null,
        });
        viewCount++;
        if (!lastViewed || lastTick > new Date(lastViewed).getTime()) {
          lastViewed = new Date(lastTick).toISOString();
        }
      }
    });

    adjustView[link.id] = { view_count: viewCount, last_viewed_at: lastViewed };
  });

  // Bot session on first link
  sessions.push({
    id: uuid(),
    link_id: linkRows[0].id,
    viewer_email: null,
    started_at: new Date(Date.now() - 86_400_000).toISOString(),
    last_tick_at: new Date(Date.now() - 86_400_000 + 2000).toISOString(),
    ended_at: new Date(Date.now() - 86_400_000 + 90_000).toISOString(),
    total_seconds: 2,
    slide_dwells: { 0: 2 },
    max_slide_reached: 0,
    device: { browser: "Slackbot", os: "Linux", mobile: false, ua: "Slackbot 1.0", bot: true },
    geo: CITIES[0],
    fp_hash: null,
    is_bot: true,
    summary_sent_at: null,
  });

  // 5 organic verified sessions
  for (let i = 0; i < 5; i++) {
    const persona = pick(["bouncer", "engaged", "engaged", "champion"]);
    const dwells = PERSONAS[persona]();
    const startedAt = Date.now() - rand(3600_000, 14 * 86_400_000);
    sessions.push({
      id: uuid(),
      link_id: null,
      viewer_email: `viewer${i + 1}@example.com`,
      started_at: new Date(startedAt).toISOString(),
      last_tick_at: new Date(startedAt + totalOf(dwells) * 1000).toISOString(),
      ended_at: new Date(startedAt + totalOf(dwells) * 1000 + 90_000).toISOString(),
      total_seconds: totalOf(dwells),
      slide_dwells: dwells,
      max_slide_reached: maxSlide(dwells),
      device: pick(DEVICES),
      geo: pick(CITIES),
      fp_hash: `fp-organic-${i + 1}`,
      is_bot: false,
      summary_sent_at: Math.random() > 0.5 ? new Date(startedAt + 100_000).toISOString() : null,
    });
  }

  return { sessions, adjustView };
}

const SEED_LINKS_BY_TOKEN = {};
buildLinks().forEach((l) => { SEED_LINKS_BY_TOKEN[l.token] = l; });

function init() {
  const now = new Date().toISOString();
  const seedLinks = buildLinks();
  const linkRows = seedLinks.map((l, i) => ({
    id: uuid(),
    token: l.token,
    name: l.name,
    note: null,
    is_active: !l.inactive,
    expires_at: null,
    created_by: process.env.GP_EMAIL?.split(",")[0]?.trim() || "demo@example.com",
    created_at: new Date(Date.now() - (i + 1) * 86_400_000).toISOString(),
    view_count: 0,
    last_viewed_at: null,
  }));

  const { sessions, adjustView } = buildSessions(linkRows);
  for (const row of linkRows) {
    const adj = adjustView[row.id];
    if (adj) {
      row.view_count = adj.view_count;
      row.last_viewed_at = adj.last_viewed_at;
    }
  }

  const approvals = [
    { id: uuid(), email: "curious@vc.example",    status: "pending", requested_at: new Date(Date.now() - 2 * 3600_000).toISOString() },
    { id: uuid(), email: "researcher@example.org", status: "pending", requested_at: new Date(Date.now() - 20 * 3600_000).toISOString() },
    { id: uuid(), email: "mayor@example.gov",      status: "pending", requested_at: new Date(Date.now() - 3 * 86_400_000).toISOString() },
  ];

  const settings = {
    public_access: true,
    email_on_request: true,
    email_on_new_email: true,
    email_on_link_open: true,
    email_on_link_open_every: true,
    email_on_session_end: true,
    free_slide_count: 5,
    notification_min_gap_seconds: 60,
    updated_at: now,
  };

  return { links: linkRows, sessions, approvals, settings };
}

let STATE = init();

export function isDemoMode() {
  const bypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";
  const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return bypass && !hasSupabase;
}

// ---- Public API (mirrors the supabase queries we'd otherwise run) ----

export const demo = {
  listLinks({ q = "", status = "all" } = {}) {
    let rows = [...STATE.links];
    if (status === "active") rows = rows.filter((l) => l.is_active);
    if (status === "disabled") rows = rows.filter((l) => !l.is_active);
    if (q) {
      const t = q.toLowerCase();
      rows = rows.filter((l) => l.name.toLowerCase().includes(t) || l.token.toLowerCase().includes(t));
    }
    rows.sort((a, b) => {
      const av = a.last_viewed_at ? new Date(a.last_viewed_at).getTime() : 0;
      const bv = b.last_viewed_at ? new Date(b.last_viewed_at).getTime() : 0;
      if (av !== bv) return bv - av;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return rows;
  },
  createLink({ name, note, token, createdBy }) {
    const row = {
      id: uuid(),
      token,
      name,
      note,
      is_active: true,
      expires_at: null,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      view_count: 0,
      last_viewed_at: null,
    };
    STATE.links.unshift(row);
    return row;
  },
  updateLink(id, patch) {
    const row = STATE.links.find((l) => l.id === id);
    if (!row) return null;
    Object.assign(row, patch);
    return row;
  },
  deleteLink(id) {
    const i = STATE.links.findIndex((l) => l.id === id);
    if (i >= 0) STATE.links.splice(i, 1);
  },
  listSessions({ days = 30, limit = 50, linkId = null } = {}) {
    const since = Date.now() - days * 86_400_000;
    let rows = STATE.sessions.filter((s) => new Date(s.started_at).getTime() >= since);
    if (linkId) rows = rows.filter((s) => s.link_id === linkId);
    rows.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    rows = rows.slice(0, limit);
    return rows.map((s) => ({ ...s, link: s.link_id ? STATE.links.find((l) => l.id === s.link_id) || null : null }));
  },
  getSession(id) {
    const s = STATE.sessions.find((x) => x.id === id);
    if (!s) return null;
    const link = s.link_id ? STATE.links.find((l) => l.id === s.link_id) : null;
    const related = s.fp_hash
      ? STATE.sessions.filter((x) => x.fp_hash === s.fp_hash && x.id !== s.id).slice(0, 20)
      : [];
    return { session: s, link: link || null, related, events: [] };
  },
  activity({ days = 30 } = {}) {
    const since = Date.now() - days * 86_400_000;
    const rows = STATE.sessions.filter((s) => !s.is_bot && new Date(s.started_at).getTime() >= since);
    const totalSessions = rows.length;
    const totalSeconds = rows.reduce((a, s) => a + (s.total_seconds || 0), 0);
    const fps = new Set(rows.map((s) => s.fp_hash).filter(Boolean));
    const liveSince = Date.now() - 90_000;
    const liveNowCount = rows.filter((s) => new Date(s.last_tick_at).getTime() >= liveSince).length;
    return { totalSessions, totalSeconds, uniqueFingerprints: fps.size, liveNowCount, days };
  },
  liveCount() {
    const liveSince = Date.now() - 90_000;
    return STATE.sessions.filter((s) => !s.is_bot && new Date(s.last_tick_at).getTime() >= liveSince).length;
  },
  listApprovals() {
    return STATE.approvals.filter((a) => a.status === "pending");
  },
  actOnApproval(id, action) {
    const a = STATE.approvals.find((x) => x.id === id);
    if (!a) return null;
    a.status = action === "approve" ? "approved" : "denied";
    a.reviewed_at = new Date().toISOString();
    return a;
  },
  getSettings() {
    return STATE.settings;
  },
  patchSettings(patch) {
    Object.assign(STATE.settings, patch, { updated_at: new Date().toISOString() });
    return STATE.settings;
  },
  reset() {
    STATE = init();
  },
};
