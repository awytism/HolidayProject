import {
  addBlock,
  addListItem,
  changeGenericList,
  changeAmenities,
  changeAnatomy,
  changeTable,
  deleteBlock,
  deleteListItem,
  duplicateBlock,
  moveBlockRelative,
  moveBlockToEnd,
  setBlockField,
  setBlockCover,
  setBlockSpan,
  toggleBlockColorHeader,
  setListItem,
  updateTable,
  updateAmenityGroup,
  updateAnatomy,
} from "./commands.js";
import { runFoodAction, runPlaceAction, updateFoodInput, updatePlaceInput } from "./agenda-editor.js";
import { getSectionConfig } from "../sections/registry.js";
import { escapeHtml } from "../utils/html.js";
import { renderCover } from "../sections/shared.js";
import { AMENITY_CATALOG, searchAmenities } from "../domain/amenity-catalog.js";
import { renderActionIcon, renderIcon } from "../ui/icon-registry.js";
import { layoutBlockGrid } from "./layout-grid.js";
import { renderEditorCardHeading } from "./editor-card-heading.js";

export { editorCardTitle } from "./editor-card-heading.js";

const COLOR_HEADER_TYPES = new Set([
  "table", "image-card", "icon-list", "checklist", "facts", "link-card", "note",
  "stay-amenities", "stay-anatomy", "essentials", "link", "saved-places",
]);
const ATTACHMENT_HIDDEN_TYPES = new Set(["stay-amenities", "stay-distances", "saved-places"]);
const INLINE_ATTACHMENT_TYPES = new Set(["flight", "transfer", "stay-summary", "day"]);
const REMOVED_STAY_TYPES = new Set(["stay-anatomy", "essentials"]);

export function shouldRenderAttachments(type, editing = false) {
  if (INLINE_ATTACHMENT_TYPES.has(type)) return editing;
  return !ATTACHMENT_HIDDEN_TYPES.has(type);
}
const DIRECTION_TOLERANCE = 4;

const CLICK_HANDLERS = [
  ["[data-stay-cover]", chooseBlockCover],
  ["[data-transport-cover]", chooseTransportLocationCover],
  ["[data-block-action]:not([data-block-action=drag])", runBlockAction],
  ["[data-add-type]", runAddBlock],
  ["[data-open-templates]", (_target, context) => context.templates.open(context.store.getState().activeSection)],
  ["[data-table-action]", runTableAction],
  ["[data-generic-list-action]", runGenericAction],
  ["[data-amenity-action],[data-add-amenity]", runAmenityAction],
  ["[data-anatomy-action]", runAnatomyAction],
  ["[data-list-action]", runListAction],
  ["[data-place-action]", runPlaceAction],
  ["[data-food-action]", runFoodAction],
];

const INPUT_HANDLERS = [
  [(target) => target.dataset.blockField !== undefined, updateBlockInput],
  [(target) => target.dataset.listProperty !== undefined, updateListInput],
  [(target) => target.dataset.placeField !== undefined, updatePlaceInput],
  [(target) => target.dataset.foodField !== undefined, updateFoodInput],
  [(target) => target.dataset.tableColumn !== undefined || target.dataset.tableCell !== undefined, updateTableInput],
  [(target) => target.dataset.genericField !== undefined, updateGenericInput],
  [(target) => target.dataset.amenityGroupLabel !== undefined, updateAmenityLabel],
  [(target) => target.dataset.amenitySearch !== undefined, renderAmenityResults],
  [(target) => target.dataset.customAmenityIcon !== undefined, updateCustomIconPreview],
  [(target) => target.dataset.blockSpan !== undefined, updateBlockSpan],
  [(target) => target.dataset.spaceField !== undefined || target.dataset.bedField !== undefined, updateAnatomyInput],
];

export function renderBlockEditor(root, store, attachments, section = store.getState().activeSection, options = {}) {
  const state = store.getState();
  const document = store.getDocument();
  const config = getSectionConfig(section);
  const renderEditing = state.editing && options.renderEditing !== false;
  const blocks = document.sections[section].filter((block) => (
    section !== "stay" || !REMOVED_STAY_TYPES.has(block.type)
  ));
  const content = blocks.length
    ? blocks.map((block) => renderBlock(block, config, renderEditing, section, {
      attachments,
      inlineEditing: state.editing,
    })).join("")
    : renderEmpty(renderEditing);
  root.innerHTML = `<div class="block-grid section-${section}-grid">${content}</div>${renderEditing ? renderAddMenu(config) : ""}`;
  bindBrokenImages(root);
  layoutBlockGrid(root);
}

export function bindBlockEditor(root, context) {
  let draggedId = null;
  let pointerDrag = null;
  let touchTooltip = null;
  root.addEventListener("input", (event) => {
    activateSectionForTarget(event.target, context);
    handleInput(event, context);
  });
  root.addEventListener("click", (event) => {
    activateSectionForTarget(event.target, context);
    handleClick(event, context);
  });
  root.addEventListener("pointerdown", (event) => {
    activateSectionForTarget(event.target, context);
    const handle = event.target.closest(".drag-handle");
    if (handle && event.button === 0) {
      const block = handle.closest(".editor-block");
      pointerDrag = {
        id: block.dataset.blockId,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        handle,
      };
      try { handle.setPointerCapture(event.pointerId); } catch { /* Synthetic pointers may not support capture. */ }
      event.preventDefault();
      return;
    }
    const tooltipButton = event.target.closest(".toolbar-icon[data-tooltip]");
    if (!tooltipButton || event.pointerType === "mouse") return;
    touchTooltip = startTouchTooltip(tooltipButton, event);
  });
  root.addEventListener("pointermove", (event) => {
    if (touchTooltip?.pointerId === event.pointerId
      && Math.hypot(event.clientX - touchTooltip.startX, event.clientY - touchTooltip.startY) > 8) {
      clearTouchTooltipTimer(touchTooltip);
      touchTooltip = null;
    }
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
    if (!pointerDrag.active && Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY) < 6) return;
    pointerDrag.active = true;
    findBlock(root, pointerDrag.id)?.classList.add("is-dragging");
    updatePointerDropState(root, event, pointerDrag.id);
    event.preventDefault();
  });
  root.addEventListener("pointerup", (event) => {
    finishTouchTooltip(touchTooltip, event.pointerId);
    if (touchTooltip?.pointerId === event.pointerId) touchTooltip = null;
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
    const completed = pointerDrag;
    pointerDrag = null;
    if (!completed.active) {
      completed.handle.classList.add("is-touch-tooltip");
      window.setTimeout(() => completed.handle.classList.remove("is-touch-tooltip"), 1200);
      return;
    }
    updatePointerDropState(root, event, completed.id);
    commitDrop(root, context, completed.id, describePointerDirection(completed, event));
  });
  root.addEventListener("pointercancel", (event) => {
    finishTouchTooltip(touchTooltip, event.pointerId);
    if (touchTooltip?.pointerId === event.pointerId) touchTooltip = null;
    if (pointerDrag?.pointerId !== event.pointerId) return;
    clearDragState(root);
    pointerDrag = null;
  });
  root.addEventListener("dragstart", (event) => {
    activateSectionForTarget(event.target, context);
    const handle = event.target.closest(".drag-handle");
    const block = handle?.closest(".editor-block");
    if (!block) return;
    draggedId = block.dataset.blockId;
    block.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedId);
  });
  root.addEventListener("dragover", (event) => handleDragOver(event, draggedId));
  root.addEventListener("drop", (event) => {
    if (!event.target.closest(".block-grid") || !draggedId) return;
    event.preventDefault();
    commitDrop(root, context, draggedId, "down");
    draggedId = null;
  });
  root.addEventListener("dragend", () => {
    clearDragState(root);
    draggedId = null;
  });
}

function renderBlock(block, config, editing, section, options) {
  const { attachments, inlineEditing } = options;
  const span = block.layout?.span ?? 12;
  const attachmentSection = shouldRenderAttachments(block.type, editing) ? attachments?.render(block.id, section, editing) ?? "" : "";
  const presentation = blockPresentation(block, Boolean(attachmentSection), inlineEditing);
  const toolbar = editing ? renderToolbar(span, presentation.supportsColorHeader, presentation.colorHeader) : "";
  const editorHeading = editing ? renderEditorCardHeading(block.type, section) : "";
  const inlineImage = presentation.inlineImage ? ' data-inline-image-field="cover"' : "";
  return `<div class="editor-block block-span-${span} block-type-${escapeHtml(block.type)}" data-block-id="${escapeHtml(block.id)}">${toolbar}<div class="${presentation.frameClass}"${inlineImage}>${presentation.cover}${presentation.header}${editorHeading}${config.render(block, editing, { attachments, section })}${attachmentSection}</div></div>`;
}

function blockPresentation(block, hasAttachments, inlineEditing) {
  const supportsColorHeader = COLOR_HEADER_TYPES.has(block.type);
  const colorHeader = supportsColorHeader && block.appearance?.colorHeader === true;
  const cover = renderCover(block.cover)
    || (inlineEditing && ["stay-summary", "image-card"].includes(block.type)
      ? '<div class="block-cover inline-image-empty"></div>'
      : "");
  const frameClass = ["block-frame", cover && "has-cover", colorHeader && "has-color-header", hasAttachments && "has-attachments"].filter(Boolean).join(" ");
  const header = colorHeader ? `<header class="block-color-header"><h3>${escapeHtml(block.data.title)}</h3></header>` : "";
  return { supportsColorHeader, colorHeader, cover, frameClass, header, inlineImage: Boolean(cover) };
}

function renderToolbar(span, supportsColorHeader, colorHeader) {
  const options = [[12, "Full"], [8, "Two-thirds"], [6, "Half"], [4, "Third"]]
    .map(([value, label]) => `<option value="${value}" ${span === value ? "selected" : ""}>${label}</option>`).join("");
  const headerToggle = supportsColorHeader ? actionButton("header", "Color Header", "palette", { pressed: colorHeader }) : "";
  return `<div class="block-toolbar" aria-label="Controles do bloco de conteúdo">${actionButton("drag", "Arrastar para reordenar", "grip", { className: "drag-handle", draggable: false, align: "start" })}${actionButton("left", "Mover para a esquerda", "arrow-left")}${actionButton("right", "Mover para a direita", "arrow-right")}${actionButton("up", "Mover para cima", "arrow-up")}${actionButton("down", "Mover para baixo", "arrow-down")}<label class="block-size"><span>Tamanho</span><select data-block-span aria-label="Largura do bloco de conteúdo">${options}</select></label>${headerToggle}${actionButton("cover", "Imagem de capa", "image")}${actionButton("insert", "Inserir bloco", "panel-plus")}${actionButton("template", "Salvar como modelo", "bookmark")}${actionButton("duplicate", "Duplicar bloco", "copy")}${actionButton("delete", "Excluir bloco", "trash", { className: "delete-action", align: "end" })}</div>`;
}

function actionButton(action, label, icon, options = {}) {
  const attributes = [
    `class="toolbar-icon ${options.className ?? ""}"`,
    'type="button"',
    `data-block-action="${action}"`,
    `data-tooltip="${escapeHtml(label)}"`,
    `aria-label="${escapeHtml(label)}"`,
  ];
  if (options.pressed !== undefined) attributes.push(`aria-pressed="${options.pressed}"`);
  if (options.align) attributes.push(`data-tooltip-align="${options.align}"`);
  if (options.draggable !== undefined) attributes.push(`draggable="${options.draggable}"`);
  return `<button ${attributes.join(" ")}>${renderActionIcon(icon)}</button>`;
}

function renderAddMenu(config) {
  const options = config.addTypes.map((item) => `<button type="button" data-add-type="${escapeHtml(item.type)}">+ ${escapeHtml(item.label)}</button>`).join("");
  return `<div class="add-block"><span>Adicionar um bloco</span><div class="add-options"><button type="button" data-open-templates>Ver modelos</button>${options}</div></div>`;
}

function renderEmpty(editing) {
  const hint = editing ? "Use “Adicionar um bloco” abaixo para começar esta seção." : "Desbloqueie a edição para adicionar conteúdo.";
  return `<div class="empty-state"><strong>Esta seção está vazia</strong><span>${hint}</span></div>`;
}

function activateSectionForTarget(target, context) {
  const section = target.closest("[data-page-section]")?.dataset.pageSection;
  if (section) context.store.setActive(section);
}

function handleClick(event, context) {
  const tooltipButton = event.target.closest("[data-suppress-click=true]");
  if (tooltipButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    delete tooltipButton.dataset.suppressClick;
    return;
  }
  const match = CLICK_HANDLERS.map(([selector, run]) => [event.target.closest(selector), run])
    .find(([target]) => target);
  if (match) match[1](match[0], context);
}

function handleInput(event, context) {
  const target = event.target;
  const block = target.closest(".editor-block");
  if (!block) return;
  const match = INPUT_HANDLERS.find(([accepts]) => accepts(target));
  if (match) match[1](target, block, context);
}

function updateBlockInput(target, block, context) {
  const section = context.store.getState().activeSection;
  context.store.mutate((document) => setBlockField(document, section, block.dataset.blockId, target.dataset.blockField, target.value));
  if (target.dataset.blockField === "title") block.querySelector(".block-color-header h3")?.replaceChildren(target.value);
}

function runBlockAction(button, context) {
  const blockId = button.closest(".editor-block").dataset.blockId;
  const action = button.dataset.blockAction;
  if (action === "delete" && !context.attachments.confirmBlockDeletion(context.store.getState().activeSection, blockId)) return;
  if (action === "cover") return chooseBlockCover(button, context);
  if (action === "insert") return context.templates.open(context.store.getState().activeSection, blockId);
  if (action === "template") return saveBlockTemplate(button, context);
  if (["left", "right", "up", "down"].includes(action)) return moveBlockInDirection(button, context, action);
  mutate(context, (document, section) => {
    if (action === "duplicate") duplicateBlock(document, section, blockId);
    if (action === "header") toggleBlockColorHeader(document, section, blockId);
    if (action === "delete") deleteBlock(document, section, blockId);
  });
}

function runAddBlock(button, context) {
  const section = context.store.getState().activeSection;
  const block = getSectionConfig(section).createBlock(button.dataset.addType);
  mutate(context, (document) => addBlock(document, section, block));
}

function runListAction(button, context) {
  if (button.dataset.listAction === "cover") return chooseListItemCover(button, context);
  const block = button.closest(".editor-block");
  const item = button.closest("[data-item-index]");
  const data = makeContext(context, block, { index: Number(item?.dataset.itemIndex) });
  mutate(context, (document) => {
    if (button.dataset.listAction === "add") addListItem(document, data);
    if (button.dataset.listAction === "delete") deleteListItem(document, data);
  });
}

function runTableAction(button, context) {
  const block = button.closest(".editor-block");
  const row = button.closest("[data-row-index]");
  const data = makeContext(context, block, { action: button.dataset.tableAction, row: Number(row?.dataset.rowIndex) });
  mutate(context, (document) => changeTable(document, data));
}

function runGenericAction(button, context) {
  const block = button.closest(".editor-block");
  const row = button.closest("[data-generic-index]");
  const data = makeContext(context, block, { action: button.dataset.genericListAction, index: Number(row?.dataset.genericIndex) });
  mutate(context, (document) => changeGenericList(document, data));
}

function runAmenityAction(button, context) {
  const block = button.closest(".editor-block");
  const group = button.closest("[data-amenity-group]");
  const item = button.closest("[data-amenity-item]");
  const action = button.dataset.amenityAction ?? "add-item";
  const data = makeContext(context, block, { action, groupId: group?.dataset.amenityGroup, itemId: item?.dataset.amenityItem });
  const preset = action === "add-custom"
    ? { label: group.querySelector("[data-custom-amenity-label]").value, iconKey: group.querySelector("[data-custom-amenity-icon]").value }
    : AMENITY_CATALOG.find((entry) => entry.id === button.dataset.addAmenity);
  mutate(context, (document) => changeAmenities(document, data, preset));
}

function runAnatomyAction(button, context) {
  const block = button.closest(".editor-block");
  const space = button.closest("[data-space-id]");
  const bed = button.closest("[data-bed-id]");
  const data = makeContext(context, block, { action: button.dataset.anatomyAction, spaceId: space?.dataset.spaceId, bedId: bed?.dataset.bedId });
  mutate(context, (document) => changeAnatomy(document, data));
}

function updateListInput(target, block, context) {
  const item = target.closest("[data-item-index]");
  const data = makeContext(context, block, {
    index: Number(item.dataset.itemIndex),
    property: target.dataset.listProperty || null,
  });
  context.store.mutate((document) => setListItem(document, data, target.value));
}

function updateTableInput(target, block, context) {
  const row = target.closest("[data-row-index]");
  const data = makeContext(context, block, {
    kind: target.dataset.tableColumn !== undefined ? "column" : "cell",
    column: Number(target.dataset.tableColumn ?? target.dataset.tableCell),
    row: Number(row?.dataset.rowIndex),
  });
  context.store.mutate((document) => updateTable(document, data, target.value));
}

function updateGenericInput(target, block, context) {
  const row = target.closest("[data-generic-index]");
  const data = makeContext(context, block, {
    action: "update",
    index: Number(row.dataset.genericIndex),
    property: target.dataset.genericField,
  });
  const value = target.type === "checkbox" ? target.checked : target.value;
  context.store.mutate((document) => changeGenericList(document, data, value));
}

function updateAmenityLabel(target, block, context) {
  const group = target.closest("[data-amenity-group]");
  const data = makeContext(context, block, { groupId: group.dataset.amenityGroup });
  context.store.mutate((document) => updateAmenityGroup(document, data, target.value));
}

function renderAmenityResults(target, block, context) {
  const group = target.closest("[data-amenity-group]");
  const section = context.store.getState().activeSection;
  const source = context.store.getDocument().sections[section].find((item) => item.id === block.dataset.blockId);
  const selectedIds = source.data.groups.flatMap((item) => item.items.map((entry) => entry.presetId));
  const results = searchAmenities(target.value, { selectedIds });
  group.querySelector(".amenity-results").innerHTML = results.map((item) => `<button type="button" role="option" data-add-amenity="${escapeHtml(item.id)}">${renderIcon(item.iconKey)}<span>${escapeHtml(item.label)}</span></button>`).join("");
}

function updateCustomIconPreview(target) {
  target.closest(".custom-amenity")?.querySelector(".custom-icon-preview")
    ?.replaceChildren(createIconNode(target.value));
}

function createIconNode(iconKey) {
  const wrapper = document.createElement("span");
  wrapper.innerHTML = renderIcon(iconKey);
  return wrapper.firstElementChild ?? wrapper;
}

function updateBlockSpan(target, block, context) {
  const section = context.store.getState().activeSection;
  context.store.mutate((document) => setBlockSpan(document, section, block.dataset.blockId, target.value));
  context.render();
}

function updateAnatomyInput(target, block, context) {
  const space = target.closest("[data-space-id]");
  const bed = target.closest("[data-bed-id]");
  const data = makeContext(context, block, {
    kind: target.dataset.spaceField !== undefined ? "space" : "bed",
    spaceId: space.dataset.spaceId,
    bedId: bed?.dataset.bedId,
    property: target.dataset.bedField ?? target.dataset.spaceField,
  });
  context.store.mutate((document) => updateAnatomy(document, data, target.value));
}

async function chooseBlockCover(button, context) {
  const blockId = button.closest(".editor-block").dataset.blockId;
  const section = context.store.getState().activeSection;
  const block = context.store.getDocument().sections[section].find((item) => item.id === blockId);
  const cover = await context.imagePicker.open(block.cover);
  if (cover === undefined) return;
  context.store.mutate((document) => setBlockCover(document, section, blockId, cover));
  context.render();
}

async function chooseTransportLocationCover(button, context) {
  const blockId = button.closest(".editor-block").dataset.blockId;
  const section = context.store.getState().activeSection;
  const property = button.dataset.transportCover;
  const block = context.store.getDocument().sections[section].find((item) => item.id === blockId);
  const cover = await context.imagePicker.open(block.data[property]);
  if (cover === undefined) return;
  context.store.mutate((document) => setBlockField(document, section, blockId, property, cover));
  context.render();
}

async function chooseListItemCover(button, context) {
  const blockElement = button.closest(".editor-block");
  const itemElement = button.closest("[data-item-index]");
  const data = makeContext(context, blockElement, {
    index: Number(itemElement.dataset.itemIndex),
    property: "cover",
  });
  const block = context.store.getDocument().sections[data.section].find((item) => item.id === data.blockId);
  const cover = await context.imagePicker.open(block.data.items[data.index].cover);
  if (cover === undefined) return;
  context.store.mutate((document) => setListItem(document, data, cover));
  context.render();
}

function saveBlockTemplate(button, context) {
  const blockId = button.closest(".editor-block").dataset.blockId;
  const section = context.store.getState().activeSection;
  const block = context.store.getDocument().sections[section].find((item) => item.id === blockId);
  context.templates.saveBlock(section, block);
}

function makeContext(context, block, extras) {
  return {
    section: context.store.getState().activeSection,
    blockId: block.dataset.blockId,
    ...extras,
  };
}

function mutate(context, operation) {
  const section = context.store.getState().activeSection;
  context.store.mutate((document) => operation(document, section));
  context.render();
}

function moveBlockInDirection(button, context, direction) {
  const section = context.store.getState().activeSection;
  const root = button.closest("[data-section-root]")
    ?? button.ownerDocument.querySelector(`[data-section-root="${section}"]`);
  const source = button.closest(".editor-block");
  const blockId = source.dataset.blockId;
  const target = findDirectionalTarget(root, source, direction);
  if (!target) return showMovementFeedback(root, blockId, noPositionMessage(direction));
  const originalBounds = source.getBoundingClientRect();
  const originalOrder = context.store.getDocument().sections[section].map((block) => block.id);
  mutate(context, (document, section) => {
    moveBlockRelative(document, section, blockId, target.dataset.blockId, ["right", "down"].includes(direction));
  });
  const movedBlock = findBlock(root, blockId);
  if (!movedBlock || !movedInDirection(originalBounds, movedBlock.getBoundingClientRect(), direction)) {
    restoreBlockOrder(context, originalOrder);
    showMovementFeedback(root, blockId, noPositionMessage(direction));
    return;
  }
  showMovementFeedback(root, blockId, `Movido ${direction}`);
}

function findDirectionalTarget(root, source, direction) {
  const sourceBounds = source.getBoundingClientRect();
  const candidates = [...root.querySelectorAll(".editor-block")].filter((block) => block !== source)
    .map((block) => {
      const bounds = block.getBoundingClientRect();
      const score = scoreDirectionalTarget(sourceBounds, bounds, direction);
      return score === null ? null : { block, score };
    }).filter(Boolean).sort((a, b) => a.score - b.score);
  return candidates[0]?.block ?? null;
}

export function scoreDirectionalTarget(sourceBounds, bounds, direction) {
  const horizontal = direction === "left" || direction === "right";
  const sign = direction === "left" || direction === "up" ? -1 : 1;
  const primaryDelta = horizontal ? bounds.left - sourceBounds.left : bounds.top - sourceBounds.top;
  if (primaryDelta * sign <= DIRECTION_TOLERANCE) return null;
  const crossDelta = horizontal
    ? Math.abs(bounds.top - sourceBounds.top)
    : Math.abs(bounds.left - sourceBounds.left);
  const overlaps = horizontal
    ? rangesOverlap(sourceBounds.top, sourceBounds.bottom, bounds.top, bounds.bottom)
    : rangesOverlap(sourceBounds.left, sourceBounds.right, bounds.left, bounds.right);
  return Math.abs(primaryDelta) + crossDelta * (overlaps ? 0.15 : 0.65);
}

function rangesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return Math.min(firstEnd, secondEnd) > Math.max(firstStart, secondStart);
}

function movedInDirection(before, after, direction) {
  const delta = direction === "left" || direction === "right"
    ? after.left - before.left
    : after.top - before.top;
  const sign = direction === "left" || direction === "up" ? -1 : 1;
  return delta * sign > DIRECTION_TOLERANCE;
}

function restoreBlockOrder(context, originalOrder) {
  const ranks = new Map(originalOrder.map((id, index) => [id, index]));
  mutate(context, (document, section) => {
    document.sections[section].sort((first, second) => ranks.get(first.id) - ranks.get(second.id));
  });
}

function noPositionMessage(direction) {
  const positions = { left: "à esquerda", right: "à direita", up: "acima", down: "abaixo" };
  return `Não há posição disponível ${positions[direction]}`;
}

function commitDrop(root, context, draggedId, direction) {
  const target = root.querySelector(".is-drop-target");
  const grid = root.querySelector(".block-grid");
  if (!target && !grid?.classList.contains("is-drop-zone")) {
    clearDragState(root);
    return;
  }
  const targetId = target?.dataset.blockId;
  const after = target?.dataset.dropPosition === "after";
  clearDragState(root);
  mutate(context, (document, section) => {
    if (targetId) moveBlockRelative(document, section, draggedId, targetId, after);
    else moveBlockToEnd(document, section, draggedId);
  });
  showMovementFeedback(root, draggedId, `Movido ${direction}`);
}

function updatePointerDropState(root, event, draggedId) {
  const element = root.ownerDocument.elementFromPoint?.(event.clientX, event.clientY) ?? event.target;
  markDropState(root.querySelector(".block-grid"), element, event, draggedId);
}

function markDropState(grid, element, point, draggedId) {
  if (!grid) return;
  const target = element?.closest?.(".editor-block");
  clearDragState(grid, true);
  if (!target || !grid.contains(target)) return grid.classList.add("is-drop-zone");
  if (target.dataset.blockId === draggedId) return;
  target.dataset.dropPosition = resolveDropPosition(point, target.getBoundingClientRect());
  target.dataset.dropAxis = resolveDropAxis(point, target.getBoundingClientRect());
  target.classList.add("is-drop-target");
}

function describePointerDirection(start, end) {
  const horizontal = end.clientX - start.startX;
  const vertical = end.clientY - start.startY;
  const parts = [];
  if (Math.abs(vertical) > 12) parts.push(vertical < 0 ? "up" : "down");
  if (Math.abs(horizontal) > 12) parts.push(horizontal < 0 ? "left" : "right");
  return parts.join(" and ") || "para uma nova posição";
}

function showMovementFeedback(root, blockId, message) {
  const block = findBlock(root, blockId);
  if (!block) return;
  const feedback = document.createElement("span");
  feedback.className = "move-feedback";
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  feedback.textContent = message;
  block.append(feedback);
  window.setTimeout(() => feedback.remove(), 1500);
}

function findBlock(root, blockId) {
  return [...root.querySelectorAll(".editor-block")]
    .find((block) => block.dataset.blockId === blockId);
}

function startTouchTooltip(button, event) {
  const state = {
    button,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
  };
  state.timer = window.setTimeout(() => {
    button.classList.add("is-touch-tooltip");
    button.dataset.suppressClick = "true";
  }, 450);
  return state;
}

function clearTouchTooltipTimer(state) {
  if (state?.timer) window.clearTimeout(state.timer);
}

function finishTouchTooltip(state, pointerId) {
  if (!state || state.pointerId !== pointerId) return;
  clearTouchTooltipTimer(state);
  if (state.button.classList.contains("is-touch-tooltip")) {
    window.setTimeout(() => state.button.classList.remove("is-touch-tooltip"), 1200);
  }
}

function handleDragOver(event, draggedId) {
  const grid = event.target.closest(".block-grid");
  if (!grid || !draggedId) return;
  event.preventDefault();
  markDropState(grid, event.target, event, draggedId);
}

export function resolveDropPosition(point, bounds) {
  const verticalRatio = bounds.height ? (point.clientY - bounds.top) / bounds.height : 0.5;
  if (verticalRatio < 0.25) return "before";
  if (verticalRatio > 0.75) return "after";
  return point.clientX >= bounds.left + bounds.width / 2 ? "after" : "before";
}

export function resolveDropAxis(point, bounds) {
  const verticalRatio = bounds.height ? (point.clientY - bounds.top) / bounds.height : 0.5;
  return verticalRatio >= 0.25 && verticalRatio <= 0.75 ? "horizontal" : "vertical";
}

function clearDragState(root, preserveDragging = false) {
  root.classList.remove("is-drop-zone");
  root.querySelectorAll(".is-drop-target").forEach((element) => {
    element.classList.remove("is-drop-target");
    delete element.dataset.dropPosition;
    delete element.dataset.dropAxis;
  });
  if (!preserveDragging) root.querySelectorAll(".is-dragging").forEach((element) => element.classList.remove("is-dragging"));
}

function bindBrokenImages(root) {
  root.querySelectorAll(".place-media img,.distance-landmark-media img,.route-location-media img").forEach((image) => image.addEventListener("error", () => image.remove(), { once: true }));
}
