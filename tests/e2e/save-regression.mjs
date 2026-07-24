import assert from "node:assert/strict";

const EDITED_DESTINATION = "Save Regression Trip";
const CUSTOM_INFORMATION = Object.freeze({ label: "Emergency", value: "Call 190" });

export async function verifyDocumentSave(client) {
  await clickElement(client, "#editButton");
  await client.waitFor(() => document.body.classList.contains("is-inline-editing"));
  await client.run((value) => {
    const target = document.querySelector("#destination");
    target.textContent = value;
    target.dispatchEvent(new window.InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: value,
    }));
  }, EDITED_DESTINATION);
  await client.waitFor((value) => document.querySelector("#destination").textContent.trim() === value, EDITED_DESTINATION);
  await client.run(() => document.querySelector(".travel-essential-add").click());
  await client.waitFor(() => Boolean(document.querySelector(".travel-essential-pill-custom")));
  await client.run(({ label, value }) => {
    const pill = document.querySelector(".travel-essential-pill-custom:last-of-type");
    const labelTarget = pill.querySelector('[data-inline-essential-fact-field="label"]');
    const valueTarget = pill.querySelector('[data-inline-essential-fact-field="value"]');
    for (const [target, text] of [[labelTarget, label], [valueTarget, value]]) {
      target.textContent = text;
      target.dispatchEvent(new window.InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    }
  }, CUSTOM_INFORMATION);
  await clickElement(client, "#editButton");
  await client.waitFor((value) => (
    !document.body.classList.contains("is-inline-editing")
    || document.querySelector("#toast").textContent.includes(value)
  ), EDITED_DESTINATION);

  const result = await client.run(() => ({
    editing: document.body.classList.contains("is-inline-editing"),
    toast: document.querySelector("#toast").textContent,
  }));
  assert.equal(result.editing, false, `Save remained in edit mode: ${JSON.stringify(result)}`);
  await client.send("Page.reload");
  await client.waitFor(() => document.querySelectorAll(".section-transport-grid .content-block").length === 3);
  const reloadedDestination = await client.run(() => document.querySelector("#destination").textContent.trim());
  assert.equal(reloadedDestination, EDITED_DESTINATION, `Edit was not persisted: ${JSON.stringify({ ...result, reloadedDestination })}`);
  const reloadedInformation = await client.run(() => {
    const pill = document.querySelector(".travel-essential-pill-custom:last-of-type");
    return pill ? {
      label: pill.querySelector(".travel-essential-copy small").textContent.trim(),
      value: pill.querySelector(".travel-essential-copy strong").textContent.trim(),
    } : null;
  });
  assert.deepEqual(reloadedInformation, CUSTOM_INFORMATION, `Information pill was not persisted: ${JSON.stringify(reloadedInformation)}`);
  const lockedBrand = await client.run(() => {
    const pill = document.querySelector(".brand");
    const label = document.querySelector("#brandName");
    const pillRect = pill.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    return {
      text: label.textContent.trim(),
      editable: label.isContentEditable,
      width: pillRect.width,
      centerOffset: Math.abs((labelRect.left + labelRect.width / 2) - (pillRect.left + pillRect.width / 2)),
    };
  });
  assert.equal(lockedBrand.text, "Itinerary");
  assert.equal(lockedBrand.editable, false);
  assert.ok(lockedBrand.centerOffset <= 0.5, `English brand label is not centred: ${JSON.stringify(lockedBrand)}`);
  await clickElement(client, '[data-locale="pt-BR"]');
  await client.waitFor(() => document.querySelector("#brandName").textContent.trim() === "Itinerário");
  const portugueseBrand = await client.run(() => {
    const pill = document.querySelector(".brand");
    const label = document.querySelector("#brandName");
    const pillRect = pill.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    return {
      text: label.textContent.trim(),
      editable: label.isContentEditable,
      width: pillRect.width,
      centerOffset: Math.abs((labelRect.left + labelRect.width / 2) - (pillRect.left + pillRect.width / 2)),
    };
  });
  assert.equal(portugueseBrand.text, "Itinerário");
  assert.equal(portugueseBrand.editable, false);
  assert.ok(portugueseBrand.centerOffset <= 0.5, `Portuguese brand label is not centred: ${JSON.stringify(portugueseBrand)}`);
  assert.ok(Math.abs(portugueseBrand.width - lockedBrand.width) <= 0.5, `Brand pill resized between languages: ${JSON.stringify({ lockedBrand, portugueseBrand })}`);
}

async function clickElement(client, selector) {
  const point = await client.run((targetSelector) => {
    const rect = document.querySelector(targetSelector).getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, selector);
  await client.send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
  await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
}
