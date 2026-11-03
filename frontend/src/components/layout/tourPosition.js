const EDGE_GAP = 12;
const TARGET_GAP = 14;

export function getTourPosition(target, popover, viewport) {
  const width = Math.min(popover.width, Math.max(0, viewport.width - EDGE_GAP * 2));
  const left = Math.max(EDGE_GAP, Math.min(target.left, viewport.width - width - EDGE_GAP));
  const belowTop = target.bottom + TARGET_GAP;
  const belowSpace = Math.max(0, viewport.height - EDGE_GAP - belowTop);
  const aboveSpace = Math.max(0, target.top - TARGET_GAP - EDGE_GAP);
  const below = belowSpace >= popover.height || belowSpace >= aboveSpace;
  const maxHeight = Math.min(popover.height, below ? belowSpace : aboveSpace);
  const top = below ? belowTop : target.top - TARGET_GAP - maxHeight;

  return { top, left, maxHeight };
}
