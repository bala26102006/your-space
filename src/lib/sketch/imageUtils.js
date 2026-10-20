/**
 * Utility functions for image importing, downscaling, transformations, and thumbnailing.
 */

const MAX_IMAGE_DIMENSION = 2500;

/**
 * Loads a File / Blob as an HTMLImageElement
 */
export function loadImageElement(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fileOrBlob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Loads an image from a data URL or remote URL
 */
export function loadImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Downscales an HTMLImageElement if larger than MAX_IMAGE_DIMENSION and returns data URL
 */
export function optimizeImage(img) {
  let { naturalWidth: width, naturalHeight: height } = img;
  if (!width || !height) {
    width = img.width || 1200;
    height = img.height || 900;
  }

  let targetWidth = width;
  let targetHeight = height;

  if (targetWidth > MAX_IMAGE_DIMENSION || targetHeight > MAX_IMAGE_DIMENSION) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * MAX_IMAGE_DIMENSION) / targetWidth);
      targetWidth = MAX_IMAGE_DIMENSION;
    } else {
      targetWidth = Math.round((targetWidth * MAX_IMAGE_DIMENSION) / targetHeight);
      targetHeight = MAX_IMAGE_DIMENSION;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Return WebP / JPEG if supported, fallback to PNG
  try {
    return {
      src: canvas.toDataURL('image/webp', 0.92),
      width: targetWidth,
      height: targetHeight
    };
  } catch (e) {
    return {
      src: canvas.toDataURL('image/png'),
      width: targetWidth,
      height: targetHeight
    };
  }
}

/**
 * Reads an image file and returns optimized src, width, and height
 */
export async function processImageFile(file) {
  const img = await loadImageElement(file);
  return optimizeImage(img);
}

/**
 * Extracts an image file from a ClipboardEvent (Ctrl+V)
 */
export function getImageFromClipboard(clipboardData) {
  if (!clipboardData || !clipboardData.items) return null;
  for (let i = 0; i < clipboardData.items.length; i++) {
    const item = clipboardData.items[i];
    if (item.type.indexOf('image') !== -1) {
      return item.getAsFile();
    }
  }
  return null;
}

/**
 * Rotates an image data URL by 90 degrees clockwise
 */
export async function rotateImageData(src) {
  const img = await loadImageFromSrc(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalHeight || img.height;
  canvas.height = img.naturalWidth || img.width;
  const ctx = canvas.getContext('2d');

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((90 * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  return {
    src: canvas.toDataURL('image/webp', 0.92),
    width: canvas.width,
    height: canvas.height
  };
}

/**
 * Flips an image horizontally or vertically
 */
export async function flipImageData(src, horizontal = true) {
  const img = await loadImageFromSrc(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');

  if (horizontal) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
  }

  ctx.drawImage(img, 0, 0);

  return {
    src: canvas.toDataURL('image/webp', 0.92),
    width: canvas.width,
    height: canvas.height
  };
}

/**
 * Generates a compact thumbnail from a canvas while preserving the true aspect ratio.
 * Longest edge is capped at maxEdge (default 640px), flattened onto the canvas background color.
 */
export function generateThumbnail(sourceCanvas, maxEdge = 640, maxHeight = null, bgColor = '#1A1D23') {
  const canvas = document.createElement('canvas');
  let width = sourceCanvas.width || 1200;
  let height = sourceCanvas.height || 900;

  // If both maxEdge and maxHeight are provided, use max bounding box; otherwise longest edge
  const effectiveMaxEdge = maxHeight ? Math.max(maxEdge, maxHeight) : maxEdge;
  const scale = Math.min(effectiveMaxEdge / Math.max(width, height), 1);

  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Flatten onto background color or neutral paper if transparent
  if (bgColor && bgColor !== 'transparent') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = '#FDF9EE';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

  try {
    return canvas.toDataURL('image/webp', 0.82);
  } catch (e) {
    return canvas.toDataURL('image/jpeg', 0.82);
  }
}

