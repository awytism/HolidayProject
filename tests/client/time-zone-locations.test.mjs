import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTimeZoneName,
  resolveTimeZoneLocation,
  timeZoneLocationLabel,
  timeZoneLocationOptions,
} from "../../src/client/editor/time-zone-locations.js";
import { isValidTimeZone } from "../../src/shared/transport-duration.mjs";

test("resolves city and country searches without exposing the full time-zone list", () => {
  assert.equal(resolveTimeZoneLocation("Rio de Janeiro, Brazil"), "America/Sao_Paulo");
  assert.equal(resolveTimeZoneLocation("Porto Alegre, Brasil"), "America/Sao_Paulo");
  assert.equal(resolveTimeZoneLocation("London, United Kingdom"), "Europe/London");
  assert.equal(resolveTimeZoneLocation("Tóquio, Japão"), "Asia/Tokyo");
  assert.equal(resolveTimeZoneLocation("Porto Ale"), "America/Sao_Paulo");
  assert.equal(resolveTimeZoneLocation("Not a real city"), "");
});

test("uses the route location to present a friendly localized time-zone choice", () => {
  assert.equal(timeZoneLocationLabel("America/Sao_Paulo", {
    locale: "en-GB",
    preferredLocation: "Aeroporto Internacional Salgado Filho",
  }), "Porto Alegre, Brazil");
  assert.equal(timeZoneLocationLabel("America/Sao_Paulo", {
    locale: "pt-BR",
    preferredLocation: "Casa Sol da Serra",
  }), "Gramado, Brasil");
  assert.equal(formatTimeZoneName("America/Sao_Paulo"), "America/Sao Paulo");
});

test("offers concise bilingual location suggestions backed by valid IANA zones", () => {
  const english = timeZoneLocationOptions("en-GB");
  const portuguese = timeZoneLocationOptions("pt-BR");
  assert.ok(english.length > 80);
  assert.equal(english.length, portuguese.length);
  assert.ok(english.some((entry) => entry.label === "Rio de Janeiro, Brazil"));
  assert.ok(portuguese.some((entry) => entry.label === "Rio de Janeiro, Brasil"));
  assert.equal(english.every((entry) => isValidTimeZone(entry.timeZone)), true);
});
