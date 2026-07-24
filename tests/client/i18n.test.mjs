import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normaliseLocale, translateText } from "../../src/client/app/i18n.js";
import { updateLanguageButtonStates } from "../../src/client/app/language-controls.js";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { MEAL_CUISINE_PAIRS } from "../../src/shared/meal-cuisines.mjs";
import { PLACE_DESCRIPTION_PAIRS } from "../../src/shared/place-descriptions.mjs";

test("uses British English as the primary language", () => {
  assert.equal(normaliseLocale(), "en-GB");
  assert.equal(normaliseLocale("en-US"), "en-GB");
});

test("language controls keep one stable active state without replacing their labels", () => {
  const buttons = [fakeLanguageButton("en-GB", "EN"), fakeLanguageButton("pt-BR", "PT")];

  updateLanguageButtonStates(buttons, "pt-BR");

  assert.equal(buttons[0].textContent, "EN");
  assert.equal(buttons[1].textContent, "PT");
  assert.equal(buttons[0].attributes["aria-pressed"], "false");
  assert.equal(buttons[1].attributes["aria-pressed"], "true");
  assert.equal(buttons[1].attributes.lang, "pt-BR");
  assert.equal(buttons[1].attributes["aria-label"], "Português brasileiro");
  assert.equal(buttons[0].classList.contains("is-active"), false);
  assert.equal(buttons[1].classList.contains("is-active"), true);
});

function fakeLanguageButton(locale, textContent) {
  const classes = new Set();
  return {
    dataset: { locale },
    textContent,
    attributes: {},
    classList: {
      toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
}

test("translates every populated place description in both directions", () => {
  for (const [, english, portuguese] of PLACE_DESCRIPTION_PAIRS) {
    assert.equal(translateText(english, "pt-BR"), portuguese);
    assert.equal(translateText(portuguese, "en-GB"), english);
  }
});

test("translates every meal cuisine in both directions", () => {
  for (const [, english, portuguese] of MEAL_CUISINE_PAIRS) {
    assert.equal(translateText(english, "pt-BR"), portuguese);
    assert.equal(translateText(portuguese, "en-GB"), english);
  }
});

test("localizes editing labels and known editable values with the active language", async () => {
  const source = await readFile("src/client/app/i18n.js", "utf8");
  assert.match(source, /const EDITABLE_VALUE_SELECTOR = \[/);
  assert.match(source, /localizeEditableValues\(root, locale\)/);
  assert.equal(translateText("Título do Dia", "en-GB"), "Day Title");
  assert.equal(translateText("Search Amenities", "pt-BR"), "Buscar Comodidades");
  assert.equal(translateText("Cabeçalho Colorido", "en-GB"), "Colour Header");
  assert.equal(translateText("Informações Essenciais da Reserva", "en-GB"), "Essential Booking Information");
  assert.equal(translateText("Endereço Exato", "en-GB"), "Exact Address");
  assert.equal(translateText("Instruções de Entrada", "en-GB"), "Entry Instructions");
  assert.equal(translateText("Contato do Anfitrião", "en-GB"), "Host Contact");
  assert.equal(translateText("Sala de Estar", "en-GB"), "Living Room");
  assert.equal(translateText("Sofá-Cama", "en-GB"), "Sofa Bed");
  assert.equal(translateText("Time Settings", "pt-BR"), "Configurações de horário");
  assert.equal(translateText("Journey Details", "pt-BR"), "Detalhes da etapa");
});

test("translates dashboard labels and imported content in both directions", () => {
  assert.equal(translateText("Hospedagem", "en-GB"), "Accommodation");
  assert.equal(translateText("Incrível Casa com Hidro e Bikes", "en-GB"), "Amazing House with Hot Tub and Bikes");
  assert.equal(translateText("2 banheiros", "en-GB"), "2 bathrooms");
  assert.equal(translateText("2 bathrooms", "pt-BR"), "2 banheiros");
  assert.equal(translateText("Listing Highlights", "pt-BR"), "Destaques do anúncio");
  assert.equal(translateText("Information", "pt-BR"), "Informação");
  assert.equal(translateText("INFORMATION", "pt-BR"), "INFORMAÇÃO");
  assert.equal(translateText("SAFETY", "pt-BR"), "SEGURANÇA");
  assert.equal(translateText("VACCINES", "pt-BR"), "VACINAS");
  assert.equal(translateText("Voltage", "en-GB"), "Voltage");
  assert.equal(translateText("Voltage", "pt-BR"), "Tensão");
  assert.equal(translateText("Volta", "en-GB"), "Inbound");
  assert.equal(translateText("Add property detail", "pt-BR"), "Adicionar detalhe da propriedade");
  assert.equal(translateText("Remove highlight group", "pt-BR"), "Remover grupo de destaques");
  assert.equal(translateText("Amenities", "pt-BR"), "Comodidades");
  assert.equal(translateText("Kitchen", "pt-BR"), "Cozinha");
  assert.equal(translateText("Sleep and Laundry", "pt-BR"), "Quartos e lavanderia");
  assert.equal(translateText("Bath and Spa", "pt-BR"), "Banho e spa");
  assert.equal(translateText("Home Comforts", "pt-BR"), "Confortos da casa");
  assert.equal(translateText("Work and Play", "pt-BR"), "Trabalho e lazer");
  assert.equal(translateText("Outdoor Living", "pt-BR"), "Vida ao ar livre");
  assert.equal(translateText("Cable and satellite TV", "pt-BR"), "TV a cabo e via satélite");
  assert.equal(translateText("Coffee and tea station", "pt-BR"), "Estação de café e chá");
  assert.equal(translateText("Bed linens and wardrobes", "pt-BR"), "Roupas de cama e armários");
  assert.equal(translateText("Nome da Hospedagem", "en-GB"), "Accommodation Name");
  assert.equal(translateText("Controles do lugar", "en-GB"), "Place controls");
  assert.equal(translateText("+ Adicionar Refeição", "en-GB"), "+ Add Meal");
  assert.equal(translateText("Remove Card", "pt-BR"), "Remover cartão");
  assert.equal(translateText("Add card", "pt-BR"), "Adicionar cartão");
  assert.equal(translateText("Adicionar cartão", "en-GB"), "Add card");
  assert.equal(translateText("Remove hero banner", "pt-BR"), "Remover banner principal");
  assert.equal(translateText("Adicionar banner principal", "en-GB"), "Add hero banner");
  assert.equal(translateText("Colour Header", "pt-BR"), "Cabeçalho Colorido");
  assert.equal(translateText("Remover Fully equipped kitchen", "en-GB"), "Remove Fully equipped kitchen");
  assert.equal(translateText("Dedicated workspace", "pt-BR"), "Espaço de trabalho");
  assert.equal(translateText("Video games", "pt-BR"), "Videogames");
  assert.equal(translateText("Fully equipped kitchen", "pt-BR"), "Cozinha completa");
  assert.equal(translateText("Forno, cooktop e micro-ondas", "en-GB"), "Oven, stovetop & microwave");
  assert.equal(translateText("Courtyard, garden & landmark views", "pt-BR"), "Vistas para o pátio, jardim e pontos turísticos");
  assert.equal(translateText("Cafeteira e máquina de chá", "en-GB"), "Coffee and tea maker");
  assert.equal(translateText("Outbound · Saturday, 24 Oct", "pt-BR"), "Ida · Saturday, 24 Oct");
  assert.equal(translateText("Itinerary", "pt-BR"), "Itinerário");
  assert.equal(translateText("Itinerário", "en-GB"), "Itinerary");
  assert.equal(translateText("Transit", "pt-BR"), "Transporte");
  assert.equal(translateText("Plug", "pt-BR"), "Tomada");
  assert.equal(translateText("Itinerary dates", "pt-BR"), "Datas do roteiro");
  assert.equal(translateText("Agenda dates", "pt-BR"), "Datas da agenda");
  assert.equal(translateText("Agenda", "pt-BR"), "Agenda");
  assert.equal(translateText("Our Next Adventure", "pt-BR"), "Nossa próxima aventura");
  assert.equal(translateText("Subtitle", "pt-BR"), "Subtítulo");
  assert.equal(translateText("Trip title", "pt-BR"), "Título da viagem");
  assert.equal(translateText("Cidade, estado ou país", "en-GB"), "City, state or country");
  assert.equal(translateText("Flight number", "pt-BR"), "Número do voo");
  assert.equal(translateText("Modelo da aeronave", "en-GB"), "Aircraft type");
  assert.equal(translateText("Seat(s)", "pt-BR"), "Assento(s)");
  assert.equal(translateText("Assento(s)", "en-GB"), "Seat(s)");
  assert.equal(translateText("Add notes", "pt-BR"), "Adicionar observações");
  assert.equal(translateText("Remover observações", "en-GB"), "Remove notes");
  assert.equal(translateText("Layover duration", "pt-BR"), "Duração da escala");
  assert.equal(translateText("Troca de avião no aeroporto da escala", "en-GB"), "Change planes at layover airport");
  assert.equal(translateText("Layover city", "pt-BR"), "Cidade da escala");
  assert.equal(translateText("Nossa próxima aventura", "en-GB"), "Our Next Adventure");
  assert.equal(translateText("Colour palette", "pt-BR"), "Paleta de cores");
  assert.equal(translateText("Font options", "pt-BR"), "Opções de fonte");
  assert.equal(translateText("Abrir opções de fonte", "en-GB"), "Open font options");
  assert.equal(translateText("Escolha uma paleta", "en-GB"), "Choose a palette");
  assert.equal(translateText("Coral, Olive & Teal", "pt-BR"), "Coral, oliva e azul-petróleo");
  assert.equal(translateText("Periwinkle Dream", "pt-BR"), "Sonho pervinca");
  assert.equal(translateText("Custom Palette", "pt-BR"), "Paleta personalizada");
  assert.equal(translateText("Colour 5 hex", "pt-BR"), "Hex da cor 5");
  assert.equal(translateText("Salvar paleta personalizada", "en-GB"), "Save custom palette");
  assert.equal(translateText("Lagoa fresca", "en-GB"), "Fresh Lagoon");
  assert.equal(translateText("Sunset Glow", "pt-BR"), "Brilho do pôr do sol");
  assert.equal(translateText("Verde e azul", "en-GB"), "Green & Blue");
  assert.equal(translateText("Travel Plan", "pt-BR"), "Travel Plan");
  assert.equal(translateText("Holidays", "pt-BR"), "Holidays");
  assert.equal(translateText("Dudu & Ale", "pt-BR"), "Dudu & Ale");
  assert.equal(translateText("Place(s)", "pt-BR"), "Lugar(es)");
  assert.equal(translateText("Meals", "pt-BR"), "Refeições");
  assert.equal(translateText("Refeições", "en-GB"), "Meals");
  assert.equal(translateText("Meal(s)", "pt-BR"), "Refeição(ões)");
  assert.equal(translateText("Refeição(ões)", "en-GB"), "Meal(s)");
  assert.equal(translateText("Nenhuma refeição planejada.", "en-GB"), "No meals planned.");
  assert.equal(translateText("No meals planned.", "pt-BR"), "Nenhuma refeição planejada.");
  assert.equal(translateText("Gramado Picks", "pt-BR"), "Dicas de Gramado");
  assert.equal(translateText("Dicas de Gramado", "en-GB"), "Gramado Picks");
  assert.equal(translateText("Other Places", "pt-BR"), "Outros lugares");
  assert.equal(translateText("Outros Lugares", "en-GB"), "Other Places");
  assert.equal(translateText("Other Places of Interest", "pt-BR"), "Outros lugares de interesse");
  assert.equal(translateText("Outros lugares de interesse", "en-GB"), "Other Places of Interest");
  assert.equal(translateText("Restaurants", "pt-BR"), "Restaurantes");
  assert.equal(translateText("Restaurants and Landmarks", "pt-BR"), "Restaurantes e pontos turísticos");
  assert.equal(translateText("Restaurantes e pontos turísticos", "en-GB"), "Restaurants and Landmarks");
  assert.equal(translateText("Remove card title", "pt-BR"), "Remover título do cartão");
  assert.equal(translateText("Add restaurant", "pt-BR"), "Adicionar restaurante");
  assert.equal(translateText("Add landmark", "pt-BR"), "Adicionar ponto turístico");
  assert.equal(translateText("Add place", "pt-BR"), "Adicionar lugar");
  assert.equal(translateText("Other", "pt-BR"), "Outros");
  assert.equal(translateText("Outros", "en-GB"), "Other");
  assert.equal(translateText("Landmarks", "pt-BR"), "Pontos turísticos");
  assert.equal(translateText("+ Add Place", "pt-BR"), "+ Adicionar lugar");
  assert.equal(translateText("Display options", "pt-BR"), "Opções de visualização");
  assert.equal(translateText("Close display options", "pt-BR"), "Fechar opções de visualização");
  assert.equal(translateText("Text size", "pt-BR"), "Tamanho do texto");
  assert.equal(translateText("Aparência", "en-GB"), "Appearance");
  assert.equal(translateText("Arrastar para reordenar", "en-GB"), "Drag to reorder");
  assert.equal(translateText("Tamanho", "en-GB"), "Size");
  assert.equal(translateText("Adicionar imagem da origem", "en-GB"), "Add Origin Image");
  assert.equal(translateText("URL do Google Maps", "en-GB"), "Google Maps URL");
  assert.equal(translateText("De carro", "en-GB"), "Driving");
  assert.equal(translateText("De bicicleta", "en-GB"), "Cycling");
  assert.equal(translateText("A pé", "en-GB"), "Walking");
  assert.equal(translateText("Driving", "pt-BR"), "De carro");
  assert.equal(translateText("Brazil's only covered themed water park, combining warm thermal pools, slides, wave areas and attractions for all ages.", "pt-BR"), "O único parque aquático temático coberto do Brasil, com piscinas termais, toboáguas, áreas de ondas e atrações para todas as idades.");
  assert.equal(translateText("Burgers, hot dogs & pizza", "pt-BR"), "Hambúrgueres, cachorros-quentes e pizza");
  assert.equal(translateText("Cycling", "pt-BR"), "De bicicleta");
  assert.equal(translateText("Walking", "pt-BR"), "A pé");
  assert.equal(translateText("Média", "en-GB"), "Medium");
  assert.equal(translateText("Medium", "pt-BR"), "Média");
  assert.equal(translateText("High priority", "pt-BR"), "Prioridade alta");
  assert.equal(translateText("Prioridade média", "en-GB"), "Medium priority");
  assert.equal(translateText("Abrir Snowland no Google Maps — link não adicionado", "en-GB"), "Google Maps link not added for Snowland");
  assert.equal(translateText("Website link not added for Snowland", "pt-BR"), "Abrir site de Snowland — link não adicionado");
});

test("uses Brazilian Portuguese sentence case while accepting legacy title case", () => {
  assert.equal(translateText("Entire Holiday Home", "pt-BR"), "Casa de férias inteira");
  assert.equal(translateText("Breakfast Meal Option", "pt-BR"), "Opção de café da manhã");
  assert.equal(translateText("Travel Essentials", "pt-BR"), "Itens essenciais de viagem");
  assert.equal(translateText("Café da Manhã Opção de Refeição", "en-GB"), "Breakfast Meal Option");
  assert.equal(translateText("Itens Essenciais de Viagem", "en-GB"), "Travel Essentials");
});

test("keeps every amenity punchy, single-line and paired with Portuguese copy", () => {
  const amenities = createDefaultDocument().sections.stay
    .find((block) => block.type === "stay-amenities")
    .data.groups.flatMap((group) => group.items);

  assert.equal(amenities.length, 24);
  for (const amenity of amenities) {
    const portuguese = translateText(amenity.label, "pt-BR");
    assert.notEqual(portuguese, amenity.label, `${amenity.presetId} needs a Portuguese translation`);
    assert.ok(amenity.label.length <= 26, `${amenity.presetId} needs shorter English copy`);
    assert.ok(portuguese.length <= 29, `${amenity.presetId} needs shorter Portuguese copy`);
  }
});
