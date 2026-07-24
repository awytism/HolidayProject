import assert from "node:assert/strict";

const EDITOR_EDGE_GUARD = 4;

export async function verifyEditOutlines(client) {
  const editing = await client.run(() => document.body.classList.contains("is-inline-editing"));
  if (!editing) await client.run(() => document.querySelector("#editButton").click());
  await client.waitFor(() => document.body.classList.contains("is-inline-editing"));
  await client.run(() => document.querySelector('[data-inline-icon-key="section-title:transport:icon:0"]')
    .dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
  await client.waitFor(() => [...document.querySelectorAll("button")]
    .some((button) => button.textContent.trim() === "Airplane"));

  const clipping = await client.run(() => {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && rect.width > 0
        && rect.height > 0
        && !element.closest(".bilingual-layout-probe");
    };
    const airplane = [...document.querySelectorAll("button")]
      .find((button) => isVisible(button) && button.textContent.trim() === "Airplane");
    airplane.classList.add("is-selected");
    const iconGridStyle = window.getComputedStyle(airplane.closest(".inline-icon-grid"));
    const highlight = [...document.querySelectorAll(".inline-stay-add")]
      .find((button) => isVisible(button) && /add highlight/i.test(button.textContent.trim()));
    const highlightRect = highlight.getBoundingClientRect();
    const highlightClipRect = highlight.closest(".amenity-group").getBoundingClientRect();
    const result = {
      iconPadding: [
        iconGridStyle.paddingTop,
        iconGridStyle.paddingRight,
        iconGridStyle.paddingBottom,
        iconGridStyle.paddingLeft,
      ].map(Number.parseFloat),
      highlightBottomSpace: highlightClipRect.bottom - highlightRect.bottom,
    };
    airplane.classList.remove("is-selected");
    airplane.closest(".inline-icon-dialog").close();
    return result;
  });

  assert.ok(
    clipping.iconPadding.every((padding) => padding >= EDITOR_EDGE_GUARD),
    `Icon selection line is clipped: ${JSON.stringify(clipping)}`,
  );
  assert.ok(
    clipping.highlightBottomSpace >= EDITOR_EDGE_GUARD,
    `Text control line is clipped: ${JSON.stringify(clipping)}`,
  );
}
