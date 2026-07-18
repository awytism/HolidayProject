import { DOCUMENT_SCHEMA_VERSION } from "./document-schema.mjs";

export function createDefaultDocument() {
  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    meta: {
      destination: "Gramado",
      region: "Rio Grande do Sul",
      startDate: "2026-10-24",
      endDate: "2026-11-01",
      days: "9",
      legs: "4",
    },
    sections: {
      transport: createTransportBlocks(),
      stay: createStayBlocks(),
      agenda: createAgendaBlocks(),
    },
  };
}

export function createStayAnatomyBlock(id = "stay-anatomy") {
  return contentBlock(id, "stay-anatomy", {
    title: "Property Anatomy",
    area: "90 m²",
    spaces: [
      anatomySpace("stay-anatomy-room-1", "Room 1", "double", "Double Bed"),
      anatomySpace("stay-anatomy-room-2", "Room 2", "double", "Double Bed"),
      anatomySpace("stay-anatomy-room-3", "Room 3", "double", "Double Bed"),
      anatomySpace("stay-anatomy-living-room", "Living Room", "sofa", "Sofa Bed"),
    ],
  });
}

function anatomySpace(id, label, bedId, bedLabel) {
  return {
    id,
    label,
    beds: [{ id: `${id}-${bedId}-bed`, label: bedLabel, quantity: 1 }],
  };
}

function createTransportBlocks() {
  return [
    contentBlock("transport-flight-outbound", "flight", {
      direction: "Outbound",
      date: "2026-10-24",
      provider: "LATAM Airlines",
      origin: "GIG",
      originCity: "Rio de Janeiro",
      destination: "POA",
      destinationCity: "Porto Alegre",
      departure: "06:00",
      arrival: "09:10",
      duration: "3h 10m",
      stop: "CWB · 45 min layover",
      details: "06:00 - 07:10 GIG → CWB (1h 10m)\n07:55 - 09:10 CWB → POA (1h 15m)",
      seats: "2A, 2C GIG → CWB · 5A, 5C CWB → POA",
    }),
    contentBlock("transport-bus-outbound", "transfer", {
      direction: "Outbound",
      date: "2026-10-24",
      provider: "Citral",
      origin: "Rodoviária de Porto Alegre",
      destination: "Rodoviária de Gramado",
      departure: "12:30",
      arrival: "15:15",
      duration: "2h 45m",
      seats: "Seats not assigned",
    }),
    contentBlock("transport-bus-return", "transfer", {
      direction: "Return",
      date: "2026-11-01",
      provider: "Citral",
      origin: "Rodoviária de Gramado",
      destination: "Rodoviária de Porto Alegre",
      departure: "11:00",
      arrival: "13:30",
      duration: "2h 30m",
      seats: "Seats not assigned",
    }),
    contentBlock("transport-flight-return", "flight", {
      direction: "Return",
      date: "2026-11-01",
      provider: "LATAM Airlines",
      origin: "POA",
      originCity: "Porto Alegre",
      destination: "GIG",
      destinationCity: "Rio de Janeiro",
      departure: "16:30",
      arrival: "18:25",
      duration: "1h 55m",
      stop: "Direct",
      details: "Direct flight",
      seats: "5A, 5C",
    }),
  ];
}

function createStayBlocks() {
  return [
    contentBlock("stay-summary", "stay-summary", {
      name: "Casa Sol da Serra",
      subtitle: "Hidro · Bikes · Centro",
      checkin: "2026-10-24",
      checkout: "2026-11-01",
      nights: "8 nights",
      link: "https://www.booking.com/hotel/br/casa-sol-da-serra-hidro-bikes-centro.html?aid=2441557",
    }),
    contentBlock("stay-highlights", "stay-amenities", {
      title: "Accommodation Highlights",
      groups: [
        amenityGroup("property", "Entire Home for You", [
          ["entire-place", "Entire three-bedroom holiday home", "home"], ["central-location", "Central Gramado location", "map-pin"],
          ["private-entrance", "Private entrance", "door"], ["free-parking", "Free private parking", "parking"],
        ]),
        amenityGroup("kitchen", "Private Kitchen", [
          ["kitchen", "Private kitchen", "kitchen"], ["coffee-maker", "Coffee maker", "coffee"], ["electric-kettle", "Electric kettle", "kettle"],
          ["microwave", "Microwave", "box"], ["oven", "Oven", "oven"], ["stove", "Cooktop", "fire"], ["toaster", "Toaster", "box"],
          ["dining-table", "Dining table", "dining"], ["cookware", "Kitchen utensils", "cookware"],
        ]),
        amenityGroup("wellbeing", "Bathroom & Wellbeing", [
          ["hot-tub", "Hot tub / hydromassage", "hot-tub"], ["bathtub", "Bathtub", "bath"], ["shower", "Shower", "shower"],
          ["hair-dryer", "Hair dryer", "hair-dryer"], ["towels", "Towels", "towel"], ["toiletries", "Complimentary toiletries", "sparkles"],
        ]),
        amenityGroup("views", "Views & Outdoor Areas", [
          ["garden-view", "Garden view", "leaf"], ["courtyard-view", "Inner courtyard view", "view"], ["balcony", "Balcony", "balcony"],
          ["terrace", "Terrace", "outdoors"], ["garden", "Garden", "leaf"], ["barbecue", "Barbecue", "grill"], ["outdoor-dining", "Outdoor dining area", "dining"],
        ]),
        amenityGroup("comfort", "Comfort & Entertainment", [
          ["air-conditioning", "Air conditioning", "snowflake"], ["indoor-fireplace", "Fireplace", "fire"], ["heating", "Heating", "thermometer"],
          ["wifi", "Free Wi-Fi", "wifi"], ["tv", "Flat-screen TV", "tv"], ["streaming", "Streaming services", "play"],
          ["washing-machine", "Washing machine", "washing-machine"], ["dryer", "Clothes dryer", "dryer"], ["board-games", "Board games", "game"],
        ]),
      ],
    }),
    contentBlock("stay-essentials", "essentials", {
      title: "Reservation Essentials",
      items: [
        { label: "Exact Address", value: "Add exact address" },
        { label: "Check-In Window", value: "Add check-in time" },
        { label: "Entry Instructions", value: "Add access details" },
        { label: "Host Contact", value: "Add contact details" },
        { label: "Confirmation", value: "Add reservation code" },
      ],
    }),
    createStayAnatomyBlock(),
  ];
}

function amenity(id, presetId, label, iconKey) {
  return { id, presetId, label, iconKey };
}

function amenityGroup(id, label, items) {
  return {
    id: `stay-amenities-${id}`,
    label,
    items: items.map(([presetId, itemLabel, iconKey]) => amenity(`stay-amenity-${presetId}`, presetId, itemLabel, iconKey)),
  };
}

function createAgendaBlocks() {
  const days = [
    agendaDay("agenda-oct-24", "2026-10-24", "Arrival", ["GIG → POA", "Rodoviária de Porto Alegre → Rodoviária de Gramado"], ["Airport", "", "Toro Gramado"]),
    agendaDay("agenda-oct-25", "2026-10-25", "Snow Day", ["Snowland"], ["Airbnb", "Snowland", "Airbnb"]),
    agendaDay("agenda-oct-26", "2026-10-26", "Gardens & Miniatures", ["Jardim do Amor", "Mini Mundo", "Praça Silvia Zorzanello"], ["", "Restaurante Höppner", "BOSKO PIZZERIA Napoletana"]),
    agendaDay("agenda-oct-27", "2026-10-27", "Historic Center", ["Rua Coberta Gramado", "Fonte do Amor Eterno", "Praça das Etnias"], ["", "Josephina Restaurante", "El Pasttelero Pastelaria - Gramado"]),
    agendaDay("agenda-oct-28", "2026-10-28", "Lakeside", ["Lago Negro"], ["Airbnb", "Resto Bar Black Lake", ""]),
    agendaDay("agenda-oct-29", "2026-10-29", "Garden Day", ["Garden Park Gramado"], ["Airbnb", "Garden Park Gramado", ""]),
    agendaDay("agenda-oct-30", "2026-10-30", "Lavender & Wildlife", ["Le Jardin Parque de Lavanda", "GramadoZoo"], ["São Pedro Casa de Pães e Café", "Le Jardin Parque de Lavanda", "Boteco do Gnomo"]),
    agendaDay("agenda-oct-31", "2026-10-31", "Water Park", ["Acquamotion"], ["Airbnb", "Acquamotion", "Airbnb"]),
    agendaDay("agenda-nov-01", "2026-11-01", "Departure", ["Rodoviária de Gramado → Rodoviária de Porto Alegre", "POA → GIG"], ["Airbnb", "Airport", ""]),
  ];
  return [...days, contentBlock("agenda-saved-places", "saved-places", {
    title: "Other Places to Try",
    places: [
      agendaPlace("La Birra Cervejaria"),
      agendaPlace("Restaurant La Table D´Or Méditerranée"),
      agendaPlace("Edelweiss"),
    ],
  })];
}

function agendaDay(id, date, title, names, meals) {
  return contentBlock(id, "day", {
    date,
    title,
    places: names.map(agendaPlace),
    meals: Object.fromEntries(["breakfast", "lunch", "dinner"].map((meal, index) => [
      meal,
      meals[index] ? [foodOption(id, meal, meals[index])] : [],
    ])),
    notes: "",
  });
}

function agendaPlace(name) {
  const isTransport = name.includes("→");
  return {
    id: `place-${slug(name)}`,
    name,
    mapUrl: isTransport ? "" : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} Gramado`)}`,
    websiteUrl: "",
    image: "",
    comment: "",
    cover: null,
    priority: "medium",
  };
}

function foodOption(dayId, meal, name) {
  return {
    id: `food-${slug(dayId)}-${meal}-1`,
    name,
    mapUrl: "",
    websiteUrl: "",
    cover: null,
    priority: "medium",
  };
}

function contentBlock(id, type, data) {
  return { id, type, cover: null, data };
}

function slug(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
