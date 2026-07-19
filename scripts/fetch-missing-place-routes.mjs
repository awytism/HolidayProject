import { setTimeout as wait } from "node:timers/promises";

const ORIGIN = { lat: -29.3872716, lon: -50.8725141 };
const USER_AGENT = "HolidayProject/2.1 distance-populator";
const DESTINATIONS = Object.freeze({
  "Josephina Café & Restaurante": "Rua Pedro Benetti, 22, Gramado, RS, Brazil",
  "Restaurante Höppner": "Rua Pedro Candiago, 364, Gramado, RS, Brazil",
  "BOSKO PIZZERIA Napoletana": "Avenida Borges de Medeiros, 2727, Gramado, RS, Brazil",
  "Resto Bar Black Lake": "Rua Vinte e Cinco de Julho, 833, Gramado, RS, Brazil",
  "Toro Gramado": "Avenida das Hortênsias, 804C, Gramado, RS, Brazil",
  "Cantina Pastasciutta": "Avenida Borges de Medeiros, 2083, Gramado, RS, Brazil",
  "Palácio dos Festivais": "Palácio dos Festivais, Gramado, RS, Brazil",
  "Igreja do Relógio": "Igreja do Relógio, Gramado, RS, Brazil",
  "Praça Major Nicoletti": "Praça Major Nicoletti, Gramado, RS, Brazil",
  "Belvedere Vale do Quilombo": "Belvedere Vale do Quilombo, Gramado, RS, Brazil",
});
const MODES = Object.freeze({ driving: "auto", cycling: "bicycle", walking: "pedestrian" });
const COORDINATE_OVERRIDES = Object.freeze({
  "Resto Bar Black Lake": { lat: -29.394615, lon: -50.8784825 },
});

const destinations = await geocodeDestinations();
const routes = Object.fromEntries(Object.keys(DESTINATIONS).map((name) => [name, {}]));
for (const [mode, costing] of Object.entries(MODES)) {
  const results = await fetchMatrix(costing, destinations);
  results.forEach((result, index) => Object.assign(routes[destinations[index].name], {
    [`${mode}Distance`]: formatDistance(result.distance),
    [`${mode}Time`]: formatDuration(result.time),
  }));
}
console.log(JSON.stringify({ destinations, routes }, null, 2));

async function geocodeDestinations() {
  const results = [];
  for (const [name, query] of Object.entries(DESTINATIONS)) {
    if (COORDINATE_OVERRIDES[name]) {
      results.push({ name, ...COORDINATE_OVERRIDES[name] });
      continue;
    }
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", query);
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) throw new Error(`Geocoding failed for ${name}: ${response.status}`);
    const [match] = await response.json();
    if (!match) throw new Error(`No geocoding result for ${name}`);
    results.push({ name, lat: Number(match.lat), lon: Number(match.lon) });
    await wait(1100);
  }
  return results;
}

async function fetchMatrix(costing, destinations) {
  const url = new URL("https://valhalla1.openstreetmap.de/sources_to_targets");
  url.searchParams.set("json", JSON.stringify({
    sources: [ORIGIN],
    targets: destinations.map(({ lat, lon }) => ({ lat, lon })),
    costing,
    units: "kilometers",
  }));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Routing failed for ${costing}: ${response.status}`);
  const payload = await response.json();
  const [results] = payload.sources_to_targets ?? [];
  if (results?.length !== destinations.length) throw new Error(`Incomplete ${costing} route matrix`);
  return results;
}

function formatDistance(value) {
  const precision = value < 10 ? 1 : 0;
  return `${Number(value).toFixed(precision)} km`;
}

function formatDuration(seconds) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} h${remainder ? ` ${remainder} m` : ""}` : `${minutes} m`;
}
