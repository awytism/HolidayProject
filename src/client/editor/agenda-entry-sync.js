const LINKED_FIELDS = new Set([
  "name", "mapUrl", "websiteUrl", "priority", "cover",
  "drivingDistance", "drivingTime", "cyclingDistance", "cyclingTime", "walkingDistance", "walkingTime",
]);

export function updateLinkedAgendaEntry(document, source, sourceKind, property, value) {
  const key = entryKey(source.name);
  source[property] = copyValue(value);
  if (!key || !LINKED_FIELDS.has(property)) return;
  for (const entry of linkedEntries(document, sourceKind)) {
    if (entry !== source && entryKey(entry.name) === key) entry[property] = copyValue(value);
  }
}

function linkedEntries(document, sourceKind) {
  const blocks = Object.values(document.sections).flat();
  const meals = blocks
    .filter((block) => block.type === "day")
    .flatMap((block) => Object.values(block.data.meals).flat());
  if (sourceKind === "saved") return meals;
  const saved = blocks
    .filter((block) => block.type === "saved-places")
    .flatMap((block) => block.data.places);
  return [...meals, ...saved];
}

function entryKey(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-GB");
}

function copyValue(value) {
  return value && typeof value === "object" ? structuredClone(value) : value;
}
