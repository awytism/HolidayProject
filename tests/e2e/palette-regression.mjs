import assert from "node:assert/strict";

export async function verifyPaletteThemes(client) {
  const palettes = [
    "periwinkle-dream",
    "custom-palette",
  ];
  const snapshots = new Map();
  const fontHighlights = new Map();

  await selectPalette(client, "coral-olive-teal");
  assertThemedIconControls(await readLightTheme(client));
  await client.run(() => document.querySelector("#themeToggle").click());
  await client.waitFor(() => document.documentElement.dataset.theme === "dark");
  const mainDark = await readRenderedTheme(client);
  assertWhiteControlLabels(mainDark);
  assertThemedIconControls(mainDark);
  await client.run(() => document.querySelector("#themeToggle").click());
  await client.waitFor(() => document.documentElement.dataset.theme === "light");
  for (const palette of palettes) {
    await selectPalette(client, palette);
    const light = await readLightTheme(client);
    assert.equal(light.palette, palette);
    assert.equal(light.theme, "light");
    assert.equal(light.source.length, 5);
    assert.ok(light.source.every(Boolean));
    assert.notEqual(light.background, "none");
    assert.equal(light.selected, "true");
    assert.equal(light.visibleNames, 0);
    assert.equal(light.swatches.length, 5);
    assert.equal(new Set(light.swatches).size, 5);
    assert.ok(light.swatches.every((colour) => colour !== "rgba(0, 0, 0, 0)" && colour !== "transparent"));
    assert.notEqual(light.fontHighlight, "rgba(0, 0, 0, 0)");
    assert.equal(light.noteBorder, light.agendaNoteBorder);
    assert.equal(light.noteBackground, light.agendaNoteBackground);
    assert.equal(light.noteColor, light.agendaNoteColor);
    assertThemedIconControls(light);
    assert.match(light.favicon, /\/assets\/brand\/favicon\.png$/);
    fontHighlights.set(palette, light.fontHighlight);

    await client.run(() => document.querySelector("#themeToggle").click());
    await client.waitFor(() => document.documentElement.dataset.theme === "dark");
    const dark = await readRenderedTheme(client);
    assert.notEqual(dark.background, light.background);
    assert.notEqual(dark.card, light.card);
    assert.notEqual(dark.themeColor, light.themeColor);
    assert.notEqual(dark.fontHighlight, light.fontHighlight);
    assertWhiteControlLabels(dark);
    assertThemedIconControls(dark);
    assert.equal(dark.noteBorder, dark.agendaNoteBorder);
    assert.equal(dark.noteBackground, dark.agendaNoteBackground);
    assert.equal(dark.noteColor, dark.agendaNoteColor);
    assert.notEqual(dark.noteBackground, light.noteBackground);
    assert.equal(dark.favicon, light.favicon);
    snapshots.set(palette, light.background + light.card + dark.background + dark.card);
    await client.run(() => document.querySelector("#themeToggle").click());
    await client.waitFor(() => document.documentElement.dataset.theme === "light");
  }

  assert.equal(new Set(snapshots.values()).size, palettes.length);
  assert.equal(new Set(fontHighlights.values()).size, palettes.length);
  assert.equal(await client.run(() => localStorage.getItem("gramado-trip-palette")), palettes.at(-1));
}

function assertThemedIconControls(snapshot) {
  assert.deepEqual(snapshot.heroLocation, {
    color: snapshot.fourthIcon.color,
    background: snapshot.fourthIcon.background,
    border: snapshot.fourthIcon.color,
  });
  assert.equal(snapshot.titleIcons.information.color, snapshot.closeTheme.color);
  assert.equal(snapshot.titleIcons.places.color, snapshot.fourthIcon.color);
  for (const icon of Object.values(snapshot.titleIcons)) {
    assert.equal(icon.background, "rgba(0, 0, 0, 0)");
    assert.equal(icon.borderWidth, "0px");
    assert.equal(icon.boxShadow, "none");
  }
  assert.ok(snapshot.closeControls.length >= 4);
  for (const close of snapshot.closeControls) {
    assert.equal(close.color, snapshot.closeTheme.color);
    assert.equal(close.background, snapshot.closeTheme.background);
    assert.equal(close.border, snapshot.closeTheme.color);
    assert.equal(close.width, "38px");
    assert.equal(close.height, "38px");
    assert.equal(close.fontSize, "0px");
    assert.equal(close.glyphColor, snapshot.closeTheme.color);
    assert.equal(close.glyphWidth, "14px");
  }
}
function assertWhiteControlLabels(snapshot) {
  assert.equal(snapshot.controlLabelColors.length, 4);
  assert.ok(snapshot.controlLabelColors.every((colour) => colour === "rgb(255, 255, 255)"));
  assert.ok(snapshot.controlLabelFillColors.every((colour) => colour === "rgb(255, 255, 255)"));
}
async function selectPalette(client, palette) {
  await client.run(() => document.querySelector("#paletteToggle").click());
  await client.waitFor(() => !document.querySelector("#paletteMenu").hidden);
  const menuSize = await client.run(() => {
    const bounds = document.querySelector("#paletteMenu").getBoundingClientRect();
    return { width: bounds.width, height: bounds.height };
  });
  assert.ok(menuSize.width <= 156, JSON.stringify(menuSize));
  assert.ok(menuSize.height <= 270, JSON.stringify(menuSize));
  await client.run((id) => document.querySelector('[data-palette="' + id + '"]').click(), palette);
  await client.waitFor((id) => document.documentElement.dataset.palette === id, palette);
}

async function readLightTheme(client) {
  const snapshot = await client.run(() => {
    if (document.documentElement.dataset.theme === "dark") document.querySelector("#themeToggle").click();
    const rootStyle = window.getComputedStyle(document.documentElement);
    const rendered = readRenderedThemeInPage();
    return {
      ...rendered,
      palette: document.documentElement.dataset.palette,
      theme: document.documentElement.dataset.theme,
      source: [1, 2, 3, 4, 5].map((index) => rootStyle.getPropertyValue("--theme-" + index).trim()),
      selected: document.querySelector('.palette-choice[data-palette="' + document.documentElement.dataset.palette + '"]').getAttribute("aria-checked"),
      visibleNames: document.querySelectorAll(".palette-choice-name").length,
      swatches: [...document.querySelectorAll('.palette-choice[data-palette="' + document.documentElement.dataset.palette + '"] .palette-choice-swatch i')]
        .map((swatch) => window.getComputedStyle(swatch).backgroundColor),
    };

    function readRenderedThemeInPage() {
      const bodyStyle = window.getComputedStyle(document.body);
      const cardStyle = window.getComputedStyle(document.querySelector(".content-block"));
      const highlightProbe = document.createElement("i");
      highlightProbe.style.background = "var(--font-control-highlight)";
      highlightProbe.style.color = "var(--transport-icon-colour)";
      document.body.append(highlightProbe);
      const probeStyle = window.getComputedStyle(highlightProbe);
      const noteStyle = window.getComputedStyle(document.querySelector(".transport-note"));
      const agendaNoteStyle = window.getComputedStyle(document.querySelector("#agendaRoot .day-note:not(.place-empty-banner):not(.meal-empty-banner)"));
      const heroLocationStyle = window.getComputedStyle(document.querySelector(".hero-location-icon"));
      const themeTokenProbe = document.createElement("i");
      themeTokenProbe.style.color = "var(--icon-fourth-colour)";
      themeTokenProbe.style.backgroundColor = "var(--icon-fourth-background)";
      themeTokenProbe.style.borderColor = "var(--icon-coral-colour)";
      themeTokenProbe.style.outlineColor = "var(--icon-coral-background)";
      document.body.append(themeTokenProbe);
      const themeTokenStyle = window.getComputedStyle(themeTokenProbe);
      const closeControls = [...document.querySelectorAll(".dialog-close,.inline-icon-close,[data-viewer-close]")].map((control) => {
        const style = window.getComputedStyle(control);
        const glyph = window.getComputedStyle(control, "::before");
        return { color: style.color, background: style.backgroundColor, border: style.borderTopColor, width: style.width, height: style.height, fontSize: style.fontSize, glyphColor: glyph.backgroundColor, glyphWidth: glyph.width };
      });
      const result = {
        background: bodyStyle.backgroundImage,
        card: cardStyle.backgroundColor + "|" + cardStyle.backgroundImage,
        themeColor: document.querySelector('meta[name="theme-color"]').content,
        fontHighlight: probeStyle.backgroundColor,
        transportIconColour: probeStyle.color,
        heroLocation: { color: heroLocationStyle.color, background: heroLocationStyle.backgroundColor, border: heroLocationStyle.borderTopColor },
        fourthIcon: { color: themeTokenStyle.color, background: themeTokenStyle.backgroundColor },
        closeTheme: { color: themeTokenStyle.borderTopColor, background: themeTokenStyle.outlineColor },
        closeControls,
        titleIcons: Object.fromEntries([
          ["information", ".information-title-icon"],
          ["places", ".saved-places-title-icon"],
        ].map(([key, selector]) => {
          const style = window.getComputedStyle(document.querySelector(selector));
          return [key, { color: style.color, background: style.backgroundColor, borderWidth: style.borderTopWidth, boxShadow: style.boxShadow }];
        })),
      controlLabelColors: [...document.querySelectorAll(".language-button > span,.font-button > span")].map((label) => window.getComputedStyle(label).color),
      controlLabelFillColors: [...document.querySelectorAll(".language-button > span,.font-button > span")].map((label) => window.getComputedStyle(label).webkitTextFillColor),
        noteBorder: noteStyle.borderLeftColor,
        noteBackground: noteStyle.backgroundColor + "|" + noteStyle.backgroundImage,
        noteColor: noteStyle.color,
        agendaNoteBorder: agendaNoteStyle.borderLeftColor,
        agendaNoteBackground: agendaNoteStyle.backgroundColor + "|" + agendaNoteStyle.backgroundImage,
        agendaNoteColor: agendaNoteStyle.color,
        favicon: document.querySelector("#siteFavicon").href,
      };
      highlightProbe.remove();
      themeTokenProbe.remove();
      return result;
    }
  });
  await client.waitFor(() => document.documentElement.dataset.theme === "light");
  return snapshot;
}

function readRenderedTheme(client) {
  return client.run(() => {
    const bodyStyle = window.getComputedStyle(document.body);
    const cardStyle = window.getComputedStyle(document.querySelector(".content-block"));
    const highlightProbe = document.createElement("i");
    highlightProbe.style.background = "var(--font-control-highlight)";
    highlightProbe.style.color = "var(--transport-icon-colour)";
    document.body.append(highlightProbe);
    const probeStyle = window.getComputedStyle(highlightProbe);
    const noteStyle = window.getComputedStyle(document.querySelector(".transport-note"));
    const agendaNoteStyle = window.getComputedStyle(document.querySelector("#agendaRoot .day-note:not(.place-empty-banner):not(.meal-empty-banner)"));
      const heroLocationStyle = window.getComputedStyle(document.querySelector(".hero-location-icon"));
      const themeTokenProbe = document.createElement("i");
      themeTokenProbe.style.color = "var(--icon-fourth-colour)";
      themeTokenProbe.style.backgroundColor = "var(--icon-fourth-background)";
      themeTokenProbe.style.borderColor = "var(--icon-coral-colour)";
      themeTokenProbe.style.outlineColor = "var(--icon-coral-background)";
      document.body.append(themeTokenProbe);
      const themeTokenStyle = window.getComputedStyle(themeTokenProbe);
      const closeControls = [...document.querySelectorAll(".dialog-close,.inline-icon-close,[data-viewer-close]")].map((control) => {
        const style = window.getComputedStyle(control);
        const glyph = window.getComputedStyle(control, "::before");
        return { color: style.color, background: style.backgroundColor, border: style.borderTopColor, width: style.width, height: style.height, fontSize: style.fontSize, glyphColor: glyph.backgroundColor, glyphWidth: glyph.width };
      });
    const result = {
      background: bodyStyle.backgroundImage,
      card: cardStyle.backgroundColor + "|" + cardStyle.backgroundImage,
      themeColor: document.querySelector('meta[name="theme-color"]').content,
      fontHighlight: probeStyle.backgroundColor,
      transportIconColour: probeStyle.color,
        heroLocation: { color: heroLocationStyle.color, background: heroLocationStyle.backgroundColor, border: heroLocationStyle.borderTopColor },
        fourthIcon: { color: themeTokenStyle.color, background: themeTokenStyle.backgroundColor },
        closeTheme: { color: themeTokenStyle.borderTopColor, background: themeTokenStyle.outlineColor },
        closeControls,
        titleIcons: Object.fromEntries([
          ["information", ".information-title-icon"],
          ["places", ".saved-places-title-icon"],
        ].map(([key, selector]) => {
          const style = window.getComputedStyle(document.querySelector(selector));
          return [key, { color: style.color, background: style.backgroundColor, borderWidth: style.borderTopWidth, boxShadow: style.boxShadow }];
        })),
      controlLabelColors: [...document.querySelectorAll(".language-button > span,.font-button > span")].map((label) => window.getComputedStyle(label).color),
      controlLabelFillColors: [...document.querySelectorAll(".language-button > span,.font-button > span")].map((label) => window.getComputedStyle(label).webkitTextFillColor),
      noteBorder: noteStyle.borderLeftColor,
      noteBackground: noteStyle.backgroundColor + "|" + noteStyle.backgroundImage,
      noteColor: noteStyle.color,
      agendaNoteBorder: agendaNoteStyle.borderLeftColor,
      agendaNoteBackground: agendaNoteStyle.backgroundColor + "|" + agendaNoteStyle.backgroundImage,
      agendaNoteColor: agendaNoteStyle.color,
      favicon: document.querySelector("#siteFavicon").href,
    };
    highlightProbe.remove();
      themeTokenProbe.remove();
    return result;
  });
}
