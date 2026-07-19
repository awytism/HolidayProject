import assert from "node:assert/strict";

export async function verifyTransportCardAlignment(client) {
  await client.run(() => [...document.querySelectorAll("#sectionRoot .editor-block")].forEach((block) => { block.classList.add("block-span-6"); }));
  await client.waitFor(() => new Set([...document.querySelectorAll("#sectionRoot .block-frame")].map((frame) => Math.round(frame.getBoundingClientRect().left))).size === 2);
  const cards = await client.run(() => [...document.querySelectorAll("#sectionRoot .block-frame")].map((frame) => {
    const rect = frame.getBoundingClientRect();
    return { left: rect.left, top: rect.top, bottom: rect.bottom };
  }));
  assert.equal(cards.length, 4);
  const lefts = [...new Set(cards.map((card) => Math.round(card.left)))].sort((a, b) => a - b);
  assert.equal(lefts.length, 2);
  const columns = lefts.map((left) => (
    cards.filter((card) => Math.round(card.left) === left).sort((a, b) => a.top - b.top)
  ));
  assert.deepEqual(columns.map((column) => column.length), [2, 2]);
  for (let row = 0; row < 2; row += 1) {
    const left = columns[0][row];
    const right = columns[1][row];
    assert.ok(
      Math.abs(left.top - right.top) <= 1,
      `row ${row + 1} card tops differ: ${left.top} vs ${right.top}`,
    );
    assert.ok(
      Math.abs(left.bottom - right.bottom) <= 1,
      `row ${row + 1} card bottoms differ: ${left.bottom} vs ${right.bottom}`,
    );
  }
  const chrome = await client.run(() => {
    const content = window.getComputedStyle(document.querySelector(".content-block"));
    const attachment = window.getComputedStyle(document.querySelector(".attachment-section"));
    const frame = window.getComputedStyle(document.querySelector(".block-frame.has-attachments"));
    const stat = window.getComputedStyle(document.querySelector(".stat"));
    return {
      borders: [content.borderTopWidth, attachment.borderTopWidth, stat.borderTopWidth],
      shadows: [frame.boxShadow, stat.boxShadow],
    };
  });
  assert.deepEqual(chrome.borders, ["0px", "0px", "0px"]);
  assert.equal(chrome.shadows.every((shadow) => shadow !== "none"), true);
}

export async function verifyCalendarEditors(client) {
  const hero = await client.run(() => ({
    types: [...document.querySelectorAll("#travelDateEditor input")].map((input) => input.type),
    values: [...document.querySelectorAll("#travelDateEditor input")].map((input) => input.value),
  }));
  assert.deepEqual(hero.types, ["date", "date"]);
  assert.deepEqual(hero.values, ["2026-10-24", "2026-11-01"]);

  const derived = await client.run(() => {
    const input = document.querySelector("#tripStartDate");
    input.value = "2026-10-25";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const result = {
      days: document.querySelector("#tripDays").textContent,
      dates: document.querySelector("#travelDates").textContent,
    };
    input.value = "2026-10-24";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return result;
  });
  assert.deepEqual(derived, { days: "8", dates: "Oct 25th to Nov 1st, 2026" });
  assert.equal(await client.run(() => document.querySelector('.editor-block input[data-block-field="date"]').type), "date");

  await client.run(() => document.querySelector("[data-view=stay]").click());
  await client.waitFor(() => document.querySelectorAll('#stayRoot input[type="date"]').length === 2);
  await client.run(() => document.querySelector("[data-view=agenda]").click());
  await client.waitFor(() => document.querySelectorAll('#agendaRoot input[type="date"]').length === 9);
  assert.equal(await client.run(() => document.querySelectorAll('#agendaRoot [data-block-field="month"],#agendaRoot [data-block-field="weekday"]').length), 0);
  await client.run(() => document.querySelector("[data-view=transport]").click());
  await client.waitFor(() => document.querySelector('.editor-block input[data-block-field="date"]'));
}

export async function verifyToolbarTooltip(client) {
  const tooltip = await client.run(() => {
    const button = document.querySelector(".drag-handle[data-tooltip]");
    button.focus({ preventScroll: true });
    const style = window.getComputedStyle(button, "::after");
    return {
      align: button.dataset.tooltipAlign,
      display: style.display,
      left: style.left,
      letterSpacing: style.letterSpacing,
      width: Number.parseFloat(style.width),
    };
  });
  assert.equal(tooltip.align, "start");
  assert.equal(tooltip.display, "block");
  assert.equal(tooltip.left, "0px");
  assert.equal(tooltip.letterSpacing, "normal");
  assert.ok(tooltip.width > 95);
}
