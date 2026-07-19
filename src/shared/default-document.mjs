import { DOCUMENT_SCHEMA_VERSION } from "./document-schema.mjs";
import { formatDurationUnits } from "./duration-utils.mjs";
import { mealCuisineDescription } from "./meal-cuisines.mjs";
import { placeDescription } from "./place-descriptions.mjs";

export function createDefaultDocument() {
  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    meta: {
      brandName: "Dudu & Ale",
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
    title: "Distribuição da Casa",
    area: "90 m²",
    spaces: [
      anatomySpace("stay-anatomy-room-1", "Quarto 1", "double", "Cama de Casal"),
      anatomySpace("stay-anatomy-room-2", "Quarto 2", "double", "Cama de Casal"),
      anatomySpace("stay-anatomy-room-3", "Quarto 3", "double", "Cama de Casal"),
      anatomySpace("stay-anatomy-living-room", "Sala de Estar", "sofa", "Sofá-Cama"),
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
      direction: "Ida",
      directionMode: "outbound",
      date: "2026-10-24",
      provider: "LATAM Airlines Brasil",
      origin: "Aeroporto Internacional Antônio Carlos Jobim",
      originCity: "Rio de Janeiro",
      destination: "Aeroporto Internacional Salgado Filho",
      destinationCity: "Porto Alegre",
      departure: "08:50",
      arrival: "11:00",
      duration: "2h 10m",
      departureDate: "2026-10-24",
      arrivalDate: "2026-10-24",
      departureTimeZone: "America/Sao_Paulo",
      arrivalTimeZone: "America/Sao_Paulo",
      stop: "Direto",
      serviceType: "direct",
      stopCount: 0,
      details: "LA3962 · Airbus A320",
      seats: "Assentos a confirmar",
      seatCount: 2,
      notes: "",
      mapUrl: "",
      websiteUrl: "",
      providerCover: null,
      originCover: rioAirportCover(),
      destinationCover: null,
    }),
    contentBlock("transport-bus-outbound", "transfer", {
      direction: "Ida",
      directionMode: "outbound",
      date: "2026-10-24",
      provider: "Telch Turismo",
      origin: "Aeroporto Internacional Salgado Filho",
      destination: "Casa Sol da Serra",
      departure: "TBD",
      arrival: "TBD",
      duration: "TBD",
      departureDate: "2026-10-24",
      arrivalDate: "2026-10-24",
      departureTimeZone: "America/Sao_Paulo",
      arrivalTimeZone: "America/Sao_Paulo",
      seats: "Transfer privativo",
      seatCount: 2,
      notes: "",
      mapUrl: "",
      websiteUrl: "",
      providerCover: null,
      originCover: null,
      destinationCover: null,
    }),
    contentBlock("transport-bus-return", "transfer", {
      direction: "Volta",
      directionMode: "inbound",
      date: "2026-11-01",
      provider: "Telch Turismo",
      origin: "Casa Sol da Serra",
      destination: "Aeroporto Internacional Salgado Filho",
      departure: "TBD",
      arrival: "TBD",
      duration: "TBD",
      departureDate: "2026-11-01",
      arrivalDate: "2026-11-01",
      departureTimeZone: "America/Sao_Paulo",
      arrivalTimeZone: "America/Sao_Paulo",
      seats: "Transfer privativo",
      seatCount: 2,
      notes: "",
      mapUrl: "",
      websiteUrl: "",
      providerCover: null,
      originCover: null,
      destinationCover: null,
    }),
    contentBlock("transport-flight-return", "flight", {
      direction: "Volta",
      directionMode: "inbound",
      date: "2026-11-01",
      provider: "LATAM Airlines",
      origin: "Aeroporto Internacional Salgado Filho",
      originCity: "Porto Alegre",
      destination: "Aeroporto Internacional Antônio Carlos Jobim",
      destinationCity: "Rio de Janeiro",
      departure: "16:30",
      arrival: "18:25",
      duration: "1h 55m",
      departureDate: "2026-11-01",
      arrivalDate: "2026-11-01",
      departureTimeZone: "America/Sao_Paulo",
      arrivalTimeZone: "America/Sao_Paulo",
      stop: "Direto",
      serviceType: "direct",
      stopCount: 0,
      details: "Voo direto",
      seats: "5A, 5C",
      seatCount: 2,
      notes: "",
      mapUrl: "",
      websiteUrl: "",
      providerCover: null,
      originCover: null,
      destinationCover: rioAirportCover(),
    }),
  ];
}

const STAY_ADDRESS = "R. Carlos Lengler Filho, 173 - Casa 01 - Planalto, Gramado - RS, 95670-000";

export function createLegacyStayDistancesBlock() {
  return contentBlock("stay-distances", "stay-distances", {
      title: "Pontos de Interesse Próximos",
      origin: STAY_ADDRESS,
      items: [
        stayDistanceItem("Mini Mundo", "R. Horácio Cardoso, 291 - Planalto, Gramado - RS, 95675-062", { distance: "0.6 km", time: "2 min" }, { distance: "0.6 km", time: "7 min" }, { distance: "0.6 km", time: "2 min" }),
        stayDistanceItem("Rua Coberta", "R. Me. Verônica, 30 - Centro, Gramado - RS, 95670-000", { distance: "1.1 km", time: "3 min" }, { distance: "1.1 km", time: "14 min" }, { distance: "1.1 km", time: "4 min" }),
        stayDistanceItem("Lago Negro", "Tres Pinheiros, Gramado - RS, 95670-000", { distance: "1.7 km", time: "5 min" }, { distance: "1.3 km", time: "19 min" }, { distance: "2.0 km", time: "7 min" }),
        stayDistanceItem("Jardim do Amor", "Av. das Hortênsias, 765 - Centro, Gramado - RS, 95670-000", { distance: "2.1 km", time: "5 min" }, { distance: "1.5 km", time: "18 min" }, { distance: "1.6 km", time: "6 min" }),
      ],
    });
}

function createStayBlocks() {
  return [
    contentBlock("stay-summary", "stay-summary", {
      name: "Casa Sol da Serra",
      subtitle: "Incrível Casa com Hidro e Bikes",
      checkin: "2026-10-24",
      checkinTime: "14:00",
      checkout: "2026-11-01",
      checkoutTime: "11:00",
      nights: "8 noites",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Casa+Sol+da+Serra+Gramado+RS",
      websiteUrl: "https://www.booking.com/hotel/br/casa-sol-da-serra-hidro-bikes-centro.html?aid=2441557",
    }, {
      url: "/assets/casa-sol-da-serra.webp",
      alt: "Casa Sol da Serra and its garden in Gramado",
      position: "center",
    }),
    contentBlock("stay-highlights", "stay-amenities", {
      title: "Listing Highlights",
      groups: bookingAmenityGroups(),
    }),
    contentBlock("stay-essentials", "essentials", {
      title: "Informações Essenciais da Reserva",
      items: [
        { label: "Endereço Exato", value: "Adicionar endereço exato" },
        { label: "Horário de Entrada", value: "Adicionar horário de entrada" },
        { label: "Instruções de Entrada", value: "Adicionar detalhes de acesso" },
        { label: "Contato do Anfitrião", value: "Adicionar contato" },
        { label: "Confirmação", value: "Adicionar código da reserva" },
      ],
    }),
    createStayAnatomyBlock(),
  ];
}

function stayDistanceItem(name, address, driving, walking, cycling) {
  const origin = encodeURIComponent(STAY_ADDRESS);
  const destination = encodeURIComponent(address);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  return {
    name,
    address,
    drivingDistance: driving.distance,
    drivingTime: formatDurationUnits(driving.time),
    walkingDistance: walking.distance,
    walkingTime: formatDurationUnits(walking.time),
    cyclingDistance: cycling.distance,
    cyclingTime: formatDurationUnits(cycling.time),
    drivingUrl: `${directionsUrl}&travelmode=driving`,
    walkingUrl: `${directionsUrl}&travelmode=walking`,
    cyclingUrl: `${directionsUrl}&travelmode=bicycling`,
    cover: null,
  };
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

function bookingAmenityGroups() {
  return [
    amenityGroup("kitchen-dining", "Kitchen", [
      ["kitchen", "Fully equipped kitchen", "kitchen"],
      ["oven", "Oven, hob and microwave", "oven"],
      ["coffee-tea-maker", "Coffee and tea station", "coffee"],
      ["kitchenware", "Cookware and dining area", "cookware"],
    ]),
    amenityGroup("bedroom-laundry", "Sleep and Laundry", [
      ["linens", "Bed linens and wardrobes", "bed"],
      ["sofa-bed", "Sofa bed", "bed"],
      ["washing-machine", "Washer and tumble dryer", "washer"],
      ["iron", "Ironing essentials", "iron"],
    ]),
    amenityGroup("bathroom-wellness", "Bath and Spa", [
      ["private-bathroom", "Two private bathrooms", "bath"],
      ["hot-tub-jacuzzi", "Private Jacuzzi and spa", "hot-tub"],
      ["towels", "Towels and bathrobes", "towel"],
      ["hairdryer", "Hairdryer and toiletries", "hair-dryer"],
    ]),
    amenityGroup("living-comfort", "Home Comforts", [
      ["sofa", "Sofa and seating area", "chair"],
      ["fireplace", "Fireplace and heating", "fire"],
      ["air-conditioning", "Air conditioning and fan", "snowflake"],
      ["smoke-free", "Smoke-free home", "shield"],
    ]),
    amenityGroup("media-technology", "Work and Play", [
      ["free-wifi", "Fast, free Wi-Fi", "wifi"],
      ["flat-screen-tv", "Cable and satellite TV", "tv"],
      ["dedicated-workspace", "Dedicated workspace", "briefcase"],
      ["game-console", "Video games", "gamepad"],
    ]),
    amenityGroup("outdoors-views", "Outdoor Living", [
      ["garden", "Garden, terrace and deck", "leaf"],
      ["balcony", "Balcony and patio seating", "balcony"],
      ["outdoor-dining", "Barbecue and picnic area", "dining"],
      ["courtyard-view", "Courtyard and local views", "map-pin"],
    ]),
  ];
}

function createAgendaBlocks() {
  const days = [
    agendaDay("agenda-oct-24", "2026-10-24", "Arrival", ["Aeroporto Internacional Salgado Filho", "Casa do Sol"], ["", "", ""]),
    agendaDay("agenda-oct-31", "2026-10-25", "Water Park", ["Acquamotion"], ["Casa do Sol", "Acquamotion", "Casa do Sol"]),
    agendaDay("agenda-oct-27", "2026-10-26", "Historic Centre", ["Rua Coberta", "Fonte do Amor Eterno", "Paróquia São Pedro", "Rua Torta", "Praça das Etnias"], ["Casa do Sol", "Josephina Café & Restaurante", ""]),
    agendaDay("agenda-oct-26", "2026-10-27", "Parks & Plazas", ["Lago Joaquina Rita Bier", "Mini Mundo", "Jardim do Amor"], ["Casa do Sol", "Restaurante Höppner", "BOSKO PIZZERIA Napoletana"]),
    agendaDay("agenda-oct-30", "2026-10-28", "Open / Rest Day", [], ["", "", ""]),
    agendaDay("agenda-oct-29", "2026-10-29", "Gardens", ["Garden Park Gramado", "Le Jardin Parque de Lavanda", "Lumni Experience"], ["Casa do Sol", "Le Jardin Parque de Lavanda", "Lumni Experience"]),
    agendaDay("agenda-oct-28", "2026-10-30", "Lakeside, Chocolates & Beer", ["Lago Negro", "Prawer Chocolates", "La Birra Cervejaria"], ["Casa do Sol", "Resto Bar Black Lake", "Toro Gramado"]),
    agendaDay("agenda-oct-25", "2026-10-31", "Snow Day", ["Snowland"], ["Casa do Sol", "Snowland", "Casa do Sol"]),
    agendaDay("agenda-nov-01", "2026-11-01", "Departure", ["Aeroporto Internacional Salgado Filho", "Aeroporto Internacional Antônio Carlos Jobim"], ["", "", ""]),
  ];
  return [...days, contentBlock("agenda-saved-places", "saved-places", {
    title: "Other Places",
    places: [
      savedPlace("Restaurant La Table D´Or Méditerranée", "restaurant"),
      savedPlace("Edelweiss", "restaurant"),
      savedPlace("São Pedro Casa de Pães e Café", "restaurant"),
      savedPlace("Cantina Pastasciutta", "restaurant"),
      savedPlace("Palácio dos Festivais", "landmark"),
      savedPlace("Igreja do Relógio", "landmark"),
      savedPlace("Praça Major Nicoletti", "landmark"),
      savedPlace("Belvedere Vale do Quilombo", "landmark"),
    ],
  })];
}

function savedPlace(name, category) {
  return { ...agendaPlace(name), category };
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
  const details = AGENDA_PLACE_DETAILS[name] ?? {};
  return {
    id: `place-${slug(name)}`,
    name,
    mapUrl: details.query ? googleMapsSearch(details.query) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} Gramado`)}`,
    websiteUrl: "",
    image: "",
    comment: placeDescription(name),
    drivingDistance: details.drivingDistance ?? "",
    drivingTime: formatDurationUnits(details.drivingTime),
    walkingDistance: details.walkingDistance ?? "",
    walkingTime: formatDurationUnits(details.walkingTime),
    cyclingDistance: details.cyclingDistance ?? "",
    cyclingTime: formatDurationUnits(details.cyclingTime),
    cover: name === "Aeroporto Internacional Antônio Carlos Jobim" ? rioAirportCover() : null,
    priority: details.priority ?? "medium",
  };
}

export const AGENDA_PLACE_DETAILS = Object.freeze(Object.fromEntries([
  ["Aeroporto Internacional Salgado Filho", "Aeroporto Internacional Salgado Filho, Porto Alegre, RS", "107 km", "1 h 53 min", "103 km", "6 h 53 min", "104 km", "23 h 6 min", "high"],
  ["Casa do Sol", "R. Carlos Lengler Filho, 173 - Casa 01 - Planalto, Gramado - RS, 95670-000", "0", "0", "0", "0", "0", "0", "high"],
  ["Acquamotion", "Acquamotion, Estrada Linha Ávila, 501, Gramado, RS", "7.6 km", "13 min", "7.1 km", "29 min", "6.9 km", "1 h 33 min"],
  ["Rua Coberta", "Rua Coberta, R. Madre Verônica, Centro, Gramado, RS", "1.3 km", "2 min", "1.1 km", "5 min", "1.2 km", "16 min"],
  ["Fonte do Amor Eterno", "Fonte do Amor Eterno, Av. Borges de Medeiros, 2659, Gramado, RS", "0.9 km", "1 min", "1.1 km", "5 min", "1.1 km", "14 min"],
  ["Paróquia São Pedro", "Paróquia São Pedro, Av. Borges de Medeiros, 2659, Gramado, RS", "1.0 km", "1 min", "1.1 km", "5 min", "1.1 km", "14 min"],
  ["Rua Torta", "Rua Torta, R. Emílio Sorgetz, Gramado, RS", "0.6 km", "1 min", "0.7 km", "3 min", "0.6 km", "8 min"],
  ["Praça das Etnias", "Praça das Etnias, Av. Borges de Medeiros, 1848, Gramado, RS", "0.6 km", "1 min", "0.6 km", "2 min", "0.6 km", "8 min"],
  ["Lago Joaquina Rita Bier", "Lago Joaquina Rita Bier, R. Leopoldo Rosenfeld, 919, Gramado, RS", "0.5 km", "1 min", "0.4 km", "3 min", "0.4 km", "6 min"],
  ["Mini Mundo", "Mini Mundo, R. Horácio Cardoso, 291, Gramado, RS", "0.6 km", "1 min", "0.6 km", "3 min", "0.5 km", "7 min"],
  ["Jardim do Amor", "Jardim do Amor, Av. das Hortênsias, 765, Gramado, RS", "2.1 km", "3 min", "2.0 km", "8 min", "2.1 km", "28 min"],
  ["Garden Park Gramado", "Garden Park Gramado, Estrada Professora Elvira Apolo Benetti, 1699, Gramado, RS", "4.9 km", "7 min", "3.4 km", "16 min", "3.4 km", "45 min"],
  ["Le Jardin Parque de Lavanda", "Le Jardin Parque de Lavanda, RS-115, 37700, Gramado, RS", "3.5 km", "5 min", "3.5 km", "14 min", "3.5 km", "47 min"],
  ["Lumni Experience", "Lumni Experience, Estrada da Tapera, 2900, Gramado, RS", "10 km", "18 min", "12 km", "56 min", "8.5 km", "1 h 53 min"],
  ["Lago Negro", "Lago Negro, R. A. J. Renner, Gramado, RS", "2.0 km", "4 min", "1.7 km", "9 min", "1.6 km", "21 min"],
  ["Prawer Chocolates", "Prawer Loja de Fábrica, Av. das Hortênsias, 4100, Gramado, RS", "3.2 km", "5 min", "3.0 km", "12 min", "3.1 km", "42 min"],
  ["La Birra Cervejaria", "La Birra Cervejaria, R. Garibaldi, 109, Gramado, RS", "1.4 km", "2 min", "1.3 km", "5 min", "1.4 km", "18 min"],
  ["Snowland", "Snowland, RS-235, 9009, Gramado, RS", "6.4 km", "10 min", "6.3 km", "26 min", "6.1 km", "1 h 22 min"],
  ["Aeroporto Internacional Antônio Carlos Jobim", "Aeroporto Internacional Antônio Carlos Jobim, Rio de Janeiro, RJ", "1551 km", "20 h 42 min", "1708 km", "124 h 8 min", "1745 km", "386 h 53 min"],
  ["Restaurant La Table D´Or Méditerranée", "La Table D'Or Méditerranée, R. da Carrieri, 525, Gramado, RS", "1.6 km", "3 min", "1.3 km", "6 min", "1.1 km", "15 min"],
  ["Edelweiss", "Edelweiss Restaurant, R. João Leopoldo Lied, 975, Gramado, RS", "1.5 km", "3 min", "1.2 km", "6 min", "1.2 km", "16 min"],
  ["São Pedro Casa de Pães e Café", "São Pedro Casa de Pães e Café, R. Pedro Benetti, 5, Gramado, RS", "1.0 km", "1 min", "1.0 km", "4 min", "1.0 km", "13 min"],
  ["Josephina Café & Restaurante", "Josephina Café & Restaurante, R. Pedro Benetti, 22, Gramado, RS", "1.0 km", "3 min", "1.0 km", "4 min", "1.1 km", "13 min"],
  ["Restaurante Höppner", "Restaurante Höppner, R. Pedro Candiago, 364, Gramado, RS", "0.7 km", "3 min", "0.7 km", "3 min", "0.6 km", "8 min"],
  ["BOSKO PIZZERIA Napoletana", "BOSKO PIZZERIA Napoletana, Av. Borges de Medeiros, 2727, Gramado, RS", "2.0 km", "5 min", "2.0 km", "7 min", "2.0 km", "25 min"],
  ["Resto Bar Black Lake", "Resto Bar Black Lake, R. Vinte e Cinco de Julho, 833, Gramado, RS", "2.0 km", "6 min", "2.1 km", "8 min", "1.4 km", "21 min"],
  ["Toro Gramado", "Toro Gramado, Av. das Hortênsias, 804C, Gramado, RS", "4.2 km", "8 min", "4.2 km", "16 min", "3.5 km", "44 min"],
  ["Cantina Pastasciutta", "Cantina Pastasciutta, Av. Borges de Medeiros, 2083, Gramado, RS", "0.8 km", "3 min", "0.8 km", "3 min", "0.5 km", "6 min"],
  ["Palácio dos Festivais", "Palácio dos Festivais, Gramado, RS", "1.4 km", "4 min", "1.4 km", "5 min", "1.1 km", "14 min"],
  ["Igreja do Relógio", "Igreja do Relógio, Gramado, RS", "1.0 km", "4 min", "1.3 km", "5 min", "1.1 km", "15 min"],
  ["Praça Major Nicoletti", "Praça Major Nicoletti, Gramado, RS", "1.0 km", "3 min", "1.0 km", "4 min", "1.0 km", "13 min"],
  ["Belvedere Vale do Quilombo", "Belvedere Vale do Quilombo, Gramado, RS", "1.3 km", "3 min", "1.3 km", "5 min", "1.3 km", "18 min"],
].map(([name, query, drivingDistance, drivingTime, cyclingDistance, cyclingTime, walkingDistance, walkingTime, priority]) => [name, {
  query,
  drivingDistance,
  drivingTime,
  cyclingDistance,
  cyclingTime,
  walkingDistance,
  walkingTime,
  priority,
}])));

function googleMapsSearch(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function foodOption(dayId, meal, name) {
  const details = AGENDA_PLACE_DETAILS[name] ?? {};
  return {
    id: `food-${slug(dayId)}-${meal}-1`,
    name,
    mapUrl: "",
    websiteUrl: "",
    drivingDistance: details.drivingDistance ?? "",
    cyclingDistance: details.cyclingDistance ?? "",
    walkingDistance: details.walkingDistance ?? "",
    drivingTime: formatDurationUnits(details.drivingTime),
    cyclingTime: formatDurationUnits(details.cyclingTime),
    walkingTime: formatDurationUnits(details.walkingTime),
    comment: mealCuisineDescription(name),
    priority: details.priority ?? "medium",
    cover: null,
  };
}

function contentBlock(id, type, data, cover = null) {
  return { id, type, cover, data };
}

function rioAirportCover() {
  return {
    url: "/assets/rio-de-janeiro-airport.png",
    alt: "Aerial view of Rio de Janeiro and Sugarloaf Mountain",
    position: "center",
  };
}

function slug(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
