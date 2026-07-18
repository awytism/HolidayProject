import { agendaConfig } from "./agenda.js";
import { stayConfig } from "./stay.js";
import { transportConfig } from "./transport.js";

const configs = { transport: transportConfig, stay: stayConfig, agenda: agendaConfig };

export function getSectionConfig(section) {
  const config = configs[section];
  if (!config) throw new TypeError(`Unknown section: ${section}`);
  return config;
}
