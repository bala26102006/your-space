import { jsPDF } from 'jspdf';
import { 
  renderStroke, 
  renderShape, 
  renderText, 
  renderSticker, 
  renderMosaic, 
  renderBackground 
} from './strokeRenderer';

/**
 * Pre-caches all images used in the document layers
 */
export async function preloadDocumentImages(canvasDoc) {
  const imageMap = new Map();
  const promises = [];

  (canvasDoc.layers || []).forEach(layer => {
    (layer.items || []).forEach(item => {
      if ((item.type === 'image' || item.type === 'fill_layer') && item.src) {
        if (!imageMap.has(item.id || item.src)) {
          const promise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              imageMap.set(item.id || item.src, img);
              resolve();
            };
            img.onerror = () => {
              resolve(); // Don't reject entire export on 1 broken image
            };
            img.src = item.src;
          });
          promises.push(promise);
        }
      }
    });
  });

  await Promise.all(promises);
  return imageMap;
}

/**
 * Renders a document onto an offscreen canvas with target scale, preset aspect ratio, and watermark
 */
export async function renderDocumentToCanvas(canvasDoc, options = {}) {
  const {
    scale = 1,
    format = 'png',
    preset = 'original', // 'original' | 'ig_post' (1080x1080) | 'ig_story' (1080x1920) | 'wa_status' (1080x1920)
    fitMode = 'fit', // 'fit' | 'crop'
    transparent = false,
    watermark = false,
    watermarkText = 'Created in Your Space',
    backgroundColor = null
  } = options;

  const imageMap = await preloadDocumentImages(canvasDoc);

  const docWidth = canvasDoc.width || 1200;
  const docHeight = canvasDoc.height || 900;

  // Determine target canvas dimensions based on preset
  let targetWidth = docWidth;
  let targetHeight = docHeight;

  if (preset === 'ig_post') {
    targetWidth = 1080;
    targetHeight = 1080;
  } else if (preset === 'ig_story' || preset === 'wa_status') {
    targetWidth = 1080;
    targetHeight = 1920;
  }

  // Scale resolution
  const finalWidth = Math.round(targetWidth * scale);
  const finalHeight = Math.round(targetHeight * scale);

  const offscreen = document.createElement('canvas');
  offscreen.width = finalWidth;
  offscreen.height = finalHeight;
  const ctx = offscreen.getContext('2d');

  ctx.scale(scale, scale);

  // Background Fill (no guide grids on export)
  if (!transparent) {
    const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const bgColor = backgroundColor || (
      canvasDoc.background?.id === 'dark' ? '#1A1D23' :
      canvasDoc.background?.id === 'white' ? '#FFFFFF' :
      isDarkMode ? '#1A1D23' : '#FFFFFF'
    );
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  } else {
    ctx.clearRect(0, 0, targetWidth, targetHeight);
  }

  // Calculate layout placement for 'fit' vs 'crop'
  let drawX = 0;
  let drawY = 0;
  let drawW = targetWidth;
  let drawH = targetHeight;
  let contentScale = 1;

  if (preset !== 'original') {
    const scaleX = targetWidth / docWidth;
    const scaleY = targetHeight / docHeight;

    if (fitMode === 'crop') {
      contentScale = Math.max(scaleX, scaleY);
    } else {
      // 'fit'
      contentScale = Math.min(scaleX, scaleY);
    }

    drawW = docWidth * contentScale;
    drawH = docHeight * contentScale;
    drawX = (targetWidth - drawW) / 2;
    drawY = (targetHeight - drawH) / 2;
  }

  // Render document content inside calculated viewport
  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.scale(contentScale, contentScale);

  (canvasDoc.layers || []).forEach(layer => {
    if (!layer.visible) return;

    ctx.save();
    ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1;

    (layer.items || []).forEach(item => {
      if (item.type === 'image' || item.type === 'fill_layer') {
        const img = imageMap.get(item.id || item.src);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.globalAlpha = (item.opacity ?? 1) * (layer.opacity ?? 1);
          if (item.type === 'fill_layer') {
            ctx.drawImage(img, 0, 0, docWidth, docHeight);
          } else {
            ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
            if (item.rotation) ctx.rotate((item.rotation * Math.PI) / 180);
            if (item.flipX || item.flipY) ctx.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1);
            ctx.drawImage(img, -item.width / 2, -item.height / 2, item.width, item.height);
          }
          ctx.restore();
        }
      } else if (item.type?.startsWith('shape_')) {
        renderShape(ctx, item);
      } else if (item.type === 'text') {
        renderText(ctx, item);
      } else if (item.type === 'sticker') {
        renderSticker(ctx, item);
      } else if (item.type === 'mosaic') {
        renderMosaic(ctx, item, docWidth, docHeight);
      } else {
        renderStroke(ctx, item);
      }
    });

    ctx.restore();
  });

  ctx.restore();

  // Optional Watermark
  if (watermark && watermarkText) {
    ctx.save();
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillStyle = transparent ? 'rgba(0, 0, 0, 0.45)' : (canvasDoc.background?.id === 'dark' ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(watermarkText, targetWidth - 16, targetHeight - 12);
    ctx.restore();
  }

  return offscreen;
}

/**
 * Generates an export Blob or File based on options
 */
export async function exportDocument(canvasDoc, title = 'sketch', options = {}) {
  const { format = 'png', jpegQuality = 0.92, scale = 1 } = options;
  const offscreen = await renderDocumentToCanvas(canvasDoc, options);

  const cleanTitle = (title || 'sketch')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-');
  const dateStr = new Date().toISOString().split('T')[0];

  if (format === 'pdf') {
    // Generate PDF via jsPDF
    const imgData = offscreen.toDataURL('image/jpeg', 0.95);
    const isLandscape = offscreen.width > offscreen.height;
    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'px',
      format: [offscreen.width, offscreen.height]
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, offscreen.width, offscreen.height);
    const blob = pdf.output('blob');
    const filename = `${cleanTitle}-${dateStr}.pdf`;
    return {
      blob,
      file: new File([blob], filename, { type: 'application/pdf' }),
      filename,
      width: offscreen.width,
      height: offscreen.height
    };
  }

  // PNG or JPG
  const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpg' ? 'jpg' : 'png';
  const filename = `${cleanTitle}-${dateStr}.${ext}`;

  const blob = await new Promise((resolve) => {
    offscreen.toBlob(resolve, mimeType, format === 'jpg' ? jpegQuality : undefined);
  });

  const file = new File([blob], filename, { type: mimeType });

  return {
    blob,
    file,
    filename,
    dataUrl: offscreen.toDataURL(mimeType, format === 'jpg' ? jpegQuality : undefined),
    width: offscreen.width,
    height: offscreen.height
  };
}

/**
 * Downloads a Blob directly with filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
