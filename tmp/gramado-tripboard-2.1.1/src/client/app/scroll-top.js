export function initializeScrollTop(elements) {
  let topVisible = true;
  const update = () => {
    const root = document.documentElement;
    const overflows = root.scrollHeight > window.innerHeight + 80;
    const visible = !topVisible && overflows;
    elements.button.hidden = !visible;
    elements.button.classList.toggle("is-visible", visible);
  };
  const observer = new IntersectionObserver(([entry]) => {
    topVisible = entry.isIntersecting;
    update();
  }, { rootMargin: "-120px 0px 0px" });
  observer.observe(elements.sentinel);
  const resizeObserver = new ResizeObserver(update);
  resizeObserver.observe(document.body);
  window.addEventListener("resize", update);
  window.addEventListener("fontscalechange", update);
  window.addEventListener("dashboardrender", update);
  elements.button.addEventListener("click", () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  });
  update();
  return { refresh: update, disconnect: () => { observer.disconnect(); resizeObserver.disconnect(); } };
}
