export function calculateScrollTopThreshold(viewportHeight) {
  return Math.max(240, Math.min(420, viewportHeight * 0.4));
}

export function shouldShowScrollTop({ scrollY, scrollHeight, viewportHeight }) {
  const overflows = scrollHeight > viewportHeight + 80;
  return overflows && scrollY > calculateScrollTopThreshold(viewportHeight);
}

export function initializeScrollTop(elements) {
  let frame = 0;
  elements.button.hidden = false;
  const update = () => {
    const root = document.documentElement;
    const visible = shouldShowScrollTop({
      scrollY: window.scrollY,
      scrollHeight: root.scrollHeight,
      viewportHeight: window.innerHeight,
    });
    elements.button.classList.toggle("is-visible", visible);
    elements.button.setAttribute("aria-hidden", String(!visible));
    elements.button.tabIndex = visible ? 0 : -1;
  };
  const scheduleUpdate = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };
  const resizeObserver = new ResizeObserver(update);
  resizeObserver.observe(document.body);
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("fontscalechange", update);
  window.addEventListener("dashboardrender", update);
  elements.button.addEventListener("click", () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  });
  update();
  return {
    refresh: update,
    disconnect: () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("fontscalechange", update);
      window.removeEventListener("dashboardrender", update);
    },
  };
}
