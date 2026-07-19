import { inclusiveDayCount } from "./date-utils.mjs";

const TRANSPORT_CARD_TYPES = new Set(["flight", "transfer"]);

export function deriveTripStats(tripDocument) {
  const meta = tripDocument?.meta ?? {};
  const transport = Array.isArray(tripDocument?.sections?.transport)
    ? tripDocument.sections.transport
    : [];
  return {
    days: inclusiveDayCount(meta.startDate, meta.endDate),
    legs: transport.filter((block) => TRANSPORT_CARD_TYPES.has(block?.type)).length,
  };
}

export function synchronizeTripStats(tripDocument) {
  const stats = deriveTripStats(tripDocument);
  tripDocument.meta.days = stats.days === null ? "" : String(stats.days);
  tripDocument.meta.legs = String(stats.legs);
  return stats;
}
