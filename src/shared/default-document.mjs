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
      date: "2026-10-24",
      provider: "LATAM Airlines Brasil",
      origin: "GIG",
      originCity: "Rio de Janeiro",
      destination: "POA",
      destinationCity: "Porto Alegre",
      departure: "08:50",
      arrival: "11:00",
      duration: "2h 10m",
      stop: "Direto",
      details: "LA3962 · Airbus A320",
      seats: "Assentos a confirmar",
      mapUrl: "",
      websiteUrl: "",
      originCover: null,
      destinationCover: null,
    }),
    contentBlock("transport-bus-outbound", "transfer", {
      direction: "Ida",
      date: "2026-10-24",
      provider: "Telch Turismo",
      origin: "Aeroporto de Porto Alegre",
      destination: "Casa Sol da Serra",
      departure: "A confirmar",
      arrival: "A confirmar",
      duration: "A confirmar",
      seats: "Transfer privativo",
      mapUrl: "",
      websiteUrl: "",
      originCover: null,
      destinationCover: null,
    }),
    contentBlock("transport-bus-return", "transfer", {
      direction: "Volta",
      date: "2026-11-01",
      provider: "Telch Turismo",
      origin: "Casa Sol da Serra",
      destination: "Aeroporto de Porto Alegre",
      departure: "A confirmar",
      arrival: "A confirmar",
      duration: "A confirmar",
      seats: "Transfer privativo",
      mapUrl: "",
      websiteUrl: "",
      originCover: null,
      destinationCover: null,
    }),
    contentBlock("transport-flight-return", "flight", {
      direction: "Volta",
      date: "2026-11-01",
      provider: "LATAM Airlines",
      origin: "POA",
      originCity: "Porto Alegre",
      destination: "GIG",
      destinationCity: "Rio de Janeiro",
      departure: "16:30",
      arrival: "18:25",
      duration: "1h 55m",
      stop: "Direto",
      details: "Voo direto",
      seats: "5A, 5C",
      mapUrl: "",
      websiteUrl: "",
      originCover: null,
      destinationCover: null,
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
      subtitle: "Hidro · Bikes · Centro",
      checkin: "2026-10-24",
      checkinTime: "",
      checkout: "2026-11-01",
      checkoutTime: "",
      nights: "8 noites",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Casa+Sol+da+Serra+Gramado+RS",
      websiteUrl: "https://www.booking.com/hotel/br/casa-sol-da-serra-hidro-bikes-centro.html?aid=2441557",
    }),
    contentBlock("stay-highlights", "stay-amenities", {
      title: "Destaques da Hospedagem",
      groups: [
        amenityGroup("property", "Casa Inteira para Vocês", [
          ["entire-place", "Casa de férias inteira com três quartos", "home"], ["central-location", "Localização central em Gramado", "map-pin"],
          ["private-entrance", "Entrada privativa", "door"], ["free-parking", "Estacionamento privativo gratuito", "parking"],
        ]),
        amenityGroup("kitchen", "Cozinha Privativa", [
          ["kitchen", "Cozinha privativa", "kitchen"], ["coffee-maker", "Cafeteira", "coffee"], ["electric-kettle", "Chaleira elétrica", "kettle"],
          ["microwave", "Micro-ondas", "box"], ["oven", "Forno", "oven"], ["stove", "Cooktop", "fire"], ["toaster", "Torradeira", "box"],
          ["dining-table", "Mesa de jantar", "dining"], ["cookware", "Utensílios de cozinha", "cookware"],
        ]),
        amenityGroup("wellbeing", "Banheiro e Bem-Estar", [
          ["hot-tub", "Banheira de hidromassagem", "hot-tub"], ["bathtub", "Banheira", "bath"], ["shower", "Chuveiro", "shower"],
          ["hair-dryer", "Secador de cabelo", "hair-dryer"], ["towels", "Toalhas", "towel"], ["toiletries", "Produtos de higiene cortesia", "sparkles"],
        ]),
        amenityGroup("views", "Vistas e Áreas Externas", [
          ["garden-view", "Vista para o jardim", "leaf"], ["courtyard-view", "Vista para o pátio interno", "view"], ["balcony", "Varanda", "balcony"],
          ["terrace", "Terraço", "outdoors"], ["garden", "Jardim", "leaf"], ["barbecue", "Churrasqueira", "grill"], ["outdoor-dining", "Área para refeições ao ar livre", "dining"],
        ]),
        amenityGroup("comfort", "Conforto e Entretenimento", [
          ["air-conditioning", "Ar-condicionado", "snowflake"], ["indoor-fireplace", "Lareira", "fire"], ["heating", "Aquecimento", "thermometer"],
          ["wifi", "Wi-Fi gratuito", "wifi"], ["tv", "TV de tela plana", "tv"], ["streaming", "Serviços de streaming", "play"],
          ["washing-machine", "Máquina de lavar", "washing-machine"], ["dryer", "Secadora de roupas", "dryer"], ["board-games", "Jogos de tabuleiro", "game"],
        ]),
      ],
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
    drivingTime: driving.time,
    walkingDistance: walking.distance,
    walkingTime: walking.time,
    cyclingDistance: cycling.distance,
    cyclingTime: cycling.time,
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

function createAgendaBlocks() {
  const days = [
    agendaDay("agenda-oct-24", "2026-10-24", "Chegada", ["GIG → POA", "Aeroporto de Porto Alegre → Casa Sol da Serra"], ["Aeroporto", "", "Toro Gramado"]),
    agendaDay("agenda-oct-25", "2026-10-25", "Dia de Neve", ["Snowland"], ["Airbnb", "Snowland", "Airbnb"]),
    agendaDay("agenda-oct-26", "2026-10-26", "Jardims & Miniatures", ["Jardim do Amor", "Mini Mundo", "Praça Silvia Zorzanello"], ["", "Restaurante Höppner", "BOSKO PIZZERIA Napoletana"]),
    agendaDay("agenda-oct-27", "2026-10-27", "Centro Histórico", ["Rua Coberta Gramado", "Fonte do Amor Eterno", "Praça das Etnias"], ["", "Josephina Restaurante", "El Pasttelero Pastelaria - Gramado"]),
    agendaDay("agenda-oct-28", "2026-10-28", "À Beira do Lago", ["Lago Negro"], ["Airbnb", "Resto Bar Black Lake", ""]),
    agendaDay("agenda-oct-29", "2026-10-29", "Jardim Day", ["Jardim Park Gramado"], ["Airbnb", "Jardim Park Gramado", ""]),
    agendaDay("agenda-oct-30", "2026-10-30", "Lavanda e Vida Selvagem", ["Le Jardin Parque de Lavanda", "GramadoZoo"], ["São Pedro Casa de Pães e Café", "Le Jardin Parque de Lavanda", "Boteco do Gnomo"]),
    agendaDay("agenda-oct-31", "2026-10-31", "Parque Aquático", ["Acquamotion"], ["Airbnb", "Acquamotion", "Airbnb"]),
    agendaDay("agenda-nov-01", "2026-11-01", "Partida", ["Casa Sol da Serra → Aeroporto de Porto Alegre", "POA → GIG"], ["Airbnb", "Aeroporto", ""]),
  ];
  return [...days, contentBlock("agenda-saved-places", "saved-places", {
    title: "Outros Lugares para Conhecer",
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
    drivingDistance: "",
    drivingTime: "",
    walkingDistance: "",
    walkingTime: "",
    cyclingDistance: "",
    cyclingTime: "",
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
  };
}

function contentBlock(id, type, data) {
  return { id, type, cover: null, data };
}

function slug(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
