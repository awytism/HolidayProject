export function createCanonicalTranslation(translate) {
  const textSources = new WeakMap();
  const attributeSources = new WeakMap();
  const editableValueSources = new WeakMap();

  return {
    editableValue(control, locale) {
      return translateFromSource(control, control.value, locale, editableValueSources, translate);
    },
    text(node, locale) {
      return translateFromSource(node, node.nodeValue, locale, textSources, translate);
    },
    attribute(element, attribute, locale) {
      if (element.closest("[data-no-translate]") || !element.hasAttribute(attribute)) return;
      let sources = attributeSources.get(element);
      if (!sources) {
        sources = new Map();
        attributeSources.set(element, sources);
      }
      const value = element.getAttribute(attribute);
      const translated = translateFromSource(attribute, value, locale, sources, translate);
      if (translated !== value) element.setAttribute(attribute, translated);
    },
  };
}

function translateFromSource(key, currentValue, locale, sources, translate) {
  const previous = sources.get(key);
  const source = previous && currentValue === previous.localized ? previous.source : currentValue;
  const localized = translate(source, locale);
  sources.set(key, { source, localized });
  return localized;
}