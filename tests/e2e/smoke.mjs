import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createScryptPasswordHash } from "../../src/server/security.mjs";
import { verifyAgendaEmptyStates, verifyCalendarEditors, verifyLiveFlightResources, verifyPlacesTitleInline, verifyRequestedUiPolish, verifyResponsiveResizeAndMotion, verifyToolbarTooltip, verifyTransportCardAlignment, verifyTravelEssentialsCard } from "./ui-regressions.mjs";
import { verifyCardEditorCrud } from "./card-editor-regression.mjs";
import { verifyEditOutlines } from "./edit-outline-regression.mjs";
import { verifyPaletteThemes } from "./palette-regression.mjs";
import { verifyDocumentSave } from "./save-regression.mjs";
import { verifyLanguageTranslation } from "./language-regression.mjs";
const root = process.cwd();
const port = 3107;
const debugPort = 9237;
const database = resolve(root, `data/e2e-${process.pid}.sqlite`);
const profile = resolve(process.env.TEMP ?? root, `gramado-e2e-chrome-${process.pid}`);
const uploadFixture = resolve(root, `data/e2e-cover-${process.pid}.png`);
const oversizedFixture = resolve(root, `data/e2e-cover-oversized-${process.pid}.jpg`);
const chromePath = findChrome();
const movementOnly = process.argv.includes("--movement-only");
const alignmentOnly = process.argv.includes("--alignment-only");
const headingsOnly = process.argv.includes("--headings-only");
const cardsOnly = process.argv.includes("--cards-only");
const palettesOnly = process.argv.includes("--palettes-only");
const clippingOnly = process.argv.includes("--clipping-only"); const placesTitleOnly = process.argv.includes("--places-title-only");
const saveOnly = process.argv.includes("--save-only");
const polishOnly = process.argv.includes("--polish-only");
const responsiveOnly = process.argv.includes("--responsive-only");
const languageOnly = process.argv.includes("--language-only");
const password = "e2e-only-password";
const passwordHash = await createScryptPasswordHash(password, { salt: randomBytes(16) });
const hmacSecret = randomBytes(32).toString("hex");
rmSync(database, { force: true });
rmSync(profile, { recursive: true, force: true });
writeFileSync(uploadFixture, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
writeFileSync(oversizedFixture, Buffer.alloc(8 * 1024 * 1024 + 1));
const server = spawn(process.execPath, ["src/server/app.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    GRAMADO_DB_PATH: database,
    GRAMADO_PASSWORD_SCRYPT_HASH: passwordHash,
    GRAMADO_IP_HMAC_SECRET: hmacSecret,
  },
  stdio: "pipe",
});
let chrome;
let client;
try {
  await waitForServer(`http://127.0.0.1:${port}/api/document`);
  chrome = spawn(chromePath, [
    "--headless=new", "--disable-gpu", "--disable-dev-shm-usage", "--no-first-run",
    "--window-size=1280,1000", `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`, `http://127.0.0.1:${port}/#transport`,
  ], { stdio: "ignore" });
  client = await connectToChrome(debugPort);
  if (placesTitleOnly) {
    await client.waitFor(() => document.querySelectorAll(".section-transport-grid .content-block").length === 3);
    await unlockEditing(client);
    await verifyPlacesTitleInline(client);
  } else if (languageOnly) {
    await client.waitFor(() => document.querySelectorAll(".section-transport-grid .content-block").length === 3);
    await verifyLanguageTranslation(client);
  } else await runSmokeTest(client);
  console.log("Browser smoke test passed");
} finally {
  client?.close();
  await stopProcess(chrome);
  await stopProcess(server);
  rmSync(database, { force: true });
  rmSync(`${database}-shm`, { force: true });
  rmSync(`${database}-wal`, { force: true });
  rmSync(profile, { recursive: true, force: true });
  rmSync(uploadFixture, { force: true });
  rmSync(oversizedFixture, { force: true });
}
async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([once(child, "exit"), delay(2_000)]);
}
async function runSmokeTest(client) {
  await client.waitFor(() => document.querySelectorAll(".section-transport-grid .content-block").length === 3);
  await verifyJoinedAttachments(client);
  if (palettesOnly) {
    await verifyPaletteThemes(client);
    return;
  }
  if (clippingOnly) {
    await verifyEditOutlines(client);
    return;
  }
  if (saveOnly) {
    await verifyDocumentSave(client);
    return;
  }
  if (responsiveOnly) {
    await verifyResponsiveResizeAndMotion(client);
    return;
  }
  if (polishOnly) {
    await verifyLiveFlightResources(client); await verifyTravelEssentialsCard(client);
    await verifyAgendaEmptyStates(client);
    await unlockEditing(client);
    await verifyRequestedUiPolish(client);
    return;
  }
  if (cardsOnly) {
    await unlockEditing(client);
    await verifyCardEditorCrud(client);
    return;
  }
  if (headingsOnly) {
    await verifyHeadingAlignment(client);
    return;
  }
  if (alignmentOnly) {
    await verifyTransportCardAlignment(client);
    return;
  }
  if (movementOnly) {
    const originalFirst = await client.run(() => document.querySelector(".editor-block").dataset.blockId);
    await unlockEditing(client);
    await verifyCalendarEditors(client);
    await verifyToolbarTooltip(client);
    await verifyAttachmentDisclosures(client);
    await verifyEditingInteractions(client, originalFirst);
    return;
  }
  await verifyBrandNavigation(client);
  await verifyLanguageTranslation(client);
  await verifyLiveFlightResources(client);
  await verifyTravelEssentialsCard(client);
  await verifyPaletteThemes(client);
  await verifyAgendaEmptyStates(client);
  await verifyResponsiveResizeAndMotion(client);
  await unlockEditing(client);
  await verifyEditOutlines(client);
  await verifyCalendarEditors(client);
  await verifyPlacesTitleInline(client);
  await verifyRequestedUiPolish(client);
  await verifyCardEditorCrud(client);
  await client.run(() => document.querySelector("#editButton").click());
  await client.waitFor(() => !document.body.classList.contains("is-inline-editing"));
  await verifyDocumentSave(client);
}
async function unlockEditing(client) {
  await client.run(() => document.querySelector("#editButton").click());
  await client.waitFor(() => document.body.classList.contains("is-inline-editing") || document.body.classList.contains("is-editing"));
}
async function verifyEditingInteractions(client, blockId) {
  const blockIds = await client.run(() => [...document.querySelectorAll(".editor-block")].slice(0, 3).map((block) => block.dataset.blockId));
  for (const id of blockIds) {
    await client.run((targetId) => {
      const select = document.querySelector(`[data-block-id="${targetId}"] [data-block-span]`);
      select.value = "6";
      select.dispatchEvent(new Event("input", { bubbles: true }));
    }, id);
  }
  const semantics = await client.run((id) => {
    const block = document.querySelector(`[data-block-id="${id}"]`);
    return {
      blockDraggable: block.draggable,
      handleDraggable: block.querySelector(".drag-handle").draggable,
      inputDraggable: block.querySelector("input").draggable,
    };
  }, blockId);
  assert.deepEqual(semantics, { blockDraggable: false, handleDraggable: false, inputDraggable: false });
  await client.waitFor((id) => {
    const block = document.querySelector(`[data-block-id="${id}"]`);
    return block.classList.contains("block-span-6") && block.style.gridRowEnd === "";
  }, blockId);
  await client.run(([sourceId, targetId]) => {
    const source = document.querySelector(`[data-block-id="${sourceId}"] .drag-handle`);
    const target = document.querySelector(`[data-block-id="${targetId}"]`);
    const bounds = target.getBoundingClientRect();
    source.dispatchEvent(new window.PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: source.getBoundingClientRect().left + 2,
      clientY: source.getBoundingClientRect().top + 2,
      pointerId: 7,
      pointerType: "mouse",
    }));
    target.dispatchEvent(new window.PointerEvent("pointermove", {
      bubbles: true,
      buttons: 1,
      clientX: bounds.right - 2,
      clientY: bounds.top + bounds.height / 2,
      pointerId: 7,
      pointerType: "mouse",
    }));
    target.dispatchEvent(new window.PointerEvent("pointerup", {
      bubbles: true,
      clientX: bounds.right - 2,
      clientY: bounds.top + bounds.height / 2,
      pointerId: 7,
      pointerType: "mouse",
    }));
  }, blockIds.slice(0, 2));
  assert.deepEqual(
    await client.run(() => [...document.querySelectorAll(".editor-block")].slice(0, 3).map((block) => block.dataset.blockId)),
    [blockIds[1], blockIds[0], blockIds[2]],
  );
  await client.run(([sourceId, targetId]) => {
    const source = document.querySelector(`[data-block-id="${sourceId}"] .drag-handle`);
    const target = document.querySelector(`[data-block-id="${targetId}"]`);
    const dataTransfer = new window.DataTransfer();
    source.dispatchEvent(new window.DragEvent("dragstart", { bubbles: true, dataTransfer }));
    target.dispatchEvent(new window.DragEvent("dragover", {
      bubbles: true,
      clientY: target.getBoundingClientRect().bottom,
      dataTransfer,
    }));
    target.dispatchEvent(new window.DragEvent("drop", { bubbles: true, dataTransfer }));
  }, blockIds.slice(1));
  assert.deepEqual(
    await client.run(() => [...document.querySelectorAll(".editor-block")].slice(0, 3).map((block) => block.dataset.blockId)),
    [blockIds[0], blockIds[2], blockIds[1]],
  );
}
async function verifyHeadingAlignment(client) {
  const aligned = (selector) => client.waitFor((target) => {
    const title = document.querySelector(target).getBoundingClientRect();
    const workspace = document.querySelector(".workspace-bar").getBoundingClientRect();
    return Math.abs(title.top - workspace.bottom - 24) <= 2;
  }, selector);
  await client.run(() => window.scrollTo(0, 0));
  await client.run(() => document.querySelector("[data-view=transport]").click());
  await aligned("#transportTitle");
  const transportTop = await client.run(() => document.querySelector("#transportTitle").getBoundingClientRect().top);
  await client.run(() => document.querySelector("[data-view=stay]").click());
  await client.waitFor(() => document.querySelector(".nav-item.is-active")?.dataset.view === "stay");
  await aligned("#stayTitle");
  const stayTop = await client.run(() => document.querySelector("#stayTitle").getBoundingClientRect().top);
  await client.run(() => document.querySelector("[data-view=agenda]").click());
  await client.waitFor(() => document.querySelector(".nav-item.is-active")?.dataset.view === "agenda");
  await aligned("#agendaTitle");
  const agendaTop = await client.run(() => document.querySelector("#agendaTitle").getBoundingClientRect().top);
  assert.ok(Math.abs(transportTop - stayTop) <= 1);
  assert.ok(Math.abs(transportTop - agendaTop) <= 1);
  await client.run(() => document.querySelector("[data-view=transport]").click());
  await client.waitFor(() => document.querySelector(".nav-item.is-active")?.dataset.view === "transport");
}
async function verifyBrandNavigation(client) {
  const transportCardCount = await client.run(() => document.querySelectorAll(".section-transport-grid .content-block").length);
  assert.ok(transportCardCount > 0);
  await client.run(() => window.scrollTo(0, document.body.scrollHeight));
  await client.run(() => document.querySelector("[data-view=stay]").click());
  await client.waitFor(() => document.querySelector(".nav-item.is-active")?.dataset.view === "stay");
  await client.waitFor(() => {
    const title = document.querySelector("#stayTitle").getBoundingClientRect();
    const workspace = document.querySelector(".workspace-bar").getBoundingClientRect();
    return Math.abs(title.top - workspace.bottom - 24) <= 2;
  });
  const stayLabelTop = await client.run(() => document.querySelector("#stayTitle").getBoundingClientRect().top);
  assert.equal(await client.run(() => {
    const content = document.querySelector("#stayTitle").getBoundingClientRect();
    const workspace = document.querySelector(".workspace-bar").getBoundingClientRect();
    return content.top >= workspace.bottom + 22;
  }), true);
  await verifyUncoveredStayLayout(client);
  await client.run(() => document.querySelector("[data-view=agenda]").click());
  await client.waitFor(() => document.querySelector(".nav-item.is-active")?.dataset.view === "agenda");
  await client.waitFor(() => {
    const title = document.querySelector("#agendaTitle").getBoundingClientRect();
    const workspace = document.querySelector(".workspace-bar").getBoundingClientRect();
    return Math.abs(title.top - workspace.bottom - 24) <= 2;
  });
  await verifyAgendaLayout(client);
  const agendaLabelTop = await client.run(() => document.querySelector("#agendaTitle").getBoundingClientRect().top);
  assert.ok(Math.abs(agendaLabelTop - stayLabelTop) <= 4);
  await client.run(() => document.querySelector(".brand").click());
  await client.waitFor(() => document.querySelector(".nav-item.is-active")?.dataset.view === "transport");
  await client.waitFor(() => window.scrollY <= 2);
  assert.equal(await client.run(() => location.hash), "#transport");
  assert.equal(await client.run(() => document.querySelectorAll(".section-transport-grid .content-block").length), transportCardCount);
}
async function verifyJoinedAttachments(client) {
  const state = await client.run(() => ({
    editing: document.body.classList.contains("is-editing"),
    blocks: document.querySelectorAll(".section-transport-grid .editor-block").length,
    trays: document.querySelectorAll(".section-transport-grid .attachment-section").length,
flightResourceActionsPresent: [...document.querySelectorAll(".section-transport-grid .flight-information-card")]
      .every((card) => Boolean(
        card.querySelector(".flight-resource-row .map-link")
        && card.querySelector(".flight-resource-row .website-link")
        && card.querySelector(".flight-resource-row .transport-attachment-button")
      )),
  }));
  assert.equal(state.flightResourceActionsPresent, true);
  assert.equal(state.trays, state.editing ? state.blocks : 0);
}
async function verifyAttachmentDisclosures(client) {
  assert.equal(await client.run(() => [...document.querySelectorAll(".attachment-section")].every((section) => (
    section.classList.contains("is-collapsed")
      && section.querySelector(".attachment-summary")?.getAttribute("aria-expanded") === "false"
      && !section.querySelector(".attachment-panel")
  ))), true);
  const expandScroll = await client.run(() => {
    const button = document.querySelector("[data-attachment-toggle]");
    button.scrollIntoView({ block: "center" });
    const scroll = window.scrollY;
    button.click();
    return scroll;
  });
  await client.waitFor(() => document.querySelector(".attachment-section.is-expanded .attachment-panel"));
  assert.ok(Math.abs(await client.run(() => window.scrollY) - expandScroll) <= 8);
  assert.equal(await client.run(() => document.querySelectorAll(".attachment-section.is-expanded").length), 1);
  assert.equal(await client.run(() => document.querySelector(".attachment-section.is-expanded .attachment-summary").getAttribute("aria-expanded")), "true");
  assert.equal(await client.run(() => document.activeElement === document.querySelector(".attachment-section.is-expanded [data-attachment-toggle]")), true);
  const collapseScroll = await client.run(() => {
    const scroll = window.scrollY;
    document.querySelector(".attachment-section.is-expanded [data-attachment-toggle]").click();
    return scroll;
  });
  await client.waitFor(() => !document.querySelector(".attachment-section.is-expanded"));
  assert.ok(Math.abs(await client.run(() => window.scrollY) - collapseScroll) <= 8);
}
async function verifyAgendaLayout(client) {
  assert.deepEqual(await client.run(() => {
    const card = [...document.querySelectorAll(".day-card")].find((day) => day.querySelectorAll(".meal-group").length === 3 && day.querySelector(".place-route-toggle"));
    const meals = card.querySelector(".meal-grid");
    const places = card.querySelector(".place-list");
    const routeModes = [...card.querySelectorAll(".place-row:first-child .place-route-toggle .meal-route-option")];
    const mealRows = [...card.querySelectorAll(".food-row")];
    const filledMeal = document.querySelector(".food-row:not(.food-row-open)");
    const filledMedia = filledMeal?.querySelector(".place-media")?.getBoundingClientRect();
    const filledCopy = filledMeal?.querySelector(".food-card-copy")?.getBoundingClientRect();
    return {
      visible: card.getBoundingClientRect().height > 0,
      mealColumns: window.getComputedStyle(meals).gridTemplateColumns.split(" ").length,
      mealRows: mealRows.length,
      mealActionsBelow: mealRows.every((row) => {
        const label = row.querySelector(".open,.place-copy")?.getBoundingClientRect();
        const links = row.querySelector(".entry-links")?.getBoundingClientRect();
        return label && links && links.top >= label.bottom - 1;
      }),
      filledMealAligned: Boolean(filledMedia && filledCopy && filledMedia.right <= filledCopy.left),
      placeColumns: window.getComputedStyle(places).gridTemplateColumns.split(" ").length,
      routeModes: routeModes.map((mode) => mode.dataset.routeMode),
      noOverflow: card.scrollWidth <= card.clientWidth,
    };
  }), {
    visible: true,
    mealColumns: 3,
    mealRows: 3,
    mealActionsBelow: true,
    filledMealAligned: true,
    placeColumns: 2,
    routeModes: ["driving", "cycling", "walking"],
    noOverflow: true,
  });
}
async function verifyUncoveredStayLayout(client) {
  assert.deepEqual(await client.run(() => {
    const frame = document.querySelector(".section-stay-grid .editor-block:first-child .block-frame");
    const summary = frame.querySelector(".stay-summary");
    return {
      covered: frame.classList.contains("has-cover"),
      columns: window.getComputedStyle(summary).gridTemplateColumns.split(" ").length,
      legacyArtPresent: Boolean(summary.querySelector(".stay-art")),
      noOverflow: summary.scrollWidth <= summary.clientWidth,
    };
  }), { covered: true, columns: 3, legacyArtPresent: false, noOverflow: true });
}
async function connectToChrome(portNumber) {
  let tabs;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      tabs = await (await fetch(`http://127.0.0.1:${portNumber}/json`)).json();
      break;
    } catch { await delay(100); }
  }
  if (!tabs) throw new Error("Chrome debugging endpoint did not start");
  const tab = tabs.find((item) => item.type === "page");
  return createCdpClient(tab.webSocketDebuggerUrl);
}
async function createCdpClient(url) {
  const socket = new WebSocket(url);
  await withTimeout(new Promise((resolveOpen, reject) => {
    socket.onopen = resolveOpen;
    socket.onerror = reject;
  }), 10_000, "Chrome debugging socket did not open");
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = (event) => settleMessage(pending, event.data);
  socket.onclose = () => rejectPending(pending, new Error("Chrome debugging socket closed"));
  socket.onerror = () => rejectPending(pending, new Error("Chrome debugging socket failed"));
  const send = (method, params = {}) => new Promise((resolveMessage, rejectMessage) => {
    const id = ++nextId;
    const timer = globalThis.setTimeout(() => {
      pending.delete(id);
      rejectMessage(new Error(`Chrome command timed out: ${method}`));
    }, 10_000);
    timer.unref?.();
    pending.set(id, { resolveMessage, rejectMessage, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const run = async (operation, argument) => readResult(await send("Runtime.evaluate", {
    expression: `(${operation.toString()})(${JSON.stringify(argument)})`,
    returnByValue: true,
    awaitPromise: true,
  }));
  return {
    send,
    run,
    close: () => socket.close(),
    async waitFor(predicate, argument) {
      for (let attempt = 0; attempt < 80; attempt += 1) {
        if (await run(predicate, argument)) return;
        await delay(100);
      }
      throw new Error("Browser condition timed out");
    },
  };
}
function settleMessage(pending, data) {
  const message = JSON.parse(data);
  if (!message.id || !pending.has(message.id)) return;
  const request = pending.get(message.id);
  pending.delete(message.id);
  globalThis.clearTimeout(request.timer);
  request.resolveMessage(message);
}
function rejectPending(pending, error) {
  for (const request of pending.values()) {
    globalThis.clearTimeout(request.timer);
    request.rejectMessage(error);
  }
  pending.clear();
}
function withTimeout(promise, milliseconds, message) {
  return Promise.race([
    promise,
    delay(milliseconds).then(() => { throw new Error(message); }),
  ]);
}
function readResult(message) {
  if (message.error) throw new Error(message.error.message);
  if (message.result?.exceptionDetails) throw new Error(message.result.exceptionDetails.text);
  return message.result?.result?.value;
}
async function waitForServer(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch(url)).ok) return; } catch { /* Server is still starting. */ }
    await delay(100);
  }
  throw new Error("Server did not start");
}
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);
  const match = candidates.find(existsSync);
  if (!match) throw new Error("Set CHROME_PATH to run browser tests");
  return match;
}
