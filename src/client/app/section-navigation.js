import { isSectionTitleVisible } from "./section-title-visibility.js";

const SECTION_ORDER = ["transport", "stay", "agenda", "places"];

export function calculateHeroScrollTop({ pageScroll, heroViewportTop, stickyViewportBottom }) {
  return calculateSectionScrollTop({ pageScroll, targetViewportTop: heroViewportTop, stickyViewportBottom });
}

export function calculateSectionScrollTop({ pageScroll, targetViewportTop, stickyViewportBottom, gap = 0 }) {
  const top = Math.round(pageScroll + targetViewportTop - stickyViewportBottom - gap);

  // Fractional layout pixels can otherwise leave a one-pixel sliver above the
  // hero after navigating from deep in the page.
  return top <= 2 ? 0 : top;
}

export function synchronizeSectionNavigation(meta, elements, titleDefaults) {
  for (const section of SECTION_ORDER) {
    const button = elements.nav.find((item) => item.dataset.view === section);
    if (!button) continue;
    const label = elements.sectionTitleLabels[`${section}Title`].textContent.trim()
      || titleDefaults[`${section}Title`];
    button.hidden = !isSectionTitleVisible(meta, section);
    button.setAttribute("aria-label", label);
    button.title = label;
    button.querySelector(".sr-only")?.replaceChildren(label);
    mirrorTitleIcon(button, elements.sectionTitles[section]);
  }
}

function mirrorTitleIcon(button, title) {
  const source = title.querySelector(".section-pill-icon svg");
  if (!source) return;
  const icon = source.cloneNode(true);
  for (const attribute of ["data-inline-icon-key", "data-inline-icon-name", "tabindex", "role", "aria-label"]) {
    icon.removeAttribute(attribute);
  }
  icon.setAttribute("aria-hidden", "true");
  button.querySelector("svg")?.replaceWith(icon);
}