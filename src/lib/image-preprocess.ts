/**
 * Client-side image preprocessing for receipt OCR.
 *
 * Pipeline: load → grayscale → contrast stretch → Otsu binarization → upscale → export
 *
 * These steps dramatically improve Tesseract accuracy on receipt photos
 * by normalizing lighting, removing noise, and ensuring crisp text edges.
 */

/** Load an image File into an HTMLImageElement. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

/** Convert pixel data to grayscale in-place using luminance weights. */
function toGrayscale(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
}

/**
 * Stretch contrast so the darkest pixels become 0 and brightest become 255.
 * Uses 1st/99th percentile to avoid outlier skew.
 */
function stretchContrast(data: Uint8ClampedArray): void {
  const histogram = new Uint32Array(256);
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]]++;
  }

  // Find 1st and 99th percentile values
  const lowTarget = Math.floor(pixelCount * 0.01);
  const highTarget = Math.floor(pixelCount * 0.99);

  let low = 0;
  let high = 255;
  let cumulative = 0;

  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i];
    if (cumulative >= lowTarget) {
      low = i;
      break;
    }
  }

  cumulative = 0;
  for (let i = 255; i >= 0; i--) {
    cumulative += histogram[i];
    if (cumulative >= pixelCount - highTarget) {
      high = i;
      break;
    }
  }

  if (high <= low) return;

  const scale = 255 / (high - low);
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.max(0, Math.min(255, (data[i] - low) * scale));
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
}

/**
 * Otsu's method: find the threshold that minimizes intra-class variance,
 * then binarize the image to pure black and white.
 */
function otsuBinarize(data: Uint8ClampedArray): void {
  const histogram = new Uint32Array(256);
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]]++;
  }

  let totalSum = 0;
  for (let i = 0; i < 256; i++) {
    totalSum += i * histogram[i];
  }

  let backgroundWeight = 0;
  let backgroundSum = 0;
  let maxVariance = 0;
  let threshold = 0;

  for (let t = 0; t < 256; t++) {
    backgroundWeight += histogram[t];
    if (backgroundWeight === 0) continue;

    const foregroundWeight = pixelCount - backgroundWeight;
    if (foregroundWeight === 0) break;

    backgroundSum += t * histogram[t];

    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (totalSum - backgroundSum) / foregroundWeight;
    const meanDiff = backgroundMean - foregroundMean;

    const variance = backgroundWeight * foregroundWeight * meanDiff * meanDiff;
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  for (let i = 0; i < data.length; i += 4) {
    const v = data[i] > threshold ? 255 : 0;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
}

/**
 * Preprocess a receipt image for OCR.
 *
 * Returns a processed PNG blob optimized for Tesseract recognition.
 * The image is grayscaled, contrast-enhanced, binarized, and upscaled
 * (if needed) to meet Tesseract's recommended ~300 DPI equivalent.
 */
export async function preprocessReceiptImage(file: File): Promise<Blob> {
  const img = await loadImage(file);

  // Upscale small images — Tesseract works best when text is ~30px tall.
  // Target minimum width of 1800px for receipt images.
  const MIN_WIDTH = 1800;
  const scale = img.width < MIN_WIDTH ? MIN_WIDTH / img.width : 1;

  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get canvas context");

  // Use high-quality interpolation for upscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  toGrayscale(data);
  stretchContrast(data);
  otsuBinarize(data);

  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      "image/png"
    );
  });
}
