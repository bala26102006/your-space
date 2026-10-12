/**
 * Fast scanline-based 4-way Flood Fill for Canvas 2D
 */

function hexToRgba(hex, alpha = 255) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return [
    (num >> 16) & 255,
    (num >> 8) & 255,
    num & 255,
    alpha
  ];
}

function colorMatch(data, idx, target, tolerance) {
  const dr = Math.abs(data[idx] - target[0]);
  const dg = Math.abs(data[idx + 1] - target[1]);
  const db = Math.abs(data[idx + 2] - target[2]);
  const da = Math.abs(data[idx + 3] - target[3]);
  return (dr + dg + db + da) / 4 <= tolerance;
}

/**
 * Executes flood fill at (startX, startY) on the given canvas context
 * Returns a new dataURL containing ONLY the filled pixels, or null if no-op
 */
export function executeFloodFill(sourceCtx, startX, startY, fillHex, tolerance = 32, width, height) {
  const x0 = Math.round(startX);
  const y0 = Math.round(startY);

  if (x0 < 0 || x0 >= width || y0 < 0 || y0 >= height) return null;

  const srcImgData = sourceCtx.getImageData(0, 0, width, height);
  const srcData = srcImgData.data;

  const targetIdx = (y0 * width + x0) * 4;
  const targetColor = [
    srcData[targetIdx],
    srcData[targetIdx + 1],
    srcData[targetIdx + 2],
    srcData[targetIdx + 3]
  ];

  const fillColor = hexToRgba(fillHex, 255);

  // If already matches fill color within tolerance, no-op
  if (colorMatch(targetColor, 0, fillColor, 5)) {
    return null;
  }

  // Create isolated output canvas for the filled mask
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d');
  const maskImgData = maskCtx.createImageData(width, height);
  const maskData = maskImgData.data;

  // Visited array: 1 bit per pixel (Uint8Array)
  const visited = new Uint8Array(width * height);
  const stack = [x0, y0];

  visited[y0 * width + x0] = 1;

  while (stack.length > 0) {
    const cy = stack.pop();
    const cx = stack.pop();

    const idx = (cy * width + cx) * 4;
    maskData[idx] = fillColor[0];
    maskData[idx + 1] = fillColor[1];
    maskData[idx + 2] = fillColor[2];
    maskData[idx + 3] = fillColor[3];

    // Check 4 neighbors
    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1]
    ];

    for (let i = 0; i < neighbors.length; i++) {
      const [nx, ny] = neighbors[i];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const pIdx = ny * width + nx;
        if (!visited[pIdx]) {
          visited[pIdx] = 1;
          const nDataIdx = pIdx * 4;
          if (colorMatch(srcData, nDataIdx, targetColor, tolerance)) {
            stack.push(nx, ny);
          }
        }
      }
    }
  }

  maskCtx.putImageData(maskImgData, 0, 0);
  return maskCanvas.toDataURL('image/png');
}
