/**
 * Computes symmetric branches for a given set of stroke points [[x, y, pressure], ...]
 */

export function computeSymmetryBranches(points, symmetryMode = 'off', docWidth = 1200, docHeight = 900) {
  if (!points || points.length === 0 || !symmetryMode || symmetryMode === 'off') {
    return [];
  }

  const cx = docWidth / 2;
  const cy = docHeight / 2;
  const branches = [];

  if (symmetryMode === 'vertical') {
    // Mirror across vertical center axis
    const branch = points.map(([x, y, p]) => [2 * cx - x, y, p]);
    branches.push(branch);
  } else if (symmetryMode === 'horizontal') {
    // Mirror across horizontal center axis
    const branch = points.map(([x, y, p]) => [x, 2 * cy - y, p]);
    branches.push(branch);
  } else if (symmetryMode === 'radial4') {
    // 4 Quadrants
    const b1 = points.map(([x, y, p]) => [2 * cx - x, y, p]);
    const b2 = points.map(([x, y, p]) => [x, 2 * cy - y, p]);
    const b3 = points.map(([x, y, p]) => [2 * cx - x, 2 * cy - y, p]);
    branches.push(b1, b2, b3);
  } else if (symmetryMode === 'radial6' || symmetryMode === 'radial8') {
    const numAxes = symmetryMode === 'radial6' ? 6 : 8;
    const angleStep = (2 * Math.PI) / numAxes;

    for (let k = 1; k < numAxes; k++) {
      const angle = k * angleStep;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const branch = points.map(([x, y, p]) => {
        const dx = x - cx;
        const dy = y - cy;
        const rx = cx + (dx * cosA - dy * sinA);
        const ry = cy + (dx * sinA + dy * cosA);
        return [rx, ry, p];
      });
      branches.push(branch);
    }
  }

  return branches;
}
