export function calculateHeroScrollTop({ pageScroll, heroViewportTop, stickyViewportBottom }) {
  return calculateSectionScrollTop({ pageScroll, targetViewportTop: heroViewportTop, stickyViewportBottom });
}

export function calculateSectionScrollTop({ pageScroll, targetViewportTop, stickyViewportBottom }) {
  const top = Math.round(pageScroll + targetViewportTop - stickyViewportBottom);

  // Fractional layout pixels can otherwise leave a one-pixel sliver above the
  // hero after navigating from deep in the page.
  return top <= 2 ? 0 : top;
}
