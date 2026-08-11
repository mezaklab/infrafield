import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export interface ProcessImageOptions {
  whiteThreshold?: number; // 220-250 (default: 232)
}

/**
 * Downloads an image from a URL and converts it into a Buffer.
 */
export async function fetchImageBuffer(imageUrl: string): Promise<Buffer | null> {
  try {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_IMAGE_BYTES) return null;

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) return null;
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error(`[fetchImageBuffer] Failed to download image from ${imageUrl}:`, err);
    return null;
  }
}

/**
 * Process image buffer:
 * 1. Optional remove.bg API (if REMOVE_BG_API_KEY is defined)
 * 2. Local Sharp background removal algorithm for white/light backgrounds
 * 3. Convert to transparent PNG
 */
export async function removeWhiteBackground(
  imageBuffer: Buffer,
  options: ProcessImageOptions = {}
): Promise<Buffer> {
  const apiKey = process.env.REMOVE_BG_API_KEY;

  // 1. Try Remove.bg API if key is available
  if (apiKey) {
    try {
      const apiResult = await removeBackgroundViaRemoveBg(imageBuffer, apiKey);
      if (apiResult) {
        console.log('[imageProcessor] Background removed via remove.bg API');
        return apiResult;
      }
    } catch (err) {
      console.warn('[imageProcessor] remove.bg API failed, falling back to local Sharp processor:', err);
    }
  }

  // 2. Local Sharp processing: convert white/light pixels to transparency
  try {
    const threshold = options.whiteThreshold ?? 232;
    
    // Extract raw RGBA pixels from sharp
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const channels = info.channels; // 4 (R, G, B, A)

    const pixelCount = width * height;
    
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // If already transparent, skip
      if (a === 0) continue;

      // Check if pixel is white or near-white (high RGB values and low saturation)
      const minVal = Math.min(r, g, b);
      const maxVal = Math.max(r, g, b);
      const diff = maxVal - minVal;

      // White/light grey condition
      if (r >= threshold && g >= threshold && b >= threshold && diff < 30) {
        // Pure white threshold (r, g, b >= 245) -> complete transparency
        if (r >= 245 && g >= 245 && b >= 245) {
          data[idx + 3] = 0; // Alpha = 0
        } else {
          // Smooth feathering for anti-aliasing near edges (230 - 245)
          const factor = (245 - minVal) / (245 - threshold);
          const newAlpha = Math.max(0, Math.min(255, Math.floor(factor * 255)));
          data[idx + 3] = newAlpha;
        }
      }
    }

    // Re-encode processed raw buffer into transparent PNG
    const processedPng = await sharp(data, {
      raw: {
        width,
        height,
        channels: 4,
      },
    })
      .png({ compressionLevel: 8 })
      .toBuffer();

    return processedPng;
  } catch (err) {
    console.error('[imageProcessor] Local Sharp background removal error:', err);
    // Fallback: return png conversion of original
    return await sharp(imageBuffer).png().toBuffer();
  }
}

/**
 * Remove.bg API helper
 */
async function removeBackgroundViaRemoveBg(imageBuffer: Buffer, apiKey: string): Promise<Buffer | null> {
  const formData = new FormData();
  formData.append('image_file', new Blob([new Uint8Array(imageBuffer)]), 'image.png');
  formData.append('size', 'auto');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
    },
    body: formData,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Remove.bg API error ${response.status}: ${await response.text()}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Downloads, processes to remove white background, saves locally in uploads/assets/ and returns the local public URL.
 */
export async function processAndSaveEquipmentImage(imageUrl: string, assetId?: string): Promise<string | null> {
  if (!imageUrl) return null;

  // If already a local upload URL, skip re-processing
  if (imageUrl.includes('/uploads/assets/')) {
    return imageUrl;
  }

  try {
    const rawBuffer = await fetchImageBuffer(imageUrl);
    if (!rawBuffer) return null;

    const transparentPngBuffer = await removeWhiteBackground(rawBuffer);

    // Save to storage/uploads/assets/
    const uploadsDir = path.join(process.cwd(), 'storage', 'uploads', 'assets');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueId = assetId || crypto.randomUUID();
    const filename = `asset-${uniqueId}-${Date.now()}.png`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, transparentPngBuffer);

    // Construct local public relative URL
    const publicUrl = `/uploads/assets/${filename}`;
    console.log(`[processAndSaveEquipmentImage] Saved processed transparent PNG: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error('[processAndSaveEquipmentImage] Error processing and saving image:', err);
    return null;
  }
}
