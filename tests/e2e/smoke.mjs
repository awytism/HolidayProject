import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createScryptPasswordHash } from "../../src/server/security.mjs";
import { verifyCalendarEditors, verifyToolbarTooltip, verifyTransportCardAlignment } from "./ui-regressions.mjs";
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
  await runSmokeTest(client, password, { valid: uploadFixture, oversized: oversizedFixture });
  console.log("Browser smoke test passed");
} finally {
  client?.close();
  await stopProcess(chrome);
  await stopProcess(server);
  rmSync(database, { force: true });
  rmSync(`${database}-shm`, { force: true });
  rmSync(`${database}-wal`, { force: true });
  rmSync(uploadFixture, { force: true });
  rmSync(oversizedFixture, { force: true });
}
async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([once(child, "exit"), delay(2_000)]);
}
async function runSmokeTest(client, loginPassword, coverFixtures) {
  await client.waitFor(() => document.querySelectorAll(".content-block").length === 4);
  await verifyJoinedAttachments(client);
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
    await unlockEditing(client, loginPassword);
    await verifyCalendarEditors(client);
    await verifyToolbarTooltip(client);
    await verifyAttachmentDisclosures(client);
    await verifyEditingInteractions(client, originalFirst);
    return;
  }
  await verifyFontAndScroll(client);
  await verifyBrandNavigation(client);
  const originalFirst = await client.run(() => document.querySelector(".editor-block").dataset.blockId);
  await unlockEditing(client, loginPassword);
  await verifyCalendarEditors(client);
  await verifyToolbarTooltip(client);
  await verifyAttachmentDisclosures(client);
  await verifyEditingInteractions(client, originalFirst);
  await addCoverAndTemplate(client, coverFixtures);
  await verifyJoinedAttachments(client);
  await client.run(() => document.querySelector("[data-add-type=flight]").click());
  assert.equal(await client.run(() => document.querySelectorAll(".editor-block").length), 6);
  await client.run(() => document.querySelector(".editor-block [data-block-action=down]").click());
  assert.notEqual(await client.run(() => document.querySelector(".editor-block").dataset.blockId), originalFirst);
  await client.run(() => document.querySelector("#editButton").click());
  await client.waitFor(() => !document.body.classList.contains("is-editing"));
  await client.send("Page.reload");
  await client.waitFor(() => document.querySelectorAll(".content-block").length === 6);
  assert.equal(await client.run(() => document.querySelector(".table-block").closest(".block-frame").querySelector(".block-color-header")?.textContent.trim()), "New table");
  await verifyCoveredTransportLayout(client);
  await verifyGenericCardLayout(client);
  assert.equal(await client.run(() => document.documentElement.dataset.fontScale), "120");
  assert.equal(await client.run((id) => document.querySelector(`[data-block-id="${id}"]`).classList.contains("block-span-6"), originalFirst), true);
  await client.waitFor(() => {
    const image = document.querySelector(".block-cover img");
    return image?.alt === "Travel cover" && image.complete && image.naturalWidth > 0;
  });
  await client.run(() => document.querySelector("#editButton").click());
  await client.waitFor(() => document.body.classList.contains("is-editing"));
  assert.equal(await client.run(() => document.querySelector("#authDialog").open), false);
  await client.run(() => document.querySelector(".block-cover").closest(".editor-block").querySelector("[data-block-action=cover]").click());
  await client.waitFor(() => document.querySelector(".media-dialog").open);
  assert.equal(await client.run(() => document.querySelector('.media-dialog [name="position"]').value), "top");
  await client.run(() => document.querySelector("[data-media-cancel]").click());
  await client.run(() => document.querySelector("[data-view=agenda]").click());
  assert.equal(await client.run(() => document.querySelector(".nav-item.is-active").textContent), "Agenda");
  await client.run(() => document.querySelector("[data-view=stay]").click());
  await client.waitFor(() => document.querySelector("[data-amenity-search]"));
  await addStayCover(client);
  const amenityResultCount = await client.run(() => {
    const input = document.querySelector("[data-amenity-search]");
    input.value = "dish";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return input.closest("[data-amenity-group]").querySelectorAll("[data-add-amenity]").length;
  });
  assert.ok(amenityResultCount > 0 && amenityResultCount <= 10);
  await addCustomHighlight(client);
  assert.equal(await client.run(() => Boolean(document.querySelector(".anatomy-editor"))), true);
  await client.run(() => document.querySelector("#editButton").click());
  await client.waitFor(() => !document.body.classList.contains("is-editing"));
  await client.send("Page.reload");
  await client.waitFor(() => document.querySelector(".amenity-card"));
  assert.equal(await client.run(() => document.querySelector(".amenity-card").textContent.includes("Late checkout")), true);
  assert.equal(await client.run(() => document.querySelector(".section-stay-grid .editor-block:first-child .block-frame").classList.contains("has-cover")), true);
  assert.equal(await client.run(() => window.getComputedStyle(document.querySelector(".section-stay-grid .editor-block:first-child .stay-art")).display), "none");
}
async function unlockEditing(client, loginPassword) {
  await client.run(() => document.querySelector("#editButton").click());
  await client.waitFor(() => document.querySelector("#authDialog").open);
  await client.run((value) => {
    document.querySelector("#passwordInput").value = value;
    document.querySelector("#authForm").requestSubmit();
  }, loginPassword);
  await client.waitFor(() => document.body.classList.contains("is-editing"));
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
  await client.run(() => window.scrollTo(0, 0));
  const transportTop = await client.run(() => document.querySelector(".hero .eyebrow").getBoundingClientRect().top);
  await client.run(() => document.querySelector("[data-view=stay]").click());
  await client.waitFor(() => document.querySelector(".nav-item.is-active")?.dataset.view === "stay");
  await client.waitFor(() => window.scrollY === 0);
  const stayTop = await client.run(() => document.querySelector("#sectionEyebrow").getBoundingClientRect().top);
  await client.run(() => document.querySelector("[data-view=agenda]").click());
  await client.waitFor(() => document.querySelector(".nav-item.is-active")?.dataset.view === "agenda");
  const agendaTop = await client.run(() => document.querySelector("#sectionEyebrow").getBoundingClientRect().top);
  assert.ok(Math.abs(transportTop - stayTop) <= 1);
  assert.ok(Math.abs(transportTop - agendaTop) <= 1);
  await client.run(() => document.querySelector("[data-view=transport]").click());
  await client.waitFor(() => document.querySelector(".nav-item.is-active")?.dataset.view === "transport");
}
async function verifyBrandNavigation(client) {
  await client.run(() => window.scrollTo(0, document.body.scrollHeight));
  await client.run(() => document.querySelector("[data-view=stay]").click());
  await client.waitFor(() => document.querySelector(".nav-item.is-active")?.dataset.view === "stay");
  await client.waitFor(() => window.scrollY === 0);
  const stayLabelTop = await client.run(() => document.querySelector("#sectionEyebrow").getBoundingClientRect().top);
  assert.equal(await client.run(() => {
    const content = document.querySelector(".content-section").getBoundingClientRect();
    const workspace = document.querySelector(".workspace-bar").getBoundingClientRect();
    return content.top >= workspace.bottom - 1;
  }), true);
  await verifyUncoveredStayLayout(client);
  await client.run(() => document.querySelector("[data-view=agenda]").click());
  await client.waitFor(() => document.querySelector(".nav-item.is-active")?.dataset.view === "agenda");
  await verifyAgendaLayout(client);
  const agendaLabelTop = await client.run(() => document.querySelector("#sectionEyebrow").getBoundingClientRect().top);
  assert.ok(Math.abs(agendaLabelTop - stayLabelTop) <= 1);
  await client.run(() => document.querySelector(".brand").click());
  await client.waitFor(() => document.querySelector(".nav-item.is-active")?.dataset.view === "transport");
  const transportLabelTop = await client.run(() => document.querySelector(".hero .eyebrow").getBoundingClientRect().top);
  assert.ok(Math.abs(transportLabelTop - stayLabelTop) <= 1);
  assert.equal(await client.run(() => location.hash), "#transport");
  assert.equal(await client.run(() => document.querySelectorAll(".content-block").length), 4);
}
async function verifyJoinedAttachments(client) {
  assert.equal(await client.run(() => [...document.querySelectorAll(".block-frame")].every((frame) => {
    const content = frame.querySelector(":scope > .content-block");
    const attachment = frame.querySelector(":scope > .attachment-section");
    if (!content || !attachment || !frame.classList.contains("has-attachments")) return false;
    const contentStyle = window.getComputedStyle(content);
    return Math.abs(content.getBoundingClientRect().bottom - attachment.getBoundingClientRect().top) <= 1
      && contentStyle.borderBottomLeftRadius === "0px"
      && contentStyle.borderBottomRightRadius === "0px"
      && contentStyle.boxShadow === "none";
  })), true);
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
  assert.equal(await client.run(() => window.scrollY), expandScroll);
  assert.equal(await client.run(() => document.querySelectorAll(".attachment-section.is-expanded").length), 1);
  assert.equal(await client.run(() => document.querySelector(".attachment-section.is-expanded .attachment-summary").getAttribute("aria-expanded")), "true");
  assert.equal(await client.run(() => document.activeElement === document.querySelector(".attachment-section.is-expanded [data-attachment-toggle]")), true);
  const collapseScroll = await client.run(() => {
    const scroll = window.scrollY;
    document.querySelector(".attachment-section.is-expanded [data-attachment-toggle]").click();
    return scroll;
  });
  await client.waitFor(() => !document.querySelector(".attachment-section.is-expanded"));
  assert.equal(await client.run(() => window.scrollY), collapseScroll);
}
async function verifyFontAndScroll(client) {
  await client.run(() => {
    document.querySelector("#fontIncrease").click();
    document.querySelector("#fontIncrease").click();
  });
  assert.equal(await client.run(() => document.documentElement.dataset.fontScale), "120");
  assert.match(await client.run(() => document.cookie), /gramado_font_scale=120/);
  await client.run(() => window.scrollTo(0, document.body.scrollHeight));
  await client.waitFor(() => !document.querySelector("#scrollTop").hidden);
  await client.run(() => document.querySelector("#scrollTop").click());
  await client.waitFor(() => window.scrollY === 0);
}
async function addCoverAndTemplate(client, coverFixtures) {
  await client.run(() => document.querySelector(".editor-block [data-block-action=cover]").click());
  await client.waitFor(() => document.querySelector(".media-dialog").open);
  assert.equal(await client.run(() => {
    const dialog = document.querySelector(".media-dialog");
    return document.getElementById(dialog.getAttribute("aria-labelledby"))?.textContent;
  }), "Choose an image");
  await client.run(() => {
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      if (!window.releasePendingCoverUpload && String(args[0]).endsWith("/api/media") && args[1]?.method === "POST") {
        return new Promise((resolveFetch) => {
          window.releasePendingCoverUpload = () => resolveFetch(originalFetch(...args));
        }).finally(() => {
          window.pendingCoverUploadSettled = true;
          window.fetch = originalFetch;
        });
      }
      return originalFetch(...args);
    };
  });
  await setFileInput(client, '.media-dialog [name="file"]', coverFixtures.valid);
  await client.run(() => document.querySelector('.media-dialog [type="submit"]').click());
  await client.waitFor(() => Boolean(window.releasePendingCoverUpload));
  await client.run(() => {
    const coverButton = document.querySelector(".editor-block [data-block-action=cover]");
    document.querySelector(".media-dialog").close();
    coverButton.click();
    window.releasePendingCoverUpload();
  });
  await client.waitFor(() => window.pendingCoverUploadSettled);
  assert.deepEqual(await client.run(() => ({
    dialogOpen: document.querySelector(".media-dialog").open,
    formBusy: document.querySelector(".media-form").getAttribute("aria-busy"),
    submitDisabled: document.querySelector('.media-dialog [type="submit"]').disabled,
    coverApplied: Boolean(document.querySelector(".block-frame.has-cover")),
  })), { dialogOpen: true, formBusy: null, submitDisabled: false, coverApplied: false });
  await client.run(() => {
    const dialog = document.querySelector(".media-dialog");
    dialog.querySelector('[name="url"]').value = "not a URL";
    dialog.querySelector('[type="submit"]').click();
  });
  await client.waitFor(() => {
    const error = document.querySelector("[data-media-error]");
    return error && !error.hidden && error.textContent.includes("HTTPS image URL");
  });
  assert.equal(await client.run(() => document.querySelector("[data-media-error]").closest("dialog").open), true);
  await setFileInput(client, '.media-dialog [name="file"]', coverFixtures.oversized);
  await client.run(() => document.querySelector('.media-dialog [type="submit"]').click());
  await client.waitFor(() => document.querySelector("[data-media-error]")?.textContent.includes("8 MB or smaller"));
  assert.equal(await client.run(() => document.querySelector(".media-dialog").open), true);
  await setFileInput(client, '.media-dialog [name="file"]', coverFixtures.valid);
  await client.run(() => {
    const dialog = document.querySelector(".media-dialog");
    dialog.querySelector('[name="alt"]').value = "Travel cover";
    dialog.querySelector('[name="position"]').value = "top";
    dialog.querySelector('[type="submit"]').click();
  });
  await client.waitFor(() => !document.querySelector(".media-dialog").open && document.querySelector(".block-frame.has-cover .block-cover img")?.naturalWidth > 0);
  assert.equal(await client.run(() => document.querySelector("#toast").textContent.includes("Save changes")), true);
  const geometry = await client.run(() => [...document.querySelectorAll(".editor-block")].slice(0, 3).map((block) => {
    const rect = block.getBoundingClientRect();
    return { left: Math.round(rect.left), top: Math.round(rect.top), bottom: Math.round(rect.bottom) };
  }));
  assert.equal(new Set(geometry.map((item) => item.left)).size, 2);
  assert.ok(geometry[2].top >= Math.min(geometry[0].bottom, geometry[1].bottom));
  await client.run(() => document.querySelector("[data-open-templates]").click());
  await client.waitFor(() => document.querySelector(".template-dialog").open);
  assert.equal(await client.run(() => document.querySelectorAll("[data-builtin-template] .template-prototype").length), 7);
  await client.run(() => document.querySelector("[data-builtin-template=table]").click());
  await client.waitFor(() => Boolean(document.querySelector(".table-editor")));
  assert.equal(await client.run(() => Boolean(document.querySelector('[data-block-field="direction"]').closest(".editor-block").querySelector('[data-block-action="header"]'))), false);
  await client.run(() => document.querySelector(".table-editor").closest(".editor-block").querySelector('[data-block-action="header"]').click());
  await client.waitFor(() => document.querySelector(".table-editor").closest(".block-frame").classList.contains("has-color-header"));
}
async function verifyCoveredTransportLayout(client) {
  const result = await client.run(() => {
    const source = document.querySelector(".block-frame.has-cover");
    const root = document.documentElement;
    const originalTheme = root.dataset.theme;
    const inspect = (width) => {
      const host = document.createElement("div");
      host.className = "editor-block";
      host.style.cssText = `position:fixed;visibility:hidden;width:${width}px`;
      host.append(source.cloneNode(true));
      document.body.append(host);
      const frame = host.firstElementChild;
      const cover = frame.querySelector(".block-cover").getBoundingClientRect();
      const content = frame.querySelector(".content-block").getBoundingClientRect();
      const layout = {
        columns: window.getComputedStyle(frame).gridTemplateColumns.split(" ").length,
        sideBySide: Math.round(cover.right) <= Math.round(content.left) + 1,
        stacked: Math.round(cover.bottom) <= Math.round(content.top) + 1,
        noOverflow: frame.scrollWidth <= frame.clientWidth,
      };
      host.remove();
      return layout;
    };
    const image = source.querySelector("img");
    const cover = source.querySelector(".block-cover");
    const focal = ["center", "top", "bottom", "left", "right"].map((position) => {
      cover.className = `block-cover position-${position}`;
      return window.getComputedStyle(image).objectPosition;
    });
    cover.className = "block-cover position-top";
    root.dataset.theme = "dark";
    const contentStyle = window.getComputedStyle(source.querySelector(".content-block"));
    const darkContent = { opacity: contentStyle.opacity, background: contentStyle.backgroundColor };
    root.dataset.theme = originalTheme;
    const rowAlignment = window.getComputedStyle(document.querySelector(".block-grid")).alignItems === "stretch"
      && [...document.querySelectorAll(".block-grid > .editor-block")].every((block) => block.style.gridRowEnd === "");
    return {
      layouts: [1160, 974, 973, 572, 376, 320].map(inspect),
      positions: {
        cover: window.getComputedStyle(cover).position,
        content: window.getComputedStyle(source.querySelector(".content-block")).position,
      },
      image: { tag: image.tagName, alt: image.alt, loading: image.loading, referrerPolicy: image.referrerPolicy },
      focal,
      darkContent,
      transport: {
        routeColumns: window.getComputedStyle(source.querySelector(".route-grid")).gridTemplateColumns.split(" ").length,
        visible: source.querySelector(".transport-card").getBoundingClientRect().height > 0,
      },
      rowAlignment,
      pageHasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  assert.deepEqual(result.layouts, [
    { columns: 2, sideBySide: true, stacked: false, noOverflow: true },
    { columns: 2, sideBySide: true, stacked: false, noOverflow: true },
    { columns: 1, sideBySide: false, stacked: true, noOverflow: true },
    { columns: 1, sideBySide: false, stacked: true, noOverflow: true },
    { columns: 1, sideBySide: false, stacked: true, noOverflow: true },
    { columns: 1, sideBySide: false, stacked: true, noOverflow: true },
  ]);
  assert.deepEqual(result.positions, { cover: "relative", content: "relative" });
  assert.deepEqual(result.image, { tag: "IMG", alt: "Travel cover", loading: "lazy", referrerPolicy: "no-referrer" });
  assert.deepEqual(result.focal, ["50% 50%", "50% 0%", "50% 100%", "0% 50%", "100% 50%"]);
  assert.equal(result.darkContent.opacity, "1");
  assert.notEqual(result.darkContent.background, "rgba(0, 0, 0, 0)");
  assert.deepEqual(result.transport, { routeColumns: 3, visible: true });
  assert.equal(result.rowAlignment, true);
  assert.equal(result.pageHasOverflow, false);
}
async function verifyAgendaLayout(client) {
  assert.deepEqual(await client.run(() => {
    const card = document.querySelector(".day-card");
    const meals = card.querySelector(".meal-grid");
    return {
      visible: card.getBoundingClientRect().height > 0,
      mealColumns: window.getComputedStyle(meals).gridTemplateColumns.split(" ").length,
      noOverflow: card.scrollWidth <= card.clientWidth,
    };
  }), { visible: true, mealColumns: 3, noOverflow: true });
}
async function verifyUncoveredStayLayout(client) {
  assert.deepEqual(await client.run(() => {
    const frame = document.querySelector(".section-stay-grid .editor-block:first-child .block-frame");
    const summary = frame.querySelector(".stay-summary");
    return {
      covered: frame.classList.contains("has-cover"),
      columns: window.getComputedStyle(summary).gridTemplateColumns.split(" ").length,
      artVisible: window.getComputedStyle(summary.querySelector(".stay-art")).display,
      noOverflow: summary.scrollWidth <= summary.clientWidth,
    };
  }), { covered: false, columns: 2, artVisible: "grid", noOverflow: true });
}
async function verifyGenericCardLayout(client) {
  assert.deepEqual(await client.run(() => {
    const card = document.querySelector(".generic-card");
    const scroll = card.querySelector(".table-scroll");
    return {
      visible: card.getBoundingClientRect().height > 0,
      scrollable: window.getComputedStyle(scroll).overflowX === "auto",
      contained: card.scrollWidth <= card.clientWidth,
    };
  }), { visible: true, scrollable: true, contained: true });
}
async function addStayCover(client) {
  await client.run(() => document.querySelector(".section-stay-grid .editor-block:first-child [data-block-action=cover]").click());
  await client.waitFor(() => document.querySelector(".media-dialog").open);
  await client.run(() => {
    const dialog = document.querySelector(".media-dialog");
    dialog.querySelector('[name="url"]').value = "https://example.com/stay-cover.jpg";
    dialog.querySelector('[name="alt"]').value = "Stay cover";
    dialog.querySelector('[type="submit"]').click();
  });
  await client.waitFor(() => Boolean(document.querySelector(".section-stay-grid .editor-block:first-child .block-frame.has-cover")));
  assert.deepEqual(await client.run(() => {
    const frame = document.querySelector(".section-stay-grid .editor-block:first-child .block-frame.has-cover");
    const frameRect = frame.getBoundingClientRect();
    const cover = frame.querySelector(".block-cover").getBoundingClientRect();
    const content = frame.querySelector(".content-block").getBoundingClientRect();
    return {
      display: window.getComputedStyle(frame).display,
      coverBehindContent: Math.abs(cover.left - content.left) <= 1 && Math.abs(cover.top - content.top) <= 1,
      fullBackground: Math.abs(cover.width - frameRect.width) <= 1 && Math.abs(cover.height - frameRect.height) <= 1,
    };
  }), { display: "block", coverBehindContent: true, fullBackground: true });
}
async function setFileInput(client, selector, path) {
  const tree = await client.send("DOM.getDocument");
  const match = await client.send("DOM.querySelector", { nodeId: tree.result.root.nodeId, selector });
  await client.send("DOM.setFileInputFiles", { nodeId: match.result.nodeId, files: [path] });
}
async function addCustomHighlight(client) {
  await client.run(() => {
    const group = document.querySelector("[data-amenity-group]");
    group.querySelector("[data-custom-amenity-label]").value = "Late checkout";
    group.querySelector("[data-custom-amenity-icon]").value = "key";
    group.querySelector('[data-amenity-action="add-custom"]').click();
  });
  await client.waitFor(() => document.querySelector(".amenity-selected")?.textContent.includes("Late checkout"));
  await client.run(() => {
    const group = document.querySelector("[data-amenity-group]");
    group.querySelector("[data-custom-amenity-label]").value = " late CHECKOUT ";
    group.querySelector('[data-amenity-action="add-custom"]').click();
  });
  assert.equal(await client.run(() => [...document.querySelectorAll(".amenity-selected > span")]
    .filter((item) => item.textContent.toLowerCase().includes("late checkout")).length), 1);
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
