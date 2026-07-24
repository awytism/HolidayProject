import assert from "node:assert/strict";

export async function verifyPlacesTitleInline(client) {
  const layout = await client.run(() => {
    const heading = document.querySelector(".section-places-grid .saved-places-header h3");
    const icon = heading?.querySelector(".saved-places-title-icon");
    const copy = heading?.querySelector(".saved-places-title-copy");
    if (!heading || !icon || !copy) return null;
    const headingRect = heading.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    const copyRect = copy.getBoundingClientRect();
    return {
      editing: document.body.classList.contains("is-inline-editing"),
      contentEditable: copy.contentEditable,
      display: window.getComputedStyle(heading).display,
      flexDirection: window.getComputedStyle(heading).flexDirection,
      heading: { x: headingRect.x, y: headingRect.y, width: headingRect.width, height: headingRect.height },
      icon: { x: iconRect.x, y: iconRect.y, width: iconRect.width, height: iconRect.height },
      copy: { x: copyRect.x, y: copyRect.y, width: copyRect.width, height: copyRect.height },
      centerDelta: Math.abs((iconRect.top + iconRect.height / 2) - (copyRect.top + copyRect.height / 2)),
      horizontalGap: copyRect.left - iconRect.right,
    };
  });
  assert.ok(layout, "Places of Interest heading should render");
  assert.equal(layout.editing && layout.contentEditable === "true", true);
  assert.equal(layout.display, "flex", JSON.stringify(layout));
  assert.equal(layout.flexDirection, "row");
  assert.ok(layout.centerDelta <= 2, `icon and title split vertically: ${JSON.stringify(layout)}`);
  assert.ok(layout.horizontalGap >= 0 && layout.horizontalGap <= 16, `icon and title are not adjacent: ${JSON.stringify(layout)}`);
}

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
  assert.equal(await client.run(() => document.querySelector("#travelDates").getAttribute("role")), "button");
  await client.run(() => document.querySelector("#travelDates").click());
  await client.waitFor(() => document.querySelector(".inline-date-time-dialog")?.open);
  assert.deepEqual(await client.run(() => ({
    types: [...document.querySelectorAll('.inline-date-time-dialog input[type="date"]')].map((input) => input.type),
    values: [...document.querySelectorAll('.inline-date-time-dialog input[type="date"]')].map((input) => input.value),
  })), { types: ["date", "date"], values: ["2026-10-24", "2026-11-01"] });

  await client.run(() => {
    const form = document.querySelector(".inline-date-time-dialog form");
    form.elements.startDate.value = "2026-10-25";
    form.requestSubmit();
  });
  await client.waitFor(() => !document.querySelector(".inline-date-time-dialog").open
    && document.querySelector("#tripDays").textContent === "8 days");
  assert.deepEqual(await client.run(() => ({
    days: document.querySelector("#tripDays").textContent,
    dates: document.querySelector("#travelDates").textContent,
  })), { days: "8 days", dates: "25/10 - 01/11 2026" });

  await client.run(() => document.querySelector("#travelDates").click());
  await client.waitFor(() => document.querySelector(".inline-date-time-dialog")?.open);
  await client.run(() => {
    const form = document.querySelector(".inline-date-time-dialog form");
    form.elements.startDate.value = "2026-10-24";
    form.requestSubmit();
  });
  await client.waitFor(() => !document.querySelector(".inline-date-time-dialog").open
    && document.querySelector("#tripDays").textContent === "9 days");

  await client.run(() => document.querySelector("[data-view=stay]").click());
  await client.waitFor(() => document.querySelector("#stayRoot [data-inline-date-field=checkin]")?.getAttribute("role") === "button");
  await client.run(() => document.querySelector("#stayRoot [data-inline-date-field=checkin]").click());
  await client.waitFor(() => document.querySelector(".inline-date-time-dialog")?.open);
  assert.equal(await client.run(() => document.querySelector('.inline-date-time-dialog input[name="date"]').type), "date");
  await client.run(() => document.querySelector(".inline-date-time-dialog [data-inline-date-time-cancel]").click());
  await client.waitFor(() => !document.querySelector(".inline-date-time-dialog").open);

  await client.run(() => document.querySelector("[data-view=agenda]").click());
  await client.waitFor(() => document.querySelectorAll("#agendaRoot [data-inline-date-field=date]").length === 9);
  await client.run(() => document.querySelector("#agendaRoot [data-inline-date-field=date]").click());
  await client.waitFor(() => document.querySelector(".inline-date-time-dialog")?.open);
  assert.equal(await client.run(() => document.querySelector('.inline-date-time-dialog input[name="date"]').type), "date");
  await client.run(() => document.querySelector(".inline-date-time-dialog [data-inline-date-time-cancel]").click());
  await client.waitFor(() => !document.querySelector(".inline-date-time-dialog").open);

  await client.run(() => document.querySelector("[data-view=transport]").click());
  await client.waitFor(() => document.querySelector("#transportRoot .flight-information-card [data-inline-date-field=date]")?.getAttribute("role") === "button");
  await client.run(() => document.querySelector("#transportRoot .flight-information-card [data-inline-date-field=date]").click());
  await client.waitFor(() => document.querySelector(".inline-date-time-dialog")?.open);
  assert.equal(await client.run(() => document.querySelector('.inline-date-time-dialog input[name="date"]').type), "date");
  await client.run(() => document.querySelector(".inline-date-time-dialog [data-inline-date-time-cancel]").click());
  await client.waitFor(() => !document.querySelector(".inline-date-time-dialog").open);
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
export async function verifyLiveFlightResources(client) {
  const state = await client.run(() => ({
    editing: document.body.classList.contains("is-inline-editing"),
    cards: [...document.querySelectorAll(".flight-information-card")].map((card) => {
      const row = card.querySelector(".flight-resource-row");
      const actions = [...row.querySelectorAll(".map-link,.website-link,.transport-attachment-button")];
      return {
        hasLiveResources: row.classList.contains("has-live-resources"),
        rowHidden: window.getComputedStyle(row).display === "none",
        unavailableActionsHidden: actions.every((action) => window.getComputedStyle(action).display === "none"),
      };
    }),
  }));
  assert.equal(state.editing, false);
  assert.ok(state.cards.length > 0);
  assert.equal(state.cards.every((card) => !card.hasLiveResources && card.rowHidden && card.unavailableActionsHidden), true);
}

export async function verifyAgendaEmptyStates(client) {
  await client.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await client.waitFor(() => window.innerWidth <= 390);
  const state = await client.run(() => {
    const root = document.documentElement;
    const previousTheme = root.dataset.theme;
    const previousPalette = root.dataset.palette;
    const wasEditing = document.body.classList.contains("is-inline-editing");
    const fixture = document.createElement("article");
    fixture.className = "day-card";
    fixture.style.cssText = "position:fixed;left:-10000px;top:0;width:360px;visibility:hidden;";
    fixture.innerHTML = `
      <div class="day-body">
        <div class="place-list"><p class="day-note place-empty-banner" contenteditable="true" data-inline-text-key="fixture:places">No places planned.</p></div>
        <div class="meal-grid"><p class="day-note meal-empty-banner" contenteditable="true" data-inline-text-key="fixture:meals">No meals planned.</p></div>
        <div class="saved-places"><div class="saved-place-groups"><section class="saved-place-group"><div class="saved-grid"><p class="day-note saved-place-empty">No places planned.</p></div></section></div></div>
        <p class="day-note notes-reference"><strong>Notes:</strong> Reference note</p>
      </div>`;
    document.body.append(fixture);

    const luminance = (value) => {
      const [red, green, blue] = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const scale = Math.max(red, green, blue) <= 1 ? 1 : 255;
      return ((0.2126 * red) + (0.7152 * green) + (0.0722 * blue)) / scale;
    };
    const measure = (containerSelector, bannerSelector) => {
      const container = fixture.querySelector(containerSelector);
      const banner = fixture.querySelector(bannerSelector);
      const containerRect = container.getBoundingClientRect();
      const bannerRect = banner.getBoundingClientRect();
      const style = window.getComputedStyle(banner);
      return {
        widthDifference: Math.abs(containerRect.width - bannerRect.width),
        horizontallyContained: banner.scrollWidth <= banner.clientWidth + 1,
        background: style.backgroundColor + "|" + style.backgroundImage,
        backgroundLuminance: Math.max(...[style.backgroundColor, ...(style.backgroundImage.match(/(?:rgba?|color)\([^)]+\)/g) ?? [])].map(luminance)),
        border: style.borderColor,
        color: style.color,
        colorLuminance: luminance(style.color),
        display: style.display,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        justifyContent: style.justifyContent,
        lineHeight: style.lineHeight,
        overflow: style.overflow,
        padding: style.padding,
        borderLeftWidth: style.borderLeftWidth,
        borderRadius: style.borderRadius,
        textAlign: style.textAlign,
      };
    };
    const snapshot = () => ({
      places: measure(".place-list", ".place-empty-banner"),
      meals: measure(".meal-grid", ".meal-empty-banner"),
      savedPlaces: measure(".saved-grid", ".saved-place-empty"),
      notes: measure(".day-body", ".notes-reference"),
    });

    root.dataset.theme = "dark";
    const currentPaletteDark = snapshot();
    root.dataset.palette = "periwinkle-dream";
    root.dataset.theme = "light";
    const light = snapshot();
    root.dataset.theme = "dark";
    const dark = snapshot();
    root.dataset.palette = "custom-palette";
    const customDark = snapshot();

    document.body.classList.add("is-inline-editing");
    root.dataset.palette = "periwinkle-dream";
    root.dataset.theme = "light";
    const editingLight = snapshot();
    root.dataset.theme = "dark";
    const editingDark = snapshot();
    root.dataset.palette = "custom-palette";
    const editingCustomDark = snapshot();

    fixture.remove();
    document.body.classList.toggle("is-inline-editing", wasEditing);
    if (previousTheme) root.dataset.theme = previousTheme;
    else delete root.dataset.theme;
    if (previousPalette) root.dataset.palette = previousPalette;
    else delete root.dataset.palette;
    return { currentPaletteDark, light, dark, customDark, editingLight, editingDark, editingCustomDark };
  });
  await client.send("Emulation.clearDeviceMetricsOverride");
  await client.waitFor(() => window.innerWidth > 600);

  for (const mode of [state.light, state.dark, state.customDark, state.editingLight, state.editingDark, state.editingCustomDark]) {
    for (const emptyState of [mode.places, mode.meals, mode.savedPlaces]) {
      assert.ok(emptyState.widthDifference <= 1, `empty state leaves ${emptyState.widthDifference}px unused`);
      assert.equal(emptyState.horizontallyContained, true);
      for (const property of [
        "background", "border", "borderLeftWidth", "borderRadius", "color", "display",
        "fontSize", "fontWeight", "lineHeight", "overflow", "padding", "textAlign",
      ]) assert.equal(emptyState[property], mode.notes[property], `${property} differs from Notes`);
      assert.notEqual(emptyState.background, "rgba(0, 0, 0, 0)|none");
    }
  }
  for (const type of ["places", "meals", "savedPlaces"]) {
    assert.notEqual(state.dark[type].background, state.light[type].background);
    assert.notEqual(state.dark[type].color, state.light[type].color);
    assert.notEqual(state.customDark[type].background, state.dark[type].background);
    assert.notEqual(state.customDark[type].border, state.dark[type].border);
    for (const darkMode of [state.currentPaletteDark[type], state.dark[type], state.customDark[type]]) {
      assert.ok(darkMode.backgroundLuminance < 0.4, `${type} empty state is still a light surface in dark mode`);
      assert.ok(darkMode.colorLuminance > darkMode.backgroundLuminance, `${type} empty-state text is not lighter than its dark surface`);
    }
  }
}
export async function verifyRequestedUiPolish(client) {
  await client.run(() => document.querySelector('[data-view="transport"]').click());
  await client.waitFor(() => Boolean(document.querySelector(".travel-essential-add")));
  const originalFactCount = await client.run(() => document.querySelectorAll(".travel-essential-pill").length);
  await client.run(() => document.querySelector(".travel-essential-add").click());
  await client.waitFor((count) => document.querySelectorAll(".travel-essential-pill").length === count + 1, originalFactCount);
  const addedInformation = await client.run(() => {
    const pill = document.querySelector(".travel-essential-pill-custom:last-of-type");
    const bounds = pill.getBoundingClientRect();
    const remove = pill.querySelector(".travel-essential-fact-remove").getBoundingClientRect();
    const label = pill.querySelector('[data-inline-essential-fact-field="label"]');
    const value = pill.querySelector('[data-inline-essential-fact-field="value"]');
    const icon = pill.querySelector("[data-inline-icon-key]");
    return {
      label: label.textContent.trim(),
      value: value.textContent.trim(),
      editable: label.contentEditable === "true" && value.contentEditable === "true",
      iconSelectable: icon?.dataset.inlineIconName === "information-circle",
      trashContained: remove.right <= bounds.right + 10 && remove.bottom >= bounds.top,
    };
  });
  assert.deepEqual(addedInformation, {
    label: "Detail",
    value: "Add information",
    editable: true,
    iconSelectable: true,
    trashContained: true,
  });
  await client.run(() => document.querySelector(".travel-essential-pill-custom:last-of-type .travel-essential-fact-remove").click());
  await client.waitFor((count) => document.querySelectorAll(".travel-essential-pill").length === count, originalFactCount);

  await client.run(() => document.querySelector("#fontFamilyToggle").click());
  await client.waitFor(() => !document.querySelector("#fontFamilyMenu").hidden);
  const fontPicker = await client.run(() => {
    const menu = document.querySelector("#fontFamilyMenu");
    const choices = [...menu.querySelectorAll(".font-family-choice")];
    const menuRect = menu.getBoundingClientRect();
    const customEditor = menu.querySelector("#customFontEditor");
    const customInput = menu.querySelector("#customFontInput");
    return {
      labels: choices.map((choice) => choice.textContent.trim()),
      width: menuRect.width,
      maxChoiceHeight: Math.max(...choices.map((choice) => choice.getBoundingClientRect().height)),
      horizontallyContained: choices.every((choice) => choice.scrollWidth <= choice.clientWidth + 1),
      customEditorVisible: window.getComputedStyle(customEditor).display === "grid",
      acceptedFormats: customInput.accept,
      fallbackStatus: customEditor.querySelector("#customFontStatus").textContent.trim(),
    };
  });
  assert.deepEqual(fontPicker.labels, ["ABeeZee", "Cause", "Google Sans", "Inter", "Life Savers"]);
  assert.ok(fontPicker.width <= 245, `edit-mode font menu is too wide: ${fontPicker.width}px`);
  assert.ok(fontPicker.maxChoiceHeight <= 35, `font rows are too tall: ${fontPicker.maxChoiceHeight}px`);
  assert.equal(fontPicker.horizontallyContained, true);
  assert.equal(fontPicker.customEditorVisible, true);
  assert.equal(fontPicker.acceptedFormats, ".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2");
  assert.equal(fontPicker.fallbackStatus, "");
  await client.run(() => document.querySelector("#fontFamilyToggle").click());

  const flightActions = await client.run(() => {
    function elementRect(element) {
      return element ? element.getBoundingClientRect() : null;
    }
    function centreY(rect) {
      return rect ? rect.top + rect.height / 2 : Number.NaN;
    }
    function sameSize(left, right) {
      if (!left || !right) return false;
      return left.width === right.width && left.height === right.height;
    }
    const accommodationAction = document.querySelector(".block-type-stay-summary .stay-title-row .map-link,.block-type-stay-summary .stay-title-row .website-link,.block-type-stay-summary .stay-title-row .transport-attachment-button");
    const accommodationRect = elementRect(accommodationAction);
    const accommodationGlyphRect = elementRect(accommodationAction?.querySelector("svg"));
    return [...document.querySelectorAll(".flight-information-card")].map((card) => {
      const row = card.querySelector(".flight-resource-row");
      const note = card.querySelector(".flight-note-region");
      const action = row?.querySelector(".map-link,.website-link,.transport-attachment-button");
      const rowRect = elementRect(row);
      const noteCopyRect = elementRect(note?.querySelector(".transport-note"));
      const actionRect = elementRect(action);
      const actionGlyphRect = elementRect(action?.querySelector("svg"));
      return {
        insideNotes: row?.parentElement === note,
        sharesLine: Math.abs(centreY(rowRect) - centreY(noteCopyRect)) <= 1,
        sameActionSize: sameSize(actionRect, accommodationRect),
        sameGlyphSize: sameSize(actionGlyphRect, accommodationGlyphRect),
        actions: row ? row.querySelectorAll(".map-link,.website-link,.transport-attachment-button").length : 0,
      };
    });
  });
  assert.ok(flightActions.length > 0);
  assert.equal(flightActions.every((card) => card.insideNotes && card.sharesLine && card.sameActionSize && card.sameGlyphSize && card.actions === 3), true);
  await client.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await client.waitFor(() => window.innerWidth <= 390);
  await client.run(() => document.querySelector("#mobileActionsToggle").click());
  await client.waitFor(() => document.querySelector("#mobileActionsToggle").getAttribute("aria-expanded") === "true");
  const mobileMenu = await client.run(() => {
    const panel = document.querySelector("#workspaceActions").getBoundingClientRect();
    const tools = ["#fontFamilyToggle", "#paletteToggle", "#themeToggle", "#editButton"]
      .map((selector) => document.querySelector(selector).getBoundingClientRect());
    const toolCentres = tools.map((rect) => rect.top + rect.height / 2);
    const dotColours = [...document.querySelectorAll(".mobile-actions-toggle-dots i")]
      .map((dot) => window.getComputedStyle(dot).backgroundColor);
    const language = document.querySelector(".language-switch").getBoundingClientRect();
    const textSize = document.querySelector(".font-controls").getBoundingClientRect();
    return {
      width: panel.width,
      fourToolsShareRow: Math.max(...toolCentres) - Math.min(...toolCentres) <= 1,
      pairedControlsMatch: Math.abs(language.width - textSize.width) <= 1 && Math.abs(language.height - textSize.height) <= 1,
      themedDots: new Set(dotColours).size === dotColours.length && dotColours.every((colour) => colour !== "rgb(48, 48, 48)"),
    };
  });
  assert.ok(mobileMenu.width <= 273, `mobile menu is too wide: ${mobileMenu.width}px`);
  assert.equal(mobileMenu.fourToolsShareRow, true);
  assert.equal(mobileMenu.pairedControlsMatch, true);
  assert.equal(mobileMenu.themedDots, true);
  await client.run(() => document.querySelector("#mobileActionsToggle").click());
  await client.waitFor(() => document.querySelector("#mobileActionsToggle").getAttribute("aria-expanded") === "false");

  const mobileActionsBelowNotes = await client.run(() => [...document.querySelectorAll(".flight-information-card")].every((card) => {
    const noteCopy = card.querySelector(".flight-note-region .transport-note").getBoundingClientRect();
    const actions = card.querySelector(".flight-resource-row").getBoundingClientRect();
    return actions.top >= noteCopy.bottom - 1;
  }));
  assert.equal(mobileActionsBelowNotes, true);
  await client.send("Emulation.clearDeviceMetricsOverride");
  await client.waitFor(() => window.innerWidth > 600);
  await client.run(() => document.querySelector(".flight-information-card .flight-note-remove").click());
  await client.waitFor(() => Boolean(document.querySelector(".flight-information-card .flight-note-region.is-notes-hidden .flight-resource-row")));
  assert.equal(await client.run(() => document.querySelectorAll(".flight-information-card .flight-note-region.is-notes-hidden .flight-resource-row .map-link,.flight-information-card .flight-note-region.is-notes-hidden .flight-resource-row .website-link,.flight-information-card .flight-note-region.is-notes-hidden .flight-resource-row .transport-attachment-button").length), 3);
  await client.run(() => document.querySelector(".flight-information-card .flight-note-restore").click());
  await client.waitFor(() => Boolean(document.querySelector(".flight-information-card .flight-note-region:not(.is-notes-hidden) .flight-resource-row")));
  await client.run(() => document.querySelector('[data-view="stay"]').click());
  await client.waitFor(() => document.querySelectorAll("#stayRoot .property-pill").length >= 4);
  const accommodation = await client.run(() => {
    const container = document.querySelector("#stayRoot .property-pills");
    const pills = [...container.querySelectorAll(".property-pill")];
    return {
      columns: window.getComputedStyle(container).gridTemplateColumns.split(" ").filter(Boolean).length,
      pills: pills.map((pill) => {
        const icon = pill.querySelector("i").getBoundingClientRect();
        const labelElement = pill.querySelector('[data-inline-stay-field="pill-label"]');
        const label = labelElement.getBoundingClientRect();
        const labelStyle = window.getComputedStyle(labelElement);
        const remove = pill.querySelector(".inline-stay-remove").getBoundingClientRect();
        const bounds = pill.getBoundingClientRect();
        return {
          controlsContained: icon.left >= bounds.left - 1 && remove.right <= bounds.right + 1,
          labelClearOfTrash: label.right <= remove.left - 4,
          labelVisible: label.width > 20 && label.height > 0,
          singleSurface: labelStyle.backgroundColor === "rgba(0, 0, 0, 0)"
            && labelStyle.boxShadow === "none"
            && labelStyle.borderTopWidth === "0px",
        };
      }),
    };
  });
  assert.equal(accommodation.columns, 2);
  assert.equal(accommodation.pills.every((pill) => pill.controlsContained && pill.labelClearOfTrash && pill.labelVisible && pill.singleSurface), true);

  await client.run(() => document.querySelector('[data-view="places"]').click());
  await client.waitFor(() => Boolean(document.querySelector(".section-places-grid .saved-places-header h3")));
  const places = await client.run(() => {
    const header = document.querySelector(".section-places-grid .saved-places-header");
    const card = header.closest(".saved-places");
    const title = header.querySelector("h3");
    const remove = header.querySelector(".saved-title-remove");
    const headerRect = header.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const removeRect = remove.getBoundingClientRect();
    const style = window.getComputedStyle(header);
    const titleStyle = window.getComputedStyle(title);
    const titleCopyStyle = window.getComputedStyle(title.querySelector(".saved-places-title-copy"));
    const otherLabelStyle = window.getComputedStyle(document.querySelector("#placesTitleLabel"));
    const listingTitleStyle = window.getComputedStyle(document.querySelector(".amenity-card-header h3"));
    const titleIconStyle = window.getComputedStyle(title.querySelector(".saved-places-title-icon"));
    const placesNavStyle = window.getComputedStyle(document.querySelector('.nav-item[data-view="places"]'));
    const iconCards = [...document.querySelectorAll(".section-places-grid .saved-place-card")].slice(0, 4);
    return {
      headerSpansCard: Math.abs(headerRect.left - cardRect.left) <= 1 && Math.abs(headerRect.right - cardRect.right) <= 1,
      titleFitsBeforeRemove: titleRect.left >= headerRect.left + Number.parseFloat(style.paddingLeft) - 1
        && titleRect.right <= removeRect.left - 4,
      titleIsNotClipped: title.scrollWidth <= title.clientWidth + 1,
      titleAlignment: titleStyle.textAlign,
      titleText: title.textContent.trim(),
      titleCopyMatchesOther: titleCopyStyle.color === otherLabelStyle.color
        && titleCopyStyle.backgroundImage === "none",
      titleTypographyMatchesListing: titleStyle.backgroundImage === listingTitleStyle.backgroundImage
        && titleStyle.textTransform === listingTitleStyle.textTransform
        && titleStyle.fontSize === listingTitleStyle.fontSize,
      titleIcon: {
        color: titleIconStyle.color,
        expectedColor: placesNavStyle.color,
        background: titleIconStyle.backgroundColor,
        borderWidth: titleIconStyle.borderTopWidth,
        boxShadow: titleIconStyle.boxShadow,
      },
      icons: iconCards.map((entry) => {
        const surface = entry.querySelector(".place-title-icon");
        const glyph = surface?.querySelector(".place-title-icon-glyph");
        const surfaceStyle = window.getComputedStyle(surface);
        return {
          name: glyph?.dataset.inlineIconName,
          palette: [surfaceStyle.backgroundColor, surfaceStyle.color, surfaceStyle.borderColor].join("|"),
          shapeFree: surfaceStyle.backgroundColor === "rgba(0, 0, 0, 0)"
            && surfaceStyle.borderTopWidth === "0px"
            && surfaceStyle.borderRadius === "0px",
        };
      }),
    };
  });
  assert.equal(places.headerSpansCard && places.titleFitsBeforeRemove && places.titleIsNotClipped, true);
  assert.equal(places.titleAlignment, "left");
  assert.equal(places.titleText, "Places of Interest");
  assert.equal(places.titleCopyMatchesOther, true);
  assert.equal(places.titleTypographyMatchesListing, true);
  assert.deepEqual(places.titleIcon, {
    color: places.titleIcon.expectedColor,
    expectedColor: places.titleIcon.expectedColor,
    background: "rgba(0, 0, 0, 0)",
    borderWidth: "0px",
    boxShadow: "none",
  });
  assert.deepEqual(places.icons.map((icon) => icon.name), ["home", "home", "home", "home"]);
  assert.equal(new Set(places.icons.map((icon) => icon.palette)).size, 4);
  assert.equal(places.icons.every((icon) => icon.shapeFree), true);
}

export async function verifyTravelEssentialsCard(client) {
  const desktop = await client.run(() => {
    const grid = document.querySelector(".section-transport-grid");
    const block = grid.querySelector(".block-type-travel-essentials");
    const card = block.querySelector(".travel-essentials-card");
    const gridRect = grid.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const children = [...card.querySelectorAll(".travel-essential-pill,.travel-health-line")];
    const transitHeading = document.querySelector('[data-section-title-heading="transport"]');
    const internalLabels = [...card.querySelectorAll(".travel-essential-copy small,.travel-health-copy small")];
    return {
      firstBlock: grid.firstElementChild === block,
      informationTitleIsInternal: Boolean(card.querySelector(".information-card-header")),
      titleHasInformationIcon: Boolean(card.querySelector(".information-title-icon")),
      titleText: card.querySelector(".information-card-header h3")?.textContent.trim(),
      healthIconsLead: [...card.querySelectorAll(".travel-health-line")].every((line) => line.firstElementChild?.classList.contains("travel-health-icon")),
      internalLabelsUseAuthoredCase: internalLabels.every((label) => window.getComputedStyle(label).textTransform === "none"),
      internalLabelWeights: internalLabels.map((label) => window.getComputedStyle(label).fontWeight),
      internalLabelsAreBold: internalLabels.every((label) => Number.parseInt(window.getComputedStyle(label).fontWeight, 10) >= 600),
      factLabels: [...card.querySelectorAll(".travel-essential-copy small")].map((label) => label.textContent.trim()),
      safetyLabels: [...card.querySelectorAll(".travel-health-copy small")].map((label) => label.textContent.trim()),
      transitImmediatelyFollows: block.nextElementSibling === transitHeading,
      transitPrecedesFlights: transitHeading?.nextElementSibling?.matches(".block-type-flight") === true,
      facts: card.querySelectorAll(".travel-essential-pill").length,
      healthLines: card.querySelectorAll(".travel-health-line").length,
      widthDifference: Math.abs(gridRect.width - blockRect.width),
      contained: children.every((child) => {
        const rect = child.getBoundingClientRect();
        return rect.left >= cardRect.left - 1 && rect.right <= cardRect.right + 1;
      }),
    };
  });
  assert.equal(desktop.firstBlock, true);
  assert.equal(desktop.informationTitleIsInternal, true);
  assert.equal(desktop.titleHasInformationIcon, true);
  assert.equal(desktop.titleText, "INFORMATION");
  assert.equal(desktop.healthIconsLead, true);
  assert.equal(desktop.internalLabelsUseAuthoredCase, true);
  assert.equal(desktop.internalLabelsAreBold, true, JSON.stringify(desktop.internalLabelWeights));
  assert.deepEqual(desktop.factLabels, ["Visa", "Language", "Currency", "Time Zone", "Driving Side", "Plug", "Voltage", "Frequency"]);
  assert.deepEqual(desktop.safetyLabels, ["SAFETY", "VACCINES"]);
  assert.equal(desktop.transitImmediatelyFollows, true);
  assert.equal(desktop.transitPrecedesFlights, true);
  assert.equal(desktop.facts, 8);
  assert.equal(desktop.healthLines, 2);
  assert.ok(desktop.widthDifference <= 1);
  assert.equal(desktop.contained, true);

  await client.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await client.waitFor(() => window.innerWidth <= 390);
  const mobile = await client.run(() => {
    const card = document.querySelector(".travel-essentials-card");
    const facts = [...card.querySelectorAll(".travel-essential-pill")].map((item) => item.getBoundingClientRect());
    const health = [...card.querySelectorAll(".travel-health-line")].map((item) => item.getBoundingClientRect());
    return {
      noHorizontalOverflow: card.scrollWidth <= card.clientWidth + 1,
      firstRowSharesTop: Math.abs(facts[0].top - facts[1].top) <= 1,
      nextRowFollows: facts[2].top > facts[0].top,
      healthIsStacked: health[1].top > health[0].top,
    };
  });
  assert.deepEqual(mobile, {
    noHorizontalOverflow: true,
    firstRowSharesTop: true,
    nextRowFollows: true,
    healthIsStacked: true,
  });
  await client.send("Emulation.clearDeviceMetricsOverride");
  await client.waitFor(() => window.innerWidth > 600);
}

export async function verifyResponsiveResizeAndMotion(client) {
  const inspectWidth = async (width, expectedTheme, editing) => {
    await client.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width <= 600,
    });
    await client.waitFor((value) => window.innerWidth === value, width);
    const snapshot = await client.run(async () => {
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
      const isVisible = (element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const bounded = [...document.querySelectorAll(
        ".workspace-bar,.hero,.section-shell,.editor-block,.content-block,.inline-card-controls",
      )].filter(isVisible).map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: element.className,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        };
      });
      const agendaPlaces = [...document.querySelectorAll(".day-card .place-list")]
        .find((list) => list.querySelectorAll(".place-row").length > 1);
      const title = document.querySelector("#destination");
      const titleColumn = title.closest(".hero > div").getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const cardStyle = window.getComputedStyle(document.querySelector(".content-block"));
      return {
        viewport: window.innerWidth,
        theme: document.documentElement.dataset.theme,
        editing: document.body.classList.contains("is-inline-editing"),
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        outOfBounds: bounded.filter((item) => item.left < -1 || item.right > window.innerWidth + 1),
        titleFits: titleRect.left >= titleColumn.left - 1 && titleRect.right <= titleColumn.right + 1,
        agendaColumns: agendaPlaces
          ? window.getComputedStyle(agendaPlaces).gridTemplateColumns.split(" ").filter(Boolean).length
          : 0,
        inlineControls: document.querySelectorAll(".inline-card-controls").length,
        cardBackground: cardStyle.backgroundColor,
        cardText: cardStyle.color,
      };
    });
    assert.equal(snapshot.viewport, width);
    assert.equal(snapshot.theme, expectedTheme);
    assert.equal(snapshot.editing, editing);
    assert.ok(snapshot.horizontalOverflow <= 1, `${width}px page overflowed by ${snapshot.horizontalOverflow}px`);
    assert.deepEqual(snapshot.outOfBounds, [], `${width}px elements left the viewport`);
    assert.equal(snapshot.titleFits, true, `${width}px hero title escaped its column`);
    assert.equal(snapshot.agendaColumns, width > 760 ? 2 : 1, `${width}px Agenda columns did not reflow`);
    if (editing) assert.ok(snapshot.inlineControls > 0, `${width}px edit controls did not render`);
    return snapshot;
  };

  for (const width of [1280, 1024, 821, 820, 761, 760, 601, 600, 521, 520, 391, 390, 360, 320, 390, 600, 820, 1280]) {
    await inspectWidth(width, "light", false);
  }

  await client.run(() => document.querySelector("#themeToggle").click());
  await client.waitFor(() => document.documentElement.dataset.theme === "dark");
  await client.run(() => new Promise((resolve) => window.setTimeout(resolve, 320)));
  const darkSnapshots = [];
  for (const width of [1280, 820, 600, 390, 320, 1280]) {
    darkSnapshots.push(await inspectWidth(width, "dark", false));
  }
  assert.ok(darkSnapshots.every((snapshot) => luminance(snapshot.cardBackground) < luminance(snapshot.cardText)), JSON.stringify(darkSnapshots.map(({ viewport, cardBackground, cardText }) => ({ viewport, cardBackground, cardText }))));

  await client.run(() => document.querySelector("#editButton").click());
  await client.waitFor(() => document.body.classList.contains("is-inline-editing"));
  for (const width of [1280, 820, 760, 600, 520, 390, 320, 1280]) {
    await inspectWidth(width, "dark", true);
  }

  const motion = await client.run(() => {
    const transition = (selector) => {
      const style = window.getComputedStyle(document.querySelector(selector));
      return { property: style.transitionProperty, duration: style.transitionDuration };
    };
    const addControl = document.querySelector(".inline-card-add");
    addControl.open = true;
    const popoverStyle = window.getComputedStyle(addControl.querySelector(".inline-card-add-options"));
    return {
      card: transition(".content-block"),
      remove: transition(".inline-card-remove"),
      add: transition(".inline-card-add > summary"),
      popoverAnimation: popoverStyle.animationName,
      popoverDuration: popoverStyle.animationDuration,
    };
  });
  assert.doesNotMatch(motion.card.property, /(?:^|,\s*)(?:all|width|height)(?:,|$)/);
  assert.match(motion.card.property, /transform/);
  assert.match(motion.remove.property, /transform/);
  assert.match(motion.add.property, /transform/);
  assert.notEqual(motion.remove.duration, "0s");
  assert.notEqual(motion.add.duration, "0s");
  assert.equal(motion.popoverAnimation, "inline-structure-popover-in");
  assert.notEqual(motion.popoverDuration, "0s");

  await client.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await client.waitFor(() => window.innerWidth === 390);
  await client.run(() => {
    document.querySelector(".inline-card-add").open = false;
    document.querySelector("#mobileActionsToggle").click();
  });
  await client.waitFor(() => document.querySelector("#mobileActionsToggle").getAttribute("aria-expanded") === "true");
  const mobileMotion = await client.run(() => {
    const style = window.getComputedStyle(document.querySelector("#workspaceActions"));
    return { name: style.animationName, duration: style.animationDuration };
  });
  assert.equal(mobileMotion.name, "mobile-actions-panel-in");
  assert.notEqual(mobileMotion.duration, "0s");
  await client.run(() => document.querySelector("#fontFamilyToggle").click());
  await client.waitFor(() => !document.querySelector("#fontFamilyMenu").hidden);
  await client.send("Emulation.setDeviceMetricsOverride", { width: 320, height: 700, deviceScaleFactor: 1, mobile: true });
  await client.waitFor(() => window.innerWidth === 320);
  const fontMenu = await client.run(async () => {
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    const rect = document.querySelector("#fontFamilyMenu").getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width };
  });
  assert.ok(fontMenu.left >= 11 && fontMenu.right <= 309, JSON.stringify(fontMenu));
  assert.ok(fontMenu.width <= 296, JSON.stringify(fontMenu));
  await client.run(() => {
    document.querySelector("#fontFamilyToggle").click();
    document.querySelector("#mobileActionsToggle").click();
  });

  await client.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await client.waitFor(() => window.innerWidth === 1280);
  await client.run(() => document.querySelector("#editButton").click());
  await client.waitFor(() => !document.body.classList.contains("is-inline-editing"));
  await client.run(() => document.querySelector("#themeToggle").click());
  await client.waitFor(() => document.documentElement.dataset.theme === "light");
  await client.send("Emulation.clearDeviceMetricsOverride");

  function luminance(value) {
    const channels = (String(value).match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    if (channels.length !== 3) return 0;
    return ((0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2])) / 255;
  }
}
