const LANGUAGE_NAMES = Object.freeze({
  "en-GB": "British English",
  "pt-BR": "Português Brasileiro",
});

export function updateLanguageButtonStates(buttons, locale) {
  for (const button of buttons) {
    const buttonLocale = button.dataset.locale;
    const active = buttonLocale === locale;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("lang", buttonLocale);
    button.setAttribute("aria-label", LANGUAGE_NAMES[buttonLocale] ?? buttonLocale);
  }
}
