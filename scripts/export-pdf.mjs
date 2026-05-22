#!/usr/bin/env node
/**
 * Exports the 29-panel deck to a single compressed PDF on the user's Desktop.
 *
 * Strategy: navigate to /deck?slide=N via Puppeteer for each panel, screenshot
 * at the configured viewport as JPEG, and assemble all frames into one PDF
 * with pdf-lib. JPEG quality 82 + 1920×1080 keeps the file small while text
 * stays crisp enough at typical viewing distance.
 *
 * Requires:
 *   - npm install --no-save puppeteer-core pdf-lib
 *   - Dev server running on :3000 with LOCAL_DEV_ADMIN_BYPASS=true so /deck
 *     renders without OTP
 *   - Google Chrome installed at the standard macOS path
 *
 * Run:  node scripts/export-pdf.mjs
 */

import puppeteer from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

const URL = process.env.DECK_URL || "http://localhost:3000/deck";
const OUT = path.join(homedir(), "Desktop", "PFA-Deck.pdf");
const VIEWPORT = { width: 1920, height: 1080 };
const PANEL_COUNT = 29;
const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const JPEG_QUALITY = Number(process.env.JPEG_QUALITY || 72);

async function exportPdf() {
  console.log(`Launching Chrome from ${CHROME}…`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME,
    args: ["--no-sandbox", "--hide-scrollbars"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ ...VIEWPORT, deviceScaleFactor: 1 });

    // Kill animations / transitions so screenshots capture the final
    // settled frame even if we don't wait the full transition duration.
    // Also hides scroll hints + progress dots so the deck looks clean.
    const KILL_MOTION_CSS = `
      *, *::before, *::after {
        transition-duration: 0s !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
      }
      [data-animate] { opacity: 1 !important; transform: none !important; }
      .progress, .tap-hint, .hero__scroll { display: none !important; }
    `;

    console.log(`Warming up deck at ${URL}…`);
    await page.goto(URL, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.addStyleTag({ content: KILL_MOTION_CSS });

    const pdf = await PDFDocument.create();
    pdf.setTitle("Palace of Fine Arts — A new civic destination for San Francisco");
    pdf.setAuthor("Cameron Wiese · World's Fair Co.");
    pdf.setCreator("pfa-share/export-pdf.mjs");

    for (let i = 0; i < PANEL_COUNT; i++) {
      process.stdout.write(`  slide ${String(i).padStart(2, " ")} … `);
      await page.goto(`${URL}?slide=${i}`, {
        waitUntil: "networkidle0",
        timeout: 60_000,
      });
      // Re-inject animation killer on every nav (fresh document each time).
      await page.addStyleTag({ content: KILL_MOTION_CSS });

      // Wait for any in-flight images to settle, then a short beat to let
      // the deck script land on the requested slide.
      await page.evaluate(async () => {
        await new Promise((r) => setTimeout(r, 400));
        const imgs = Array.from(document.images);
        await Promise.all(
          imgs.map((img) => {
            if (img.complete) return null;
            return new Promise((res) => {
              img.addEventListener("load", res, { once: true });
              img.addEventListener("error", res, { once: true });
            });
          })
        );
      });

      const buffer = await page.screenshot({
        type: "jpeg",
        quality: JPEG_QUALITY,
        fullPage: false,
        clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
      });

      const img = await pdf.embedJpg(buffer);
      const pdfPage = pdf.addPage([VIEWPORT.width, VIEWPORT.height]);
      pdfPage.drawImage(img, {
        x: 0,
        y: 0,
        width: VIEWPORT.width,
        height: VIEWPORT.height,
      });
      process.stdout.write("✓\n");
    }

    const bytes = await pdf.save({ useObjectStreams: true });
    await fs.writeFile(OUT, bytes);

    const stats = await fs.stat(OUT);
    console.log(`\nWrote ${OUT}`);
    console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } finally {
    await browser.close();
  }
}

exportPdf().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
