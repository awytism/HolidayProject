import assert from "node:assert/strict";

export async function verifyLanguageTranslation(client) {
  const snapshot = () => ({
    locale: document.documentElement.lang,
    localeData: document.documentElement.dataset.locale,
    storedLocale: localStorage.getItem("tripboard-language"),
    englishPressed: document.querySelector('.language-button[data-locale="en-GB"]').getAttribute("aria-pressed"),
    portuguesePressed: document.querySelector('.language-button[data-locale="pt-BR"]').getAttribute("aria-pressed"),
    brand: document.querySelector("#brandName").textContent.trim(),
    transportNav: document.querySelector('[data-view="transport"]').getAttribute("aria-label"),
    transportTitle: document.querySelector("#transportTitleLabel").textContent.trim(),
    stayTitle: document.querySelector("#stayTitleLabel").textContent.trim(),
    heroEyebrow: document.querySelector(".hero .eyebrow").textContent.trim(),
    fontLabel: document.querySelector("#fontFamilyToggle").getAttribute("aria-label"),
    themeLabel: document.querySelector("#themeToggle").getAttribute("aria-label"),
    description: document.querySelector('meta[name="description"]').content,
  });

  const initial = await client.run(snapshot);
  assert.equal(initial.locale, "en-GB");
  assert.equal(initial.englishPressed, "true");
  assert.equal(initial.transportNav, "Transit");
  assert.equal(initial.transportTitle, "Transit");
  assert.equal(initial.brand, "Itinerary");

  await client.run(() => document.querySelector('.language-button[data-locale="pt-BR"]').click());
  await client.waitFor(() => document.documentElement.lang === "pt-BR" && document.querySelector("#transportTitleLabel").textContent.trim() === "Transporte");
  const portuguese = await client.run(snapshot);
  assert.equal(portuguese.localeData, "pt-BR");
  assert.equal(portuguese.storedLocale, "pt-BR");
  assert.equal(portuguese.englishPressed, "false");
  assert.equal(portuguese.portuguesePressed, "true");
  assert.equal(portuguese.brand, "Itinerário");
  assert.equal(portuguese.transportNav, "Transporte");
  assert.equal(portuguese.transportTitle, "Transporte");
  assert.equal(portuguese.stayTitle, "Hospedagem");
  assert.equal(portuguese.heroEyebrow, "Subtítulo");
  assert.equal(portuguese.fontLabel, "Abrir opções de fonte");
  assert.equal(portuguese.themeLabel, "Ativar modo escuro");
  assert.equal(portuguese.description, "Travel Plan — planejador de viagem editável");

  const corruption = await client.run(() => {
    const attributes = [...document.querySelectorAll("[aria-label],[title],[placeholder]")]
      .flatMap((element) => ["aria-label", "title", "placeholder"].map((name) => element.getAttribute(name) ?? ""));
    const copy = `${document.body.innerText}\n${attributes.join("\n")}`;
    return /(?:Ã[\u00a0-\u00bf]|Â[\u00a0-\u00bf]|â€|�)/u.exec(copy)?.[0] ?? "";
  });
  assert.equal(corruption, "");

  await client.run(() => document.querySelector("#editButton").click());
  await client.waitFor(() => document.body.classList.contains("is-inline-editing"));
  const editorLabels = await client.run(() => ({
    heroRemove: document.querySelector("#heroRemoveButton").getAttribute("aria-label"),
    cardRemove: document.querySelector(".inline-card-remove").getAttribute("aria-label"),
    cardSize: document.querySelector("[data-inline-card-span]").getAttribute("aria-label"),
  }));
  assert.equal(editorLabels.heroRemove, "Remover banner principal");
  assert.equal(editorLabels.cardRemove, "Remover cartão");
  assert.equal(editorLabels.cardSize, "Tamanho do cartão");

  await client.run(() => {
    const target = document.querySelector(".hero .eyebrow");
    target.textContent = "Nossa próxima aventura";
    target.dispatchEvent(new window.InputEvent("input", { bubbles: true, inputType: "insertText", data: null }));
    document.querySelector('.language-button[data-locale="en-GB"]').click();
  });
  await client.waitFor(() => document.documentElement.lang === "en-GB" && document.querySelector(".hero .eyebrow").textContent.trim() === "Our Next Adventure");
  await client.run(() => document.querySelector('.language-button[data-locale="pt-BR"]').click());
  await client.waitFor(() => document.documentElement.lang === "pt-BR" && document.querySelector(".hero .eyebrow").textContent.trim() === "Nossa próxima aventura");
  await client.run(() => document.querySelector("#editButton").click());
  await client.waitFor(() => !document.body.classList.contains("is-inline-editing"));

  await client.run(() => location.reload());
  await client.waitFor(() => document.documentElement.lang === "pt-BR" && document.querySelectorAll(".section-transport-grid .content-block").length === 3);
  assert.equal(await client.run(() => localStorage.getItem("tripboard-language")), "pt-BR");

  await client.run(() => document.querySelector('.language-button[data-locale="en-GB"]').click());
  await client.waitFor(() => document.documentElement.lang === "en-GB" && document.querySelector("#transportTitleLabel").textContent.trim() === "Transit");
  const roundTrip = await client.run(snapshot);
  assert.equal(roundTrip.transportNav, "Transit");
  assert.equal(roundTrip.transportTitle, "Transit");
  assert.equal(roundTrip.stayTitle, "Accommodation");
  assert.equal(roundTrip.brand, "Itinerary");
  assert.equal(roundTrip.storedLocale, "en-GB");
}