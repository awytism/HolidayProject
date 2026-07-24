const OBJECT_IMAGE_FIELDS = new Set([
  "cover",
  "heroCover",
  "providerCover",
  "originCover",
  "destinationCover",
  "media",
]);

export function stripDocumentImages(document) {
  return stripValue(document);
}

export function documentImageReferences(document) {
  const references = [];
  collectImageReferences(document, "document", references);
  return references;
}

function stripValue(value, field = "") {
  if (field === "image") return "";
  if (OBJECT_IMAGE_FIELDS.has(field)) return null;
  if (Array.isArray(value)) return value.map((entry) => stripValue(entry));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, stripValue(entry, key)]));
}

function collectImageReferences(value, path, references) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectImageReferences(entry, `${path}[${index}]`, references));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    const entryPath = `${path}.${key}`;
    if ((key === "image" || OBJECT_IMAGE_FIELDS.has(key)) && entry) {
      references.push({ path: entryPath, value: structuredClone(entry) });
    } else {
      collectImageReferences(entry, entryPath, references);
    }
  }
}
