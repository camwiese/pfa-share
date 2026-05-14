#!/usr/bin/env node
/* Generate responsive AVIF / WebP / JPEG variants for images used on the
 * site. Outputs to images/opt/<name>-<width>.<ext>. Skips variants whose
 * output is newer than the source. Run with `npm run images`. */

import { readdir, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, parse, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_DIR = join(ROOT, 'images');
const OUT_DIR = join(SRC_DIR, 'opt');

const WIDTHS = [800, 1280, 1672];

const FORMATS = [
  { ext: 'avif', options: { quality: 55, effort: 6, chromaSubsampling: '4:2:0' } },
  { ext: 'webp', options: { quality: 78, effort: 5 } },
  { ext: 'jpg',  options: { quality: 82, mozjpeg: true, progressive: true } },
];

const SOURCES = [
  'header-image.png',
  '1915-PPIE-full.jpg',
  'Park-Lagoon-2.png',
  'grounds-0.png',
  'grounds-1.png',
  'grounds-2.png',
  'grounds-3.jpeg',
  'fare-1.png',
  'fare-2.png',
  'exhibit-0.png',
  'exhibit-1.png',
  'exhibit-3.png',
  'exhibit-4.png',
  'exhibit-5.png',
  'lab-2.png',
];

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}

async function isOutdated(srcPath, outPath) {
  if (!existsSync(outPath)) return true;
  const [s, o] = await Promise.all([stat(srcPath), stat(outPath)]);
  return s.mtimeMs > o.mtimeMs;
}

async function processOne(filename) {
  const srcPath = join(SRC_DIR, filename);
  if (!existsSync(srcPath)) {
    console.warn(`  skip (missing): ${filename}`);
    return { skipped: 0, written: 0, bytesWritten: 0 };
  }

  const meta = await sharp(srcPath).metadata();
  const baseName = parse(filename).name;
  const srcStat = await stat(srcPath);
  const srcSize = srcStat.size;

  let written = 0;
  let skipped = 0;
  let bytesWritten = 0;

  // Generate every target width. `withoutEnlargement: true` (set in the
  // pipeline below) caps the output at the source's actual width, so a
  // 1670-wide source will produce a "1672w" file that is really 1670 wide.
  // Browsers use the srcset descriptor for selection, so this is fine.
  const widths = WIDTHS.slice();

  for (const width of widths) {
    for (const fmt of FORMATS) {
      const outName = `${baseName}-${width}.${fmt.ext}`;
      const outPath = join(OUT_DIR, outName);

      if (!(await isOutdated(srcPath, outPath))) {
        skipped++;
        continue;
      }

      let pipeline = sharp(srcPath, { failOn: 'error' })
        .rotate() // honor EXIF orientation
        .resize({ width, withoutEnlargement: true });

      if (fmt.ext === 'avif') pipeline = pipeline.avif(fmt.options);
      else if (fmt.ext === 'webp') pipeline = pipeline.webp(fmt.options);
      else if (fmt.ext === 'jpg') pipeline = pipeline.jpeg(fmt.options);

      await pipeline.toFile(outPath);
      const outStat = await stat(outPath);
      bytesWritten += outStat.size;
      written++;
    }
  }

  console.log(
    `  ${filename.padEnd(28)} src ${fmtBytes(srcSize).padStart(8)}  →  ${written} new, ${skipped} cached`,
  );
  return { skipped, written, bytesWritten };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`Optimizing ${SOURCES.length} source images → ${OUT_DIR}`);
  console.log(`Widths: ${WIDTHS.join(', ')}  Formats: ${FORMATS.map((f) => f.ext).join(', ')}\n`);

  let totalWritten = 0;
  let totalSkipped = 0;
  let totalBytesWritten = 0;

  for (const src of SOURCES) {
    const { written, skipped, bytesWritten } = await processOne(src);
    totalWritten += written;
    totalSkipped += skipped;
    totalBytesWritten += bytesWritten;
  }

  // Total output size on disk for the opt/ directory.
  const all = await readdir(OUT_DIR);
  let totalOnDisk = 0;
  for (const f of all) {
    const s = await stat(join(OUT_DIR, f));
    totalOnDisk += s.size;
  }

  console.log(
    `\nDone. ${totalWritten} written, ${totalSkipped} cached.  ` +
      `Bytes written this run: ${fmtBytes(totalBytesWritten)}.  ` +
      `opt/ total on disk: ${fmtBytes(totalOnDisk)}.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
