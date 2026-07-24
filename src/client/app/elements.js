import { SECTION_ORDER } from "../sections/registry.js";

export function getElements() {
  const hero = document.querySelector(".hero");
  const sectionRoots = Object.fromEntries(SECTION_ORDER.map((section) => [
    section,
    document.querySelector('[data-section-root="' + section + '"]'),
  ]));
  const sectionTitleHeadings = Object.fromEntries(SECTION_ORDER.map((section) => [
    section,
    document.querySelector(`[data-section-title-heading="${section}"]`),
  ]));
  const sectionTitles = Object.fromEntries(SECTION_ORDER.map((section) => [
    section,
    document.querySelector(`#${section}Title`),
  ]));
  const sectionTargets = Object.fromEntries(SECTION_ORDER.map((section) => [
    section,
    document.querySelector(`[data-page-section="${section}"]`),
  ]));
  return {
    sectionsRoot: document.querySelector("#sectionsRoot"),
    sectionRoots,
    sectionTargets,
    sectionTitleHeadings,
    sectionTitles,
    sectionTitleLabels: {
      transportTitle: document.querySelector("#transportTitleLabel"),
      stayTitle: document.querySelector("#stayTitleLabel"),
      agendaTitle: document.querySelector("#agendaTitleLabel"),
      placesTitle: document.querySelector("#placesTitleLabel"),
    },
    hero,
    heroRemoveButton: document.querySelector("#heroRemoveButton"),
    heroRestoreButton: document.querySelector("#heroRestoreButton"),
    heroStats: document.querySelector(".hero-stats"),
    workspace: document.querySelector(".workspace-bar"),
    brandName: document.querySelector("#brandName"),
    destination: document.querySelector("#destination"),
    region: document.querySelector("#region"),
    travelDates: document.querySelector("#travelDates"),
    travelDateEditor: document.querySelector("#travelDateEditor"),
    tripStartDate: document.querySelector("#tripStartDate"),
    tripEndDate: document.querySelector("#tripEndDate"),
    tripDays: document.querySelector("#tripDays"),
    tripLegs: document.querySelector("#tripLegs"),
    heroCoverButton: document.querySelector("#heroCoverButton"),
    heroCoverButtonLabel: document.querySelector("#heroCoverButtonLabel"),
    brand: document.querySelector(".brand"),
    nav: [...document.querySelectorAll("[data-view]")],
    mobileActionsToggle: document.querySelector("#mobileActionsToggle"),
    workspaceActions: document.querySelector("#workspaceActions"),
    edit: document.querySelector("#editButton"),
    editLabel: document.querySelector("#editButtonLabel"),
    language: [...document.querySelectorAll("[data-locale]")],
    toast: document.querySelector("#toast"),
    preferences: {
      theme: document.querySelector("#themeToggle"),
      fontDecrease: document.querySelector("#fontDecrease"),
      fontIncrease: document.querySelector("#fontIncrease"),
      fontStatus: document.querySelector("#fontScaleStatus"),
      fontFamilyControl: document.querySelector("#fontFamilyControl"),
      fontFamilyToggle: document.querySelector("#fontFamilyToggle"),
      fontFamilyMenu: document.querySelector("#fontFamilyMenu"),
      fontFamilyOptions: [...document.querySelectorAll(".font-family-choice")],
      customFontChoice: document.querySelector("#customFontChoice"),
      customFontEditor: document.querySelector("#customFontEditor"),
      customFontInput: document.querySelector("#customFontInput"),
      customFontLabel: document.querySelector("[data-custom-font-label]"),
      customFontRemove: document.querySelector("#customFontRemove"),
      customFontStatus: document.querySelector("#customFontStatus"),
      paletteControl: document.querySelector("#paletteControl"),
      paletteToggle: document.querySelector("#paletteToggle"),
      paletteMenu: document.querySelector("#paletteMenu"),
      paletteOptions: [...document.querySelectorAll("[data-palette]")],
      customPaletteForm: document.querySelector("#customPaletteEditor"),
      customPaletteInputs: [...document.querySelectorAll("[data-custom-palette-input]")],
      customPalettePreviews: [...document.querySelectorAll("[data-custom-palette-preview]")],
      customPaletteError: document.querySelector("#customPaletteError"),
    },
    scrollTop: {
      button: document.querySelector("#scrollTop"),
      sentinel: document.querySelector("#topSentinel"),
    },
  };
}
