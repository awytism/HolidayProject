export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}

export function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function initials(value) {
  return String(value ?? "").split(/\s+/).filter(Boolean).slice(0, 2)
    .map((word) => word[0]).join("").toUpperCase() || "+";
}

export function externalIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M10 14 19 5M19 14v5H5V5h5"/></svg>';
}

export function clone(value) {
  return structuredClone(value);
}
