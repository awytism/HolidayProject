const MAX_RESULTS = 10;

function category(id, label) {
  return Object.freeze({ id, label });
}

export const AMENITY_CATEGORIES = Object.freeze([
  category("property-space", "Imóvel e espaços"),
  category("kitchen", "Cozinha"),
  category("bathroom-wellbeing", "Banheiro e bem-estar"),
  category("views", "Vistas"),
  category("outdoors", "Áreas externas"),
  category("comfort", "Conforto"),
  category("laundry", "Lavanderia"),
  category("entertainment-connectivity", "Entretenimento e conectividade"),
  category("family", "Família"),
  category("parking", "Estacionamento"),
  category("accessibility", "Acessibilidade"),
  category("policies", "Regras"),
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
  preset("entire-place", "Espaço inteiro", "property-space", "home", ["whole home", "private property", "casa inteira"]),
  preset("private-room", "Quarto privativo", "property-space", "door", ["bedroom", "quarto privativo"]),
  preset("dedicated-workspace", "Espaço de trabalho exclusivo", "property-space", "briefcase", ["office", "desk", "escritorio"]),
  preset("private-entrance", "Entrada privativa", "property-space", "door", ["separate entrance", "entrada privativa"]),
  preset("indoor-fireplace", "Lareira interna", "property-space", "fire", ["fireplace", "lareira"]),
  preset("central-location", "Localização central", "property-space", "map-pin", ["city centre", "downtown", "centro", "regiao central"]),
  preset("luggage-dropoff", "Depósito de bagagem permitido", "property-space", "luggage", ["bag drop", "luggage storage", "guarda-volumes"]),
  preset("long-term-stays", "Estadias longas permitidas", "property-space", "calendar", ["extended stay", "monthly stay", "estadias longas"]),

  preset("kitchen", "Cozinha", "kitchen", "kitchen", ["full kitchen", "cozinha"]),
  preset("refrigerator", "Geladeira", "kitchen", "snowflake", ["fridge", "geladeira", "frigorifico"]),
  preset("microwave", "Micro-ondas", "kitchen", "box", ["microwave oven", "micro-ondas"]),
  preset("oven", "Forno", "kitchen", "oven", ["forno"]),
  preset("stove", "Fogão", "kitchen", "fire", ["cooktop", "hob", "fogao"]),
  preset("dishwasher", "Lava-louças", "kitchen", "dishwasher", ["dish washing machine", "lava-loucas"]),
  preset("coffee-maker", "Cafeteira", "kitchen", "coffee", ["coffee machine", "cafeteira", "maquina de cafe"]),
  preset("electric-kettle", "Chaleira elétrica", "kitchen", "kettle", ["tea kettle", "chaleira eletrica"]),
  preset("toaster", "Torradeira", "kitchen", "box", ["torradeira"]),
  preset("blender", "Liquidificador", "kitchen", "cup", ["liquidizer", "liquidificador"]),
  preset("cookware", "Panelas e frigideiras", "kitchen", "cookware", ["cookware", "panelas"]),
  preset("dishes-cutlery", "Louças e talheres", "kitchen", "utensils", ["silverware", "tableware", "loucas e talheres"]),
  preset("cooking-basics", "Itens básicos para cozinhar", "kitchen", "salt", ["oil salt pepper", "basic ingredients", "itens basicos de cozinha"]),
  preset("dining-table", "Mesa de jantar", "kitchen", "dining", ["dining area", "mesa de jantar"]),

  preset("hot-tub", "Hidromassagem", "bathroom-wellbeing", "hot-tub", ["hydro", "hydromassage", "jacuzzi", "hidromassagem"]),
  preset("bathtub", "Banheira", "bathroom-wellbeing", "bath", ["bath", "banheira"]),
  preset("shower", "Chuveiro", "bathroom-wellbeing", "shower", ["walk-in shower", "chuveiro"]),
  preset("hair-dryer", "Secador de cabelo", "bathroom-wellbeing", "hair-dryer", ["blow dryer", "secador de cabelo"]),
  preset("shampoo", "Shampoo", "bathroom-wellbeing", "bottle", ["xampu"]),
  preset("conditioner", "Condicionador", "bathroom-wellbeing", "bottle", ["hair conditioner", "condicionador"]),
  preset("body-soap", "Sabonete corporal", "bathroom-wellbeing", "bottle", ["shower gel", "sabonete"]),
  preset("bidet", "Bidet", "bathroom-wellbeing", "droplets", ["bide"]),
  preset("hot-water", "Água quente", "bathroom-wellbeing", "droplets", ["heated water", "agua quente"]),
  preset("sauna", "Sauna", "bathroom-wellbeing", "sauna", ["steam room", "sauna a vapor"]),
  preset("towels", "Toalhas", "bathroom-wellbeing", "towel", ["bath towels", "toalhas"]),

  preset("mountain-view", "Vista para a montanha", "views", "mountain", ["hills view", "vista para a montanha"]),
  preset("garden-view", "Vista para o jardim", "views", "leaf", ["yard view", "vista para o jardim"]),
  preset("city-view", "Vista da cidade", "views", "building", ["skyline view", "vista da cidade"]),
  preset("courtyard-view", "Vista para o pátio", "views", "home", ["inner courtyard", "vista do patio"]),
  preset("lake-view", "Vista para o lago", "views", "waves", ["water view", "vista para o lago"]),
  preset("landmark-view", "Vista para ponto turístico", "views", "map-pin", ["attraction view", "vista para ponto turistico"]),

  preset("balcony", "Varanda", "outdoors", "balcony", ["private balcony", "sacada", "varanda"]),
  preset("patio", "Pátio", "outdoors", "home", ["terrace", "deck", "terraco"]),
  preset("backyard", "Quintal", "outdoors", "tree", ["garden", "yard", "quintal"]),
  preset("bbq-grill", "Churrasqueira", "outdoors", "grill", ["barbecue", "churrasqueira"]),
  preset("fire-pit", "Fogueira", "outdoors", "fire", ["outdoor fireplace", "fogueira"]),
  preset("outdoor-dining", "Área para refeições ao ar livre", "outdoors", "dining", ["alfresco dining", "refeicoes ao ar livre"]),
  preset("outdoor-furniture", "Móveis externos", "outdoors", "chair", ["patio furniture", "moveis externos"]),
  preset("hammock", "Rede", "outdoors", "hammock", ["rede de descanso"]),
  preset("bikes", "Bicicletas", "outdoors", "bike", ["bicycles", "bike access", "bicicletas"]),
  preset("private-pool", "Piscina privativa", "outdoors", "pool", ["swimming pool", "piscina privativa"]),
  preset("shared-pool", "Piscina compartilhada", "outdoors", "pool", ["communal pool", "piscina compartilhada"]),

  preset("air-conditioning", "Ar-condicionado", "comfort", "snowflake", ["ac", "air conditioner", "ar-condicionado"]),
  preset("heating", "Aquecimento", "comfort", "thermometer", ["central heating", "aquecimento"]),
  preset("fan", "Ventilador", "comfort", "fan", ["ceiling fan", "portable fan", "ventilador"]),
  preset("bed-linens", "Roupa de cama", "comfort", "bed", ["sheets", "bedding", "roupa de cama"]),
  preset("extra-pillows", "Travesseiros e cobertores extras", "comfort", "pillow", ["spare bedding", "travesseiros e cobertores"]),
  preset("blackout-shades", "Cortinas blackout", "comfort", "blinds", ["room-darkening shades", "cortinas blackout"]),
  preset("mosquito-net", "Mosquiteiro", "comfort", "shield", ["mosquito screen", "mosquiteiro"]),
  preset("cleaning-products", "Produtos de limpeza", "comfort", "spray", ["cleaning supplies", "produtos de limpeza"]),
  preset("safe", "Cofre", "comfort", "safe", ["security box", "cofre"]),

  preset("washer", "Máquina de lavar", "laundry", "washer", ["washing machine", "maquina de lavar"]),
  preset("dryer", "Secadora", "laundry", "dryer", ["tumble dryer", "secadora"]),
  preset("iron", "Ferro de passar", "laundry", "iron", ["clothes iron", "ferro de passar"]),
  preset("drying-rack", "Varal para roupas", "laundry", "clothesline", ["clothesline", "varal"]),
  preset("clothing-storage", "Guarda-roupa", "laundry", "wardrobe", ["wardrobe", "closet", "guarda-roupa"]),
  preset("laundromat-nearby", "Lavanderia próxima", "laundry", "map-pin", ["laundry nearby", "lavanderia proxima"]),

  preset("wifi", "Wi-Fi", "entertainment-connectivity", "wifi", ["wifi", "wireless internet", "internet sem fio"]),
  preset("tv", "TV", "entertainment-connectivity", "tv", ["television", "smart tv"]),
  preset("streaming-services", "Serviços de streaming", "entertainment-connectivity", "play", ["netflix", "video streaming"]),
  preset("sound-system", "Sistema de som", "entertainment-connectivity", "speaker", ["bluetooth speaker", "stereo", "sistema de som"]),
  preset("ethernet", "Conexão Ethernet", "entertainment-connectivity", "ethernet", ["wired internet", "cabo de rede"]),
  preset("books", "Livros e material de leitura", "entertainment-connectivity", "book", ["library", "livros"]),
  preset("board-games", "Jogos de tabuleiro", "entertainment-connectivity", "dice", ["tabletop games", "jogos de tabuleiro"]),
  preset("game-console", "Console de videogame", "entertainment-connectivity", "gamepad", ["video games", "videogame"]),

  preset("crib", "Berço", "family", "crib", ["cot", "berco"]),
  preset("high-chair", "Cadeira alta infantil", "family", "chair", ["baby chair", "cadeirao"]),
  preset("baby-bath", "Banheira para bebê", "family", "bath", ["infant tub", "banheira de bebe"]),
  preset("changing-table", "Trocador", "family", "baby", ["changing station", "trocador"]),
  preset("childrens-dinnerware", "Louça infantil", "family", "utensils", ["kids dishes", "louca infantil"]),
  preset("toys", "Livros e brinquedos infantis", "family", "toy", ["kids toys", "brinquedos infantis"]),
  preset("safety-gates", "Portões de segurança", "family", "gate", ["baby gates", "portoes de seguranca"]),

  preset("parking", "Estacionamento", "parking", "car", ["parking", "car space", "estacionamento"]),
  preset("parking-garage", "Garagem", "parking", "garage", ["parking garage", "covered parking", "garagem"]),
  preset("free-parking", "Estacionamento gratuito no local", "parking", "car", ["included parking", "estacionamento gratuito"]),
  preset("street-parking", "Estacionamento gratuito na rua", "parking", "map-pin", ["street parking", "on-street parking", "estacionamento na rua"]),
  preset("paid-parking", "Estacionamento pago", "parking", "coins", ["paid parking", "paid car park", "estacionamento pago"]),
  preset("ev-charger", "Carregador para veículo elétrico", "parking", "bolt", ["electric vehicle charger", "carregador eletrico"]),

  preset("step-free-entrance", "Entrada sem degraus", "accessibility", "accessibility", ["no-step entry", "entrada sem degraus"]),
  preset("accessible-parking", "Vaga de estacionamento acessível", "accessibility", "car", ["disabled parking", "vaga acessivel"]),
  preset("wide-entrance", "Entrada ampla", "accessibility", "door", ["wide doorway", "entrada ampla"]),
  preset("step-free-path", "Caminho sem degraus até a entrada", "accessibility", "path", ["level access", "caminho sem degraus"]),
  preset("single-level-home", "Casa térrea", "accessibility", "home", ["single storey", "casa terrea"]),
  preset("bathroom-grab-bars", "Barras de apoio no banheiro", "accessibility", "grab-bars", ["toilet grab rail", "barras de apoio"]),
  preset("shower-chair", "Cadeira de banho", "accessibility", "chair", ["bath seat", "cadeira de banho"]),
  preset("elevator", "Elevador", "accessibility", "elevator", ["lift", "elevador"]),

  preset("pets-allowed", "Aceita animais", "policies", "paw", ["pet friendly", "aceita animais"]),
  preset("smoking-allowed", "Permitido fumar", "policies", "smoking", ["smoking permitted", "permitido fumar"]),
  preset("events-allowed", "Eventos permitidos", "policies", "calendar", ["parties allowed", "eventos permitidos"]),
  preset("self-check-in", "Check-in autônomo", "policies", "key", ["independent check-in", "check-in autonomo"]),
  preset("host-greeting", "Recepção pelo anfitrião", "policies", "host", ["host welcome", "recepcao pelo anfitriao"]),
  preset("lockbox", "Cofre para chaves", "policies", "lockbox", ["key safe", "cofre de chaves"]),
  preset("quiet-hours", "Horário de silêncio", "policies", "moon", ["noise policy", "horario de silencio"]),
  preset("security-cameras", "Câmeras de segurança externas", "policies", "camera", ["outdoor cameras", "cameras de seguranca"]),
  preset("smoke-alarm", "Detector de fumaça", "policies", "bell", ["smoke detector", "detector de fumaca"]),
  preset("carbon-monoxide-alarm", "Detector de monóxido de carbono", "policies", "cloud", ["co alarm", "detector de monoxido de carbono"]),
  preset("first-aid-kit", "Kit de primeiros socorros", "policies", "first-aid", ["medical kit", "kit de primeiros socorros"]),
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
