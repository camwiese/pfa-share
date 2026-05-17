#!/usr/bin/env node
/**
 * Seed dummy data for the admin dashboard.
 * Usage:   node scripts/seed-dummy.js
 * Reads:   .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 * Wipes:   events, sessions, links, access_requests
 * Keeps:   allowed_emails, partner_admins, settings, otp_attempts
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local manually so we don't need dotenv.
function loadEnv() {
  try {
    const text = readFileSync(resolve(__dirname, "..", ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch (err) {
    // ignore
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  console.error("Provision Supabase + run supabase-migrations/001_init.sql, then paste keys into .env.local.");
  process.exit(1);
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const ADMIN = process.env.GP_EMAIL?.split(",")[0]?.trim() || "admin@example.com";

const TOKENS = ["x7q2k9", "a3m8b2", "j5n7c4", "p9q4r2", "f6h3w5", "k8d2v7", "z3b9m4", "t5w7g2"];
const LINKS = [
  { token: TOKENS[0], name: "Jane @ Sequoia",        persona: "champion", fps: ["fp_jane_1"] },
  { token: TOKENS[1], name: "Marc Benioff",          persona: "engaged",  fps: ["fp_marc_1", "fp_marc_2"] },     // 2 same city
  { token: TOKENS[2], name: "SF Mayor's Office",     persona: "engaged",  fps: ["fp_mayor_1", "fp_mayor_2", "fp_mayor_3"] }, // 3 mixed
  { token: TOKENS[3], name: "Demo — Cam test",       persona: "champion", fps: ["fp_cam_1"] },
  { token: TOKENS[4], name: "Anonymous — link only", persona: "bouncer",  fps: ["fp_anon_1"] },
  { token: TOKENS[5], name: "Disabled — old VC",     persona: "engaged",  fps: ["fp_olv_1"], inactive: true },
  { token: TOKENS[6], name: "Cold outreach 1",       persona: "bouncer",  fps: ["fp_cold1_1"] },
  { token: TOKENS[7], name: "Cold outreach 2",       persona: "engaged",  fps: ["fp_cold2_1"], live: true },
];

const CITIES = [
  { city: "San Francisco", region: "CA", country: "US", lat: 37.78, lon: -122.42, tz: "America/Los_Angeles" },
  { city: "Palo Alto",     region: "CA", country: "US", lat: 37.44, lon: -122.14, tz: "America/Los_Angeles" },
  { city: "New York",      region: "NY", country: "US", lat: 40.71, lon: -74.00,  tz: "America/New_York" },
  { city: "Los Angeles",   region: "CA", country: "US", lat: 34.05, lon: -118.24, tz: "America/Los_Angeles" },
  { city: "London",        region: "ENG", country: "GB", lat: 51.51, lon: -0.13,  tz: "Europe/London" },
  { city: "Tokyo",         region: "13", country: "JP", lat: 35.68, lon: 139.69,  tz: "Asia/Tokyo" },
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

function fakeDwells(persona) {
  // Returns {"0": secs, "1": secs, ...} up to a stop slide.
  const out = {};
  let stop;
  if (persona === "bouncer") stop = randInt(3, 8);
  else if (persona === "engaged") stop = randInt(12, 20);
  else stop = 27;

  for (let i = 0; i <= stop; i++) {
    let base;
    if (i < 5) base = randInt(8, 18);
    else if (i < 15) base = randInt(5, 14);
    else if (i < 25) base = randInt(3, 10);
    else base = randInt(15, 60); // letter / final beats
    out[String(i)] = base;
  }
  if (persona === "champion") out["27"] = randInt(40, 90);
  return out;
}

function totalOf(d) {
  return Object.values(d).reduce((acc, v) => acc + (Number(v) || 0), 0);
}

function maxSlide(d) {
  let m = 0;
  for (const k of Object.keys(d)) m = Math.max(m, Number(k));
  return m;
}

function randInt(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function wipe() {
  console.log("Wiping events, sessions, links, access_requests…");
  await svc.from("events").delete().not("id", "is", null);
  await svc.from("sessions").delete().not("id", "is", null);
  await svc.from("links").delete().not("id", "is", null);
  await svc.from("access_requests").delete().not("id", "is", null);
}

async function insertLinks() {
  const rows = LINKS.map((l) => ({
    token: l.token,
    name: l.name,
    note: null,
    is_active: !l.inactive,
    created_by: ADMIN,
  }));
  const { data, error } = await svc.from("links").insert(rows).select("*");
  if (error) throw new Error("links insert: " + error.message);
  return data;
}

async function insertSessions(insertedLinks) {
  // Map back token → row.
  const byToken = Object.fromEntries(insertedLinks.map((l) => [l.token, l]));

  const sessionsToInsert = [];
  const linkUpdates = [];

  for (const linkSpec of LINKS) {
    const linkRow = byToken[linkSpec.token];
    if (!linkRow) continue;

    const isMixedCity = linkSpec.fps.length >= 3;
    let viewCount = 0;
    let lastViewedAt = null;

    for (const fp of linkSpec.fps) {
      const sessionsForThisFp = randInt(1, isMixedCity ? 2 : 3);
      // Pick a city: same for all fps unless mixedCity is true.
      const cityForFp = isMixedCity ? pick(CITIES) : CITIES[linkSpec.fps.indexOf(fp) === 0 ? 0 : 0];
      // For the "engaged" 2-fps case (Marc), keep cities the same to land yellow.
      const effectiveCity = (linkSpec.fps.length === 2) ? CITIES[0] : cityForFp;
      const device = pick(DEVICES);

      for (let i = 0; i < sessionsForThisFp; i++) {
        const dwells = fakeDwells(linkSpec.persona);
        const total = totalOf(dwells);
        const maxR = maxSlide(dwells);
        // Stagger: between 5h and 30 days ago.
        const startedAtMs = Date.now() - randInt(5 * 3600_000, 30 * 86400_000);
        let lastTickMs = startedAtMs + total * 1000;
        if (linkSpec.live && i === 0) lastTickMs = Date.now() - randInt(5_000, 60_000);

        const endedAt = linkSpec.live && i === 0
          ? null
          : new Date(lastTickMs + 90_000).toISOString();

        sessionsToInsert.push({
          link_id: linkRow.id,
          viewer_email: null,
          started_at: new Date(startedAtMs).toISOString(),
          last_tick_at: new Date(lastTickMs).toISOString(),
          ended_at: endedAt,
          total_seconds: total,
          slide_dwells: dwells,
          max_slide_reached: maxR,
          device: { ...device, ua: "seed-script", tz: effectiveCity.tz },
          geo: effectiveCity,
          fp_hash: fp,
          ip_hash: null,
          is_bot: false,
        });
        viewCount++;
        if (!lastViewedAt || new Date(lastTickMs) > new Date(lastViewedAt)) {
          lastViewedAt = new Date(lastTickMs).toISOString();
        }
      }
    }

    linkUpdates.push({ id: linkRow.id, view_count: viewCount, last_viewed_at: lastViewedAt });
  }

  // Add a bot session on link 0 (excluded from headline counts).
  sessionsToInsert.push({
    link_id: insertedLinks[0].id,
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
  });

  // Add 5 organic verified sessions (no link).
  for (let i = 0; i < 5; i++) {
    const persona = pick(["bouncer", "engaged", "engaged", "champion"]);
    const dwells = fakeDwells(persona);
    const startedAtMs = Date.now() - randInt(3600_000, 14 * 86400_000);
    sessionsToInsert.push({
      link_id: null,
      viewer_email: `viewer${i + 1}@example.com`,
      started_at: new Date(startedAtMs).toISOString(),
      last_tick_at: new Date(startedAtMs + totalOf(dwells) * 1000).toISOString(),
      ended_at: new Date(startedAtMs + totalOf(dwells) * 1000 + 90_000).toISOString(),
      total_seconds: totalOf(dwells),
      slide_dwells: dwells,
      max_slide_reached: maxSlide(dwells),
      device: pick(DEVICES),
      geo: pick(CITIES),
      fp_hash: `fp_organic_${i + 1}`,
      is_bot: false,
    });
  }

  console.log(`Inserting ${sessionsToInsert.length} sessions…`);
  const { error: sErr } = await svc.from("sessions").insert(sessionsToInsert);
  if (sErr) throw new Error("sessions insert: " + sErr.message);

  // Update link view_count / last_viewed_at.
  for (const u of linkUpdates) {
    await svc.from("links").update({ view_count: u.view_count, last_viewed_at: u.last_viewed_at }).eq("id", u.id);
  }
}

async function insertAccessRequests() {
  console.log("Inserting 3 pending access requests…");
  await svc.from("access_requests").insert([
    { email: "curious@vc.example", status: "pending" },
    { email: "researcher@example.org", status: "pending" },
    { email: "mayor@example.gov", status: "pending" },
  ]);
}

async function insertEvents() {
  // A couple of audit-trail rows.
  console.log("Inserting audit events…");
  await svc.from("events").insert([
    { session_id: null, kind: "admin_login", payload: { email: ADMIN } },
    { session_id: null, kind: "link_create", payload: { name: "Cold outreach 2" } },
  ]);
}

async function main() {
  console.log(`Connected to ${SUPABASE_URL}`);
  await wipe();
  const links = await insertLinks();
  console.log(`Inserted ${links.length} links`);
  await insertSessions(links);
  await insertAccessRequests();
  await insertEvents();
  console.log("\nSeed complete. Visit /admin to see the dashboard.");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
