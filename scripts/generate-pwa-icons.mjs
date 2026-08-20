// scripts/generate-pwa-icons.mjs
// Gera os PNGs de ícone PWA a partir de public/brand/circly-icon.svg.
// Uso: node scripts/generate-pwa-icons.mjs
// Requer: sharp (devDependency).

import { readFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

const SRC_SVG = resolve(ROOT, "public/brand/circly-icon.svg");
const OUT_DIR = resolve(ROOT, "public/brand");

const BG = "#0C0D0F";

async function loadSharp() {
  try {
    const mod = await import("sharp");
    return mod.default;
  } catch (err) {
    console.error(
      "[generate-pwa-icons] sharp não encontrado. Instale com: pnpm add -D sharp"
    );
    throw err;
  }
}

/**
 * Compõe um SVG wrapper com bg cheio e cantos arredondados,
 * embutindo o ícone (símbolo Circly) centralizado em um viewport `size`.
 * `iconScale` é a fração do lado ocupada pelo símbolo (0..1).
 * `radiusRatio` é o raio dos cantos como fração do lado (0..0.5).
 */
function buildWrapperSvg({ innerSvgMarkup, size, iconScale, radiusRatio }) {
  const iconSide = Math.round(size * iconScale);
  const offset = Math.round((size - iconSide) / 2);
  const radius = Math.round(size * radiusRatio);

  // Remove a tag <svg ...> externa do inner (mantém apenas o conteúdo)
  // para permitir reaproveitar o viewBox e escalar via nested <svg>.
  const innerBody = innerSvgMarkup
    .replace(/^\s*<\?xml[\s\S]*?\?>\s*/i, "")
    .replace(/^\s*<!--[\s\S]*?-->\s*/g, "");

  // Extrai atributos do svg original para reusar o viewBox
  const svgOpenMatch = innerBody.match(/<svg\b([^>]*)>/i);
  const svgAttrs = svgOpenMatch ? svgOpenMatch[1] : 'viewBox="0 0 72 72"';
  const svgContent = innerBody
    .replace(/<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BG}"/>
  <svg x="${offset}" y="${offset}" width="${iconSide}" height="${iconSide}" ${svgAttrs}>
    ${svgContent}
  </svg>
</svg>`;
}

/**
 * Wrapper full-bleed sem cantos arredondados (para maskable).
 * O ícone fica dentro da safe zone (~60% do lado).
 */
function buildMaskableSvg({ innerSvgMarkup, size, iconScale }) {
  const iconSide = Math.round(size * iconScale);
  const offset = Math.round((size - iconSide) / 2);

  const innerBody = innerSvgMarkup
    .replace(/^\s*<\?xml[\s\S]*?\?>\s*/i, "")
    .replace(/^\s*<!--[\s\S]*?-->\s*/g, "");

  const svgOpenMatch = innerBody.match(/<svg\b([^>]*)>/i);
  const svgAttrs = svgOpenMatch ? svgOpenMatch[1] : 'viewBox="0 0 72 72"';
  const svgContent = innerBody
    .replace(/<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="0" y="0" width="${size}" height="${size}" fill="${BG}"/>
  <svg x="${offset}" y="${offset}" width="${iconSide}" height="${iconSide}" ${svgAttrs}>
    ${svgContent}
  </svg>
</svg>`;
}

async function renderSvgToPng(sharp, svgString, outPath, size) {
  await sharp(Buffer.from(svgString), { density: 384 })
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`[generate-pwa-icons] escrito: ${outPath}`);
}

async function main() {
  const sharp = await loadSharp();
  await mkdir(OUT_DIR, { recursive: true });
  const innerSvgMarkup = await readFile(SRC_SVG, "utf8");

  // 192x192 (any) — cantos arredondados suaves, ícone ocupando ~72%
  const svg192 = buildWrapperSvg({
    innerSvgMarkup,
    size: 192,
    iconScale: 0.72,
    radiusRatio: 0.18,
  });
  await renderSvgToPng(
    sharp,
    svg192,
    resolve(OUT_DIR, "icon-192.png"),
    192
  );

  // 512x512 (any) — mesmo tratamento
  const svg512 = buildWrapperSvg({
    innerSvgMarkup,
    size: 512,
    iconScale: 0.72,
    radiusRatio: 0.18,
  });
  await renderSvgToPng(
    sharp,
    svg512,
    resolve(OUT_DIR, "icon-512.png"),
    512
  );

  // 512x512 (maskable) — safe zone ~60%, bg full-bleed
  const svgMaskable = buildMaskableSvg({
    innerSvgMarkup,
    size: 512,
    iconScale: 0.6,
  });
  await renderSvgToPng(
    sharp,
    svgMaskable,
    resolve(OUT_DIR, "icon-maskable-512.png"),
    512
  );

  console.log("[generate-pwa-icons] concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
