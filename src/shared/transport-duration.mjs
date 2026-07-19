const CLOCK_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const UNCONFIRMED_TIME = /^(?:tbd|to confirm|time to confirm|a confirmar|hor[aá]rio a confirmar)$/iu;

export const DEFAULT_TRANSPORT_TIME_ZONE = "America/Sao_Paulo";

export function deriveTransportDuration(data) {
  const timing = transportTiming(data);
  if (!timing) return "0 m";
  const { departure, arrival } = timing;
  if (arrival < departure) return "0 m";
  return formatElapsedMinutes(Math.round((arrival - departure) / 60_000));
}

export function transportEndpointDate(data, endpoint) {
  const explicit = String(data?.[`${endpoint}Date`] ?? "").trim();
  return explicit || String(data?.date ?? "").trim();
}

export function transportEndpointTimeZone(data, endpoint) {
  const value = String(data?.[`${endpoint}TimeZone`] ?? "").trim();
  return isValidTimeZone(value) ? value : DEFAULT_TRANSPORT_TIME_ZONE;
}

export function isValidTimeZone(value) {
  const zone = String(value ?? "").trim();
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function isConfirmedClockTime(value) {
  const time = String(value ?? "").trim();
  return CLOCK_TIME.test(time) && !UNCONFIRMED_TIME.test(time);
}

function isClockTime(value) {
  return CLOCK_TIME.test(value) && !UNCONFIRMED_TIME.test(value);
}

function transportTiming(data) {
  const times = confirmedEndpointTimes(data);
  if (!times) return null;
  const { departureTime, arrivalTime } = times;
  const departureDate = transportEndpointDate(data, "departure");
  const arrivalDate = transportEndpointDate(data, "arrival");
  const departureZone = transportEndpointTimeZone(data, "departure");
  const arrivalZone = transportEndpointTimeZone(data, "arrival");
  const departure = zonedDateTimeToEpoch(departureDate, departureTime, departureZone);
  let arrival = zonedDateTimeToEpoch(arrivalDate, arrivalTime, arrivalZone);
  if (departure === null || arrival === null) return null;
  if (shouldInferNextDay(data, departure, arrival)) {
    arrival = zonedDateTimeToEpoch(addIsoDays(arrivalDate, 1), arrivalTime, arrivalZone);
  }
  return arrival === null ? null : { departure, arrival };
}

function confirmedEndpointTimes(data) {
  const departureTime = String(data?.departure ?? "").trim();
  if (!isClockTime(departureTime)) return null;
  const arrivalTime = String(data?.arrival ?? "").trim();
  if (!isClockTime(arrivalTime)) return null;
  return { departureTime, arrivalTime };
}

function shouldInferNextDay(data, departure, arrival) {
  if (arrival >= departure) return false;
  return !String(data?.arrivalDate ?? "").trim();
}

function zonedDateTimeToEpoch(dateValue, timeValue, timeZone) {
  const date = ISO_DATE.exec(dateValue);
  const time = /^(\d{2}):(\d{2})$/.exec(timeValue);
  if (!date || !time || !isValidTimeZone(timeZone)) return null;
  const localAsUtc = Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3]), Number(time[1]), Number(time[2]));
  let offset = timeZoneOffset(localAsUtc, timeZone);
  let epoch = localAsUtc - offset;
  const correctedOffset = timeZoneOffset(epoch, timeZone);
  if (correctedOffset !== offset) {
    offset = correctedOffset;
    epoch = localAsUtc - offset;
  }
  return Number.isFinite(epoch) ? epoch : null;
}

function timeZoneOffset(epoch, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(epoch));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const representedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return representedAsUtc - Math.floor(epoch / 1_000) * 1_000;
}

function addIsoDays(value, days) {
  const match = ISO_DATE.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return date.toISOString().slice(0, 10);
}

function formatElapsedMinutes(totalMinutes) {
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days} d`);
  if (hours) parts.push(`${hours} h`);
  if (minutes || !parts.length) parts.push(`${minutes} m`);
  return parts.join(" ");
}
