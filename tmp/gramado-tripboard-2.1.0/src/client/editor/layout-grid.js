const ROW_HEIGHT = 4;
const GAP = 16;
const activeLayouts = new WeakMap();

export function calculateRowSpan(height, rowHeight = ROW_HEIGHT, gap = GAP) {
  return Math.max(1, Math.ceil((height + gap) / (rowHeight + gap)));
}

export function layoutBlockGrid(root) {
  activeLayouts.get(root)?.disconnect();
  const grid = root.querySelector(".block-grid");
  const blocks = [...grid?.querySelectorAll(":scope > .editor-block") ?? []];
  if (!grid || !blocks.length) return;
  const view = root.ownerDocument.defaultView;
  let frame = 0;
  const resize = () => {
    view.cancelAnimationFrame(frame);
    frame = view.requestAnimationFrame(() => applyRows(blocks));
  };
  const observer = new view.ResizeObserver(resize);
  blocks.forEach((block) => observer.observe(block));
  activeLayouts.set(root, {
    disconnect() {
      observer.disconnect();
      view.cancelAnimationFrame(frame);
    },
  });
  resize();
}

function applyRows(blocks) {
  const spans = blocks.map((block) => calculateRowSpan(block.getBoundingClientRect().height));
  blocks.forEach((block, index) => { block.style.gridRowEnd = `span ${spans[index]}`; });
}
