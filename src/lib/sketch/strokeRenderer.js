import { getStroke } from 'perfect-freehand';

/**
 * Converts array of polygon points from getStroke() into an SVG path string / Path2D
 */
export function getSvgPathFromStroke(strokePoints) {
  if (!strokePoints.length) return '';

  const d = strokePoints.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...strokePoints[0], 'Q']
  );

  d.push('Z');
  return d.join(' ');
}

/**
 * Simple pseudo-random hash for deterministic texture jitter
 */
function pseudoHash(n) {
  let x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

/**
 * Renders a single branch of freehand stroke points onto Canvas 2D
 */
function renderSingleStrokeBranch(ctx, branchPoints, stroke) {
  if (!branchPoints || branchPoints.length === 0) return;

  const {
    tool = 'pen',
    color = '#2C2A28',
    colorB = null,
    gradient = false,
    size = 4,
    opacity = 1,
    stabilizer = 0.5,
    stickerBorder = false,
    stamp = '⭐'
  } = stroke;

  // 1. Stamp Brush Mode
  if (tool === 'stamp_brush') {
    ctx.save();
    ctx.globalAlpha = opacity || 1;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const stampSize = Math.max(16, size * 5);
    const spacing = Math.max(24, stampSize * 0.85);

    let lastX = null;
    let lastY = null;

    branchPoints.forEach((pt, idx) => {
      const [px, py] = pt;
      if (lastX === null) {
        lastX = px;
        lastY = py;
        ctx.font = `${stampSize}px sans-serif`;
        ctx.fillText(stamp, px, py);
        return;
      }

      const dist = Math.hypot(px - lastX, py - lastY);
      if (dist >= spacing) {
        lastX = px;
        lastY = py;

        const jitterRot = (pseudoHash(idx * 7) - 0.5) * 0.5; // -15 to +15 deg
        const jitterScale = 0.85 + pseudoHash(idx * 13) * 0.3; // 0.85 to 1.15 scale
        const curSize = stampSize * jitterScale;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(jitterRot);
        ctx.font = `${curSize}px sans-serif`;
        ctx.fillText(stamp, 0, 0);
        ctx.restore();
      }
    });

    ctx.restore();
    return;
  }

  // 2. Rainbow Brush (Dynamic Color Spectrum along stroke)
  if (tool === 'rainbow') {
    if (branchPoints.length < 2) return;
    ctx.save();
    ctx.globalAlpha = opacity || 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < branchPoints.length - 1; i++) {
      const p0 = branchPoints[i];
      const p1 = branchPoints[i + 1];
      const t = i / Math.max(1, branchPoints.length - 1);
      const hue = Math.round(t * 360);
      const segPressure = (p0[2] || 0.5 + (p1[2] || 0.5)) / 2;
      const segWidth = Math.max(1.5, size * 2 * segPressure);

      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.strokeStyle = `hsl(${hue}, 95%, 55%)`;
      ctx.lineWidth = segWidth;
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  // 3. Normal / Textured Freehand Inking using perfect-freehand
  ctx.save();

  // Opacity & Blend Mode
  if (tool === 'highlighter') {
    ctx.globalAlpha = (opacity || 1) * 0.42;
    ctx.globalCompositeOperation = 'multiply';
  } else if (tool === 'watercolor') {
    ctx.globalAlpha = (opacity || 1) * 0.28;
    ctx.globalCompositeOperation = 'source-over';
  } else if (tool === 'pencil') {
    ctx.globalAlpha = (opacity || 1) * 0.72;
  } else if (tool === 'crayon') {
    ctx.globalAlpha = (opacity || 1) * 0.85;
  } else {
    ctx.globalAlpha = opacity || 1;
  }

  // Detect if real stylus pressure is present (mouse defaults to 0.5)
  const hasRealPressure = branchPoints.some(pt => pt[2] !== undefined && pt[2] > 0 && Math.abs(pt[2] - 0.5) > 0.04);

  // Parameterize perfect-freehand options with distance-based responsive smoothing
  const effectiveStabilizer = stabilizer !== undefined ? stabilizer : 0.15;
  const streamlineVal = Math.max(0.05, Math.min(0.6, effectiveStabilizer * 0.5));
  let strokeOptions = {
    size: size * 2,
    thinning: hasRealPressure ? 0.35 : 0, // Constant width for mouse, dynamic for stylus
    smoothing: Math.max(0.45, streamlineVal),
    streamline: streamlineVal,
    easing: (t) => t,
    start: { taper: hasRealPressure ? size * 0.5 : 0, cap: true },
    end: { taper: 0, cap: true }
  };

  if (tool === 'marker') {
    strokeOptions.thinning = 0;
    strokeOptions.size = size * 2.5;
  } else if (tool === 'highlighter') {
    strokeOptions.thinning = 0;
    strokeOptions.size = size * 3.5;
    strokeOptions.streamline = Math.max(0.2, streamlineVal);
  } else if (tool === 'pencil') {
    strokeOptions.thinning = hasRealPressure ? 0.45 : 0;
    strokeOptions.size = size * 1.5;
  } else if (tool === 'crayon') {
    strokeOptions.thinning = hasRealPressure ? 0.2 : 0;
    strokeOptions.size = size * 2.2;
  } else if (tool === 'neon') {
    strokeOptions.thinning = hasRealPressure ? 0.25 : 0;
    strokeOptions.size = size * 2.2;
  } else if (tool === 'watercolor') {
    strokeOptions.thinning = 0;
    strokeOptions.size = size * 3.2;
  }

  let outlinePoints = getStroke(branchPoints, strokeOptions);
  if (!outlinePoints || outlinePoints.length === 0) {
    ctx.restore();
    return;
  }

  // Crayon rough waxy vertex jitter
  if (tool === 'crayon' && outlinePoints.length > 0) {
    outlinePoints = outlinePoints.map(([ox, oy], i) => {
      const jx = (pseudoHash(i * 17) - 0.5) * Math.min(size * 0.4, 2);
      const jy = (pseudoHash(i * 31) - 0.5) * Math.min(size * 0.4, 2);
      return [ox + jx, oy + jy];
    });
  }

  // Draw outline points directly onto canvas without SVG string / Path2D overhead
  const drawDirectOutline = (targetCtx) => {
    targetCtx.beginPath();
    const len = outlinePoints.length;
    targetCtx.moveTo(outlinePoints[0][0], outlinePoints[0][1]);
    for (let i = 0; i < len - 1; i++) {
      const [p0x, p0y] = outlinePoints[i];
      const [p1x, p1y] = outlinePoints[i + 1];
      targetCtx.quadraticCurveTo(p0x, p0y, (p0x + p1x) / 2, (p0y + p1y) / 2);
    }
    targetCtx.closePath();
  };

  // Gradient computation if enabled
  let fillStyle = color;
  if (gradient && colorB && branchPoints.length >= 2) {
    const pStart = branchPoints[0];
    const pEnd = branchPoints[branchPoints.length - 1];
    const grad = ctx.createLinearGradient(pStart[0], pStart[1], pEnd[0], pEnd[1]);
    grad.addColorStop(0, color);
    grad.addColorStop(1, colorB);
    fillStyle = grad;
  }

  // 4. Sticker Border (underlying thick white/light contour)
  if (stickerBorder) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.lineWidth = size * 2 + 10;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawDirectOutline(ctx);
    ctx.stroke();
    ctx.restore();
  }

  // 5. Neon Glow Pass
  if (tool === 'neon') {
    // Outer electric glow
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(10, size * 2.8);
    ctx.fillStyle = color;
    drawDirectOutline(ctx);
    ctx.fill();
    ctx.restore();

    // Inner bright discharge core
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.85;
    drawDirectOutline(ctx);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    return;
  }

  // 6. Watercolor soft layered multi-pass
  if (tool === 'watercolor') {
    ctx.fillStyle = fillStyle;
    drawDirectOutline(ctx);
    ctx.fill();

    // Second softer wash
    ctx.save();
    ctx.globalAlpha = (opacity || 1) * 0.18;
    const washOptions = { ...strokeOptions, size: strokeOptions.size * 1.25 };
    const washOutline = getStroke(branchPoints, washOptions);
    if (washOutline && washOutline.length > 0) {
      ctx.beginPath();
      ctx.moveTo(washOutline[0][0], washOutline[0][1]);
      for (let i = 0; i < washOutline.length - 1; i++) {
        const [p0x, p0y] = washOutline[i];
        const [p1x, p1y] = washOutline[i + 1];
        ctx.quadraticCurveTo(p0x, p0y, (p0x + p1x) / 2, (p0y + p1y) / 2);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // 7. Pencil grainy tooth
  if (tool === 'pencil') {
    ctx.fillStyle = fillStyle;
    drawDirectOutline(ctx);
    ctx.fill();

    // Add subtle graphite paper tooth specks
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = color;
    for (let i = 0; i < branchPoints.length; i += 2) {
      const [px, py] = branchPoints[i];
      const rx = (pseudoHash(i * 19) - 0.5) * (size * 1.2);
      const ry = (pseudoHash(i * 43) - 0.5) * (size * 1.2);
      ctx.fillRect(px + rx, py + ry, 1, 1);
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // Default Fill (Pen, Marker, Crayon)
  ctx.fillStyle = fillStyle;
  drawDirectOutline(ctx);
  ctx.fill();

  ctx.restore();
}

/**
 * Renders a freehand stroke (including any symmetry branches)
 */
export function renderStroke(ctx, stroke) {
  if (!stroke.points || stroke.points.length === 0) return;

  // Render main stroke points
  renderSingleStrokeBranch(ctx, stroke.points, stroke);

  // Render symmetry branches if present
  if (Array.isArray(stroke.symmetryBranches) && stroke.symmetryBranches.length > 0) {
    stroke.symmetryBranches.forEach(branch => {
      renderSingleStrokeBranch(ctx, branch, stroke);
    });
  }
}

/**
 * Renders geometric shapes (line, arrow, rect, ellipse, triangle)
 */
export function renderShape(ctx, shape) {
  const {
    type,
    startX,
    startY,
    endX,
    endY,
    color = '#2C2A28',
    size = 3,
    fill = false,
    opacity = 1
  } = shape;

  ctx.save();
  ctx.globalAlpha = opacity || 1;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const minX = Math.min(startX, endX);
  const minY = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  if (type === 'shape_line') {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  } else if (type === 'shape_arrow') {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(endY - startY, endX - startX);
    const headLen = Math.max(12, size * 3.5);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLen * Math.cos(angle - Math.PI / 6),
      endY - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLen * Math.cos(angle + Math.PI / 6),
      endY - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  } else if (type === 'shape_rect') {
    if (fill) {
      ctx.fillRect(minX, minY, width, height);
    } else {
      ctx.strokeRect(minX, minY, width, height);
    }
  } else if (type === 'shape_ellipse') {
    const rx = width / 2;
    const ry = height / 2;
    const cx = minX + rx;
    const cy = minY + ry;

    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
    if (fill) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  } else if (type === 'shape_triangle') {
    ctx.beginPath();
    ctx.moveTo((startX + endX) / 2, startY);
    ctx.lineTo(endX, endY);
    ctx.lineTo(startX, endY);
    ctx.closePath();
    if (fill) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Renders a text object onto canvas with optional outline and shadow
 */
export function renderText(ctx, item) {
  const {
    text = '',
    x = 0,
    y = 0,
    fontSize = 24,
    fontFamily = 'Inter, sans-serif',
    bold = false,
    color = '#2C2A28',
    opacity = 1,
    outline = false,
    shadow = false
  } = item;

  if (!text) return;

  ctx.save();
  ctx.globalAlpha = opacity || 1;
  ctx.font = `${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'top';

  const lines = text.split('\n');
  const lineHeight = fontSize * 1.25;

  // Text Outline (for readability over photos)
  if (outline) {
    ctx.save();
    ctx.strokeStyle = color === '#FFFFFF' || color === '#ECEEF2' ? '#000000' : '#FFFFFF';
    ctx.lineWidth = Math.max(3, fontSize / 5.5);
    ctx.lineJoin = 'round';
    lines.forEach((line, index) => {
      ctx.strokeText(line, x, y + index * lineHeight);
    });
    ctx.restore();
  }

  // Text Shadow
  if (shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1.5;
    ctx.shadowOffsetY = 2;
  }

  ctx.fillStyle = color;
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });

  ctx.restore();
}

/**
 * Renders an emoji/sticker item
 */
export function renderSticker(ctx, item) {
  const { emoji = '⭐', x = 0, y = 0, size = 48, opacity = 1, rotation = 0 } = item;

  ctx.save();
  ctx.globalAlpha = opacity || 1;
  ctx.translate(x, y);
  if (rotation) {
    ctx.rotate((rotation * Math.PI) / 180);
  }
  ctx.font = `${size}px sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(emoji, 0, 0);
  ctx.restore();
}

/**
 * Renders a mosaic / pixelate privacy region
 */
export function renderMosaic(ctx, item, targetWidth, targetHeight) {
  const { x, y, width, height, blockSize = 14 } = item;
  if (!width || !height) return;

  const clampedX = Math.max(0, Math.min(x, targetWidth - 1));
  const clampedY = Math.max(0, Math.min(y, targetHeight - 1));
  const clampedW = Math.max(1, Math.min(width, targetWidth - clampedX));
  const clampedH = Math.max(1, Math.min(height, targetHeight - clampedY));

  try {
    const imgData = ctx.getImageData(clampedX, clampedY, clampedW, clampedH);
    const data = imgData.data;

    for (let by = 0; by < clampedH; by += blockSize) {
      for (let bx = 0; bx < clampedW; bx += blockSize) {
        const sampleIdx = (by * clampedW + bx) * 4;
        const r = data[sampleIdx];
        const g = data[sampleIdx + 1];
        const b = data[sampleIdx + 2];
        const a = data[sampleIdx + 3];

        for (let py = 0; py < blockSize && by + py < clampedH; py++) {
          for (let px = 0; px < blockSize && bx + px < clampedW; px++) {
            const curIdx = ((by + py) * clampedW + (bx + px)) * 4;
            data[curIdx] = r;
            data[curIdx + 1] = g;
            data[curIdx + 2] = b;
            data[curIdx + 3] = a;
          }
        }
      }
    }

    ctx.putImageData(imgData, clampedX, clampedY);
  } catch (e) {
    ctx.save();
    ctx.fillStyle = 'rgba(100, 100, 100, 0.9)';
    ctx.fillRect(clampedX, clampedY, clampedW, clampedH);
    ctx.restore();
  }
}

/**
 * Draws background pattern (grid, dot grid, lined, checkerboard)
 */
export function renderBackground(ctx, width, height, background, isDarkMode) {
  ctx.save();

  const isTransparent = background?.id === 'transparent';
  const bgColor = isTransparent
    ? null
    : background?.customColor || (
        background?.id === 'dark' ? '#1A1D23' :
        background?.id === 'white' ? '#FFFFFF' :
        isDarkMode ? '#1A1D23' : '#FAF9F6'
      );

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Checkerboard for transparent
    const cellSize = 16;
    for (let y = 0; y < height; y += cellSize) {
      for (let x = 0; x < width; x += cellSize) {
        ctx.fillStyle = (Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0
          ? (isDarkMode ? '#242831' : '#F1F3F5')
          : (isDarkMode ? '#1B1E24' : '#E5E7EB');
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }

  // Draw guide patterns if enabled
  if (background?.showGuides !== false && background?.pattern && background.pattern !== 'none') {
    const guideColor = isDarkMode ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)';
    ctx.strokeStyle = guideColor;
    ctx.fillStyle = guideColor;

    if (background.pattern === 'dots') {
      const spacing = 28;
      for (let x = spacing; x < width; x += spacing) {
        for (let y = spacing; y < height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.25, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (background.pattern === 'grid') {
      const spacing = 32;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = spacing; x < width; x += spacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = spacing; y < height; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    } else if (background.pattern === 'lined') {
      const spacing = 32;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = spacing * 1.5; y < height; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}
