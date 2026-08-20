/**
 * Video filters (Fase 19) — desfoque de fundo e background swap.
 *
 * Usa MediaPipe Tasks Vision (ImageSegmenter com o modelo selfie_segmenter)
 * para produzir uma máscara de confiança do "primeiro plano" a cada frame.
 * Compomos o resultado em um <canvas> e devolvemos o stream via
 * canvas.captureStream(30) — o LiveKit publica esse stream no lugar da
 * câmera raw.
 *
 * Modelo e WASM são baixados da CDN oficial do MediaPipe (uma vez, cacheado
 * pelo browser). Não versionamos o .tflite no repo.
 */

import type {
  ImageSegmenter as MPImageSegmenter,
  ImageSegmenterResult,
} from "@mediapipe/tasks-vision";

export type VideoFilter = "none" | "blur" | "image";

export interface FilterOptions {
  filter: VideoFilter;
  /** raio do blur em px aplicado ao fundo (default 12) */
  blurAmount?: number;
  /** imagem de fundo para o modo 'image' */
  backgroundImage?: HTMLImageElement;
}

/**
 * Handle retornado por createFilteredStream.
 * Guarda referências ao RAF, ao segmenter e à MediaStream original
 * pra poder desligar tudo com stopFilter().
 */
export interface FilteredStreamHandle {
  stream: MediaStream;
  stop: () => void;
}

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

let segmenterPromise: Promise<MPImageSegmenter> | null = null;

async function getSegmenter(): Promise<MPImageSegmenter> {
  if (segmenterPromise) return segmenterPromise;
  segmenterPromise = (async () => {
    // import dinâmico — MediaPipe é ESM only e depende de globals de browser,
    // então não deve ser puxado durante SSR/build node.
    const { FilesetResolver, ImageSegmenter } = await import(
      "@mediapipe/tasks-vision"
    );
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    return ImageSegmenter.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
  })();
  return segmenterPromise;
}

/** Detecção grosseira de ambientes sem suporte ao pipeline. */
export function filtersLikelySupported(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof HTMLCanvasElement === "undefined") return false;
  // captureStream é essencial pra devolver o stream processado
  if (typeof HTMLCanvasElement.prototype.captureStream !== "function") {
    return false;
  }
  // OffscreenCanvas não é estritamente necessário — usamos <canvas> normal.
  // Mas é um bom indicador de que o navegador é minimamente moderno.
  return true;
}

/**
 * Cria uma MediaStream que espelha o vídeo de `source` com o filtro aplicado.
 * O áudio de `source` NÃO é copiado — o caller cuida do áudio separadamente.
 *
 * O <canvas> passado deve estar no DOM (mesmo que off-screen com display:none)
 * ou ao menos anexado a algum shadow tree para funcionar em todos os navegadores.
 */
export async function createFilteredStream(
  source: MediaStream,
  opts: FilterOptions,
  canvas: HTMLCanvasElement
): Promise<FilteredStreamHandle> {
  const videoTrack = source.getVideoTracks()[0];
  if (!videoTrack) {
    throw new Error("Source stream sem faixa de vídeo.");
  }

  if (!filtersLikelySupported()) {
    throw new Error("Filtros não são suportados neste navegador.");
  }

  const settings = videoTrack.getSettings();
  const width = settings.width ?? 640;
  const height = settings.height ?? 480;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) {
    throw new Error("Canvas 2D context indisponível.");
  }

  // <video> oculto pra alimentar o segmenter — MediaPipe aceita HTMLVideoElement
  // como ImageSource sem custo adicional.
  const video = document.createElement("video");
  video.srcObject = source;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  await video.play().catch(() => {
    /* alguns navegadores rejeitam play() silenciosamente — seguimos */
  });

  const segmenter = await getSegmenter();

  let rafId = 0;
  let stopped = false;
  let lastTimestamp = -1;
  let firstFrameStart = 0;
  let firstFrameDuration = 0;
  let firstFrameMeasured = false;

  const draw = (mask: ImageSegmenterResult) => {
    const w = canvas.width;
    const h = canvas.height;

    if (opts.filter === "blur") {
      // 1) fundo borrado (frame inteiro)
      ctx.save();
      ctx.filter = `blur(${opts.blurAmount ?? 12}px)`;
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();
    } else if (opts.filter === "image" && opts.backgroundImage) {
      // 1) imagem de fundo, com cover
      const img = opts.backgroundImage;
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      // filtro none — apenas espelha o vídeo original
      ctx.drawImage(video, 0, 0, w, h);
      return;
    }

    // 2) aplica a máscara: mantém pessoa (mask≈1), remove fundo (mask≈0)
    const confidence = mask.confidenceMasks?.[0];
    if (!confidence) {
      // sem máscara: pinta o vídeo cru por cima do fundo pra não ficar vazio
      ctx.drawImage(video, 0, 0, w, h);
      return;
    }

    const mw = confidence.width;
    const mh = confidence.height;
    const maskArr = confidence.getAsFloat32Array();

    // Composição via canvas offscreen: desenhamos o vídeo em um buffer,
    // multiplicamos o alpha pela máscara pixel a pixel e sobrepomos.
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const offCtx = off.getContext("2d");
    if (!offCtx) return;
    offCtx.drawImage(video, 0, 0, w, h);
    const frame = offCtx.getImageData(0, 0, w, h);
    const data = frame.data;

    // Se as dimensões da máscara batem com o canvas, aplicamos direto.
    // Caso contrário, fazemos um nearest-neighbor rápido.
    const sameSize = mw === w && mh === h;
    for (let y = 0; y < h; y++) {
      const my = sameSize ? y : Math.floor((y * mh) / h);
      for (let x = 0; x < w; x++) {
        const mx = sameSize ? x : Math.floor((x * mw) / w);
        const m = maskArr[my * mw + mx];
        const idx = (y * w + x) * 4;
        data[idx + 3] = Math.round(m * 255);
      }
    }
    offCtx.putImageData(frame, 0, 0);
    ctx.drawImage(off, 0, 0);
  };

  const loop = () => {
    if (stopped) return;
    if (video.readyState < 2) {
      rafId = requestAnimationFrame(loop);
      return;
    }

    const ts = performance.now();
    if (!firstFrameMeasured) firstFrameStart = ts;

    // segmentForVideo exige timestamps monotônicos crescentes
    const timestamp = ts <= lastTimestamp ? lastTimestamp + 1 : Math.floor(ts);
    lastTimestamp = timestamp;

    try {
      const result = segmenter.segmentForVideo(video, timestamp);
      draw(result);
      result.close();
    } catch (err) {
      // Se a inferência falhar (GPU perdida, etc), pinta o vídeo cru
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      console.warn("[filters] segmentForVideo falhou:", err);
    }

    if (!firstFrameMeasured) {
      firstFrameDuration = performance.now() - firstFrameStart;
      firstFrameMeasured = true;
      if (firstFrameDuration > 200) {
        console.warn(
          `[filters] primeiro frame demorou ${Math.round(firstFrameDuration)}ms — dispositivo pode estar lento.`
        );
      }
    }

    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);

  const outputStream = canvas.captureStream(30);

  return {
    stream: outputStream,
    stop: () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      outputStream.getTracks().forEach((t) => t.stop());
      video.pause();
      video.srcObject = null;
    },
  };
}

/**
 * Libera o segmenter em cache (útil se o usuário desativou filtros
 * definitivamente e queremos liberar VRAM).
 */
export async function disposeSegmenter(): Promise<void> {
  if (!segmenterPromise) return;
  try {
    const seg = await segmenterPromise;
    seg.close();
  } catch {
    /* ignore */
  }
  segmenterPromise = null;
}
