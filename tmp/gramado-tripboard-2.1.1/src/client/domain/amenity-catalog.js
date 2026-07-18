const MAX_RESULTS = 10;

function category(id, label) {
  return Object.freeze({ id, label });
}

export const AMENITY_CATEGORIES = Object.freeze([
  category("property-space", "Property & space"),
  category("kitchen", "Kitchen"),
  category("bathroom-wellbeing", "Bathroom & wellbeing"),
  category("views", "Views"),
  category("outdoors", "Outdoors"),
  category("comfort", "Comfort"),
  category("laundry", "Laundry"),
  category("entertainment-connectivity", "Entertainment & connectivity"),
  category("family", "Family"),
  category("parking", "Parking"),
  category("accessibility", "Accessibility"),
  category("policies", "Policies"),
]);

function preset(id, label, categoryId, iconKey, aliases = []) {
  return Object.freeze({
    id,
    label,
    aliases: Object.freeze(aliases),
    iconKey,
    category: categoryId,
  });
}

export const AMENITY_CATALOG = Object.freeze([
  preset("entire-place", "Entire place", "property-space", "home", ["whole home", "private property", "casa inteira"]),
  preset("private-room", "Private room", "property-space", "door", ["bedroom", "quarto privativo"]),
  preset("dedicated-workspace", "Dedicated workspace", "property-space", "briefcase", ["office", "desk", "escritorio"]),
  preset("private-entrance", "Private entrance", "property-space", "door", ["separate entrance", "entrada privativa"]),
  preset("indoor-fireplace", "Indoor fireplace", "property-space", "fire", ["fireplace", "lareira"]),
  preset("central-location", "Central location", "property-space", "map-pin", ["city centre", "downtown", "centro", "regiao central"]),
  preset("luggage-dropoff", "Luggage drop-off allowed", "property-space", "luggage", ["bag drop", "luggage storage", "guarda-volumes"]),
  preset("long-term-stays", "Long-term stays allowed", "property-space", "calendar", ["extended stay", "monthly stay", "estadias longas"]),

  preset("kitchen", "Kitchen", "kitchen", "kitchen", ["full kitchen", "cozinha"]),
  preset("refrigerator", "Refrigerator", "kitchen", "snowflake", ["fridge", "geladeira", "frigorifico"]),
  preset("microwave", "Microwave", "kitchen", "box", ["microwave oven", "micro-ondas"]),
  preset("oven", "Oven", "kitchen", "oven", ["forno"]),
  preset("stove", "Stove", "kitchen", "fire", ["cooktop", "hob", "fogao"]),
  preset("dishwasher", "Dishwasher", "kitchen", "dishwasher", ["dish washing machine", "lava-loucas"]),
  preset("coffee-maker", "Coffee maker", "kitchen", "coffee", ["coffee machine", "cafeteira", "maquina de cafe"]),
  preset("electric-kettle", "Electric kettle", "kitchen", "kettle", ["tea kettle", "chaleira eletrica"]),
  preset("toaster", "Toaster", "kitchen", "box", ["torradeira"]),
  preset("blender", "Blender", "kitchen", "cup", ["liquidizer", "liquidificador"]),
  preset("cookware", "Pots and pans", "kitchen", "cookware", ["cookware", "panelas"]),
  preset("dishes-cutlery", "Dishes and cutlery", "kitchen", "utensils", ["silverware", "tableware", "loucas e talheres"]),
  preset("cooking-basics", "Cooking basics", "kitchen", "salt", ["oil salt pepper", "basic ingredients", "itens basicos de cozinha"]),
  preset("dining-table", "Dining table", "kitchen", "dining", ["dining area", "mesa de jantar"]),

  preset("hot-tub", "Hot tub", "bathroom-wellbeing", "hot-tub", ["hydro", "hydromassage", "jacuzzi", "hidromassagem"]),
  preset("bathtub", "Bathtub", "bathroom-wellbeing", "bath", ["bath", "banheira"]),
  preset("shower", "Shower", "bathroom-wellbeing", "shower", ["walk-in shower", "chuveiro"]),
  preset("hair-dryer", "Hair dryer", "bathroom-wellbeing", "hair-dryer", ["blow dryer", "secador de cabelo"]),
  preset("shampoo", "Shampoo", "bathroom-wellbeing", "bottle", ["xampu"]),
  preset("conditioner", "Conditioner", "bathroom-wellbeing", "bottle", ["hair conditioner", "condicionador"]),
  preset("body-soap", "Body soap", "bathroom-wellbeing", "bottle", ["shower gel", "sabonete"]),
  preset("bidet", "Bidet", "bathroom-wellbeing", "droplets", ["bide"]),
  preset("hot-water", "Hot water", "bathroom-wellbeing", "droplets", ["heated water", "agua quente"]),
  preset("sauna", "Sauna", "bathroom-wellbeing", "sauna", ["steam room", "sauna a vapor"]),
  preset("towels", "Towels", "bathroom-wellbeing", "towel", ["bath towels", "toalhas"]),

  preset("mountain-view", "Mountain view", "views", "mountain", ["hills view", "vista para a montanha"]),
  preset("garden-view", "Garden view", "views", "leaf", ["yard view", "vista para o jardim"]),
  preset("city-view", "City view", "views", "building", ["skyline view", "vista da cidade"]),
  preset("courtyard-view", "Courtyard view", "views", "home", ["inner courtyard", "vista do patio"]),
  preset("lake-view", "Lake view", "views", "waves", ["water view", "vista para o lago"]),
  preset("landmark-view", "Landmark view", "views", "map-pin", ["attraction view", "vista para ponto turistico"]),

  preset("balcony", "Balcony", "outdoors", "balcony", ["private balcony", "sacada", "varanda"]),
  preset("patio", "Patio", "outdoors", "home", ["terrace", "deck", "terraco"]),
  preset("backyard", "Backyard", "outdoors", "tree", ["garden", "yard", "quintal"]),
  preset("bbq-grill", "BBQ grill", "outdoors", "grill", ["barbecue", "churrasqueira"]),
  preset("fire-pit", "Fire pit", "outdoors", "fire", ["outdoor fireplace", "fogueira"]),
  preset("outdoor-dining", "Outdoor dining area", "outdoors", "dining", ["alfresco dining", "refeicoes ao ar livre"]),
  preset("outdoor-furniture", "Outdoor furniture", "outdoors", "chair", ["patio furniture", "moveis externos"]),
  preset("hammock", "Hammock", "outdoors", "hammock", ["rede de descanso"]),
  preset("bikes", "Bikes", "outdoors", "bike", ["bicycles", "bike access", "bicicletas"]),
  preset("private-pool", "Private pool", "outdoors", "pool", ["swimming pool", "piscina privativa"]),
  preset("shared-pool", "Shared pool", "outdoors", "pool", ["communal pool", "piscina compartilhada"]),

  preset("air-conditioning", "Air conditioning", "comfort", "snowflake", ["ac", "air conditioner", "ar-condicionado"]),
  preset("heating", "Heating", "comfort", "thermometer", ["central heating", "aquecimento"]),
  preset("fan", "Fan", "comfort", "fan", ["ceiling fan", "portable fan", "ventilador"]),
  preset("bed-linens", "Bed linens", "comfort", "bed", ["sheets", "bedding", "roupa de cama"]),
  preset("extra-pillows", "Extra pillows and blankets", "comfort", "pillow", ["spare bedding", "travesseiros e cobertores"]),
  preset("blackout-shades", "Blackout shades", "comfort", "blinds", ["room-darkening shades", "cortinas blackout"]),
  preset("mosquito-net", "Mosquito net", "comfort", "shield", ["mosquito screen", "mosquiteiro"]),
  preset("cleaning-products", "Cleaning products", "comfort", "spray", ["cleaning supplies", "produtos de limpeza"]),
  preset("safe", "Safe", "comfort", "safe", ["security box", "cofre"]),

  preset("washer", "Washer", "laundry", "washer", ["washing machine", "maquina de lavar"]),
  preset("dryer", "Dryer", "laundry", "dryer", ["tumble dryer", "secadora"]),
  preset("iron", "Iron", "laundry", "iron", ["clothes iron", "ferro de passar"]),
  preset("drying-rack", "Drying rack", "laundry", "clothesline", ["clothesline", "varal"]),
  preset("clothing-storage", "Clothing storage", "laundry", "wardrobe", ["wardrobe", "closet", "guarda-roupa"]),
  preset("laundromat-nearby", "Laundromat nearby", "laundry", "map-pin", ["laundry nearby", "lavanderia proxima"]),

  preset("wifi", "Wi-Fi", "entertainment-connectivity", "wifi", ["wifi", "wireless internet", "internet sem fio"]),
  preset("tv", "TV", "entertainment-connectivity", "tv", ["television", "smart tv"]),
  preset("streaming-services", "Streaming services", "entertainment-connectivity", "play", ["netflix", "video streaming"]),
  preset("sound-system", "Sound system", "entertainment-connectivity", "speaker", ["bluetooth speaker", "stereo", "sistema de som"]),
  preset("ethernet", "Ethernet connection", "entertainment-connectivity", "ethernet", ["wired internet", "cabo de rede"]),
  preset("books", "Books and reading material", "entertainment-connectivity", "book", ["library", "livros"]),
  preset("board-games", "Board games", "entertainment-connectivity", "dice", ["tabletop games", "jogos de tabuleiro"]),
  preset("game-console", "Game console", "entertainment-connectivity", "gamepad", ["video games", "videogame"]),

  preset("crib", "Crib", "family", "crib", ["cot", "berco"]),
  preset("high-chair", "High chair", "family", "chair", ["baby chair", "cadeirao"]),
  preset("baby-bath", "Baby bath", "family", "bath", ["infant tub", "banheira de bebe"]),
  preset("changing-table", "Changing table", "family", "baby", ["changing station", "trocador"]),
  preset("childrens-dinnerware", "Children's dinnerware", "family", "utensils", ["kids dishes", "louca infantil"]),
  preset("toys", "Children's books and toys", "family", "toy", ["kids toys", "brinquedos infantis"]),
  preset("safety-gates", "Safety gates", "family", "gate", ["baby gates", "portoes de seguranca"]),

  preset("parking", "Parking", "parking", "car", ["car space", "estacionamento"]),
  preset("parking-garage", "Parking garage", "parking", "garage", ["covered parking", "garagem"]),
  preset("free-parking", "Free parking on premises", "parking", "car", ["included parking", "estacionamento gratuito"]),
  preset("street-parking", "Free street parking", "parking", "map-pin", ["on-street parking", "estacionamento na rua"]),
  preset("paid-parking", "Paid parking", "parking", "coins", ["paid car park", "estacionamento pago"]),
  preset("ev-charger", "EV charger", "parking", "bolt", ["electric vehicle charger", "carregador eletrico"]),

  preset("step-free-entrance", "Step-free entrance", "accessibility", "accessibility", ["no-step entry", "entrada sem degraus"]),
  preset("accessible-parking", "Accessible parking space", "accessibility", "car", ["disabled parking", "vaga acessivel"]),
  preset("wide-entrance", "Wide entrance", "accessibility", "door", ["wide doorway", "entrada ampla"]),
  preset("step-free-path", "Step-free path to entrance", "accessibility", "path", ["level access", "caminho sem degraus"]),
  preset("single-level-home", "Single-level home", "accessibility", "home", ["single storey", "casa terrea"]),
  preset("bathroom-grab-bars", "Bathroom grab bars", "accessibility", "grab-bars", ["toilet grab rail", "barras de apoio"]),
  preset("shower-chair", "Shower chair", "accessibility", "chair", ["bath seat", "cadeira de banho"]),
  preset("elevator", "Elevator", "accessibility", "elevator", ["lift", "elevador"]),

  preset("pets-allowed", "Pets allowed", "policies", "paw", ["pet friendly", "aceita animais"]),
  preset("smoking-allowed", "Smoking allowed", "policies", "smoking", ["smoking permitted", "permitido fumar"]),
  preset("events-allowed", "Events allowed", "policies", "calendar", ["parties allowed", "eventos permitidos"]),
  preset("self-check-in", "Self check-in", "policies", "key", ["independent check-in", "check-in autonomo"]),
  preset("host-greeting", "Host greets you", "policies", "host", ["host welcome", "recepcao pelo anfitriao"]),
  preset("lockbox", "Lockbox", "policies", "lockbox", ["key safe", "cofre de chaves"]),
  preset("quiet-hours", "Quiet hours", "policies", "moon", ["noise policy", "horario de silencio"]),
  preset("security-cameras", "Exterior security cameras", "policies", "camera", ["outdoor cameras", "cameras de seguranca"]),
  preset("smoke-alarm", "Smoke alarm", "policies", "bell", ["smoke detector", "detector de fumaca"]),
  preset("carbon-monoxide-alarm", "Carbon monoxide alarm", "policies", "cloud", ["co alarm", "detector de monoxido de carbono"]),
  preset("first-aid-kit", "First aid kit", "policies", "first-aid", ["medical kit", "kit de primeiros socorros"]),
]);

export function normalizeAmenitySearch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function searchAmenities(query, options = {}) {
  const normalizedQuery = normalizeAmenitySearch(query);
  const settings = options && typeof options === "object" ? options : {};
  const excluded = toIdSet(settings.selectedIds);
  const categoryId = normalizeCategory(settings.category);

  return AMENITY_CATALOG
    .map((item, index) => match(item, index, normalizedQuery))
    .filter((candidate) => candidate.rank !== Infinity)
    .filter((candidate) => !excluded.has(candidate.item.id))
    .filter((candidate) => !categoryId || candidate.item.category === categoryId)
    .sort(compareMatches)
    .slice(0, MAX_RESULTS)
    .map((candidate) => candidate.item);
}

function match(item, index, query) {
  return { item, index, rank: matchRank(item, query) };
}

function matchRank(item, query) {
  if (!query) return 0;
  const label = normalizeAmenitySearch(item.label);
  if (label === query) return 0;
  if (label.startsWith(query)) return 1;
  if (label.includes(query)) return 2;
  const aliases = item.aliases.map(normalizeAmenitySearch);
  if (aliases.some((alias) => alias === query)) return 3;
  if (aliases.some((alias) => alias.startsWith(query))) return 4;
  if (aliases.some((alias) => alias.includes(query))) return 5;
  return Infinity;
}

function normalizeCategory(value) {
  return normalizeAmenitySearch(value)
    .replace(/\s*(?:&|\/)\s*/g, "-")
    .replace(/\s+/g, "-");
}

function toIdSet(value) {
  if (Array.isArray(value) || value instanceof Set) return new Set(value);
  return new Set();
}

function compareMatches(left, right) {
  return left.rank - right.rank || left.index - right.index;
}
