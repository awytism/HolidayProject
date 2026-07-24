import { EDITOR_PAIRS } from "./editor-i18n.js";
import { PREFERENCE_PAIRS } from "./preference-i18n.js";
import { LEGACY_PORTUGUESE_ALIASES } from "./legacy-portuguese-i18n.js";
import { createCanonicalTranslation } from "./canonical-translation.js";
import { updateLanguageButtonStates } from "./language-controls.js";
import { MEAL_CUISINE_PAIRS, PLACE_DESCRIPTION_PAIRS } from "../../shared/place-descriptions.mjs";

const STORAGE_KEY = "tripboard-language";
const DEFAULT_LOCALE = "en-GB";
const SUPPORTED_LOCALES = new Set([DEFAULT_LOCALE, "pt-BR"]);

const PAIRS = [
  ...[...PLACE_DESCRIPTION_PAIRS, ...MEAL_CUISINE_PAIRS].map(([, english, portuguese]) => [english, portuguese]),
  ["Travel Plan", "Travel Plan"],
  ["Holidays", "Holidays"],
  ["Go to Transport", "Ir para transporte"],
  ["Trip sections", "Seções da viagem"],
  ["Itinerary dates", "Datas do roteiro"],
  ["Agenda dates", "Datas da agenda"],
  ["Transport", "Transporte"],
  ["Accommodation", "Hospedagem"],
  ["Transit", "Transporte"],
  ["Our Next Adventure", "Nossa próxima aventura"],
  ["Duration", "Duração"],
  ["Agenda", "Agenda"],

  ["Edit", "Editar"],
  ["Save", "Salvar"],
  ["Cancel", "Cancelar"],
  ["Loading your trip…", "Carregando sua viagem…"],
  ["Could not load Travel Plan", "Não foi possível carregar o Travel Plan"],
  ["Changes saved securely", "Alterações salvas com segurança"],
  ["Changes discarded", "Alterações descartadas"],
  ["This trip was changed elsewhere. Reload before saving.", "Esta viagem foi alterada em outro lugar. Recarregue antes de salvar."],
  ["Your editing session expired. Start editing again.", "Sua sessão de edição expirou. Comece a editar novamente."],
  ["Local edits loaded. Edit and save to migrate them.", "Edições locais carregadas. Edite e salve para migrá-las."],
  ...PREFERENCE_PAIRS,
  ["Enable dark mode", "Ativar modo escuro"],
  ["Enable light mode", "Ativar modo claro"],
  ["Scroll to top", "Voltar ao topo"],
  ["Start", "Início"],
  ["End", "Fim"],
  ["Trip start date", "Data de início da viagem"],
  ["Trip end date", "Data de fim da viagem"],
  ["days", "dias"], ["1 day", "1 dia"],
  ["legs", "trechos"], ["1 leg", "1 trecho"],
  ["nights", "noites"],
  ["Entire Holiday Home", "Casa de férias inteira"],
  ["Amazing House with Hot Tub and Bikes", "Incrível Casa com Hidro e Bikes"],
  ["3 bedrooms", "3 quartos"],
  ["4 beds", "4 camas"],
  ["2 bathrooms", "2 banheiros"],
  ["Check-in", "Entrada"],
  ["Check-out", "Saída"],
  ["Time to confirm", "Horário a confirmar"],
  ["Amenities", "Comodidades"],
  ["From Casa Sol da Serra", "A partir da Casa Sol da Serra"],
  ["From Casa do Sol", "A partir da Casa do Sol"],
  ["Accommodation Layout", "Distribuição da hospedagem"],
  ["Listing Highlights", "Destaques do anúncio"],
  ["Sleep and Laundry", "Quartos e lavanderia"],
  ["Bath and Spa", "Banho e spa"],
  ["Home Comforts", "Confortos da casa"],
  ["Work and Play", "Trabalho e lazer"],
  ["Outdoor Living", "Vida ao ar livre"],
  ["Kitchen & Dining", "Cozinha e refeições"],
  ["Fully equipped kitchen", "Cozinha completa"],
  ["Oven, hob and microwave", "Forno, cooktop e micro-ondas"],
  ["Coffee and tea station", "Estação de café e chá"],
  ["Cookware and dining area", "Louças e área de refeições"],
  ["Bed linens and wardrobes", "Roupas de cama e armários"],
  ["Sofa bed", "Sofá-cama"],
  ["Washer and tumble dryer", "Lavadora e secadora"],
  ["Ironing essentials", "Itens para passar roupa"],
  ["Two private bathrooms", "Dois banheiros privativos"],
  ["Private Jacuzzi and spa", "Jacuzzi privativa e spa"],
  ["Towels and bathrobes", "Toalhas e roupões"],
  ["Hairdryer and toiletries", "Secador e itens de higiene"],
  ["Sofa and seating area", "Sofá e área de estar"],
  ["Fireplace and heating", "Lareira e aquecimento"],
  ["Air conditioning and fan", "Ar-condicionado e ventilador"],
  ["Smoke-free home", "Casa livre de fumo"],
  ["Fast, free Wi-Fi", "Wi-Fi rápido e gratuito"],
  ["Cable and satellite TV", "TV a cabo e via satélite"],
  ["Dedicated workspace", "Espaço de trabalho"],
  ["Video games", "Videogames"],
  ["Garden, terrace and deck", "Jardim, terraço e deck"],
  ["Balcony and patio seating", "Assentos na varanda e pátio"],
  ["Barbecue and picnic area", "Churrasco e piquenique"],
  ["Courtyard and local views", "Pátio e vistas locais"],
  ["Complete kitchen ready for everyday cooking", "Cozinha completa para cozinhar no dia a dia"],
  ["Oven, stovetop and microwave for easy meals", "Forno, cooktop e micro-ondas para refeições"],
  ["Coffee, tea and toast station for breakfast", "Estação de café, chá e torradas no café da manhã"],
  ["Cookware, tableware and dedicated dining space", "Panelas, louças e espaço próprio para refeições"],
  ["Fresh bed linens and spacious wardrobes", "Roupas de cama limpas e guarda-roupas amplos"],
  ["Sofa bed with flexible extra sleeping space", "Sofá-cama com espaço extra para dormir"],
  ["Washer, tumble dryer and indoor drying rack", "Lavadora, secadora e varal interno para roupas"],
  ["Iron and ironing facilities for longer stays", "Ferro e estrutura para passar roupas na estadia"],
  ["Two private bathrooms for added convenience", "Dois banheiros privativos para maior conforto"],
  ["Private Jacuzzi and a relaxing spa lounge", "Jacuzzi privativa e lounge relaxante de spa"],
  ["Fresh towels, soft bathrobes and toiletries", "Toalhas, roupões macios e itens de higiene"],
  ["Hairdryer and useful bathroom essentials", "Secador e itens práticos para o banheiro"],
  ["Comfortable sofa and a generous seating area", "Sofá confortável e ampla área de estar"],
  ["Indoor fireplace and heating for cool evenings", "Lareira interna e aquecimento para noites frias"],
  ["Air conditioning and fan for everyday comfort", "Ar-condicionado e ventilador para mais conforto"],
  ["Entirely smoke-free home for a fresher stay", "Casa totalmente livre de fumo durante a estadia"],
  ["Fast, free Wi-Fi available throughout the house", "Wi-Fi rápido e gratuito disponível em toda a casa"],
  ["Flat-screen TV with cable and satellite channels", "TV de tela plana com canais a cabo e via satélite"],
  ["Dedicated workspace for remote work and planning", "Espaço dedicado para trabalhar e planejar passeios"],
  ["Video games for relaxed evenings at home", "Videogames para noites tranquilas em casa"],
  ["Landscaped garden with terrace and sunny deck", "Jardim paisagístico com terraço e deck ensolarado"],
  ["Balcony and patio with comfortable outdoor seating", "Varanda e pátio com assentos externos confortáveis"],
  ["Barbecue, picnic and outdoor dining spaces", "Áreas para churrasco, piquenique e refeições"],
  ["Peaceful courtyard and local landmark views", "Vistas do pátio e dos pontos turísticos locais"],
  ["Fully equipped kitchen", "Cozinha completa"],
  ["Oven, stovetop & microwave", "Forno, cooktop e micro-ondas"],
  ["Coffee & tea maker, kettle & toaster", "Cafeteira, chaleira e torradeira"],
  ["Breakfast station for coffee, tea and toast", "Estação de café da manhã para café, chá e torradas"],
  ["Cookware, kitchenware & dining table", "Panelas, utensílios e mesa de jantar"],
  ["Cookware, tableware & dining area", "Panelas, louças e área de refeições"],
  ["Kitchen", "Cozinha"],
  ["Dining table", "Mesa de jantar"],
  ["Coffee and tea maker", "Cafeteira e máquina de chá"],
  ["Toaster", "Torradeira"],
  ["Stovetop", "Cooktop"],
  ["Kitchenware", "Utensílios de cozinha"],
  ["Dining area", "Área de refeições"],
  ["Bedroom & Laundry", "Quartos e lavanderia"],
  ["Linens, wardrobe & clothes rack", "Roupa de cama, guarda-roupa e cabideiro"],
  ["Bed linen, wardrobe & clothes storage", "Roupa de cama, guarda-roupa e espaço para roupas"],
  ["Bed linens, wardrobes & clothes storage", "Roupas de cama, guarda-roupas e espaço para roupas"],
  ["Bed linens & wardrobes", "Roupas de cama e guarda-roupas"],
  ["Sofa bed & extra sleeping space", "Sofá-cama e espaço adicional para dormir"],
  ["Washing machine & dryer", "Máquina de lavar e secadora"],
  ["Washing machine, tumble dryer & drying rack", "Máquina de lavar, secadora e varal"],
  ["Iron & ironing facilities", "Ferro e comodidades para passar roupa"],
  ["Clothing drying rack", "Varal para roupas"],
  ["Linens", "Roupa de cama"],
  ["Wardrobe or closet", "Guarda-roupa ou armário"],
  ["Sofa bed", "Sofá-cama"],
  ["Drying rack for clothing", "Varal para roupas"],
  ["Clothes rack", "Cabideiro"],
  ["Ironing facilities", "Comodidades para passar roupa"],
  ["Iron", "Ferro de passar"],
  ["Washing machine", "Máquina de lavar"],
  ["Bathroom & Wellness", "Banheiro e bem-estar"],
  ["Private bathroom, bath & shower", "Banheiro privativo, banheira e chuveiro"],
  ["Two private bathrooms with bath, shower & additional toilet", "Dois banheiros privativos com banheira, chuveiro e banheiro adicional"],
  ["Two private bathrooms", "Dois banheiros privativos"],
  ["Hot tub / Jacuzzi & spa lounge", "Hidromassagem / Jacuzzi e lounge do spa"],
  ["Towels & bathrobes", "Toalhas e roupões"],
  ["Towels, bathrobes & toiletries", "Toalhas, roupões e produtos de higiene"],
  ["Hairdryer & free toiletries", "Secador e produtos de higiene gratuitos"],
  ["Toilet, additional toilet & toilet paper", "Vaso sanitário, banheiro adicional e papel higiênico"],
  ["Toilet paper", "Papel higiênico"],
  ["Additional toilet", "Banheiro adicional"],
  ["Private bathroom", "Banheiro privativo"],
  ["Toilet", "Vaso sanitário"],
  ["Free toiletries", "Produtos de higiene pessoal gratuitos"],
  ["Hot tub / Jacuzzi", "Banheira de hidromassagem / Jacuzzi"],
  ["Bathrobe", "Roupão"],
  ["Hairdryer", "Secador de cabelo"],
  ["Bath", "Banheira"],
  ["Spa lounge / relaxation area", "Lounge do spa / área de relaxamento"],
  ["Living & Comfort", "Sala e conforto"],
  ["Sofa & seating area", "Sofá e área de estar"],
  ["Sofa & comfortable seating area", "Sofá e área de estar confortável"],
  ["Fireplace & heating", "Lareira e aquecimento"],
  ["Indoor fireplace & heating", "Lareira interna e aquecimento"],
  ["Air conditioning & fan", "Ar-condicionado e ventilador"],
  ["Desk & bedside sockets", "Escrivaninha e tomadas ao lado da cama"],
  ["Sofa", "Sofá"],
  ["Fireplace", "Lareira"],
  ["Seating area", "Área de estar"],
  ["Desk", "Escrivaninha"],
  ["Socket near the bed", "Tomada perto da cama"],
  ["Fan", "Ventilador"],
  ["Smoke-free property with non-smoking rooms", "Propriedade livre de fumo com quartos para não fumantes"],
  ["Smoke-free home with non-smoking rooms", "Casa livre de fumo com quartos para não fumantes"],
  ["Smoke-free home", "Casa livre de fumo"],
  ["Media & Technology", "Mídia e tecnologia"],
  ["Free Wi-Fi throughout", "Wi-Fi gratuito em todas as áreas"],
  ["Streaming service (like Netflix)", "Serviço de streaming (como Netflix)"],
  ["Streaming services such as Netflix", "Serviços de streaming como Netflix"],
  ["Flat-screen TV", "TV de tela plana"],
  ["Flat-screen TV with cable, satellite & pay-per-view channels", "TV de tela plana com canais a cabo, via satélite e pay-per-view"],
  ["Flat-screen TV with cable & satellite", "TV de tela plana com canais a cabo e via satélite"],
  ["Cable channels", "Canais a cabo"],
  ["Cable & satellite channels", "Canais a cabo e via satélite"],
  ["Satellite channels", "Canais via satélite"],
  ["Pay-per-view channels", "Canais pay-per-view"],
  ["Video games", "Videogames"],
  ["Outdoors & Views", "Áreas externas e vistas"],
  ["Garden, terrace & sun deck", "Jardim, terraço e solário"],
  ["Landscaped garden, terrace & sun deck", "Jardim paisagístico, terraço e solário"],
  ["Balcony, patio & outdoor furniture", "Varanda, pátio e móveis externos"],
  ["Outdoor dining & picnic area", "Área para refeições externas e piquenique"],
  ["Outdoor dining, picnic area & barbecue", "Área para refeições ao ar livre, piquenique e churrasqueira"],
  ["Courtyard, garden & landmark views", "Vistas para o pátio, jardim e pontos turísticos"],
  ["Courtyard & landmark views", "Vistas para o pátio e pontos turísticos"],
  ["Picnic area", "Área para piquenique"],
  ["Outdoor dining area", "Área para refeições ao ar livre"],
  ["Sun deck", "Terraço ao ar livre"],
  ["Barbecue / BBQ facilities", "Churrasqueira"],
  ["Terrace", "Terraço"],
  ["Garden", "Jardim"],
  ["Inner courtyard view", "Vista para o pátio interno"],
  ["Landmark view", "Vista para ponto turístico"],
  ["Family & Play", "Família e lazer"],
  ["Family rooms", "Quartos para famílias"],
  ["Children's high chair", "Cadeira alta infantil"],
  ["Outdoor play equipment for kids", "Equipamentos de lazer ao ar livre para crianças"],
  ["Indoor play area", "Área de lazer interna"],
  ["Board games / puzzles", "Jogos de tabuleiro / quebra-cabeças"],
  ["Video games", "Videogames"],
  ["Parking, Transport & Activities", "Estacionamento, transporte e atividades"],
  ["Free private parking on site (no reservation needed)", "Estacionamento privativo gratuito no local (sem necessidade de reserva)"],
  ["Parking garage", "Garagem"],
  ["Bike tours", "Passeios de bicicleta"],
  ["Bicycle rental", "Aluguel de bicicletas"],
  ["Pets", "Animais de estimação"],
  ["Pets allowed on request (charges may apply)", "Animais de estimação permitidos mediante solicitação (pode haver custos)"],
  ["Pet bowls", "Tigelas para animais de estimação"],
  ["Pet basket", "Cama para animais de estimação"],
  ["Property, Accessibility & Services", "Imóvel, acessibilidade e serviços"],
  ["Upper floors accessible by stairs only", "Andares superiores acessíveis somente por escadas"],
  ["Detached / semi-detached property", "Imóvel independente / geminado"],
  ["Invoice provided", "Nota fiscal fornecida"],
  ["Key access", "Acesso com chave"],
  ["English, Spanish and Portuguese spoken", "Idiomas falados: inglês, espanhol e português"],
  ["Household Essentials", "Itens essenciais da casa"],
  ["Dishes and cutlery", "Louças e talheres"],
  ["Cooking basics", "Itens básicos para cozinhar"],
  ["Stove", "Cooktop"],
  ["Oven", "Forno"],
  ["Microwave", "Micro-ondas"],
  ["Coffee maker", "Cafeteira"],
  ["Electric kettle", "Chaleira elétrica"],
  ["BBQ grill", "Churrasqueira"],
  ["Washer", "Máquina de lavar"],
  ["Dryer", "Secadora"],
  ["Bathroom", "Banheiro"],
  ["Shower", "Chuveiro"],
  ["Hot tub", "Banheira de hidromassagem"],
  ["Towels", "Toalhas"],
  ["Bathrobes", "Roupões"],
  ["Hot water", "Água quente"],
  ["Hair dryer", "Secador de cabelo"],
  ["Shampoo", "Xampu"],
  ["Conditioner", "Condicionador"],
  ["Body soap", "Sabonete corporal"],
  ["Indoor Comfort", "Conforto interno"],
  ["Indoor fireplace", "Lareira interna"],
  ["Heating", "Aquecimento"],
  ["Air conditioning", "Ar-condicionado"],
  ["Game console", "Console de jogos"],
  ["Dedicated workspace", "Espaço de trabalho"],
  ["Outdoor Spaces", "Áreas externas"],
  ["Balcony", "Varanda"],
  ["Garden view", "Vista para o jardim"],
  ["Backyard", "Quintal"],
  ["Patio", "Pátio"],
  ["Outdoor furniture", "Móveis externos"],
  ["Bikes", "Bicicletas"],
  ["Outbound", "Ida"],
  ["Return", "Volta"],
  ["Direct", "Direto"],
  ["To confirm", "A confirmar"],
  ["Arrival", "Chegada"],
  ["Water Park", "Parque aquático"],
  ["Historic Centre", "Centro histórico"],
  ["Parks & Plazas", "Parques e praças"],
  ["Open/Rest Day", "Dia livre/descanso"],
  ["Gardens", "Jardins"],
  ["Lakeside, Chocolates & Beer", "Lago, chocolates e cerveja"],
  ["Snow Day", "Dia na neve"],
  ["Departure", "Partida"],
  ["Gramado Picks", "Dicas de Gramado"],
  ["Other Places", "Outros lugares"],
  ["Other Places of Interest", "Outros lugares de interesse"],
  ["Local Shortlist", "Seleção local"],
  ["Restaurants and landmarks worth keeping close.", "Restaurantes e pontos turísticos para ter sempre à mão."],
  ["Restaurants", "Restaurantes"],
  ["Restaurant", "Restaurante"],
  ["Landmarks", "Pontos turísticos"],
  ["Landmark", "Ponto Turístico"],
  ["Category", "Categoria"],
  ["Place category", "Categoria do lugar"],
  ["No saved places yet.", "Nenhum lugar salvo ainda."],
  ["+ Add Place", "+ Adicionar lugar"],
  ["Place(s)", "Lugar(es)"],
  ["Meals", "Refeições"],
  ["Meal(s)", "Refeição(ões)"],
  ["Breakfast", "Café da manhã"],
  ["Lunch", "Almoço"],
  ["Dinner", "Jantar"],
  ["Notes:", "Observações:"],
  ["No additional notes.", "Nenhuma observação adicional."],
  ["No places planned.", "Nenhum lugar planejado."],
  ["No meals planned.", "Nenhuma refeição planejada."],
  ["No saved places.", "Nenhum lugar salvo."],
  ["Open", "Em aberto"],
  ["Attachments", "Anexos"],
  ["Download transport attachment", "Baixar anexo do transporte"],
  ["No attachment is available for this transport yet.", "Ainda não há anexo disponível para este transporte."],
  ["Download accommodation attachment", "Baixar anexo da hospedagem"],
  ["No attachment is available for this accommodation yet.", "Ainda não há anexo disponível para esta hospedagem."],
  ["Download agenda attachment", "Baixar anexo da agenda"],
  ["No attachment is available for this agenda item yet.", "Ainda não há anexo disponível para este item da agenda."],
  ["No attachment is available yet.", "Ainda não há anexo disponível."],
  ["Travel documents", "Documentos da viagem"],
  ["Choose an attachment", "Escolha um anexo"],
  ["Protected download", "Download protegido"],
  ["Enter the attachment password", "Digite a senha do anexo"],
  ["Attachment password", "Senha do anexo"],
  ["Password", "Senha"],
  ["Download", "Baixar"],
  ["Incorrect password. Please try again.", "Senha incorreta. Tente novamente."],
  ["Attachment downloaded securely.", "Anexo baixado com segurança."],
  ["Unlock to view", "Desbloqueie para visualizar"],
  ["No attachments yet.", "Nenhum anexo ainda."],
  ["Add Attachment", "Adicionar anexo"],
  ["Up to 50 MB per file", "Até 50 MB por arquivo"],
  ["file", "arquivo"],
  ["files", "arquivos"],
  ["High", "Alta"],
  ["Medium", "Média"],
  ["Low", "Baixa"],
  ["High priority", "Prioridade alta"],
  ["Medium priority", "Prioridade média"],
  ["Low priority", "Prioridade baixa"],
  ["Driving", "De carro"],
  ["Walking", "A pé"],
  ["Cycling", "De bicicleta"],
  ["Driving distance", "Distância de carro"],
  ["Cycling distance", "Distância de bicicleta"],
  ["Walking distance", "Distância a pé"],
  ["Distance not set", "Distância não informada"],
  ["Driving time", "Tempo de carro"],
  ["Cycling time", "Tempo de bicicleta"],
  ["Walking time", "Tempo a pé"],
  ["Change travel mode", "Alterar modo de deslocamento"],
  ["Priority", "Prioridade"],
  ["Title", "Título"],
  ["Description", "Descrição"],
  ["Date", "Data"],
  ["Direction", "Direção"],
  ["Company", "Empresa"],
  ["Departure time", "Horário de Partida"],
  ["Arrival time", "Horário de Chegada"],
  ["Origin", "Origem"],
  ["Destination", "Destino"],
  ["Origin city", "Cidade de Origem"],
  ["Destination city", "Cidade de Destino"],
  ["Stops", "Paradas"],
  ["Seats", "Assentos"],
  ["Details", "Detalhes"],
  ["Website URL", "URL do site"],
  ["Cover image", "Imagem de capa"],
  ["Close", "Fechar"],
  ["Cover Image", "Imagem de capa"],
  ["Choose an Image", "Escolher uma imagem"],
  ["Upload JPEG, PNG or WebP", "Enviar JPEG, PNG ou WebP"],
  ["Maximum 8 MB and 20 megapixels", "Máximo de 8 MB e 20 megapixels"],
  ["or", "ou"],
  ["Image HTTPS URL", "URL HTTPS da imagem"],
  ["Alternative Text", "Texto alternativo"],
  ["Describe the image", "Descreva a imagem"],
  ["Focus Position", "Posição do foco"],
  ["Centre", "Centro"],
  ["Top", "Topo"],
  ["Bottom", "Base"],
  ["Left", "Esquerda"],
  ["Right", "Direita"],
  ["Remove", "Remover"],
  ["Use Image", "Usar imagem"],
  ["Uploading...", "Enviando..."],
  ["Enter an HTTPS image URL or choose a file", "Digite uma URL HTTPS de imagem ou escolha um arquivo"],
  ["The image must be 8 MB or smaller", "A imagem deve ter no máximo 8 MB"],
  ["Cover image removed. Save your changes to keep this update.", "Imagem de capa removida. Salve as alterações para manter esta atualização."],
  ["Cover image applied. Save your changes to keep it.", "Imagem de capa aplicada. Salve as alterações para mantê-la."],
  ["Provider Image", "Imagem da companhia"],
  ["Add Provider Image", "Adicionar imagem da companhia"],
  ["Change Provider Image", "Trocar imagem da companhia"],
  ["Origin Image", "Imagem da origem"],
  ["Destination Image", "Imagem do destino"],
  ["Add Origin Image", "Adicionar imagem da origem"],
  ["Change Origin Image", "Trocar imagem da origem"],
  ["Add Destination Image", "Adicionar imagem do destino"],
  ["Change Destination Image", "Trocar imagem do destino"],
  ["Google Maps URL", "URL do Google Maps"],
  ["Content block controls", "Controles do bloco de conteúdo"],
  ["Content block width", "Largura do bloco de conteúdo"],
  ["Drag to reorder", "Arrastar para reordenar"],
  ["Move left", "Mover para a esquerda"],
  ["Move right", "Mover para a direita"],
  ["Size", "Tamanho"],
  ["Full", "Completo"],
  ["Two-thirds", "Dois terços"],
  ["Half", "Metade"],
  ["Third", "Um terço"],
  ["Colour Header", "Cabeçalho Colorido"],
  ["Insert block", "Inserir bloco"],
  ["Save as template", "Salvar como modelo"],
  ["Duplicate block", "Duplicar bloco"],
  ["Delete block", "Excluir bloco"],
  ...EDITOR_PAIRS,
  ["Change", "Trocar"],
  ["Add", "Adicionar"],
  ["Delete", "Excluir"],
  ["Move up", "Mover para cima"],
  ["Move down", "Mover para baixo"],
  ["Places", "Lugares"],
  ["Add place", "Adicionar lugar"],
  ["Add item", "Adicionar item"],
  ["Add category", "Adicionar categoria"],
  ["Add information", "Adicionar informação"],
  ["Remove information", "Remover informação"],
  ["Detail", "Detalhe"],
  ["Custom Highlight", "Destaque Personalizado"],
  ["New Table", "Nova Tabela"],
  ["Language", "Idioma"],
  ["Display options", "Opções de visualização"],
  ["Close display options", "Fechar opções de visualização"],
  ["Text size", "Tamanho do texto"],
  ["Appearance", "Aparência"],
  ["British English", "Inglês britânico"],
  ["Brazilian Portuguese", "Português brasileiro"],
];

const TO_PORTUGUESE = new Map(PAIRS);
const TO_ENGLISH = new Map([
  ...PAIRS.map(([english, portuguese]) => [portuguese, english]),
  ...LEGACY_PORTUGUESE_ALIASES,
]);
const ATTRIBUTES = ["aria-label", "title", "placeholder", "data-tooltip"];
const CANONICAL_TRANSLATION = createCanonicalTranslation(translateText);
const EDITABLE_VALUE_SELECTOR = [
  '[data-block-field]:not([type="date"]):not([type="time"]):not([type="url"])',
  "[data-amenity-group-label]",
  '[data-place-field="comment"]',
  '[data-food-field="name"]',
  '[data-food-field="comment"]',
  '[data-space-field="label"]',
  '[data-bed-field="label"]',
  '[data-generic-field="label"]',
  '[data-generic-field="value"]',
  '[data-list-property="label"]',
  '[data-list-property="value"]',
].join(",");
const EMBEDDED_PHRASES = new Set([
  "Outbound", "Return", "Ida", "Volta", "days", "dias", "legs", "trechos",
  "nights", "noites", "files", "arquivos", "file", "arquivo",
]);

export function normaliseLocale(locale) {
  return SUPPORTED_LOCALES.has(locale) ? locale : DEFAULT_LOCALE;
}

export function translateText(value, locale) {
  if (typeof value !== "string" || value.trim() === "") return value;
  const target = normaliseLocale(locale);
  const { leading, content, trailing } = splitWhitespace(value);
  return `${leading}${translateContent(content, target)}${trailing}`;
}

function translateContent(content, locale) {
  const map = locale === "pt-BR" ? TO_PORTUGUESE : TO_ENGLISH;
  const exact = map.get(content);
  if (exact) return exact;
  const dynamic = translateDynamic(content, locale);
  return dynamic === content ? translateEmbedded(content, map) : dynamic;
}

function splitWhitespace(value) {
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  return { leading, content: value.slice(leading.length, value.length - trailing.length || undefined), trailing };
}

function translateEmbedded(content, map) {
  let translated = content;
  const replacements = [...map.entries()].filter(([source]) => EMBEDDED_PHRASES.has(source));
  for (const [source, destination] of replacements) {
    const wholePhrase = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(source)}(?![\\p{L}\\p{N}_])`, "gu");
    translated = translated.replace(wholePhrase, destination);
  }
  return translated;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function translateDynamic(value, locale) {
  return locale === "en-GB" ? translateEnglishDynamic(value) : translatePortugueseDynamic(value);
}

function translateEnglishDynamic(value) {
  const removeItem = /^Remover (.+)$/.exec(value);
  if (removeItem) return `Remove ${removeItem[1]}`;
  const unavailableMapLink = /^Abrir (.+) no Google Maps — link não adicionado$/.exec(value);
  if (unavailableMapLink) return `Google Maps link not added for ${unavailableMapLink[1].replaceAll(" para ", " to ")}`;
  const unavailableWebsite = /^Abrir site de (.+) — link não adicionado$/.exec(value);
  if (unavailableWebsite) return `Website link not added for ${unavailableWebsite[1].replaceAll(" para ", " to ")}`;
  const mapLink = /^Abrir (.+) no Google Maps$/.exec(value);
  if (mapLink) return `Open ${mapLink[1].replaceAll(" para ", " to ")} in Google Maps`;
  const website = /^Abrir site de (.+)$/.exec(value);
  if (website) return `Open website for ${website[1].replaceAll(" para ", " to ")}`;
  return value;
}

function translatePortugueseDynamic(value) {
  const removeItem = /^Remove (.+)$/.exec(value);
  if (removeItem) return `Remover ${removeItem[1]}`;
  const unavailableMapLink = /^Google Maps link not added for (.+)$/.exec(value);
  if (unavailableMapLink) return `Abrir ${unavailableMapLink[1].replaceAll(" to ", " para ")} no Google Maps — link não adicionado`;
  const unavailableWebsite = /^Website link not added for (.+)$/.exec(value);
  if (unavailableWebsite) return `Abrir site de ${unavailableWebsite[1].replaceAll(" to ", " para ")} — link não adicionado`;
  const mapLink = /^Open (.+) in Google Maps$/.exec(value);
  if (mapLink) return `Abrir ${mapLink[1].replaceAll(" to ", " para ")} no Google Maps`;
  const website = /^Open website for (.+)$/.exec(value);
  if (website) return `Abrir site de ${website[1].replaceAll(" to ", " para ")}`;
  return value;
}

export function initializeLanguage({ root = document, buttons = [], onChange = () => {} } = {}) {
  let locale = readStoredLocale();
  let scheduled = false;

  const localize = () => localizeTree(root, locale);
  const select = (nextLocale, { persist = true, notify = true } = {}) => {
    const selectedLocale = normaliseLocale(nextLocale);
    const changed = locale !== selectedLocale;
    locale = selectedLocale;
    root.documentElement.lang = locale;
    root.documentElement.dataset.locale = locale;
    if (persist) writeStoredLocale(locale);
    updateLanguageButtonStates(buttons, locale);
    if (notify && changed) onChange(locale);
    localize();
  };

  for (const button of buttons) button.addEventListener("click", () => select(button.dataset.locale));

  const observer = new globalThis.MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    globalThis.queueMicrotask(() => {
      scheduled = false;
      localize();
    });
  });
  observer.observe(root.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
  select(locale, { persist: false, notify: false });

  return {
    get locale() { return locale; },
    localize,
    select,
    translate: (value) => translateText(value, locale),
    disconnect: () => observer.disconnect(),
  };
}

function localizeTree(root, locale) {
  localizeTextNodes(root, locale);
  localizeAttributes(root, locale);
  localizeEditableValues(root, locale);
  localizeMetadata(root, locale);
}

function localizeEditableValues(root, locale) {
  for (const control of root.body.querySelectorAll(EDITABLE_VALUE_SELECTOR)) {
    const translated = CANONICAL_TRANSLATION.editableValue(control, locale);
    if (translated !== control.value) control.value = translated;
  }
}

function localizeTextNodes(root, locale) {
  const walker = root.createTreeWalker(root.body, globalThis.NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    localizeTextNode(node, locale);
    node = walker.nextNode();
  }
}

function localizeTextNode(node, locale) {
  if (node.parentElement?.closest("script, style, [data-no-translate]")) return;
  const translated = CANONICAL_TRANSLATION.text(node, locale);
  if (translated !== node.nodeValue) node.nodeValue = translated;
}

function localizeAttributes(root, locale) {
  for (const element of root.body.querySelectorAll(ATTRIBUTES.map((attribute) => `[${attribute}]`).join(","))) {
    for (const attribute of ATTRIBUTES) CANONICAL_TRANSLATION.attribute(element, attribute, locale);
  }
}

function localizeMetadata(root, locale) {
  const title = root.querySelector("#destination")?.textContent.trim() || "Travel Plan";
  if (root.title !== title) root.title = title;
  const description = root.querySelector('meta[name="description"]');
  if (description) description.content = locale === "pt-BR"
    ? "Travel Plan — planejador de viagem editável"
    : "Travel Plan — an editable travel planner";
}

function readStoredLocale() {
  try {
    return normaliseLocale(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

function writeStoredLocale(locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // The selected language still works if storage is unavailable.
  }
}
