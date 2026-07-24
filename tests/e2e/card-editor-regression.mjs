import assert from "node:assert/strict";

export async function verifyCardEditorCrud(client) {
  const initial = await client.run(() => ({
    inlineEditing: document.body.classList.contains("is-inline-editing"),
    legacyEditing: document.body.classList.contains("is-editing"),
    cards: document.querySelectorAll(".editor-block").length,
    forms: document.querySelectorAll(".editor-block .edit-form").length,
    removeButtons: document.querySelectorAll(".inline-card-remove").length,
    sizeControls: document.querySelectorAll("[data-inline-card-span]").length,
    legacyAddButtons: document.querySelectorAll("[data-add-type]").length,
    transportTypes: [...document.querySelectorAll('[data-section-root="transport"] [data-card-type]')]
      .map((button) => button.dataset.cardType),
    stayTypes: [...document.querySelectorAll('[data-section-root="stay"] [data-card-type]')]
      .map((button) => button.dataset.cardType),
    agendaTypes: [...document.querySelectorAll('[data-section-root="agenda"] [data-card-type]')]
      .map((button) => button.dataset.cardType),
    placesTypes: [...document.querySelectorAll('[data-section-root="places"] [data-card-type]')]
      .map((button) => button.dataset.cardType),
    imageButtons: document.querySelectorAll(".inline-image-button").length,
    heroImageDisplay: window.window.getComputedStyle(document.querySelector("#heroCoverButton")).display,
    titleInset: document.querySelector("#destination").getBoundingClientRect().left
      - document.querySelector(".hero").getBoundingClientRect().left,
    titleAlignment: Math.abs(document.querySelector("#destination").getBoundingClientRect().left
      - document.querySelector(".hero .eyebrow").getBoundingClientRect().left),
    heroTitleFontSize: Number.parseFloat(window.getComputedStyle(document.querySelector("#destination")).fontSize),
    heroTitleFullyVisible: (() => {
      const title = document.querySelector("#destination");
      const titleRect = title.getBoundingClientRect();
      const columnRect = title.closest(".hero > div").getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(title);
      const glyphRect = range.getBoundingClientRect();
      const checks = {
        fitsColumn: titleRect.right <= columnRect.right + 1,
        glyphLeft: glyphRect.left >= titleRect.left - 1,
        glyphRight: glyphRect.right <= titleRect.right + 1,
        glyphTop: glyphRect.top >= titleRect.top - 1,
        glyphBottom: glyphRect.bottom <= titleRect.bottom + 1,
        overflowVisible: window.getComputedStyle(title).overflow === "visible",
      };
      return { ...checks, all: Object.values(checks).every(Boolean), titleRect, glyphRect, columnRect };
    })(),
    uniformHeroPills: (() => {
      const widths = [...document.querySelectorAll(".hero-stats .stat")].map((pill) => Math.round(pill.getBoundingClientRect().width));
      return widths.length === 3 && widths.every((width) => width > 0) && new Set(widths).size === 1;
    })(),
    containedSectionTitlePills: (() => {
      const pills = [...document.querySelectorAll(".section-pill:not([hidden])")];
      return pills.length === 4 && pills.every((pill) => pill.getBoundingClientRect().width > 0 && pill.scrollWidth <= pill.clientWidth + 1);
    })(),
    placesNavigation: (() => {
      const buttons = [...document.querySelectorAll(".main-nav [data-view]")];
      const agendaIndex = buttons.findIndex((button) => button.dataset.view === "agenda");
      const placesIndex = buttons.findIndex((button) => button.dataset.view === "places");
      const button = buttons[placesIndex];
      return {
        visible: Boolean(button && !button.hidden),
        followsAgenda: placesIndex === agendaIndex + 1,
        label: button?.title,
        hasCompassOutline: Boolean(button?.querySelector(".nav-places-icon circle") && button.querySelector(".nav-places-icon path")),
        centred: button ? window.getComputedStyle(button).placeItems === "center" : false,
      };
    })(),
    innerCardRowsAligned: (() => {
      const selectors = [
        ".property-pills", ".stay-dates", ".amenity-groups", ".distance-list",
        ".meal-grid", ".day-card .place-list", ".saved-place-groups", ".saved-place-group .saved-grid",
      ];
      const results = [...document.querySelectorAll(selectors.join(","))].map((grid) => {
        const items = [...grid.children].filter((item) => window.getComputedStyle(item).display !== "none");
        const rows = [];
        for (const item of items) {
          const rect = item.getBoundingClientRect();
          const row = rows.find((candidate) => Math.abs(candidate[0].top - rect.top) <= 2);
          if (row) row.push(rect); else rows.push([rect]);
        }
        const alignItems = window.getComputedStyle(grid).alignItems;
        const dimensions = rows.map((row) => row.map((rect) => [Math.round(rect.top), Math.round(rect.height)]));
        const aligned = rows.every((row) => Math.max(...row.map((rect) => rect.height))
          - Math.min(...row.map((rect) => rect.height)) <= 2);
        return { className: grid.className, alignItems, dimensions, pass: alignItems === "stretch" && aligned };
      });
      return { all: results.every((result) => result.pass), failures: results.filter((result) => !result.pass) };
    })(),
    flightCards: document.querySelectorAll(".flight-information-card").length,
    legacyTransportCards: document.querySelectorAll(".transport-card.transfer, .transport-card.note").length,
    exactSizeChoices: [...document.querySelectorAll(".editor-block [data-inline-card-span]")].every((select) => (
      JSON.stringify([...select.options].map((option) => option.value)) === JSON.stringify(["4", "6", "12"])
    )),
    pinnedFlightCities: [...document.querySelectorAll(".flight-information-card")].every((card) => (
      card.querySelectorAll(".flight-city > svg").length === 2
    )),
    optionalArrivalDates: [...document.querySelectorAll(".flight-information-card")].every((card) => (
      Boolean(card.querySelector('[data-inline-date-field="arrivalDate"][data-inline-date-optional]'))
    )),
    streamlinedTimelines: [...document.querySelectorAll(".flight-information-card .flight-timeline")].every((timeline) => (
      !timeline.querySelector(".flight-journey-line")
      && Boolean(timeline.querySelector(".flight-origin"))
      && Boolean(timeline.querySelector(".flight-journey"))
      && Boolean(timeline.querySelector(".flight-destination"))
    )),
    centeredIconFigures: [...document.querySelectorAll(".nav-item, .stat-icon, .hero-location-icon, .section-pill-icon:not(.section-pill-icon-spacer), .stay-date-icon, .amenity-group-icon, .amenity-icon, .distance-mode-icon, .place-route-icon, .meal-heading-icon, .entry-links a, .transport-attachment-button, .flight-journey-icon, .toolbar-icon, .scroll-top")].every((figure) => {
      const glyph = figure.querySelector("svg");
      if (!glyph) return true;
      const figureBox = figure.getBoundingClientRect();
      const glyphBox = glyph.getBoundingClientRect();
      return Math.abs((figureBox.left + figureBox.width / 2) - (glyphBox.left + glyphBox.width / 2)) <= 2
        && Math.abs((figureBox.top + figureBox.height / 2) - (glyphBox.top + glyphBox.height / 2)) <= 2;
    }),
    leftAlignedFlightTimelines: [...document.querySelectorAll(".flight-information-card .flight-timeline")].every((timeline) => {
      const leftEdges = [
        timeline.querySelector(".flight-origin .flight-time"),
        timeline.querySelector(".flight-journey-icon"),
        timeline.querySelector(".flight-destination .flight-time"),
      ].map((element) => element.getBoundingClientRect().left);
      return Math.max(...leftEdges) - Math.min(...leftEdges) <= 2;
    }),
    balancedFlightRouteSpacing: [...document.querySelectorAll(".flight-information-card .flight-timeline")].every((timeline) => {
      const departure = timeline.querySelector(".flight-origin").getBoundingClientRect();
      const duration = timeline.querySelector(".flight-journey").getBoundingClientRect();
      const arrival = timeline.querySelector(".flight-destination").getBoundingClientRect();
      return Math.abs((duration.top - departure.bottom) - (arrival.top - duration.bottom)) <= 1;
    }),
    notesGradientFlightDurationBands: [...document.querySelectorAll(".flight-information-card .flight-timeline")].every((timeline) => {
      const duration = window.getComputedStyle(timeline.querySelector(".flight-journey"));
      const note = window.getComputedStyle(timeline.closest(".flight-information-card").querySelector(".transport-note"));
      return duration.backgroundImage !== "none"
        && duration.backgroundImage === note.backgroundImage
        && duration.borderRadius === note.borderRadius;
    }),
    propertyFlightPillMetrics: (() => {
      const extract = (element) => {
        const style = window.getComputedStyle(element);
        return { backgroundColor: style.backgroundColor, borderTopWidth: style.borderTopWidth, borderRadius: style.borderRadius, boxShadow: style.boxShadow, fontWeight: style.fontWeight };
      };
      return {
        property: extract(document.querySelector(".property-pill")),
        flights: [...document.querySelectorAll(".flight-aircraft, .flight-service-badge")].map(extract),
      };
    })(),
    leftAlignedPropertyPills: [...document.querySelectorAll(".property-pills > .property-pill")].every((pill) => {
      const style = window.getComputedStyle(pill);
      return style.justifyContent === "flex-start" && style.textAlign === "left";
    }),
    flightLabelWeights: [...document.querySelectorAll(".flight-information-card .flight-summary .transport-direction-view, .flight-information-card .transport-direction-control select, .flight-information-card .flight-airport-copy > strong, .flight-information-card .flight-seat-heading > strong, .flight-information-card .flight-booking-detail > strong")].map((label) => ({
      label: label.textContent.trim(),
      className: label.className,
      isInformationLabel: label.matches(".flight-seat-heading > strong, .flight-booking-detail > strong"),
      weight: Number.parseInt(window.getComputedStyle(label).fontWeight, 10),
    })),

    flightColumnMetrics: [...document.querySelectorAll(".flight-information-card")].map((card) => ({
      outer: [
        ".flight-summary-title",
        ".flight-carrier .flight-airline-mark",
        ".flight-origin .flight-time",
        ".flight-journey-icon",
        ".flight-destination .flight-time",
        ".flight-seat-heading",
        ".flight-booking-detail > strong",
        ".flight-note-region",
      ].map((selector) => [selector, card.querySelector(selector).getBoundingClientRect().left]),
      copy: [
        ".flight-carrier-copy",
        ".flight-origin .flight-airport-copy",
        ".flight-journey-copy",
        ".flight-destination .flight-airport-copy",
      ].map((selector) => [selector, card.querySelector(selector).getBoundingClientRect().left]),
    })),
    flightLeadingGaps: [...document.querySelectorAll(".flight-information-card")].map((card) => ({
      carrier: Number.parseFloat(window.getComputedStyle(card.querySelector(".flight-carrier")).columnGap),
      departure: Number.parseFloat(window.getComputedStyle(card.querySelector(".flight-origin")).columnGap),
      journey: Number.parseFloat(window.getComputedStyle(card.querySelector(".flight-journey")).columnGap),
      arrival: Number.parseFloat(window.getComputedStyle(card.querySelector(".flight-destination")).columnGap),
    })),
    completeFlightCards: [...document.querySelectorAll(".flight-information-card")].every((card) => (
      Boolean(card.querySelector(".flight-summary"))
      && Boolean(card.querySelector(".flight-carrier-row"))
      && Boolean(card.querySelector(".flight-timeline"))
      && Boolean(card.querySelector(".flight-information-strip"))
      && Boolean(card.querySelector(".flight-seat-heading svg"))
    )),
    completeFlightResourceActions: [...document.querySelectorAll(".flight-information-card")].every((card) => (
      card.querySelectorAll(".flight-resource-row .map-link,.flight-resource-row .website-link,.flight-resource-row .transport-attachment-button").length === 3
    )),
    amenityIcons: document.querySelectorAll(".flight-information-card [data-amenity], .flight-information-card .wifi").length,
    notesRemoveButtons: document.querySelectorAll('.flight-information-card [data-inline-transport-action="remove-notes"]').length,
    detailsBelowSeats: [...document.querySelectorAll(".flight-information-card")].every((card) => (
      card.querySelector(".flight-booking-detail").getBoundingClientRect().top
        >= card.querySelector(".flight-seat-information").getBoundingClientRect().bottom
    )),
    centeredSeatAssignments: [...document.querySelectorAll(".flight-information-card")].every((card) => {
      const heading = card.querySelector(".flight-seat-heading").getBoundingClientRect();
      const assignment = card.querySelector(".flight-seat-copy").getBoundingClientRect();
      return Math.abs((heading.top + heading.height / 2) - (assignment.top + assignment.height / 2)) <= 2;
    }),
    wideWritingAreas: [...document.querySelectorAll(".flight-information-card")].every((card) => {
      const cardWidth = card.getBoundingClientRect().width;
      return card.querySelector(".flight-seat-copy").getBoundingClientRect().width >= cardWidth * 0.55
        && card.querySelector(".flight-booking-detail > span:last-child").getBoundingClientRect().width >= cardWidth * 0.7;
    }),
    overflowingFlightCards: [...document.querySelectorAll(".flight-information-card")]
      .filter((card) => card.scrollWidth > card.clientWidth + 1).length,
  }));
  assert.equal(initial.inlineEditing, true);
  assert.equal(initial.legacyEditing, false);
  assert.equal(initial.forms, 0);
  assert.equal(initial.removeButtons, initial.cards);
  assert.equal(initial.sizeControls, initial.cards);
  assert.equal(initial.legacyAddButtons, 0);
  const universalTypes = ["travel-essentials", "flight", "stay-summary", "stay-amenities", "day", "saved-places", "link", "note"];
  assert.deepEqual(initial.transportTypes, universalTypes);
  assert.deepEqual(initial.stayTypes, universalTypes);
  assert.deepEqual(initial.agendaTypes, universalTypes);
  assert.deepEqual(initial.placesTypes, universalTypes);
  assert.ok(initial.imageButtons > 0);
  assert.notEqual(initial.heroImageDisplay, "none");
  assert.ok(initial.titleInset >= 40, `Hero title inset was ${initial.titleInset}px`);
  assert.ok(initial.titleAlignment <= 2);
  assert.equal(initial.heroTitleFontSize, 58);
  assert.equal(initial.heroTitleFullyVisible.all, true, JSON.stringify(initial.heroTitleFullyVisible));
  assert.equal(initial.uniformHeroPills, true);
  assert.equal(initial.containedSectionTitlePills, true);
  assert.deepEqual(initial.placesNavigation, {
    visible: true, followsAgenda: true, label: "Other", hasCompassOutline: true, centred: true,
  });
  assert.equal(initial.innerCardRowsAligned.all, true, JSON.stringify(initial.innerCardRowsAligned.failures));
  assert.equal(initial.flightCards, 2);
  assert.equal(initial.legacyTransportCards, 0);
  assert.equal(initial.exactSizeChoices, true);
  assert.equal(initial.pinnedFlightCities, true);
  assert.equal(initial.optionalArrivalDates, true);
  assert.equal(initial.streamlinedTimelines, true);
  assert.equal(initial.centeredIconFigures, true);
  assert.equal(initial.leftAlignedFlightTimelines, true);
  assert.equal(initial.balancedFlightRouteSpacing, true);
  assert.equal(initial.notesGradientFlightDurationBands, true);
  for (const pill of initial.propertyFlightPillMetrics.flights) {
    assert.deepEqual(pill, initial.propertyFlightPillMetrics.property);
  }
  assert.equal(initial.leftAlignedPropertyPills, true);
  for (const label of initial.flightLabelWeights) {
    if (label.isInformationLabel) assert.equal(label.weight, 400, JSON.stringify(label));
    else assert.ok(label.weight >= 700, JSON.stringify(label));
  }
  for (const metrics of initial.flightColumnMetrics) {
    for (const column of ["outer", "copy"]) {
      const leftEdges = metrics[column].map(([, left]) => left);
      assert.ok(Math.max(...leftEdges) - Math.min(...leftEdges) <= 2, JSON.stringify(metrics[column]));
    }
  }
  for (const gaps of initial.flightLeadingGaps) {
    assert.ok(gaps.carrier >= 20, JSON.stringify(gaps));
    assert.ok(gaps.departure >= 6, JSON.stringify(gaps));
    assert.ok(gaps.journey >= 6, JSON.stringify(gaps));
    assert.ok(gaps.arrival >= 6, JSON.stringify(gaps));
  }
  assert.equal(initial.completeFlightCards, true);
  assert.equal(initial.completeFlightResourceActions, true);
  assert.equal(initial.amenityIcons, 0);
  assert.equal(initial.notesRemoveButtons, 2);
  assert.equal(initial.detailsBelowSeats, true);
  assert.equal(initial.centeredSeatAssignments, true);
  assert.equal(initial.wideWritingAreas, true);
  assert.equal(initial.overflowingFlightCards, 0);

  await client.run(() => document.querySelector('[data-locale="pt-BR"]').click());
  await client.waitFor(() => document.querySelector('.main-nav [data-view="places"]')?.title === "Outros");
  await client.run(() => document.querySelector('[data-locale="en-GB"]').click());
  await client.waitFor(() => document.querySelector('.main-nav [data-view="places"]')?.title === "Other");

  const firstCardId = await client.run(() => document.querySelector(".editor-block").dataset.blockId);
  for (const span of [4, 6, 12]) {
    await client.run(([blockId, value]) => {
      const select = document.querySelector(`[data-block-id="${blockId}"] [data-inline-card-span]`);
      select.value = String(value);
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }, [firstCardId, span]);
    await client.waitFor(([blockId, value]) => (
      document.querySelector(`[data-block-id="${blockId}"]`)?.classList.contains(`block-span-${value}`)
    ), [firstCardId, span]);
  }

  await client.run(() => {
    const title = document.querySelector("#transportTitleLabel");
    title.textContent = "Journeys";
    title.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await client.waitFor(() => document.querySelector('.main-nav [data-view="transport"]')?.title === "Journeys");
  await client.run(() => document.querySelector("#transportTitle .section-pill-icon svg").dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
  await client.waitFor(() => document.querySelector(".inline-icon-dialog")?.open);
  await client.run(() => document.querySelector('[data-icon-choice="map-pin"]').click());
  await client.waitFor(() => {
    const titleIcon = document.querySelector("#transportTitle .section-pill-icon svg");
    const navIcon = document.querySelector('.main-nav [data-view="transport"] svg');
    return titleIcon?.innerHTML === navIcon?.innerHTML && !navIcon?.hasAttribute("data-inline-icon-key");
  });

  await client.run(() => {
    document.querySelector('[data-section="stay"][data-section-title-action="remove"]').click();
    document.querySelector('[data-section="agenda"][data-section-title-action="remove"]').click();
  });
  await client.waitFor(() => [...document.querySelectorAll(".main-nav [data-view]")]
    .filter((button) => !button.hidden).map((button) => button.dataset.view).join(",") === "transport,places");
  // Only the matching title keeps a navigation item visible.
  await client.run(() => {
    document.querySelector('[data-section="stay"][data-section-title-action="restore"]').click();
    document.querySelector('[data-section="agenda"][data-section-title-action="restore"]').click();
  });
  await client.waitFor(() => [...document.querySelectorAll(".main-nav [data-view]")].every((button) => !button.hidden));

  const stayNestedCounts = await client.run(() => ({
    pills: document.querySelectorAll(".block-type-stay-summary .property-pill").length,
    groups: document.querySelectorAll(".block-type-stay-amenities .amenity-group").length,
    items: document.querySelectorAll(".block-type-stay-amenities li[data-amenity-item-id]").length,
  }));
  await client.run(() => document.querySelector('.block-type-stay-summary [data-inline-stay-action="remove-pill"]').click());
  await client.waitFor((count) => document.querySelectorAll(".block-type-stay-summary .property-pill").length === count - 1, stayNestedCounts.pills);
  await client.run(() => document.querySelector('.block-type-stay-summary [data-inline-stay-action="add-pill"]').click());
  await client.waitFor((count) => document.querySelectorAll(".block-type-stay-summary .property-pill").length === count, stayNestedCounts.pills);

  await client.run(() => document.querySelector('.block-type-stay-amenities [data-inline-stay-action="remove-item"]').click());
  await client.waitFor((count) => document.querySelectorAll(".block-type-stay-amenities li[data-amenity-item-id]").length === count - 1, stayNestedCounts.items);
  await client.run(() => document.querySelector('.block-type-stay-amenities .amenity-group [data-inline-stay-action="add-item"]').click());
  await client.waitFor((count) => document.querySelectorAll(".block-type-stay-amenities li[data-amenity-item-id]").length === count, stayNestedCounts.items);

  await client.run(() => document.querySelector('.block-type-stay-amenities [data-inline-stay-action="remove-group"]').click());
  await client.waitFor((count) => document.querySelectorAll(".block-type-stay-amenities .amenity-group").length === count - 1, stayNestedCounts.groups);
  await client.run(() => document.querySelector('.block-type-stay-amenities .amenity-card > [data-inline-stay-action="add-group"]').click());
  await client.waitFor((count) => document.querySelectorAll(".block-type-stay-amenities .amenity-group").length === count, stayNestedCounts.groups);

  await client.run(() => document.querySelector('.flight-information-card [data-inline-date-field="arrivalDate"]').click());
  await client.waitFor(() => document.querySelector(".inline-date-time-dialog")?.open);
  assert.equal(await client.run(() => document.querySelector('.inline-date-time-dialog input[name="date"]').required), false);
  await client.run(() => {
    const input = document.querySelector('.inline-date-time-dialog input[name="date"]');
    input.value = "";
    input.closest("form").requestSubmit();
  });
  await client.waitFor(() => Boolean(document.querySelector(".flight-information-card .flight-arrival-date-control"))
    && !document.querySelector(".flight-information-card .flight-arrival-date"));
  await client.run(() => document.querySelector(".flight-information-card .flight-arrival-date-control").click());
  await client.waitFor(() => document.querySelector(".inline-date-time-dialog")?.open);
  await client.run(() => {
    const input = document.querySelector('.inline-date-time-dialog input[name="date"]');
    input.value = "2099-01-01";
    input.closest("form").requestSubmit();
  });
  await client.waitFor(() => {
    const card = document.querySelector(".flight-information-card");
    const liveDate = card?.querySelector(".flight-arrival-date");
    const editorControl = card?.querySelector(".flight-arrival-date-control");
    return Boolean(liveDate && editorControl)
      && window.getComputedStyle(liveDate).display === "none"
      && window.getComputedStyle(editorControl).display !== "none";
  });
  await client.run(() => document.querySelector(".flight-information-card .flight-note-remove").click());
  await client.waitFor(() => {
    const hiddenNotes = document.querySelector(".flight-information-card .flight-note-region.is-notes-hidden");
    return Boolean(hiddenNotes?.querySelector(".flight-note-restore") && hiddenNotes.querySelector(".flight-resource-row"));
  });
  await client.run(() => document.querySelector(".flight-information-card .flight-note-restore").click());
  await client.waitFor(() => Boolean(document.querySelector(".flight-information-card .flight-note-region:not(.is-notes-hidden)")));

  await client.run(() => {
    const service = document.querySelector('.flight-information-card [data-inline-transport-field="serviceType"]');
    service.value = "layover";
    service.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await client.waitFor(() => document.querySelectorAll(".flight-information-card:first-of-type .flight-path-extra").length === 1);
  await client.run(() => {
    const provider = document.querySelector('.flight-information-card .flight-path-extra [data-inline-flight-segment-field="provider"]');
    provider.textContent = "Connection Airline";
    provider.dispatchEvent(new Event("input", { bubbles: true }));
    const stops = document.querySelector('.flight-information-card [data-inline-transport-field="stopCount"]');
    stops.value = "2";
    stops.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await client.waitFor(() => (
    document.querySelectorAll(".flight-information-card:first-of-type .flight-path-extra").length === 2
    && document.querySelectorAll(".flight-information-card:first-of-type .flight-layover-divider").length === 2
    && document.querySelector('.flight-information-card:first-of-type .flight-path-extra [data-inline-flight-segment-field="provider"]')?.textContent === "Connection Airline"
  ));
  await client.run(() => {
    const stops = document.querySelector('.flight-information-card [data-inline-transport-field="stopCount"]');
    stops.value = "1";
    stops.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await client.waitFor(() => document.querySelectorAll(".flight-information-card:first-of-type .flight-path-extra").length === 1);
  await client.run(() => {
    const service = document.querySelector('.flight-information-card [data-inline-transport-field="serviceType"]');
    service.value = "direct";
    service.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await client.waitFor(() => document.querySelectorAll(".flight-information-card:first-of-type .flight-path-extra").length === 0);

  const transportCount = await client.run(() => document.querySelectorAll(".section-transport-grid .editor-block").length);
  await client.run(() => document.querySelector('[data-section-root="transport"] [data-card-type="flight"]').click());
  await client.waitFor((count) => document.querySelectorAll(".section-transport-grid .editor-block").length === count + 1, transportCount);
  const newCardSizing = await client.run(() => {
    const card = document.querySelector(".section-transport-grid .editor-block:last-child");
    return {
      full: card.classList.contains("block-span-12"),
      choices: [...card.querySelector("[data-inline-card-span]").options].map((option) => option.value),
    };
  });
  assert.deepEqual(newCardSizing, { full: true, choices: ["4", "6", "12"] });
  await client.run(() => {
    window.confirm = () => true;
    document.querySelector(".section-transport-grid .editor-block:last-child .inline-card-remove").click();
  });
  await client.waitFor((count) => document.querySelectorAll(".section-transport-grid .editor-block").length === count, transportCount);

  await client.run(() => document.querySelector('[data-section="transport"][data-section-title-action="remove"]').click());
  await client.waitFor(() => document.querySelector("#transportTitle").hidden
    && !document.querySelector('[data-section="transport"][data-section-title-action="restore"]').hidden);
  await client.run(() => document.querySelector('[data-section="transport"][data-section-title-action="restore"]').click());
  await client.waitFor(() => !document.querySelector("#transportTitle").hidden
    && document.querySelector('[data-section="transport"][data-section-title-action="restore"]').hidden);

  const favicon = await client.run(async () => {
    const link = document.querySelector('link[rel="icon"]');
    const response = await fetch(link.href, { cache: "no-store" });
    return { href: link.href, type: link.type, bytes: (await response.arrayBuffer()).byteLength };
  });
  assert.match(favicon.href, /\/assets\/brand\/favicon\.png$/);
  assert.equal(favicon.type, "image/png");
  assert.ok(favicon.bytes > 5_000 && favicon.bytes < 50_000, JSON.stringify(favicon));

  const nestedCounts = await client.run(() => {
    const day = [...document.querySelectorAll(".section-agenda-grid .block-type-day")]
      .find((card) => card.querySelector("[data-place-id]") && card.querySelector("[data-food-id]"));
    const saved = document.querySelector(".section-places-grid .block-type-saved-places");
    return {
      dayId: day.dataset.blockId,
      dayPlaces: day.querySelectorAll("[data-place-id]").length,
      meals: day.querySelectorAll("[data-food-id]").length,
      savedPlaces: saved.querySelectorAll("[data-place-id]").length,
    };
  });
  await client.run((id) => [...document.querySelectorAll(".section-agenda-grid .block-type-day")].find((card) => card.dataset.blockId === id).querySelector("[data-inline-agenda-action=remove-place]").click(), nestedCounts.dayId);
  await client.waitFor(([id, count]) => [...document.querySelectorAll(".section-agenda-grid .block-type-day")].find((card) => card.dataset.blockId === id).querySelectorAll("[data-place-id]").length === count - 1, [nestedCounts.dayId, nestedCounts.dayPlaces]);
  await client.run((id) => [...document.querySelectorAll(".section-agenda-grid .block-type-day")].find((card) => card.dataset.blockId === id).querySelector("[data-inline-agenda-action=add-place]").click(), nestedCounts.dayId);
  await client.waitFor(([id, count]) => [...document.querySelectorAll(".section-agenda-grid .block-type-day")].find((card) => card.dataset.blockId === id).querySelectorAll("[data-place-id]").length === count, [nestedCounts.dayId, nestedCounts.dayPlaces]);

  await client.run((id) => [...document.querySelectorAll(".section-agenda-grid .block-type-day")].find((card) => card.dataset.blockId === id).querySelector("[data-inline-agenda-action=remove-food]").click(), nestedCounts.dayId);
  await client.waitFor(([id, count]) => [...document.querySelectorAll(".section-agenda-grid .block-type-day")].find((card) => card.dataset.blockId === id).querySelectorAll("[data-food-id]").length === count - 1, [nestedCounts.dayId, nestedCounts.meals]);
  await client.run((id) => [...document.querySelectorAll(".section-agenda-grid .block-type-day")].find((card) => card.dataset.blockId === id).querySelector(".meal-group [data-inline-agenda-action=add-food]").click(), nestedCounts.dayId);
  await client.waitFor(([id, count]) => [...document.querySelectorAll(".section-agenda-grid .block-type-day")].find((card) => card.dataset.blockId === id).querySelectorAll("[data-food-id]").length === count, [nestedCounts.dayId, nestedCounts.meals]);

  await client.run(() => document.querySelector(".section-places-grid .block-type-saved-places [data-inline-agenda-action=remove-place]").click());
  await client.waitFor((count) => document.querySelectorAll(".section-places-grid .block-type-saved-places [data-place-id]").length === count - 1, nestedCounts.savedPlaces);
  await client.run(() => document.querySelector(".section-places-grid .block-type-saved-places [data-inline-agenda-action=add-place]").click());
  await client.waitFor((count) => document.querySelectorAll(".section-places-grid .block-type-saved-places [data-place-id]").length === count, nestedCounts.savedPlaces);

  await client.run(() => {
    const title = document.querySelector(".section-places-grid .block-type-saved-places .saved-places-title-copy");
    title.textContent = "Dining and Sights";
    title.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await client.waitFor(() => document.querySelector(".section-places-grid .block-type-saved-places .saved-places-title-copy")?.textContent === "Dining and Sights");
  await client.run(() => document.querySelector(".section-places-grid .block-type-saved-places [data-inline-agenda-action=remove-title]").click());
  await client.waitFor(() => document.querySelector(".section-places-grid .block-type-saved-places .saved-places-header").classList.contains("is-title-hidden"));
  await client.waitFor(() => {
    const button = document.querySelector('.main-nav [data-view="places"]');
    return !button.hidden && button.title === "Other";
  });
  await client.run(() => document.querySelector(".section-places-grid .block-type-saved-places [data-inline-agenda-action=restore-title]").click());
  await client.waitFor(() => {
    const header = document.querySelector(".section-places-grid .block-type-saved-places .saved-places-header");
    return !header.classList.contains("is-title-hidden") && header.querySelector("h3").textContent === "Dining and Sights";
  });
  await client.waitFor(() => {
    const button = document.querySelector('.main-nav [data-view="places"]');
    return !button.hidden && button.title === "Other";
  });
  await client.run(() => document.querySelector('.main-nav [data-view="places"]').click());
  await client.waitFor(() => location.hash === "#places"
    && document.querySelector('.main-nav [data-view="places"]').getAttribute("aria-current") === "true");
  await client.run(() => document.querySelector('[data-locale="pt-BR"]').click());
  await client.waitFor(() => document.querySelector('.inline-card-add > summary span')?.textContent === "Adicionar cartão");
  const portuguese = await client.run(() => ({
    addCard: document.querySelector('.inline-card-add > summary span').textContent,
    removeCard: document.querySelector('.inline-card-remove').getAttribute('aria-label'),
    removeHero: document.querySelector('#heroRemoveButton').getAttribute('aria-label'),
    removeNotes: document.querySelector('.flight-note-remove').getAttribute('aria-label'),
    language: document.documentElement.lang,
    heroTitleLayout: (() => {
      const title = document.querySelector("#destination");
      const range = document.createRange();
      range.selectNodeContents(title);
      const titleRect = title.getBoundingClientRect();
      const columnRect = title.closest(".hero > div").getBoundingClientRect();
      return {
        lines: range.getClientRects().length,
        fontSize: Number.parseFloat(window.getComputedStyle(title).fontSize),
        fitsColumn: titleRect.right <= columnRect.right + 1,
        lineHeight: Number.parseFloat(window.getComputedStyle(title).lineHeight),
      };
    })(),
    uniformHeroPills: (() => {
      const widths = [...document.querySelectorAll(".hero-stats .stat")].map((pill) => Math.round(pill.getBoundingClientRect().width));
      return widths.length === 3 && widths.every((width) => width > 0) && new Set(widths).size === 1;
    })(),
    containedSectionTitlePills: (() => {
      const pills = [...document.querySelectorAll(".section-pill:not([hidden])")];
      return pills.length === 4 && pills.every((pill) => pill.getBoundingClientRect().width > 0 && pill.scrollWidth <= pill.clientWidth + 1);
    })(),
  }));
  assert.deepEqual(portuguese, {
    addCard: "Adicionar cartão",
    removeCard: "Remover cartão",
    removeHero: "Remover banner principal",
    removeNotes: "Remover observações",
    language: "pt-BR",
    heroTitleLayout: {
      lines: 1,
      fontSize: 58,
      fitsColumn: true,
      lineHeight: 64.96,
    },
    uniformHeroPills: true,
    containedSectionTitlePills: true,
  });
  assert.equal(portuguese.heroTitleLayout.fontSize, initial.heroTitleFontSize);

  await client.run(() => document.querySelector('#heroRemoveButton').click());
  await client.waitFor(() => document.querySelector('.hero').hidden && !document.querySelector('#heroRestoreButton').hidden);
  assert.equal(await client.run(() => document.querySelector('#heroRestoreButton').textContent.trim()), "+ Adicionar banner principal");
  await client.run(() => document.querySelector('#heroRestoreButton').click());
  await client.waitFor(() => !document.querySelector('.hero').hidden && document.querySelector('#heroRestoreButton').hidden);

  await client.run(() => document.querySelector('[data-locale="en-GB"]').click());
  await client.waitFor(() => document.querySelector('.inline-card-add > summary span')?.textContent === "Add card");
  assert.equal(await client.run(() => document.querySelector('.inline-card-remove').getAttribute('aria-label')), "Remove card");
}