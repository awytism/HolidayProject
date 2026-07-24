const SVG_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">';

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
  plus: '<path d="M12 5v14M5 12h14"/>',
  pencil: '<path d="m4 16-.8 4.8L8 20 19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
  replace: '<path d="M20 7h-7a5 5 0 0 0-5 5v1m12-6-3-3m3 3-3 3M4 17h7a5 5 0 0 0 5-5v-1m-12 6 3 3m-3-3 3-3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 20h16"/>',
  "zoom-in": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v6m-3-3h6"/>',
  "zoom-out": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M7.5 10.5h6"/>',
});

const TRUSTED_ICON_BODIES = Object.freeze({
  accessibility: '<circle cx="12" cy="4" r="2"/><path d="M5 9h14M12 6v7m0 0-4 7m4-7 4 7"/>',
  airplane: '<path d="M17.8 19 16 11l3.5-3.5c1.5-1.5 2-3.5 1-4.5s-3-.5-4.5 1L12.5 7.5l-8-1.8L3 7l6.5 4L6 14.5 3.5 14 2 15.5l4 2 2 4L9.5 20 9 17.5l3.5-3.5 4 6.5 1.3-1.5Z"/>',
  "amenity-bathtub": '<path d="M3 11h18v4a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-4Z"/><path d="M18 11V6a4 4 0 0 0-8 0h3M7 20l-1 2m11-2 1 2"/>',
  "amenity-laptop": '<rect x="5" y="4" width="14" height="11" rx="1.5"/><path d="M3 19h18"/>',
  "amenity-oven": '<rect x="4" y="2" width="16" height="20" rx="1.5"/><path d="M4 8h16M7 5h.01M10.5 5h.01M14 5h.01M17 5h.01"/><rect x="7" y="11" width="10" height="8" rx="1"/>',
  "amenity-pillow": '<path d="M4 4c2 0 3 1 5 1h6c2 0 3-1 5-1 1 0 0 3 0 5v6c0 2 1 5 0 5-2 0-3-1-5-1H9c-2 0-3 1-5 1-1 0 0-3 0-5V9c0-2-1-5 0-5Z"/><path d="m4.5 4.5 3 2.5m12-2.5-3 2.5m-12 12.5 3-2.5m12 2.5-3-2.5"/>',
  "amenity-sofa": '<path d="M5 11V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4"/><path d="M5 10a3 3 0 0 0-3 3v6h20v-6a3 3 0 0 0-3-3 2 2 0 0 0-2 2v3H7v-3a2 2 0 0 0-2-2ZM5 19v2m14-2v2"/>',
  "amenity-tree": '<path d="M12 22v-8m0 3-4-4m4 4 5-5"/><path d="M7 18a5 5 0 0 1-1.5-9.8A6.5 6.5 0 0 1 18 9.5 4.5 4.5 0 0 1 17 18"/>',
  "amenity-washer": '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M4 7h16M8 4.5h.01M14 4h3"/><circle cx="12" cy="14" r="5"/><circle cx="12" cy="14" r="3.5"/>',
  baby: '<path d="M9 12h.01M15 12h.01M10 16c.6.4 1.3.6 2 .6s1.4-.2 2-.6"/><path d="M18.8 6.3A8.7 8.7 0 0 1 21 12a9 9 0 0 1-18 0 2.2 2.2 0 0 1 2.2-2.2c.3 0 .6.1.8.2A8.8 8.8 0 0 1 12 3c1.8 0 3.5.5 4.9 1.5M16.9 2.5A3.5 3.5 0 0 1 13.5 6 2.5 2.5 0 0 1 11 3.5"/>',
  balcony: '<path d="M5 13V3h14v10M12 3v10M3 13h18M4 17h16M5 13v9m4-9v9m6-9v9m4-9v9"/>',
  bath: '<path d="M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3ZM6 12V6a3 3 0 0 1 6 0"/><path d="M8 20v2m8-2v2"/>',
  bed: '<path d="M3 19V7m18 12v-6a3 3 0 0 0-3-3H3v9h18ZM7 10V7h4a3 3 0 0 1 3 3M5 19v2m14-2v2"/>',
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
  car: '<path d="M6.88 2.00 L17.47 2.08 L18.72 3.02 L19.89 5.87 L21.38 5.55 L21.88 5.91 L21.96 7.35 L21.49 7.94 L20.83 8.05 L21.49 10.95 L21.49 16.14 L21.06 16.96 L18.84 17.16 L18.33 16.92 L17.98 16.34 L17.94 14.81 L6.02 14.81 L6.02 16.26 L5.55 17.00 L3.37 17.16 L2.66 16.69 L2.51 10.71 L3.17 8.09 L2.16 7.59 L2.04 6.06 L2.63 5.55 L4.07 5.87 L5.32 2.94 L5.95 2.35Z"/><path d="M7.43 2.86 L6.80 3.13 L6.38 3.72 L4.81 7.55 L5.09 8.25 L18.76 8.29 L19.19 7.94 L17.63 3.76 L16.77 2.90Z"/><path d="M4.85 10.52 L4.54 10.79 L4.70 12.74 L7.98 12.82 L8.33 12.63 L8.41 10.95 L8.17 10.55Z"/><path d="M15.91 10.52 L15.55 10.91 L15.75 12.74 L19.03 12.82 L19.42 12.55 L19.42 10.79 L19.23 10.55Z"/>',
  walking: '<path d="M12 4a1 1 0 1 0 2 0a1 1 0 1 0-2 0M7 21l3-4M16 21l-2-4-3-3 1-6M6 12l2-3 4-1 3 3 3 1"/>',
  seat: '<path d="M5 11V8a3 3 0 0 1 6 0v4h6a3 3 0 0 1 3 3v3H8a4 4 0 0 1-4-4v-3h1Z"/><path d="M8 18v3m11-3v3M11 9h-1"/>',
  "airline-seat": '<path d="M7 2.5c-1.4 0-2.4 1.3-2.1 2.7l2.4 10.7c.2 1.1 1.2 1.9 2.4 1.9H19a2.6 2.6 0 0 0 0-5.2h-8L9 4.5a2 2 0 0 0-2-2Z"/><path d="M9.8 8.2h5.3a3.5 3.5 0 0 1 3.5 3.5h-7.9M10.5 17.8 8 22h10l-2.5-4.2"/>',
  chair: '<path d="M6 13h12v7H6v-7Zm2 7v2m8-2v2M8 13V7a4 4 0 0 1 8 0v6"/>',
  clothesline: '<path d="M3 5v16m18-16v16M3 8c6 3 12 3 18 0M8 10v5h4v-4m3-1v5h4v-6"/>',
  clipboard: '<rect x="4" y="4" width="16" height="18" rx="2"/><path d="M9 4V2h6v2M8 9h8m-8 5h8m-8 5h5"/>',
  cloud: '<path d="M7 19h11a4 4 0 0 0 .7-7.9A6.5 6.5 0 0 0 6.4 9.5 4.8 4.8 0 0 0 7 19Z"/>',
  coffee: '<path d="M5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9Zm12 2h1a3 3 0 0 1 0 6h-2M8 3v3m4-3v3m4-3v3"/>',
  coins: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.8-.7-1.9-1.1-3.2-1.1-1.8 0-3.1.9-3.1 2.3 0 3.5 6.6 1.5 6.6 4.8 0 1.4-1.4 2.4-3.4 2.4-1.5 0-2.8-.5-3.7-1.4M12.3 5v14"/>',
  cookware: '<path d="M5 10h14v5a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-5Zm3-4h8M3 10h18"/>',
  crib: '<path d="M4 5v17m16-17v17M4 8h16v10H4M8 8v10m4-10v10m4-10v10"/>',
  cup: '<path d="M7 3h10l-1 18H8L7 3Zm1 5h8M10 12h4"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/>',
  dining: '<circle cx="12" cy="12" r="5"/><path d="M4 3v7m3-7v7M4 7h3m-1.5 3v11M19 3v18m0-18c-3 2-3 7 0 9"/>',
  dishwasher: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 7h14M9 5h.01M12 5h.01"/><circle cx="12" cy="14" r="4"/>',
  door: '<path d="M5 21h14M7 21V3h10v18M13 12h.01"/>',
  droplets: '<path d="M8 3 4 9a4 4 0 1 0 8 0L8 3Zm8 7-3 5a3 3 0 1 0 6 0l-3-5Z"/>',
  dryer: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M4 7h16M8 5h.01"/><circle cx="12" cy="14" r="5"/><path d="M9 14c2-2 4 2 6 0"/>',
  elevator: '<rect x="5" y="2" width="14" height="20" rx="1"/><path d="M12 2v20m-3-16 3-2 3 2M9 18l3 2 3-2"/>',
  ethernet: '<path d="M8 3h8v7H8V3Zm4 7v4M5 21v-4h14v4M5 17v-3h14v3"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c-1-5 0-8 3-8s4 4 1 7l-2 2m0 3c5-1 8 0 8 3s-4 4-7 1l-2-2m-3-2c1 5 0 8-3 8s-4-4-1-7l2-2m2-3c-5 1-8 0-8-3s4-4 7-1l2 2"/>',
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
  "hot-tub": '<path d="M4 12h16v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-4Z"/><path d="M4 15c2-1 3 1 5 0s3-1 5 0 3 1 6 0"/><circle cx="7" cy="8" r="1"/><circle cx="12" cy="6" r="1"/><circle cx="17" cy="9" r="1"/>',
  iron: '<path d="M4 18h16l-3-9H9a5 5 0 0 0-5 5v4Zm5-9V5h5a3 3 0 0 1 3 3v1"/>',
  kettle: '<path d="M6 8h11v9a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4V8Zm11 2h1a3 3 0 0 1 0 6h-1M8 5h7M9 2h5"/>',
  key: '<circle cx="8" cy="15" r="5"/><path d="m12 11 8-8m-3 3 3 3m-6 0 2 2"/>',
  kitchen: '<rect x="3" y="3" width="8" height="18" rx="1"/><path d="M3 10h8M8 6v2m0 5v3"/><rect x="13" y="3" width="8" height="18" rx="1"/><path d="M13 9h8M16 6h.01M19 6h.01"/><rect x="15" y="12" width="4" height="6" rx=".5"/>',
  leaf: '<path d="M20 4C10 4 4 9 4 16c0 3 2 5 5 5 7 0 11-7 11-17Z"/><path d="M5 20c3-5 7-8 12-11"/>',
  lockbox: '<rect x="5" y="8" width="14" height="13" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2m-7 5h.01m3 0h.01m3 0h.01m-6 4h6"/>',
  luggage: '<rect x="6" y="6" width="12" height="14" rx="2"/><path d="M9 6V3h6v3M9 10v6m6-6v6M8 22h.01M16 22h.01"/>',
  "map-pin": '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  moon: '<path d="M20 15a8 8 0 0 1-11-11 9 9 0 1 0 11 11Z"/>',
  mountain: '<path d="m3 20 7-13 4 7 2-3 5 9H3Z"/><path d="m8 11 2 2 2-2"/>',
  oven: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M4 8h16M8 5h.01M12 5h.01M16 5h.01"/><circle cx="12" cy="15" r="4"/>',
  path: '<path d="M5 22c0-5 6-4 6-8s-4-4-2-8c1-2 3-3 5-4"/><path d="M10 22c0-3 5-3 5-7 0-3-3-4-2-7 1-2 3-3 5-3M4 22h7"/>',
  paw: '<circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/><circle cx="5" cy="13" r="2"/><circle cx="19" cy="13" r="2"/><path d="M12 11c-4 0-7 5-5 8 2 2 4 0 5 0s3 2 5 0c2-3-1-8-5-8Z"/>',
  pillow: '<path d="M6 5c1.5 1 3.5 1.5 6 1.5S16.5 6 18 5c1 1.5 1.5 3.8 1.5 7S19 17.5 18 19c-1.5-1-3.5-1.5-6-1.5S7.5 18 6 19c-1-1.5-1.5-3.8-1.5-7S5 6.5 6 5Z"/><path d="M8.5 8.5c1 .7 2.2 1 3.5 1s2.5-.3 3.5-1M8.5 15.5c1-.7 2.2-1 3.5-1s2.5.3 3.5 1"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/>',
  pool: '<path d="M3 9c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2M3 15c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2M7 9V4h5m0 5V4h5"/>',
  "priority-star": '<path d="m12 2.9 2.82 5.72 6.31.92-4.56 4.44 1.07 6.28L12 17.3l-5.64 2.96 1.07-6.28-4.56-4.44 6.31-.92L12 2.9Z"/>',
  safe: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8v4l3 2M6 7h.01M6 17h.01"/>',
  salt: '<path d="M8 8h8l1 13H7L8 8Zm1-5h6l1 5H8l1-5ZM10 5h.01M14 5h.01"/>',
  sauna: '<path d="M4 21V4h16v17M4 15h16M8 15v6m8-6v6M8 11h8"/><path d="M9 3c-2 2 2 3 0 7m6-7c-2 2 2 3 0 7"/>',
  shield: '<path d="M12 22S20 18 20 9V4l-8-2-8 2v5c0 9 8 13 8 13Z"/><path d="m9 12 2 2 4-5"/>',
  shower: '<path d="M5 21V7a4 4 0 0 1 8 0v1m-3 0h6l2 4H8l2-4Zm0 8v1m4-1v2m4-2v1"/>',
  smoking: '<path d="M3 15h14v4H3v-4Zm14 0h2v4h-2M8 11c0-3 5-2 5-5 0-2-1-3-3-3m4 8c0-2 4-2 4-5"/>',
  "non-smoking": '<path d="M3 15h14v4H3v-4Zm14 0h2v4h-2M8 11c0-3 5-2 5-5 0-2-1-3-3-3m4 8c0-2 4-2 4-5M3 3l18 18"/>',
  snowflake: '<path d="M12 2v20M4 6l16 12M20 6 4 18M9 4l3 3 3-3M9 20l3-3 3 3"/>',
  soda: '<path d="M7 7h10l-1 14H8L7 7Zm-1-3h12M14 7l1-5h4M9 12h6"/>',
  speaker: '<path d="M5 9h4l5-4v14l-5-4H5V9Zm12 1c2 1 2 3 0 4m2-7c4 3 4 7 0 10"/>',
  spray: '<path d="M9 8h7l2 4v9H7v-9l2-4Zm1-4h5v4h-5V4Zm5 0 3 1m2-1h1m-2 4h2"/>',
  thermometer: '<path d="M10 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><path d="M13 7v10"/>',
  toilet: '<path d="M14 12V4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v8M16 5h2"/><path d="M3 12h18c0 3.4-1.8 6.4-5 8v2H9v-2c-3.8-1.2-6-4.3-6-8Z"/>',
  towel: '<path d="M6 3h12v18H6V3Zm3 4h6M9 11h6M9 15h6"/>',
  toy: '<rect x="3" y="12" width="8" height="8" rx="1"/><rect x="13" y="12" width="8" height="8" rx="1"/><rect x="8" y="3" width="8" height="8" rx="1"/><circle cx="12" cy="7" r="2"/><path d="m7 15 2 3H5l2-3Zm10 0v3m-1.5-1.5h3"/>',
  tree: '<path d="m12 2-5 7h3l-5 7h6v6h2v-6h6l-5-7h3l-5-7Z"/>',
  tv: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="m8 2 4 4 4-4M8 23h8"/>',
  utensils: '<path d="M5 3v7m3-7v7M5 7h3m-1.5 3v11M15 3v18m0-18c4 1 5 4 5 8h-5"/>',
  wardrobe: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M9 12h.01m6 0h.01"/>',
  washer: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M4 7h16M8 5h.01M11 5h.01"/><circle cx="12" cy="14" r="5"/><path d="M9 13c2 2 4-2 6 0"/>',
  waves: '<path d="M3 8c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2M3 14c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2M3 20c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2"/>',
  wifi: '<path d="M3 9a14 14 0 0 1 18 0M6 13a9 9 0 0 1 12 0m-9 4a5 5 0 0 1 6 0"/><circle cx="12" cy="21" r="1"/>',
});

const EXPANDED_ICON_BODIES = Object.freeze({
  bus: '<path d="M4.85 2.00 L19.15 2.00 L19.77 2.59 L19.77 4.46 L21.45 4.50 L21.88 4.81 L22.00 8.09 L21.65 8.60 L21.02 8.72 L20.52 8.37 L20.40 6.06 L19.77 6.10 L19.77 18.68 L19.42 19.15 L18.84 19.27 L18.84 20.59 L18.48 21.18 L15.95 21.18 L15.59 20.71 L15.59 19.27 L8.41 19.27 L8.41 20.71 L8.05 21.18 L5.83 21.30 L5.32 20.98 L5.16 19.27 L4.58 19.15 L4.23 18.68 L4.23 6.10 L3.60 6.06 L3.60 8.05 L3.25 8.60 L2.51 8.68 L2.00 8.09 L2.04 4.97 L2.55 4.50 L4.23 4.46 L4.23 2.59Z"/><path d="M5.83 3.60 L5.79 12.35 L18.21 12.35 L18.21 3.60Z"/><path d="M7.23 15.01 L6.38 15.52 L6.10 16.57 L6.61 17.47 L7.78 17.74 L8.72 17.04 L8.84 16.02 L8.25 15.20Z"/><path d="M16.26 15.01 L15.32 15.63 L15.13 16.53 L15.63 17.47 L16.80 17.74 L17.70 17.12 L17.90 16.22 L17.39 15.28Z"/>',
  train: '<path d="M9.96 2.00 L14.04 2.00 L14.04 2.90 L17.96 2.94 L18.98 3.69 L19.18 4.20 L19.18 17.14 L18.67 17.57 L17.41 17.61 L22.00 21.14 L19.02 21.14 L15.45 17.57 L8.55 17.57 L4.98 21.14 L2.00 21.14 L6.59 17.61 L5.33 17.57 L4.82 17.14 L4.90 3.92 L5.25 3.37 L6.04 2.94 L9.96 2.90Z"/><path d="M6.67 4.55 L6.39 4.86 L6.39 11.14 L6.59 11.41 L17.57 11.25 L17.45 4.59Z"/><path d="M7.53 14.55 L6.86 14.94 L6.71 15.76 L7.10 16.35 L7.92 16.51 L8.59 15.96 L8.67 15.37 L8.35 14.78Z"/><path d="M16.24 14.55 L15.61 14.90 L15.41 15.76 L15.80 16.35 L16.63 16.51 L17.22 16.12 L17.37 15.33 L17.02 14.75Z"/>',
  subway: '<path d="M6.07 2.00 L14.07 2.00 L15.67 2.58 L16.69 3.53 L17.49 5.71 L17.49 15.60 L16.91 16.69 L15.89 17.05 L4.25 17.05 L3.02 16.47 L2.65 15.60 L2.73 5.13 L3.16 3.96 L4.18 2.80Z"/><path d="M4.84 6.07 L4.76 10.36 L9.27 10.36 L9.27 6.07Z"/><path d="M10.95 6.07 L10.87 10.36 L15.38 10.36 L15.38 6.07Z"/><path d="M5.56 12.76 L4.84 13.27 L4.76 14.15 L5.35 14.80 L6.00 14.87 L6.73 14.36 L6.87 13.64 L6.51 12.98Z"/><path d="M14.15 12.76 L13.49 13.13 L13.27 13.93 L13.78 14.73 L14.51 14.87 L15.24 14.44 L15.38 13.49 L14.95 12.91Z"/><path d="M4.84 18.22 L6.80 18.22 L6.07 19.24 L14.07 19.24 L13.35 18.22 L15.31 18.22 L18.15 22.00 L16.18 22.00 L15.24 20.69 L4.91 20.69 L3.96 22.00 L2.00 22.00Z"/>',
  tram: '<path d="M3.56 2.00 L13.48 2.00 L14.27 2.27 L14.81 2.86 L15.05 3.76 L14.54 4.38 L14.03 4.30 L13.33 3.29 L9.19 3.29 L9.19 5.05 L11.49 5.05 L12.70 5.40 L13.95 6.38 L14.66 7.70 L14.77 16.80 L14.38 17.74 L13.33 18.33 L14.66 20.95 L14.66 21.41 L14.30 21.88 L13.37 21.88 L12.78 20.98 L4.19 20.98 L3.45 21.96 L2.90 22.00 L2.47 21.69 L2.35 20.83 L3.64 18.33 L2.78 17.98 L2.20 16.92 L2.31 7.78 L3.02 6.41 L4.11 5.48 L5.52 5.01 L7.86 5.01 L7.86 3.29 L3.72 3.29 L3.37 3.48 L3.02 4.30 L2.27 4.27 L2.00 3.76 L2.23 2.86 L2.78 2.27Z"/><path d="M5.83 6.96 L4.62 7.47 L3.91 8.41 L3.72 11.69 L4.07 12.16 L12.74 12.27 L13.29 11.88 L13.33 8.76 L12.86 7.82 L12.16 7.23 L11.34 6.96Z"/><path d="M4.93 14.27 L3.91 14.81 L3.72 15.79 L4.27 16.61 L5.05 16.80 L6.02 16.26 L6.22 15.28 L5.71 14.50Z"/><path d="M12.08 14.30 L11.02 14.85 L10.83 15.83 L11.38 16.65 L12.23 16.84 L13.13 16.30 L13.33 15.32 L12.82 14.54Z"/><path d="M5.59 18.45 L4.89 19.77 L12.12 19.77 L11.45 18.45Z"/>',
  taxi: '<path d="M9.54 2.00 L14.85 2.12 L15.20 2.63 L15.20 4.15 L16.61 4.50 L17.90 5.16 L18.84 6.41 L19.54 8.05 L21.69 8.05 L21.92 8.25 L21.61 10.28 L20.59 10.44 L21.30 11.65 L21.45 13.13 L20.98 14.58 L20.36 15.28 L20.36 17.39 L20.01 17.90 L17.55 17.98 L17.04 17.43 L17.04 16.34 L14.81 16.30 L6.96 16.30 L6.96 17.43 L6.45 17.98 L4.38 18.02 L3.76 17.66 L3.64 15.24 L2.94 14.42 L2.55 13.09 L2.74 11.49 L3.33 10.48 L2.39 10.28 L2.00 8.41 L2.31 8.05 L4.46 8.05 L5.16 6.41 L6.06 5.20 L7.39 4.50 L8.80 4.15 L8.84 2.51Z"/><path d="M11.88 5.36 L9.23 5.59 L7.16 6.30 L6.49 7.16 L5.83 8.84 L18.17 8.84 L17.35 6.88 L16.57 6.14 L14.77 5.59Z"/><path d="M6.06 11.41 L5.05 12.08 L4.85 13.25 L5.44 14.15 L6.53 14.42 L7.59 13.80 L7.82 12.55 L7.20 11.65Z"/><path d="M17.39 11.41 L16.38 12.12 L16.22 13.33 L16.84 14.19 L18.09 14.38 L19.03 13.64 L19.19 12.63 L18.56 11.65Z"/>',
  ferry: '<path d="M4 13h16l-2 6H6l-2-6Zm3 0V8h10v5M9 8V5h6v3M3 22c2-2 4 2 6 0s4 2 6 0 4 2 6 0"/>',
  sailboat: '<path d="M12 3v12M12 4 5 14h7m1-8 6 8h-6M4 17h16l-3 4H7l-3-4Z"/>',
  motorcycle: '<circle cx="5" cy="16" r="3"/><circle cx="19" cy="16" r="3"/><path d="M7.5 14h5l4-4H6m1.5 4 4-4M13 6h2l1.5 3 2 4"/>',
  scooter: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 19h7l3-11h3M15 11h4M8 16h5"/>',
  helicopter: '<path d="M4 14h10a4 4 0 0 0 4-4V8h-8a6 6 0 0 0-6 6Z"/><path d="M10 8V5h5M3 4h16M18 10l4 3M9 14v4m-4 2h11"/><circle cx="8" cy="11" r="1"/>',
  van: '<path d="M5.30 2.00 L18.70 2.00 L19.30 2.30 L20.10 7.40 L22.00 7.40 L22.00 10.40 L20.50 10.60 L20.70 11.80 L20.70 20.40 L20.40 20.80 L18.60 20.90 L18.20 20.70 L18.10 18.30 L6.00 18.30 L6.00 20.30 L5.70 20.80 L3.80 20.90 L3.40 20.60 L3.30 11.90 L3.50 10.60 L2.00 10.30 L2.00 7.40 L4.00 7.30 L4.50 3.00 L4.70 2.40Z"/><path d="M5.30 4.60 L4.70 9.60 L19.40 9.60 L18.70 4.60Z"/><path d="M5.60 12.50 L4.80 13.20 L4.80 14.20 L5.60 14.90 L6.30 14.90 L7.00 14.40 L7.20 13.50 L6.60 12.60Z"/><path d="M17.70 12.50 L17.00 13.00 L16.80 13.90 L17.30 14.70 L18.40 14.90 L19.10 14.40 L19.30 13.50 L18.70 12.60Z"/><path d="M8.40 12.70 L8.30 13.50 L15.70 13.50 L15.70 12.70Z"/><path d="M8.40 13.90 L8.30 14.70 L15.70 14.70 L15.60 13.90Z"/>',
  "cable-car": '<path d="M3 4h18M12 4v4M7 8h10l2 3v8H5v-8l2-3Z"/><path d="M8 12h3v4H8v-4Zm5 0h3v4h-3v-4Z"/>',
  pizza: '<path d="m12 3 9 18H3L12 3Zm-6 12h12M9 11h.01M14 16h.01"/>',
  burger: '<path d="M4 10h16a8 6 0 0 0-16 0Zm0 4h16M5 14l2 3 3-3 3 3 3-3 3 3M4 20h16"/>',
  "ice-cream": '<path d="M7 9a5 5 0 0 1 10 0c2 0 3 1 3 3H4c0-2 1-3 3-3Zm1 7h8l-4 6-4-6Z"/>',
  cake: '<path d="M4 11h16v10H4V11Zm0 5c2 2 4-2 6 0s4-2 6 0 4-2 4 0M8 11V7m4 4V5m4 6V7M8 4h.01M12 2h.01M16 4h.01"/>',
  "wine-glass": '<path d="M7 3h10l-1 7a4 4 0 0 1-8 0L7 3Zm1 5h8M12 14v7m-4 0h8"/>',
  cocktail: '<path d="M4 4h16l-8 9-8-9Zm8 9v8m-4 0h8M15 7l4-5"/>',
  bread: '<path d="M4 11a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v9H4v-9Z"/><path d="m8 7 2 4m2-6 2 5m2-3 2 4"/>',
  fish: '<path d="M3 12s4-6 10-6c4 0 6 3 8 6-2 3-4 6-8 6-6 0-10-6-10-6Zm0 0-2-4v8l2-4Z"/><circle cx="15" cy="10" r="1"/>',
  steak: '<path d="M4 18c-3-4 0-10 5-13 5-3 11-1 11 4 0 6-10 13-16 9Z"/><circle cx="14" cy="10" r="3"/><path d="M6 15c2 1 4 1 6 0"/>',
  apple: '<path d="M12 7c-4-4-9-1-9 5 0 7 6 10 9 10s9-3 9-10c0-6-5-9-9-5Zm0 0c0-3 2-5 5-5"/><path d="M12 5c-2 0-3-1-4-3"/>',
  bowl: '<path d="M3 10h18a9 9 0 0 1-18 0Zm4 10h10M7 6c0-2 2-2 2-4m4 4c0-2 2-2 2-4"/>',
  croissant: '<path d="M5 7c3 0 5 2 7 5 2-3 4-5 7-5 1 5-2 11-7 13C7 18 4 12 5 7Z"/><path d="m8 8 4 4 4-4m-8 8 4-4 4 4"/>',
  taco: '<path d="M3 17a9 9 0 0 1 18 0H3Z"/><path d="M7 14c1-3 3-4 5-4s4 1 5 4M9 12l-2-3m8 3 2-3"/>',
  sushi: '<ellipse cx="12" cy="7" rx="7" ry="4"/><path d="M5 7v10c0 2 3 4 7 4s7-2 7-4V7M9 7c0-1 1-2 3-2s3 1 3 2-1 2-3 2-3-1-3-2Z"/>',
  cheese: '<path d="M4 9 16 3l4 6v11H4V9Zm0 0h16"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="17" r="1"/><circle cx="16" cy="11" r="1"/>',
  popcorn: '<path d="m6 9 1 12h10l1-12H6Zm3 2 1 8m5-8-1 8M7 8C3 6 5 2 9 4c1-4 6-3 6 1 4-2 6 3 2 5"/>',
  "air-conditioning": '<rect x="3" y="4" width="18" height="9" rx="2"/><path d="M7 8h10M6 17c2-2 4 2 6 0m0 4c2-2 4 2 6 0"/>',
  gym: '<path d="M3 9v6M6 7v10M9 10v4h6v-4M18 7v10M21 9v6M6 12h3m6 0h3"/>',
  fireplace: '<path d="M4 3h16v18H4V3Zm4 14h8M9 17c-1-4 3-5 3-9 3 3 5 5 3 9a3 3 0 0 1-6 0Z"/>',
  garden: '<path d="M4 22V12m5 10V9m6 13V9m5 13V12M3 15h18M12 9c0-4 3-7 7-7 0 4-3 7-7 7Zm0 0C8 9 5 6 5 2c4 0 7 3 7 7Z"/>',
  terrace: '<path d="M3 10h18c-1-5-4-7-9-7s-8 2-9 7Zm9-7v18m-5 0h10M6 15h5m7 0h-4"/>',
  "security-camera": '<path d="M4 7h12l3 4-3 4H4V7Zm4 8-3 6m9-6 2 4M19 11h3"/>',
  workspace: '<path d="M4 15h16v6H4v-6Zm3 0V5h10v10M9 18h6M2 12h5m10 0h5"/>',
  breakfast: '<path d="M5 15a7 7 0 0 1 14 0H5Zm-2 0h18M7 20h10M12 8V5M8 9 6.5 7.5M16 9l1.5-1.5"/>',
  banana: '<path d="M5 5c2 8 7 12 15 11-3 5-10 6-15 1C1 13 2 8 5 5Z"/><path d="M5 5 4 2m16 14 2 1"/>',
  beer: '<path d="M5 6h11v14H5V6Zm11 3h2a3 3 0 0 1 0 6h-2M8 3h.01M12 2h.01M15 4h.01M8 10v6m4-6v6"/>',
  chicken: '<path d="M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23"/><path d="m8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59"/>',
  cupcake: '<path d="M5 11a2 2 0 0 1 2-2 5 5 0 0 1 10 0 2 2 0 0 1 0 4H7a2 2 0 0 1-2-2Z"/><path d="m7 13 1 8h8l1-8M10 16v3m4-3v3"/><circle cx="12" cy="3.5" r="1.5"/>',
  donut: '<path d="M20.5 10a2.5 2.5 0 0 1-2.4-3H18a2.95 2.95 0 0 1-2.6-4.4 10 10 0 1 0 6.3 7.1c-.3.2-.8.3-1.2.3"/><circle cx="12" cy="12" r="3"/>',
  noodles: '<path d="M4 11h16a8 8 0 0 1-16 0Zm3 9h10M8 4l8 7m-4-8 5 8"/>',
  salad: '<path d="M4 12h16a8 8 0 0 1-16 0Zm3 8h10"/><path d="M8 11c-2-3 1-6 4-3 0-4 5-4 5 0 3-1 4 2 2 4"/>',
  sandwich: '<path d="M4 18 12 5l8 13H4Zm2-3h12M8 11h8M4 21h16"/>',
  soup: '<path d="M4 11h16a8 8 0 0 1-16 0Zm3 9h10M8 7c-1-2 2-2 1-4m4 4c-1-2 2-2 1-4m4 4c-1-2 2-2 1-4"/>',
  tea: '<path d="M5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9Zm12 2h1a3 3 0 0 1 0 6h-2M11 3v6m0-6h4v3h-4"/>',
  "parking-sign": '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 18V6h4a4 4 0 0 1 0 8H9"/>',
  "charging-station": '<rect x="5" y="3" width="11" height="18" rx="2"/><path d="M8 7h5M16 8h2l2 3v7a2 2 0 0 1-4 0v-3M11 10l-2 4h3l-2 4"/>',
  "luggage-storage": '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="8" y="9" width="8" height="8" rx="1"/><path d="M10 9V7h4v2m-4 4h4"/>',
  "room-service": '<path d="M4 17h16M6 14a6 6 0 0 1 12 0H6Zm6-6V6m-2 0h4M3 21h18"/>',
  reception: '<path d="M3 14h18v7H3v-7Zm4 0v-3a5 5 0 0 1 10 0v3M12 3v3M9 4l1 2m5-2-1 2"/>',
  passport: '<rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="10" r="4"/><path d="M8 10h8M12 6c-2 2-2 6 0 8m0-8c2 2 2 6 0 8M8 18h8"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c3 3 4 6 4 10s-1 7-4 10c-3-3-4-6-4-10s1-7 4-10Z"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/><circle cx="12" cy="12" r="1"/>',
  "compass-needle": '<path d="m17 7-3.5 7-6.5 3 3.5-7L17 7Z"/><path d="m10.5 10 3 4"/>',
  ticket: '<path d="M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V7Zm7 0v12"/>',
  binoculars: '<path d="M7 5h3v8H4l3-8Zm7 0h3l3 8h-6V5ZM10 9h4M4 13a4 4 0 1 0 8 0m0 0a4 4 0 1 0 8 0"/>',
  "beach-umbrella": '<path d="M4 10c2-6 8-8 14-4l2 2L4 10Zm8-2 4 13M8 21h12M6 17h5"/>',
  landmark: '<path d="m12 2 3 5-1 10h-4L9 7l3-5ZM7 17h10v4H7v-4ZM5 21h14"/>',
  airport: '<path d="M5 8h14l-2 5H7L5 8Zm4 5-2 9m8-9 2 9M8 18h8M12 8V3M9 5h6"/>',
  bridge: '<path d="M3 21V7m18 14V7M3 12h18M6 12V9m12 3V9M3 8c5 0 5-5 9-5s4 5 9 5M6 16h12M8 12v9m8-9v9"/>',
  church: '<path d="M5 21V9l7-5 7 5v12H5Zm5 0v-6h4v6M12 4V1m-2 2h4"/>',
  city: '<path d="M3 21V8h7v13m0 0V3h7v18m0 0v-9h4v9M6 12h1m-1 4h1m7-9h-1m1 4h-1m1 4h-1"/>',
  "ferris-wheel": '<circle cx="12" cy="10" r="7"/><path d="M12 3v14M5 10h14M7 5l10 10M17 5 7 15m5 2-4 5m4-5 4 5M6 22h12"/>',
  lighthouse: '<path d="M8 21h8l-1-12H9L8 21Zm1-12 3-4 3 4M5 21h14M4 7 1 5m19 2 3-2M4 11H1m22 0h-3"/>',
  map: '<path d="m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3V5Zm6-3v17m6-14v17"/>',
  monument: '<path d="M8 21h8M6 21h12M9 17h6L14 7h-4L9 17Zm1-10 2-5 2 5M8 17h8v4H8"/>',
  "shopping-bag": '<path d="M5 8h14l1 13H4L5 8Zm4 2V6a3 3 0 0 1 6 0v4"/>',
  waterfall: '<path d="M4 4h5v4c0 3-2 4-2 7M20 4h-5v4c0 3 2 4 2 7M11 4v9m2-9v11"/><path d="M3 17c2-1.5 4 1.5 6 0s4 1.5 6 0 4 1.5 6 0M3 21c2-1.5 4 1.5 6 0s4 1.5 6 0 4 1.5 6 0"/>',
  route: '<circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="6" r="2.5"/><path d="M7.5 18h2c5 0 1-8 6-8H17"/><path d="m15 8 2 2-2 2"/>',
  signpost: '<path d="M12 22V3M5 5h12l3 3-3 3H5V5Zm2 9h12v5H7l-3-2.5L7 14Z"/>',
  tent: '<path d="m3 20 9-17 9 17H3Zm9-17v17m0-7 5 7"/>',
  backpack: '<path d="M7 8V6a5 5 0 0 1 10 0v2M5 9h14v12H5V9Zm4 4h6v5H9v-5ZM5 12H3v5h2m14-5h2v5h-2"/>',
  hotel: '<path d="M4 21V4h16v17M7 8h3m4 0h3M7 12h3m4 0h3M9 21v-5h6v5M2 21h20"/>',
  museum: '<path d="m3 8 9-5 9 5H3Zm2 3h14M6 11v8m4-8v8m4-8v8m4-8v8M3 22h18"/>',
  castle: '<path d="M4 22V7h4V3h3v4h2V3h3v4h4v15H4Zm4 0v-5h8v5M7 11h2m6 0h2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  "cloud-sun": '<path d="M15 2v2m5 1-1.5 1.5M22 11h-2M10.5 6.5A5 5 0 0 1 19 10"/><path d="M7 20h10a3.5 3.5 0 0 0 .5-7A5.5 5.5 0 0 0 7 11a4.5 4.5 0 0 0 0 9Z"/>',
  rain: '<path d="M7 15h11a4 4 0 0 0 .6-7.9A6 6 0 0 0 7 6a4.5 4.5 0 0 0 0 9ZM8 18l-1 3m6-3-1 3m6-3-1 3"/>',
  thunderstorm: '<path d="M7 14h11a4 4 0 0 0 .6-7.9A6 6 0 0 0 7 5a4.5 4.5 0 0 0 0 9Z"/><path d="m12 15-2 4h3l-1 3 4-5h-3l1-2"/>',
  wind: '<path d="M3 8h11c3 0 3-4 0-4-1 0-2 .5-2.5 1.5M3 12h16c3 0 3 4 0 4-1 0-2-.5-2.5-1.5M3 16h8c3 0 3 4 0 4-1 0-2-.5-2.5-1.5"/>',
  umbrella: '<path d="M3 12a9 9 0 0 1 18 0H3Zm9-9v17a2 2 0 0 0 4 0M3 12c2-3 4-3 6 0 2-3 4-3 6 0 2-3 4-3 6 0"/>',
  fog: '<path d="M7 14h11a4 4 0 0 0 .6-7.9A6 6 0 0 0 7 5a4.5 4.5 0 0 0 0 9ZM4 18h14M7 22h13"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  phone: '<path d="M7.5 3 5 4.5c-1.2.7-.9 3.7.7 6.5 2.2 3.8 5.5 6.9 9.3 8.2 2.7.9 4.9.7 5.5-.4l.9-2.8-5-2.5-1.8 2.1c-2.5-1.1-5-3.5-6.2-5.9l1.9-2L7.5 3Z"/>',
  plug: '<path d="M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8Zm6 9v5"/>',
  voltage: '<path d="m13 2-7 11h6l-1 9 7-12h-6l1-8Z"/><path d="M3 5h3m12 14h3"/>',
  frequency: '<path d="M2 12h3c2 0 2-6 4-6s2 12 4 12 2-12 4-12 2 6 4 6h1"/>',
  "square-metre": '<path d="M5 7V4h3M16 4h3v3M5 17v3h3m8 0h3v-3"/><path d="M8 12h8m-6-2-2 2 2 2m4-4 2 2-2 2"/><path d="M12 8V6h2"/>',
  info: '<path d="M12 10v7M12 7h.01"/>',
  "information-circle": '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  medicine: '<rect x="3" y="7" width="18" height="10" rx="5"/><path d="M12 7v10"/>',
  syringe: '<path d="m18 2 4 4M17 7l3-3M14 4l6 6M19 9 8.7 19.3a2.4 2.4 0 0 1-3.4 0l-.6-.6a2.4 2.4 0 0 1 0-3.4L15 5M9 11l4 4M5 19l-3 3"/>',
  money: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 9a3 3 0 0 1-1 1v4a3 3 0 0 1 1 1m10-6a3 3 0 0 0 1 1v4a3 3 0 0 0-1 1"/><circle cx="12" cy="12" r="2.5"/>',
});

const ICON_BODIES = Object.freeze({ ...TRUSTED_ICON_BODIES, ...EXPANDED_ICON_BODIES });

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
  [...Object.entries(ICON_BODIES), ...Object.entries(ICON_ALIASES).map(([key, target]) => [key, ICON_BODIES[target]])]
    .map(([key, body]) => [key, `${SVG_OPEN}${body}</svg>`]),
));

export const TRUSTED_ICON_KEYS = Object.freeze(Object.keys(ICON_REGISTRY));

const ICON_PICKER_HIDDEN_KEYS = new Set(["amenity-pillow", "bath", "info", "play", "route", "seat", "shield", "tree"]);
const ICON_PICKER_LABELS = Object.freeze({
  "airline-seat": "Seat",
  "cloud-sun": "Partly Cloudy",
  "information-circle": "Info",
  coins: "Coin",
  "square-metre": "Square Metres",
  "amenity-bathtub": "Bathtub",
  "amenity-laptop": "Laptop",
  "amenity-oven": "Oven",
  "amenity-pillow": "Pillow",
  "amenity-sofa": "Sofa",
  "amenity-tree": "Tree",
  "amenity-washer": "Washer",
  "map-pin": "Pin",
  "non-smoking": "Non-Smoking",
  paw: "Pet",
  "priority-star": "Star",
  tv: "TV",
});

export const ICON_PICKER_KEYS = Object.freeze(
  Object.entries(ICON_REGISTRY)
    .filter(([key, markup], index, entries) => !ICON_PICKER_HIDDEN_KEYS.has(key) && entries.findIndex(([, candidate]) => candidate === markup) === index)
    .map(([key]) => key),
);

const PICKER_CATEGORY_KEYS = Object.freeze([
  ["transportation", "Transportation", ["airplane", "airline-seat", "bus", "car", "taxi", "van", "train", "subway", "tram", "cable-car", "bike", "motorcycle", "scooter", "walking", "ferry", "sailboat", "helicopter"]],
  ["amenities", "Amenities", ["accessibility", "air-conditioning", "amenity-bathtub", "amenity-laptop", "amenity-oven", "amenity-sofa", "amenity-tree", "amenity-washer", "baby", "balcony", "bed", "bell", "blinds", "bolt", "book", "chair", "charging-station", "clothesline", "cookware", "crib", "cup", "dice", "dining", "dishwasher", "door", "dryer", "elevator", "ethernet", "fan", "fire", "fireplace", "first-aid", "gamepad", "garage", "garden", "gate", "grab-bars", "grill", "gym", "hair-dryer", "hammock", "home", "host", "hot-tub", "iron", "kettle", "key", "kitchen", "lockbox", "luggage-storage", "non-smoking", "oven", "parking-sign", "paw", "pillow", "pool", "reception", "room-service", "safe", "sauna", "security-camera", "shower", "smoking", "speaker", "spray", "terrace", "thermometer", "toilet", "towel", "toy", "tv", "utensils", "wardrobe", "washer", "wifi", "wine-glass", "workspace"]],
  ["food-drink", "Food & Drink", ["apple", "banana", "beer", "bottle", "bowl", "bread", "breakfast", "burger", "cake", "cheese", "chicken", "cocktail", "coffee", "croissant", "cupcake", "donut", "fish", "ice-cream", "noodles", "pizza", "popcorn", "salad", "salt", "sandwich", "soda", "soup", "steak", "sushi", "taco", "tea"]],
  ["travel-places", "Travel & Places", ["airport", "backpack", "beach-umbrella", "binoculars", "bridge", "building", "calendar", "camera", "castle", "church", "city", "clock", "cloud", "cloud-sun", "coins", "compass", "droplets", "fog", "ferris-wheel", "frequency", "globe", "hotel", "information-circle", "landmark", "leaf", "lighthouse", "luggage", "map", "map-pin", "monument", "moon", "mountain", "medicine", "money", "museum", "passport", "path", "phone", "plug", "rain", "shopping-bag", "signpost", "snowflake", "square-metre", "sun", "syringe", "tent", "thunderstorm", "ticket", "umbrella", "voltage", "waterfall", "waves", "wind"]],
]);

export const ICON_PICKER_CATEGORIES = buildPickerCategories();

function buildPickerCategories() {
  const available = new Set(ICON_PICKER_KEYS);
  const assigned = new Set();
  const categories = PICKER_CATEGORY_KEYS.map(([id, label, requestedKeys]) => {
    const keys = sortIconKeys(requestedKeys.filter((key) => available.has(key) && !assigned.has(key)));
    keys.forEach((key) => assigned.add(key));
    return Object.freeze({ id, label, keys: Object.freeze(keys) });
  });
  const travelAndPlacesKeys = sortIconKeys(ICON_PICKER_KEYS.filter((key) => !assigned.has(key)));
  return Object.freeze(categories.map((category) => category.id === "travel-places"
    ? Object.freeze({ ...category, keys: Object.freeze(sortIconKeys([...category.keys, ...travelAndPlacesKeys])) })
    : category));
}

function sortIconKeys(keys) {
  return [...keys].sort((first, second) => iconPickerLabel(first).localeCompare(iconPickerLabel(second), "en", { sensitivity: "base" }));
}

export function hasTrustedIcon(iconKey) {
  return typeof iconKey === "string" && Object.hasOwn(ICON_REGISTRY, iconKey);
}

export function iconPickerLabel(iconKey) {
  if (!hasTrustedIcon(iconKey)) return "";
  return ICON_PICKER_LABELS[iconKey] ?? iconKey.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function renderIcon(iconKey) {
  return hasTrustedIcon(iconKey) ? ICON_REGISTRY[iconKey] : "";
}

export function renderActionIcon(iconKey) {
  const body = ACTION_ICON_BODIES[iconKey];
  return body ? `${SVG_OPEN}${body}</svg>` : "";
}
