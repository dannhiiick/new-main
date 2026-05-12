#!/usr/bin/env node
// Generates branded icon.png, adaptive-icon.png, splash.png for MoodStream KZ
// Run: node scripts/gen-assets.js

const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '../assets/images');

// Brand colors
const BG    = { r: 0x0D, g: 0x13, b: 0x26 }; // #0D1326 deep navy
const ACC   = { r: 0xC8, g: 0x7B, b: 0x4E }; // #C87B4E copper
const ACC2  = { r: 0xD4, g: 0xB8, b: 0x96 }; // #D4B896 warm sand

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function setPixel(png, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * Math.round(y) + Math.round(x)) << 2;
  png.data[idx]     = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function fillRect(png, x, y, w, h, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(png, x + dx, y + dy, r, g, b, a);
}

function fillRoundRect(png, x, y, w, h, radius, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx, py = y + dy;
      // Corner distance check
      const cx = dx < radius ? radius : dx > w - radius - 1 ? w - radius - 1 : dx;
      const cy = dy < radius ? radius : dy > h - radius - 1 ? h - radius - 1 : dy;
      const dist = Math.sqrt((dx - cx) ** 2 + (dy - cy) ** 2);
      if (dx < radius || dx >= w - radius || dy < radius || dy >= h - radius) {
        if (dist > radius) continue;
      }
      setPixel(png, px, py, r, g, b, a);
    }
  }
}

function drawBar(png, cx, cy, barW, barH, color) {
  const x = Math.round(cx - barW / 2);
  const y = Math.round(cy - barH / 2);
  const radius = Math.min(barW / 2, 12);
  fillRoundRect(png, x, y, barW, barH, radius, color.r, color.g, color.b);
}

function fillBackground(png, c) {
  const len = png.width * png.height * 4;
  for (let i = 0; i < len; i += 4) {
    png.data[i]     = c.r;
    png.data[i + 1] = c.g;
    png.data[i + 2] = c.b;
    png.data[i + 3] = 255;
  }
}

function drawWaveform(png, cx, cy, scale = 1) {
  // 5 bars: heights proportional to a waveform peak
  const heights = [0.38, 0.68, 1.0, 0.68, 0.38];
  const maxH = 340 * scale;
  const barW  = Math.round(72 * scale);
  const gap   = Math.round(36 * scale);
  const total = heights.length * barW + (heights.length - 1) * gap;
  const startX = cx - total / 2 + barW / 2;

  heights.forEach((h, i) => {
    const barH = Math.round(maxH * h);
    const bx = startX + i * (barW + gap);
    // Gradient: bottom ACC, top ACC2
    const t = h;
    const color = {
      r: lerp(ACC.r, ACC2.r, t * 0.6),
      g: lerp(ACC.g, ACC2.g, t * 0.6),
      b: lerp(ACC.b, ACC2.b, t * 0.6),
    };
    drawBar(png, bx, cy, barW, barH, color);
  });
}

function savePNG(png, filename) {
  const out = path.join(OUT, filename);
  const buf = PNG.sync.write(png);
  fs.writeFileSync(out, buf);
  console.log(`✓ ${filename} (${png.width}×${png.height})`);
}

// ─── Icon 1024×1024 ───────────────────────────────────────────────────────────
function genIcon() {
  const S = 1024;
  const png = new PNG({ width: S, height: S });
  fillBackground(png, BG);

  // Subtle radial glow in center
  const cx = S / 2, cy = S / 2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const t = Math.max(0, 1 - dist / (S * 0.55));
      const glow = Math.round(t * t * 22);
      const idx = (S * y + x) << 2;
      png.data[idx]     = Math.min(255, BG.r + glow);
      png.data[idx + 1] = Math.min(255, BG.g + glow);
      png.data[idx + 2] = Math.min(255, BG.b + Math.round(glow * 1.5));
      png.data[idx + 3] = 255;
    }
  }

  drawWaveform(png, cx, cy, 1.0);
  savePNG(png, 'icon.png');
}

// ─── Adaptive icon foreground 1024×1024 (no bg, just waveform centered) ─────
function genAdaptiveIcon() {
  const S = 1024;
  const png = new PNG({ width: S, height: S });
  // Transparent background
  png.data.fill(0);

  // Draw waveform centered, slightly smaller (safe zone = 66% of canvas)
  drawWaveform(png, S / 2, S / 2, 0.75);
  savePNG(png, 'adaptive-icon.png');
}

// ─── Splash 2048×2048 ────────────────────────────────────────────────────────
function genSplash() {
  const S = 2048;
  const png = new PNG({ width: S, height: S });
  fillBackground(png, BG);

  const cx = S / 2, cy = S / 2;

  // Radial glow
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const t = Math.max(0, 1 - dist / (S * 0.45));
      const glow = Math.round(t * t * 30);
      const idx = (S * y + x) << 2;
      png.data[idx]     = Math.min(255, BG.r + glow);
      png.data[idx + 1] = Math.min(255, BG.g + glow);
      png.data[idx + 2] = Math.min(255, BG.b + Math.round(glow * 2));
      png.data[idx + 3] = 255;
    }
  }

  // Waveform at center, scaled up
  drawWaveform(png, cx, cy - 80, 1.6);

  savePNG(png, 'splash.png');
}

genIcon();
genAdaptiveIcon();
genSplash();
console.log('\nDone. Run "npx expo prebuild" or rebuild to apply.');
