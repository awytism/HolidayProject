export function layoutBlockGrid(root) {
  const grid = root.querySelector(".block-grid");
  const blocks = [...grid?.querySelectorAll(":scope > .editor-block") ?? []];
  blocks.forEach((block) => { block.style.removeProperty("grid-row-end"); });
}
