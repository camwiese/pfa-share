#!/usr/bin/env node
/* Capture every panel of the deck as a PDF page and save to ~/Desktop. */

import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const URL = 'http://localhost:8765';
const VIEWPORT = { width: 1280, height: 800 };
const OUT_PATH = join(homedir(), 'Desktop', 'pfa-share-deck.pdf');

const browser = await puppeteer.launch({
  defaultViewport: VIEWPORT,
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport(VIEWPORT);
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });

// Eagerly load all images so subsequent panels don't show blank.
await page.evaluate(() => {
  document.querySelectorAll('img').forEach((i) => i.setAttribute('loading', 'eager'));
});
await new Promise((r) => setTimeout(r, 2500));

const count = await page.evaluate(() => document.querySelectorAll('.panel[data-panel]').length);
console.log(`Capturing ${count} panels @ ${VIEWPORT.width}x${VIEWPORT.height}…`);

// Jump to start
await page.keyboard.press('Home');
await new Promise((r) => setTimeout(r, 800));

const pdfDoc = await PDFDocument.create();

for (let i = 0; i < count; i++) {
  if (i > 0) {
    await page.keyboard.press('ArrowDown');
    await new Promise((r) => setTimeout(r, 700)); // let transition + images settle
  } else {
    await new Promise((r) => setTimeout(r, 300));
  }
  const png = await page.screenshot({ type: 'png', fullPage: false });
  const img = await pdfDoc.embedPng(png);
  const p = pdfDoc.addPage([VIEWPORT.width, VIEWPORT.height]);
  p.drawImage(img, { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height });
  process.stdout.write(`  panel ${i + 1}/${count}\r`);
}

const bytes = await pdfDoc.save();
await writeFile(OUT_PATH, bytes);
await browser.close();

console.log(`\nWrote ${OUT_PATH} (${(bytes.length / 1024 / 1024).toFixed(2)} MB)`);
