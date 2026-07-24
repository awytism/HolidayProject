const FAVICON_HREF = "/assets/brand/favicon.png";

export function updateThemedFavicon(documentRef = globalThis.document) {
  const link = typeof documentRef?.querySelector === "function"
    ? documentRef.querySelector("#siteFavicon")
    : null;
  if (!link) return;
  link.type = "image/png";
  link.href = FAVICON_HREF;
}