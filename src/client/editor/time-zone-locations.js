import { isValidTimeZone } from "../../shared/transport-duration.mjs";

const LOCATIONS = Object.freeze([
  location("Gramado", "Brazil", "Brasil", "America/Sao_Paulo", ["Casa Sol da Serra", "Casa do Sol"]),
  location("Porto Alegre", "Brazil", "Brasil", "America/Sao_Paulo", ["POA", "Salgado Filho"]),
  location("Rio de Janeiro", "Brazil", "Brasil", "America/Sao_Paulo", ["Rio", "GIG", "Antônio Carlos Jobim", "Antonio Carlos Jobim"]),
  location("São Paulo", "Brazil", "Brasil", "America/Sao_Paulo", ["Sao Paulo", "GRU"]),
  location("Brasília", "Brazil", "Brasil", "America/Sao_Paulo", ["Brasilia"]),
  location("Belo Horizonte", "Brazil", "Brasil", "America/Sao_Paulo"),
  location("Curitiba", "Brazil", "Brasil", "America/Sao_Paulo"),
  location("Florianópolis", "Brazil", "Brasil", "America/Sao_Paulo", ["Florianopolis"]),
  location("Foz do Iguaçu", "Brazil", "Brasil", "America/Sao_Paulo", ["Foz do Iguacu"]),
  location("Salvador", "Brazil", "Brasil", "America/Bahia"),
  location("Recife", "Brazil", "Brasil", "America/Recife"),
  location("Fortaleza", "Brazil", "Brasil", "America/Fortaleza"),
  location("Manaus", "Brazil", "Brasil", "America/Manaus"),
  location("Cuiabá", "Brazil", "Brasil", "America/Cuiaba", ["Cuiaba"]),
  location("Campo Grande", "Brazil", "Brasil", "America/Campo_Grande"),
  location("Rio Branco", "Brazil", "Brasil", "America/Rio_Branco"),
  location("Fernando de Noronha", "Brazil", "Brasil", "America/Noronha"),
  location("London", "United Kingdom", "Reino Unido", "Europe/London", ["UK"]),
  location("Dublin", "Ireland", "Irlanda", "Europe/Dublin"),
  location("Lisbon", "Portugal", "Portugal", "Europe/Lisbon", ["Lisboa"]),
  location("Paris", "France", "França", "Europe/Paris", ["Franca"]),
  location("Madrid", "Spain", "Espanha", "Europe/Madrid"),
  location("Barcelona", "Spain", "Espanha", "Europe/Madrid"),
  location("Berlin", "Germany", "Alemanha", "Europe/Berlin", ["Berlim"]),
  location("Munich", "Germany", "Alemanha", "Europe/Berlin", ["München", "Munique"]),
  location("Rome", "Italy", "Itália", "Europe/Rome", ["Roma", "Italia"]),
  location("Milan", "Italy", "Itália", "Europe/Rome", ["Milano", "Milão"]),
  location("Amsterdam", "Netherlands", "Países Baixos", "Europe/Amsterdam"),
  location("Brussels", "Belgium", "Bélgica", "Europe/Brussels", ["Bruxelas"]),
  location("Zurich", "Switzerland", "Suíça", "Europe/Zurich", ["Zürich", "Suica"]),
  location("Vienna", "Austria", "Áustria", "Europe/Vienna", ["Viena"]),
  location("Athens", "Greece", "Grécia", "Europe/Athens", ["Atenas"]),
  location("Istanbul", "Turkey", "Turquia", "Europe/Istanbul"),
  location("Reykjavík", "Iceland", "Islândia", "Atlantic/Reykjavik", ["Reykjavik"]),
  location("Oslo", "Norway", "Noruega", "Europe/Oslo"),
  location("Stockholm", "Sweden", "Suécia", "Europe/Stockholm", ["Estocolmo"]),
  location("Copenhagen", "Denmark", "Dinamarca", "Europe/Copenhagen", ["Copenhague"]),
  location("Helsinki", "Finland", "Finlândia", "Europe/Helsinki"),
  location("Warsaw", "Poland", "Polônia", "Europe/Warsaw", ["Varsóvia"]),
  location("Prague", "Czechia", "Tchéquia", "Europe/Prague", ["Praga"]),
  location("Budapest", "Hungary", "Hungria", "Europe/Budapest"),
  location("Bucharest", "Romania", "Romênia", "Europe/Bucharest", ["Bucareste"]),
  location("New York", "United States", "Estados Unidos", "America/New_York", ["NYC", "USA"]),
  location("Miami", "United States", "Estados Unidos", "America/New_York", ["USA"]),
  location("Boston", "United States", "Estados Unidos", "America/New_York", ["USA"]),
  location("Washington, DC", "United States", "Estados Unidos", "America/New_York", ["Washington DC", "USA"]),
  location("Chicago", "United States", "Estados Unidos", "America/Chicago", ["USA"]),
  location("Denver", "United States", "Estados Unidos", "America/Denver", ["USA"]),
  location("Los Angeles", "United States", "Estados Unidos", "America/Los_Angeles", ["LA", "USA"]),
  location("San Francisco", "United States", "Estados Unidos", "America/Los_Angeles", ["USA"]),
  location("Seattle", "United States", "Estados Unidos", "America/Los_Angeles", ["USA"]),
  location("Anchorage", "United States", "Estados Unidos", "America/Anchorage", ["Alaska", "USA"]),
  location("Honolulu", "United States", "Estados Unidos", "Pacific/Honolulu", ["Hawaii", "USA"]),
  location("Toronto", "Canada", "Canadá", "America/Toronto", ["Canada"]),
  location("Vancouver", "Canada", "Canadá", "America/Vancouver", ["Canada"]),
  location("Mexico City", "Mexico", "México", "America/Mexico_City", ["Ciudad de Mexico", "Cidade do Mexico"]),
  location("Cancún", "Mexico", "México", "America/Cancun", ["Cancun"]),
  location("Buenos Aires", "Argentina", "Argentina", "America/Argentina/Buenos_Aires"),
  location("Santiago", "Chile", "Chile", "America/Santiago"),
  location("Lima", "Peru", "Peru", "America/Lima"),
  location("Bogotá", "Colombia", "Colômbia", "America/Bogota", ["Bogota"]),
  location("Montevideo", "Uruguay", "Uruguai", "America/Montevideo"),
  location("Casablanca", "Morocco", "Marrocos", "Africa/Casablanca"),
  location("Cairo", "Egypt", "Egito", "Africa/Cairo"),
  location("Johannesburg", "South Africa", "África do Sul", "Africa/Johannesburg"),
  location("Cape Town", "South Africa", "África do Sul", "Africa/Johannesburg", ["Cidade do Cabo"]),
  location("Nairobi", "Kenya", "Quênia", "Africa/Nairobi"),
  location("Lagos", "Nigeria", "Nigéria", "Africa/Lagos"),
  location("Dubai", "United Arab Emirates", "Emirados Árabes Unidos", "Asia/Dubai", ["UAE"]),
  location("Doha", "Qatar", "Catar", "Asia/Qatar"),
  location("Riyadh", "Saudi Arabia", "Arábia Saudita", "Asia/Riyadh", ["Riad"]),
  location("Tel Aviv", "Israel", "Israel", "Asia/Jerusalem"),
  location("Delhi", "India", "Índia", "Asia/Kolkata", ["New Delhi", "Nova Deli"]),
  location("Mumbai", "India", "Índia", "Asia/Kolkata", ["Bombay"]),
  location("Colombo", "Sri Lanka", "Sri Lanka", "Asia/Colombo"),
  location("Kathmandu", "Nepal", "Nepal", "Asia/Kathmandu", ["Catmandu"]),
  location("Bangkok", "Thailand", "Tailândia", "Asia/Bangkok"),
  location("Ho Chi Minh City", "Vietnam", "Vietnã", "Asia/Ho_Chi_Minh", ["Saigon"]),
  location("Kuala Lumpur", "Malaysia", "Malásia", "Asia/Kuala_Lumpur"),
  location("Singapore", "Singapore", "Singapura", "Asia/Singapore"),
  location("Jakarta", "Indonesia", "Indonésia", "Asia/Jakarta"),
  location("Beijing", "China", "China", "Asia/Shanghai", ["Pequim"]),
  location("Shanghai", "China", "China", "Asia/Shanghai", ["Xangai"]),
  location("Hong Kong", "Hong Kong", "Hong Kong", "Asia/Hong_Kong"),
  location("Tokyo", "Japan", "Japão", "Asia/Tokyo", ["Tóquio"]),
  location("Seoul", "South Korea", "Coreia do Sul", "Asia/Seoul", ["Seul"]),
  location("Manila", "Philippines", "Filipinas", "Asia/Manila"),
  location("Sydney", "Australia", "Austrália", "Australia/Sydney", ["Sidney"]),
  location("Melbourne", "Australia", "Austrália", "Australia/Melbourne"),
  location("Brisbane", "Australia", "Austrália", "Australia/Brisbane"),
  location("Perth", "Australia", "Austrália", "Australia/Perth"),
  location("Auckland", "New Zealand", "Nova Zelândia", "Pacific/Auckland"),
  location("Suva", "Fiji", "Fiji", "Pacific/Fiji"),
]);

export function timeZoneLocationOptions(locale = "en-GB") {
  return LOCATIONS.map((entry) => ({
    label: locationLabel(entry, locale),
    timeZone: entry.timeZone,
  }));
}

export function resolveTimeZoneLocation(value, { currentTimeZone = "" } = {}) {
  const query = normalize(value);
  if (!query) return "";
  if (isValidTimeZone(value)) return value;
  const exact = LOCATIONS.filter((entry) => entry.searchValues.includes(query));
  if (exact.length) return uniqueTimeZone(exact);
  if (isValidTimeZone(currentTimeZone)) {
    const currentMatches = LOCATIONS.filter((entry) => entry.timeZone === currentTimeZone);
    if (currentMatches.some((entry) => entry.searchValues.some((candidate) => candidate.includes(query)))) return currentTimeZone;
  }
  const partial = LOCATIONS.filter((entry) => entry.searchValues.some((candidate) => candidate.startsWith(query)));
  return uniqueTimeZone(partial);
}

export function timeZoneLocationLabel(timeZone, { locale = "en-GB", preferredLocation = "" } = {}) {
  const matches = LOCATIONS.filter((entry) => entry.timeZone === timeZone);
  if (!matches.length) return String(timeZone ?? "").replaceAll("_", " ");
  const preferred = normalize(preferredLocation);
  const match = preferred
    ? matches.find((entry) => entry.cityValues.some((value) => preferred.includes(value)))
    : null;
  return locationLabel(match ?? matches[0], locale);
}

export function formatTimeZoneName(timeZone) {
  return String(timeZone ?? "").replaceAll("_", " ");
}

function location(city, country, countryPt, timeZone, aliases = []) {
  const cityValues = [city, ...aliases].map(normalize);
  const countryValues = [country, countryPt].map(normalize);
  const searchValues = new Set([normalize(timeZone), ...cityValues]);
  for (const cityValue of cityValues) {
    for (const countryValue of countryValues) searchValues.add(`${cityValue} ${countryValue}`);
  }
  return Object.freeze({ city, country, countryPt, timeZone, cityValues, searchValues: Object.freeze([...searchValues]) });
}

function locationLabel(entry, locale) {
  return `${entry.city}, ${locale === "pt-BR" ? entry.countryPt : entry.country}`;
}

function uniqueTimeZone(entries) {
  const zones = new Set(entries.map((entry) => entry.timeZone));
  return zones.size === 1 ? [...zones][0] : "";
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}
