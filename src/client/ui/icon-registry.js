const SVG_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">';

const ACTION_ICON_BODIES = Object.freeze({
  "arrow-down": '<path d="M12 4v16m-6-6 6 6 6-6"/>',
  "arrow-left": '<path d="M20 12H4m6-6-6 6 6 6"/>',
  "arrow-right": '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  "arrow-up": '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  bookmark: '<path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4V4Z"/><path d="M9 7h6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  "external-link": '<path d="M14 5h5v5M10 14 19 5M19 14v5H5V5h5"/>',
  file: '<path d="M6 2h8l4 4v16H6V2Z"/><path d="M14 2v5h5"/>',
  grip: '<circle cx="8" cy="6" r="1"/><circle cx="16" cy="6" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="18" r="1"/><circle cx="16" cy="18" r="1"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m4 17 5-5 4 4 2-2 5 5"/>',
  "map-pin": '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h3a6 6 0 0 0 0-12h-3Z"/><circle cx="7.5" cy="10" r=".7"/><circle cx="9" cy="6.5" r=".7"/><circle cx="14" cy="6" r=".7"/>',
  "panel-plus": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16m5-8h5m-2.5-2.5v5"/>',
  pencil: '<path d="m4 16-.8 4.8L8 20 19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
  replace: '<path d="M20 7h-7a5 5 0 0 0-5 5v1m12-6-3-3m3 3-3 3M4 17h7a5 5 0 0 0 5-5v-1m-12 6 3 3m-3-3 3-3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 20h16"/>',
  "zoom-in": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v6m-3-3h6"/>',
  "zoom-out": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M7.5 10.5h6"/>',
});

const TRUSTED_ICON_BODIES = Object.freeze({
  accessibility: '<circle cx="12" cy="4" r="2"/><path d="M5 9h14M12 6v7m0 0-4 7m4-7 4 7"/>',
  baby: '<circle cx="12" cy="8" r="4"/><path d="M8 8h8M6 22v-5a6 6 0 0 1 12 0v5M10 12v3h4v-3"/>',
  balcony: '<path d="M4 21V5h16v16M4 12h16M7 12v9m5-9v9m5-9v9"/>',
  bath: '<path d="M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3ZM6 12V6a3 3 0 0 1 6 0"/><path d="M8 20v2m8-2v2"/>',
  bed: '<path d="M3 20v-9h18v9M3 16h18M6 11V7h5a3 3 0 0 1 3 3v1"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
  bike: '<circle cx="6" cy="17" r="4"/><circle cx="18" cy="17" r="4"/><path d="m6 17 4-8 4 8h-4l5-9h3M8 9h4"/>',
  blinds: '<path d="M5 3h14v18H5zM5 8h14M5 13h14M5 18h14"/>',
  bolt: '<path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>',
  book: '<path d="M4 5a4 4 0 0 1 4-2h4v18H8a4 4 0 0 0-4 2V5Zm16 0a4 4 0 0 0-4-2h-4v18h4a4 4 0 0 1 4 2V5Z"/>',
  bottle: '<path d="M9 3h6M10 3v4l-2 3v11h8V10l-2-3V3M8 13h8"/>',
  box: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3v3m8-3v3M8 11h8"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3m-13 6h18M10 13v2h4v-2"/>',
  building: '<path d="M4 21V5l8-3 8 3v16M8 8h2m4 0h2M8 12h2m4 0h2M8 16h2m4 0h2M10 21v-3h4v3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  camera: '<path d="M4 7h4l2-3h4l2 3h4v13H4V7Z"/><circle cx="12" cy="13" r="4"/>',
  car: '<path d="m4 15 2-7h12l2 7v5H4v-5Zm2 0h12M7 20v2m10-2v2"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/>',
  walking: '<path d="M12 4a1 1 0 1 0 2 0a1 1 0 1 0-2 0M7 21l3-4M16 21l-2-4-3-3 1-6M6 12l2-3 4-1 3 3 3 1"/>',
  seat: '<path d="M5 11V8a3 3 0 0 1 6 0v4h6a3 3 0 0 1 3 3v3H8a4 4 0 0 1-4-4v-3h1Z"/><path d="M8 18v3m11-3v3M11 9h-1"/>',
  "airline-seat": '<path d="M7 2.5c-1.4 0-2.4 1.3-2.1 2.7l2.4 10.7c.2 1.1 1.2 1.9 2.4 1.9H19a2.6 2.6 0 0 0 0-5.2h-8L9 4.5a2 2 0 0 0-2-2Z"/><path d="M9.8 8.2h5.3a3.5 3.5 0 0 1 3.5 3.5h-7.9M10.5 17.8 8 22h10l-2.5-4.2"/>',
  chair: '<path d="M6 13h12v7H6v-7Zm2 7v2m8-2v2M8 13V7a4 4 0 0 1 8 0v6"/>',
  clothesline: '<path d="M3 5v16m18-16v16M3 8c6 3 12 3 18 0M8 10v5h4v-4m3-1v5h4v-6"/>',
  cloud: '<path d="M7 18h11a4 4 0 0 0 .5-8A6 6 0 0 0 7 8a5 5 0 0 0 0 10Z"/><path d="M9 13h6"/>',
  coffee: '<path d="M5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9Zm12 2h1a3 3 0 0 1 0 6h-2M8 3v3m4-3v3m4-3v3"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 2 3 3 6 3m6-7v3M8 14c0 2 3 3 6 3s6-1 6-3m-12 0v4c0 2 3 3 6 3s6-1 6-3v-4"/>',
  cookware: '<path d="M5 10h14v5a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-5Zm3-4h8M3 10h18"/>',
  crib: '<path d="M4 5v17m16-17v17M4 8h16v10H4M8 8v10m4-10v10m4-10v10"/>',
  cup: '<path d="M7 3h10l-1 18H8L7 3Zm1 5h8M10 12h4"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/>',
  dining: '<circle cx="12" cy="9" r="6"/><path d="M4 21v-3a8 8 0 0 1 16 0v3M12 15v6"/>',
  dishwasher: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 7h14M9 5h.01M12 5h.01"/><circle cx="12" cy="14" r="4"/>',
  door: '<path d="M5 21h14M7 21V3h10v18M13 12h.01"/>',
  droplets: '<path d="M8 3 4 9a4 4 0 1 0 8 0L8 3Zm8 7-3 5a3 3 0 1 0 6 0l-3-5Z"/>',
  dryer: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M4 7h16M8 5h.01"/><circle cx="12" cy="14" r="5"/><path d="M9 14c2-2 4 2 6 0"/>',
  elevator: '<rect x="5" y="2" width="14" height="20" rx="1"/><path d="M12 2v20m-3-16 3-2 3 2M9 18l3 2 3-2"/>',
  ethernet: '<path d="M8 3h8v7H8V3Zm4 7v4M5 21v-4h14v4M5 17v-3h14v3"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c-2-7 5-8 6-4 1 3-2 5-4 6m-4 0c-7-2-5-9-1-8 3 1 3 5 3 6m0 4c2 7-5 8-6 4-1-3 2-5 4-6m4 0c7 2 5 9 1 8-3-1-3-5-3-6"/>',
  fire: '<path d="M12 22c5 0 8-3 8-8 0-4-3-8-6-11 0 4-2 6-4 8 0-2-1-3-2-4-2 2-4 5-4 8 0 4 3 7 8 7Z"/><path d="M9 18c0-2 1-3 3-5 0 2 3 3 3 5a3 3 0 0 1-6 0Z"/>',
  "first-aid": '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M9 6V3h6v3m-3 4v6m-3-3h6"/>',
  gamepad: '<path d="M8 8h8a6 6 0 0 1 5 9l-1 2a2 2 0 0 1-3 0l-2-3H9l-2 3a2 2 0 0 1-3 0l-1-2A6 6 0 0 1 8 8Z"/><path d="M7 11v4m-2-2h4m7-1h.01m2 2h.01"/>',
  garage: '<path d="M3 21V8l9-5 9 5v13M6 21v-9h12v9M6 15h12"/>',
  gate: '<path d="M4 22V4m16 18V4M4 8h16M4 18h16M8 8v10m8-10v10"/>',
  "grab-bars": '<path d="M5 20V8a4 4 0 0 1 4-4h10M9 20V9a1 1 0 0 1 1-1h9"/><circle cx="5" cy="20" r="1"/><circle cx="9" cy="20" r="1"/>',
  grill: '<path d="M5 9h14a7 7 0 0 1-14 0Zm7 7v6m-4 0 4-6 4 6M8 5h.01M12 3h.01M16 5h.01"/>',
  "hair-dryer": '<path d="M4 7h10l5-3v10l-5-3H4V7Zm7 4-2 10H5l2-10"/>',
  hammock: '<path d="M3 4v17m18-17v17M3 7c4 12 14 12 18 0M7 17l-2 4m12-4 2 4"/>',
  home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
  host: '<circle cx="12" cy="7" r="4"/><path d="M4 22a8 8 0 0 1 16 0M18 5l2-2m-2 6 3 1"/>',
  "hot-tub": '<path d="M4 12h16v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-4ZM7 3c-2 3 2 4 0 7m5-7c-2 3 2 4 0 7m5-7c-2 3 2 4 0 7"/>',
  iron: '<path d="M4 18h16l-3-9H9a5 5 0 0 0-5 5v4Zm5-9V5h5a3 3 0 0 1 3 3v1"/>',
  kettle: '<path d="M6 8h11v9a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4V8Zm11 2h1a3 3 0 0 1 0 6h-1M8 5h7M9 2h5"/>',
  key: '<circle cx="8" cy="15" r="5"/><path d="m12 11 8-8m-3 3 3 3m-6 0 2 2"/>',
  kitchen: '<path d="M4 3v8m4-8v8M4 7h4m-2 4v10M15 3v18m0-18c4 1 5 4 5 8h-5"/>',
  leaf: '<path d="M20 4C10 4 4 9 4 16c0 3 2 5 5 5 7 0 11-7 11-17Z"/><path d="M5 20c3-5 7-8 12-11"/>',
  lockbox: '<rect x="5" y="8" width="14" height="13" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2m-7 5h.01m3 0h.01m3 0h.01m-6 4h6"/>',
  luggage: '<rect x="6" y="6" width="12" height="14" rx="2"/><path d="M9 6V3h6v3M9 10v6m6-6v6M8 22h.01M16 22h.01"/>',
  "map-pin": '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  moon: '<path d="M20 15a8 8 0 0 1-11-11 9 9 0 1 0 11 11Z"/>',
  mountain: '<path d="m3 20 7-13 4 7 2-3 5 9H3Z"/><path d="m8 11 2 2 2-2"/>',
  oven: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M4 8h16M8 5h.01M12 5h.01M16 5h.01"/><circle cx="12" cy="15" r="4"/>',
  path: '<path d="M9 22c6-4-2-7 4-11 3-2 2-5 1-9M4 22h16"/>',
  paw: '<circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/><circle cx="5" cy="13" r="2"/><circle cx="19" cy="13" r="2"/><path d="M12 11c-4 0-7 5-5 8 2 2 4 0 5 0s3 2 5 0c2-3-1-8-5-8Z"/>',
  pillow: '<rect x="4" y="6" width="16" height="12" rx="4"/><path d="M8 9c2 2 2 4 0 6m8-6c-2 2-2 4 0 6"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/>',
  pool: '<path d="M3 9c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2M3 15c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2M7 9V4h5m0 5V4h5"/>',
  safe: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8v4l3 2M6 7h.01M6 17h.01"/>',
  salt: '<path d="M8 8h8l1 13H7L8 8Zm1-5h6l1 5H8l1-5ZM10 5h.01M14 5h.01"/>',
  sauna: '<path d="M4 21V9h16v12M4 15h16M8 15v6m8-6v6M8 3c-2 2 2 3 0 5m5-5c-2 2 2 3 0 5"/>',
  shield: '<path d="M12 22S20 18 20 9V4l-8-2-8 2v5c0 9 8 13 8 13Z"/><path d="m9 12 2 2 4-5"/>',
  shower: '<path d="M5 21V7a4 4 0 0 1 8 0v1m-3 0h6l2 4H8l2-4Zm0 8v1m4-1v2m4-2v1"/>',
  smoking: '<path d="M3 15h14v4H3v-4Zm14 0h2v4h-2M8 11c0-3 5-2 5-5 0-2-1-3-3-3m4 8c0-2 4-2 4-5"/>',
  snowflake: '<path d="M12 2v20M4 6l16 12M20 6 4 18M9 4l3 3 3-3M9 20l3-3 3 3"/>',
  speaker: '<path d="M5 9h4l5-4v14l-5-4H5V9Zm12 1c2 1 2 3 0 4m2-7c4 3 4 7 0 10"/>',
  spray: '<path d="M9 8h7l2 4v9H7v-9l2-4Zm1-4h5v4h-5V4Zm5 0 3 1m2-1h1m-2 4h2"/>',
  thermometer: '<path d="M10 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><path d="M13 7v10"/>',
  towel: '<path d="M6 3h12v18H6V3Zm3 4h6M9 11h6M9 15h6"/>',
  toy: '<path d="m12 3 2.5 5 5.5.8-4 4 1 5.7-5-2.7-5 2.7 1-5.7-4-4 5.5-.8L12 3Z"/>',
  tree: '<path d="m12 2-5 7h3l-5 7h6v6h2v-6h6l-5-7h3l-5-7Z"/>',
  tv: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="m8 2 4 4 4-4M8 23h8"/>',
  utensils: '<path d="M5 3v7m3-7v7M5 7h3m-1.5 3v11M15 3v18m0-18c4 1 5 4 5 8h-5"/>',
  wardrobe: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M9 12h.01m6 0h.01"/>',
  washer: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M4 7h16M8 5h.01M11 5h.01"/><circle cx="12" cy="14" r="5"/><path d="M9 13c2 2 4-2 6 0"/>',
  waves: '<path d="M3 8c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2M3 14c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2M3 20c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2"/>',
  wifi: '<path d="M3 9a14 14 0 0 1 18 0M6 13a9 9 0 0 1 12 0m-9 4a5 5 0 0 1 6 0"/><circle cx="12" cy="21" r="1"/>',
});

const ICON_ALIASES = Object.freeze({
  check: "shield",
  game: "gamepad",
  outdoors: "tree",
  parking: "car",
  sparkles: "toy",
  view: "mountain",
  "washing-machine": "washer",
});

export const ICON_REGISTRY = Object.freeze(Object.fromEntries(
  [...Object.entries(TRUSTED_ICON_BODIES), ...Object.entries(ICON_ALIASES).map(([key, target]) => [key, TRUSTED_ICON_BODIES[target]])]
    .map(([key, body]) => [key, `${SVG_OPEN}${body}</svg>`]),
));

export const TRUSTED_ICON_KEYS = Object.freeze(Object.keys(ICON_REGISTRY));

export function hasTrustedIcon(iconKey) {
  return typeof iconKey === "string" && Object.hasOwn(ICON_REGISTRY, iconKey);
}

export function renderIcon(iconKey) {
  return hasTrustedIcon(iconKey) ? ICON_REGISTRY[iconKey] : "";
}

export function renderActionIcon(iconKey) {
  const body = ACTION_ICON_BODIES[iconKey];
  return body ? `${SVG_OPEN}${body}</svg>` : "";
}
