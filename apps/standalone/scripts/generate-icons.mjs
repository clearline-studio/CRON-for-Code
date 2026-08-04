import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..', '..');
const assetsDir = path.join(projectRoot, 'branding', 'assets');

const SOURCE_ICON = path.join(workspaceRoot, 'assets', 'branding', 'code_icon.png');
const SOURCE_LOGO = path.join(workspaceRoot, 'assets', 'branding', 'code_logo.png');

const ICO_OUT = path.join(assetsDir, 'code_icon.ico');
const TRAY_OUT = path.join(assetsDir, 'code_icon_tray.png');
const LOGO_TRANSPARENT_OUT = path.join(assetsDir, 'code_logo_transparent.png');

const BLACK_THRESHOLD = 30;

function assert(ok, msg) { if (!ok) { console.error('ASSERT FAILED:', msg); process.exit(1); } }

function writeIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const entrySize = 16;
  const dirSize = headerSize + count * entrySize;

  const header = Buffer.alloc(dirSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let dataOffset = dirSize;
  const dataChunks = [];

  for (let i = 0; i < count; i++) {
    const png = pngBuffers[i];
    const entryOff = headerSize + i * entrySize;

    const ihdrStart = 8;
    const w = png.readUInt32BE(ihdrStart + 8);
    const h = png.readUInt32BE(ihdrStart + 12);

    header.writeUInt8(w >= 256 ? 0 : w, entryOff);
    header.writeUInt8(h >= 256 ? 0 : h, entryOff + 1);
    header.writeUInt8(0, entryOff + 2);
    header.writeUInt8(0, entryOff + 3);
    header.writeUInt16LE(1, entryOff + 4);
    header.writeUInt16LE(32, entryOff + 6);
    header.writeUInt32LE(png.length, entryOff + 8);
    header.writeUInt32LE(dataOffset, entryOff + 12);

    dataChunks.push(png);
    dataOffset += png.length;
  }

  return Buffer.concat([header, ...dataChunks]);
}

async function generatePng(size) {
  const buf = await sharp(SOURCE_ICON)
    .resize(size, size, { kernel: 'lanczos3' })
    .removeAlpha()
    .ensureAlpha()
    .png()
    .toBuffer();
  return buf;
}

function verifyPngFrame(buf, expectedSize, label) {
  const magic = buf.toString('binary', 1, 4);
  assert(magic === 'PNG', `${label}: not a valid PNG`);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  assert(w === expectedSize && h === expectedSize, `${label}: expected ${expectedSize}x${expectedSize}, got ${w}x${h}`);
  assert(buf.length > 0, `${label}: empty buffer`);
  const colorType = buf.readUInt8(25);
  assert(colorType === 6, `${label}: expected RGBA (colorType 6), got ${colorType}`);
}

async function generateTransparentLogo() {
  assert(fs.existsSync(SOURCE_LOGO), `Logo not found: ${SOURCE_LOGO}`);
  const image = sharp(SOURCE_LOGO).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let count = 0;
  for (let i = 0; i < width * height; i++) {
    const off = i * channels;
    if (data[off] <= BLACK_THRESHOLD && data[off + 1] <= BLACK_THRESHOLD && data[off + 2] <= BLACK_THRESHOLD) {
      data[off + 3] = Math.min(Math.round((Math.max(data[off], data[off + 1], data[off + 2]) / BLACK_THRESHOLD) * 255), 255);
      count++;
    }
  }
  await sharp(data, { raw: { width, height, channels } }).png().toFile(LOGO_TRANSPARENT_OUT);
  console.log(`  Transparent logo: ${count} pixels -> ${LOGO_TRANSPARENT_OUT}`);
}

async function main() {
  console.log('CRON for Code — ICO Generator (Custom Binary)\n');

  assert(fs.existsSync(SOURCE_ICON), `Source icon not found: ${SOURCE_ICON}`);

  console.log('Generating transparent logo...');
  await generateTransparentLogo();

  console.log('\nGenerating ICO frames...');
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const frames = [];
  for (const size of sizes) {
    const buf = await generatePng(size);
    verifyPngFrame(buf, size, `Frame ${size}x${size}`);
    frames.push(buf);
    console.log(`  ${size}x${size} — ${buf.length} bytes — verified PNG`);
  }

  console.log('\nWriting ICO...');
  const icoBuf = writeIco(frames);
  fs.writeFileSync(ICO_OUT, icoBuf);

  const expectedHeaderSize = 6 + 16 * sizes.length;
  assert(icoBuf.length >= expectedHeaderSize, 'ICO too small');
  assert(icoBuf.readUInt16LE(0) === 0, 'ICO reserved field invalid');
  assert(icoBuf.readUInt16LE(2) === 1, 'ICO type field invalid');
  assert(icoBuf.readUInt16LE(4) === sizes.length, 'ICO count field invalid');

  console.log(`  ICO: ${icoBuf.length} bytes — ${sizes.length} frames`);
  console.log(`  -> ${ICO_OUT}`);

  console.log('\nRound-trip verification: extracting ICO frames back to PNG...');
  const count = icoBuf.readUInt16LE(4);
  for (let i = 0; i < count; i++) {
    const entryOff = 6 + i * 16;
    const w = icoBuf.readUInt8(entryOff) || 256;
    const h = icoBuf.readUInt8(entryOff + 1) || 256;
    const size = icoBuf.readUInt32LE(entryOff + 8);
    const offset = icoBuf.readUInt32LE(entryOff + 12);
    const frameData = icoBuf.subarray(offset, offset + size);
    try {
      verifyPngFrame(Buffer.from(frameData), w, `ICO frame ${i} (${w}x${h})`);
      console.log(`  Frame ${i}: ${w}x${h} — OK`);
    } catch (e) {
      console.error(`  Frame ${i}: ${w}x${h} — CORRUPT: ${e.message}`);
    }
  }

  console.log('\nGenerating tray icon...');
  const trayBuf = await generatePng(16);
  verifyPngFrame(trayBuf, 16, 'Tray');
  fs.writeFileSync(TRAY_OUT, trayBuf);
  console.log(`  -> ${TRAY_OUT}`);

  console.log('\n=== Assets in', assetsDir, '===');
  for (const f of fs.readdirSync(assetsDir).sort()) {
    const kb = (fs.statSync(path.join(assetsDir, f)).size / 1024).toFixed(1);
    console.log(`  ${f.padEnd(35)} ${kb.padStart(8)} KB`);
  }
  console.log('\nDone.');
}

main().catch((err) => { console.error(err); process.exit(1); });
