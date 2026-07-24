const SECTION_NAMES = Object.freeze(["transport", "stay", "agenda", "places"]);
const SECTION_NAME_SET = new Set(SECTION_NAMES);

export function isHeroVisible(meta) {
  return meta?.hiddenHero !== true;
}

export function setHeroVisible(document, visible) {
  if (visible) delete document.meta.hiddenHero;
  else document.meta.hiddenHero = true;
}

export function isSectionTitleVisible(meta, section) {
  assertSection(section);
  return !normaliseHiddenTitles(meta?.hiddenSectionTitles).includes(section);
}

export function setSectionTitleVisible(document, section, visible) {
  assertSection(section);
  const hidden = new Set(normaliseHiddenTitles(document.meta.hiddenSectionTitles));
  if (visible) hidden.delete(section);
  else hidden.add(section);

  const ordered = SECTION_NAMES.filter((name) => hidden.has(name));
  if (ordered.length) document.meta.hiddenSectionTitles = ordered;
  else delete document.meta.hiddenSectionTitles;
}

function normaliseHiddenTitles(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((section, index) => SECTION_NAME_SET.has(section) && value.indexOf(section) === index);
}

function assertSection(section) {
  if (!SECTION_NAME_SET.has(section)) throw new TypeError(`Unknown section: ${section}`);
}
