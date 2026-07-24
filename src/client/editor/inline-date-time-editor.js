import { setBlockField } from "./commands.js";
import { escapeHtml } from "../utils/html.js";
import {
  DEFAULT_TRANSPORT_TIME_ZONE,
  deriveTransportDuration,
  isValidTimeZone,
  transportEndpointDate,
  transportEndpointTimeZone,
} from "../../shared/transport-duration.mjs";
import {
  formatTimeZoneName,
  resolveTimeZoneLocation,
  timeZoneLocationLabel,
  timeZoneLocationOptions,
} from "./time-zone-locations.js";

const DATE_SELECTOR = "[data-inline-date-action]";
const TIME_SELECTOR = "[data-inline-time-field]";
const CLOCK_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function createInlineDateTimeEditor({ store, language, preferences, render, showToast, root = document }) {
  const dialog = root.createElement("dialog");
  dialog.className = "inline-date-time-dialog media-dialog";
  dialog.setAttribute("aria-labelledby", "inlineDateTimeTitle");
  root.body.append(dialog);
  let active = null;

  root.addEventListener("click", handleTrigger, true);
  root.addEventListener("keydown", handleKeydown, true);
  dialog.addEventListener("submit", handleSubmit);
  dialog.addEventListener("click", handleDialogClick);
  dialog.addEventListener("change", handleDialogChange);
  dialog.addEventListener("input", handleDialogInput);
  dialog.addEventListener("cancel", handleCancel);

  return {
    apply() {
      const editing = store.getState().editing;
      for (const target of root.querySelectorAll(`${DATE_SELECTOR},${TIME_SELECTOR}`)) {
        if (editing) enableTarget(target);
        else restoreTarget(target);
      }
      if (!editing) close();
    },
    close,
  };

  function enableTarget(target) {
    if (target.dataset.inlineStructuredControl === undefined) {
      target.dataset.inlineOriginalRole = target.getAttribute("role") ?? "";
      target.dataset.inlineOriginalAriaLabel = target.getAttribute("aria-label") ?? "";
      target.dataset.inlineOriginalAriaHidden = target.getAttribute("aria-hidden") ?? "";
    }
    target.dataset.inlineStructuredControl = "";
    target.classList.add("is-inline-structured-control");
    target.tabIndex = 0;
    target.setAttribute("role", "button");
    target.removeAttribute("aria-hidden");
    const label = target.matches(TIME_SELECTOR)
      ? target.dataset.inlineTimeLabel || "Edit time"
      : target.dataset.inlineDateLabel || "Choose date";
    target.setAttribute("aria-label", language.translate(label));
    target.title = language.translate(label);
  }

  function restoreTarget(target) {
    if (target.dataset.inlineStructuredControl === undefined) return;
    restoreAttribute(target, "role", target.dataset.inlineOriginalRole);
    restoreAttribute(target, "aria-label", target.dataset.inlineOriginalAriaLabel);
    restoreAttribute(target, "aria-hidden", target.dataset.inlineOriginalAriaHidden);
    target.removeAttribute("tabindex");
    target.removeAttribute("title");
    target.classList.remove("is-inline-structured-control");
    delete target.dataset.inlineStructuredControl;
    delete target.dataset.inlineOriginalRole;
    delete target.dataset.inlineOriginalAriaLabel;
    delete target.dataset.inlineOriginalAriaHidden;
  }

  function handleTrigger(event) {
    const target = event.target.closest?.(`${DATE_SELECTOR},${TIME_SELECTOR}`);
    if (!target || !store.getState().editing) return;
    event.preventDefault();
    event.stopPropagation();
    if (target.matches(TIME_SELECTOR)) openTime(target);
    else openDate(target);
  }

  function handleKeydown(event) {
    if (!store.getState().editing || !["Enter", " "].includes(event.key)) return;
    const target = event.target.closest?.(`${DATE_SELECTOR},${TIME_SELECTOR}`);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    if (target.matches(TIME_SELECTOR)) openTime(target);
    else openDate(target);
  }

  function openDate(trigger) {
    const descriptor = describeDate(trigger);
    if (!descriptor) return;
    active = { kind: "date", descriptor, trigger };
    const current = currentDateValues(descriptor);
    dialog.innerHTML = renderDateDialog(descriptor, current);
    dialog.showModal();
    const firstInput = dialog.querySelector('input[type="date"]');
    firstInput?.focus();
    if (descriptor.kind === "block") {
      try { firstInput?.showPicker?.(); } catch { /* The input remains ready to open normally. */ }
    }
  }

  function openTime(trigger) {
    const descriptor = describeBlockTarget(trigger, trigger.dataset.inlineTimeField);
    if (!descriptor) return;
    descriptor.label = trigger.dataset.inlineTimeLabel || "Edit Time";
    descriptor.transportEndpoint = descriptor.section === "transport" && ["departure", "arrival"].includes(descriptor.field);
    if (descriptor.transportEndpoint) {
      descriptor.dateField = `${descriptor.field}Date`;
      descriptor.timeZoneField = `${descriptor.field}TimeZone`;
    }
    active = { kind: "time", descriptor, trigger };
    const current = currentTimeValues(descriptor);
    dialog.innerHTML = renderTimeDialog(descriptor, current);
    dialog.showModal();
    syncTimeConfirmation();
    syncTimeZoneLocation();
    const timeInput = dialog.querySelector('input[type="time"]');
    timeInput?.focus();
    if (CLOCK_TIME.test(current.time)) {
      try { timeInput?.showPicker?.(); } catch { /* The input remains ready to open normally. */ }
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!active || !store.getState().editing) return;
    const form = event.target;
    const values = new FormData(form);
    if (active.kind === "date") saveDate(values);
    else saveTime(values);
  }

  function saveDate(values) {
    if (active.descriptor.kind === "hero") {
      const startDate = String(values.get("startDate") ?? "");
      const endDate = String(values.get("endDate") ?? "");
      if (!startDate || !endDate || endDate < startDate) {
        showError("End date must be on or after the start date");
        return;
      }
      store.mutate((tripDocument) => {
        tripDocument.meta.startDate = startDate;
        tripDocument.meta.endDate = endDate;
      });
    } else {
      const date = String(values.get("date") ?? "");
      if (isMissingRequiredDate(date, active.descriptor)) {
        showError("Choose a valid date");
        return;
      }
      store.mutate((tripDocument) => setBlockField(
        tripDocument,
        active.descriptor.section,
        active.descriptor.blockId,
        active.descriptor.field,
        date,
      ));
    }
    const dateFormat = values.get("dateFormat");
    if (dateFormat !== null) preferences.setDateFormat(dateFormat);
    close();
    render();
    showToast("Date updated — save when you are ready");
  }

  function saveTime(values) {
    const unconfirmed = values.get("unconfirmed") === "on";
    const value = unconfirmed ? "TBD" : String(values.get("time") ?? "");
    if (!unconfirmed && !CLOCK_TIME.test(value)) {
      showError("Choose a valid time");
      return;
    }
    preferences.setTimeFormat(values.get("timeFormat"));
    if (active.descriptor.transportEndpoint) {
      if (!saveTransportTime(values, value)) return;
    } else {
      store.mutate((tripDocument) => setBlockField(
        tripDocument,
        active.descriptor.section,
        active.descriptor.blockId,
        active.descriptor.field,
        value,
      ));
    }
    close();
    render();
    showToast("Time updated — save when you are ready");
  }

  function saveTransportTime(values, value) {
    const journeyDate = String(values.get("journeyDate") ?? "");
    const timeZoneLocation = String(values.get("timeZoneLocation") ?? "");
    const timeZone = resolveTimeZoneLocation(timeZoneLocation, {
      currentTimeZone: String(values.get("timeZone") ?? ""),
    });
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(journeyDate)) {
      showError("Choose a valid journey date");
      return false;
    }
    if (!isValidTimeZone(timeZone)) {
      showError("Choose a city and country from the suggestions");
      return false;
    }
    store.mutate((tripDocument) => {
      const block = findBlock(tripDocument, active.descriptor);
      if (!block) return;
      block.data[active.descriptor.field] = value;
      block.data[active.descriptor.dateField] = journeyDate;
      block.data[active.descriptor.timeZoneField] = timeZone;
      block.data.duration = deriveTransportDuration(block.data);
    });
    return true;
  }

  function handleDialogClick(event) {
    if (event.target.closest("[data-inline-date-time-cancel]")) close();
  }

  function handleDialogChange(event) {
    if (event.target.matches('[name="unconfirmed"]')) syncTimeConfirmation();
    if (event.target.matches('[name="timeZoneLocation"]')) syncTimeZoneLocation();
  }

  function handleDialogInput(event) {
    if (event.target.matches('[name="timeZoneLocation"]')) syncTimeZoneLocation();
  }

  function handleCancel(event) {
    event.preventDefault();
    close();
  }

  function syncTimeConfirmation() {
    const checkbox = dialog.querySelector('[name="unconfirmed"]');
    const input = dialog.querySelector('[name="time"]');
    if (!checkbox || !input) return;
    input.disabled = checkbox.checked;
    input.required = !checkbox.checked;
  }

  function syncTimeZoneLocation() {
    const input = dialog.querySelector('[name="timeZoneLocation"]');
    const hidden = dialog.querySelector('[name="timeZone"]');
    const result = dialog.querySelector("[data-time-zone-result]");
    if (!input || !hidden || !result) return;
    const timeZone = resolveTimeZoneLocation(input.value, { currentTimeZone: hidden.value });
    hidden.value = timeZone;
    result.classList.toggle("is-unresolved", !timeZone);
    result.textContent = timeZone
      ? `${language.translate("Resolved time zone")}: ${formatTimeZoneName(timeZone)}`
      : language.translate("Choose a city and country from the suggestions");
  }

  function showError(message) {
    const error = dialog.querySelector("[data-inline-date-time-error]");
    if (!error) return;
    error.textContent = language.translate(message);
    error.hidden = false;
  }

  function close() {
    const trigger = active?.trigger;
    active = null;
    if (dialog.open) dialog.close();
    if (trigger?.isConnected) trigger.focus?.();
  }

  function describeDate(target) {
    if (target.dataset.inlineDateAction === "hero") return { kind: "hero", label: "Trip Dates" };
    const descriptor = describeBlockTarget(target, target.dataset.inlineDateField);
    if (!descriptor) return null;
    return {
      ...descriptor,
      kind: "block",
      label: target.dataset.inlineDateLabel || "Agenda Date",
      optional: target.dataset.inlineDateOptional !== undefined,
    };
  }

  function describeBlockTarget(target, field) {
    const block = target.closest(".editor-block[data-block-id]");
    const section = target.closest("[data-section-root]")?.dataset.sectionRoot;
    if (!block || !section || !field) return null;
    return { section, blockId: block.dataset.blockId, field };
  }

  function currentDateValues(descriptor) {
    const tripDocument = store.getDocument();
    if (descriptor.kind === "hero") {
      return { startDate: tripDocument.meta.startDate, endDate: tripDocument.meta.endDate };
    }
    return { date: currentBlockValue(descriptor) };
  }

  function currentBlockValue(descriptor) {
    const block = findBlock(store.getDocument(), descriptor);
    return block?.data?.[descriptor.field] ?? "";
  }

  function currentTimeValues(descriptor) {
    const block = findBlock(store.getDocument(), descriptor);
    const data = block?.data ?? {};
    if (!descriptor.transportEndpoint) {
      return { time: data[descriptor.field] ?? "", date: "", timeZone: DEFAULT_TRANSPORT_TIME_ZONE, timeZoneLocation: "" };
    }
    return currentTransportTimeValues(data, descriptor);
  }

  function currentTransportTimeValues(data, descriptor) {
    const timeZone = transportEndpointTimeZone(data, descriptor.field);
    const locationHint = descriptor.field === "departure"
      ? `${data.originCity ?? ""} ${data.origin ?? ""}`
      : `${data.destinationCity ?? ""} ${data.destination ?? ""}`;
    return {
      time: data[descriptor.field] ?? "",
      date: transportEndpointDate(data, descriptor.field),
      timeZone,
      timeZoneLocation: timeZoneLocationLabel(timeZone, {
        locale: language.locale,
        preferredLocation: locationHint,
      }),
    };
  }

  function renderDateDialog(descriptor, current) {
    const label = (value) => escapeHtml(language.translate(value));
    const fields = descriptor.kind === "hero"
      ? `<div class="inline-date-range"><label><span>${label("Start Date")}</span><input type="date" name="startDate" value="${escapeHtml(current.startDate)}" required></label><label><span>${label("End Date")}</span><input type="date" name="endDate" value="${escapeHtml(current.endDate)}" required></label></div>`
      : `<label><span>${label("Date")}</span><input type="date" name="date" value="${escapeHtml(current.date)}" ${descriptor.optional ? "" : "required"}></label>`;
    const formatChoice = !allowsDateFormatSelection(descriptor)
      ? ""
      : `<label><span>${label("Date Format")}</span><select name="dateFormat">${dateFormatOptions(label)}</select></label>`;
    return `<form class="media-form inline-date-time-form" novalidate data-no-translate>
      <button type="button" class="dialog-close" data-inline-date-time-cancel aria-label="${label("Close")}">×</button>
      <small>${label("Date")}</small>
      <h2 id="inlineDateTimeTitle">${label(descriptor.label)}</h2>
      <p class="media-error" data-inline-date-time-error role="alert" hidden></p>
      ${fields}
      ${formatChoice}
      <div class="dialog-actions"><button type="button" data-inline-date-time-cancel>${label("Cancel")}</button><button type="submit">${label("Apply")}</button></div>
    </form>`;
  }

  function renderTimeDialog(descriptor, current) {
    const label = (value) => escapeHtml(language.translate(value));
    const confirmed = CLOCK_TIME.test(current.time);
    const timeSettings = `<section class="inline-time-settings-card" aria-labelledby="inlineTimeSettingsTitle"><h3 id="inlineTimeSettingsTitle">${label("Time Settings")}</h3><div class="inline-time-settings-grid"><label><span>${label("Time")}</span><input type="time" name="time" value="${confirmed ? escapeHtml(current.time) : ""}" step="60"></label><label><span>${label("Time Format")}</span><select name="timeFormat">${timeFormatOptions(label)}</select></label></div><label class="inline-time-confirm"><input type="checkbox" name="unconfirmed" ${confirmed ? "" : "checked"}><span>${label("To be determined")}</span></label></section>`;
    const transportFields = descriptor.transportEndpoint
      ? `<section class="inline-transport-time-card" aria-labelledby="inlineJourneyDetailsTitle"><header><h3 id="inlineJourneyDetailsTitle">${label("Journey Details")}</h3><p>${label("This date and location are used only to calculate the journey duration.")}</p></header><div class="inline-transport-time-fields"><label><span>${label("Journey Date")}</span><input type="date" name="journeyDate" value="${escapeHtml(current.date)}" required></label><label class="inline-time-zone-field"><span>${label("City and Country")}</span><input type="search" name="timeZoneLocation" value="${escapeHtml(current.timeZoneLocation)}" list="inline-time-zone-locations" placeholder="${label("Start typing a city and country")}" autocomplete="off" aria-describedby="inline-time-zone-result" required><input type="hidden" name="timeZone" value="${escapeHtml(current.timeZone)}"><small id="inline-time-zone-result" data-time-zone-result>${label("Resolved time zone")}: ${escapeHtml(formatTimeZoneName(current.timeZone))}</small></label><datalist id="inline-time-zone-locations">${timeZoneLocationOptions(language.locale).map(({ label: optionLabel }) => `<option value="${escapeHtml(optionLabel)}"></option>`).join("")}</datalist></div></section>`
      : "";
    return `<form class="media-form inline-date-time-form" novalidate data-no-translate>
      <button type="button" class="dialog-close" data-inline-date-time-cancel aria-label="${label("Close")}">×</button>
      <small>${label("Time")}</small>
      <h2 id="inlineDateTimeTitle">${label(descriptor.label)}</h2>
      <p class="media-error" data-inline-date-time-error role="alert" hidden></p>
      ${timeSettings}
      ${transportFields}
      <div class="dialog-actions"><button type="button" data-inline-date-time-cancel>${label("Cancel")}</button><button type="submit">${label("Apply")}</button></div>
    </form>`;
  }

  function dateFormatOptions(label) {
    return [
      ["day-first", "Day first — 24/10/2026"],
      ["month-first", "Month first — 10/24/2026"],
      ["written", "Written — 24 Oct 2026"],
    ].map(([value, copy]) => `<option value="${value}" ${preferences.dateFormat === value ? "selected" : ""}>${label(copy)}</option>`).join("");
  }

  function timeFormatOptions(label) {
    return [
      ["24-hour", "24-hour (military) — 18:30"],
      ["12-hour", "12-hour (AM/PM) — 6:30 PM"],
    ].map(([value, copy]) => `<option value="${value}" ${preferences.timeFormat === value ? "selected" : ""}>${label(copy)}</option>`).join("");
  }

}

export function allowsDateFormatSelection(descriptor) {
  return descriptor?.kind !== "block" || descriptor?.section !== "agenda";
}

function isMissingRequiredDate(date, descriptor) {
  return !date && !descriptor.optional;
}
function restoreAttribute(target, name, value) {
  if (value) target.setAttribute(name, value);
  else target.removeAttribute(name);
}

function findBlock(tripDocument, descriptor) {
  return tripDocument.sections[descriptor.section]?.find((entry) => entry.id === descriptor.blockId);
}
