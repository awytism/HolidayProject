export const MEAL_CUISINE_PAIRS = Object.freeze([
  ["Casa do Sol", "Home cooking", "Comida caseira"],
  ["Acquamotion", "Burgers, hot dogs & pizza", "Hambúrgueres, cachorros-quentes e pizza"],
  ["Josephina Café & Restaurante", "Brazilian", "Brasileira"],
  ["Restaurante Höppner", "German", "Alemã"],
  ["BOSKO PIZZERIA Napoletana", "Neapolitan pizza", "Pizza napolitana"],
  ["Le Jardin Parque de Lavanda", "Italian & café", "Italiana e cafeteria"],
  ["Lumni Experience", "Italian & burgers", "Italiana e hambúrgueres"],
  ["Resto Bar Black Lake", "Italian & steakhouse", "Italiana e churrascaria"],
  ["Toro Gramado", "Steakhouse & burgers", "Churrascaria e hambúrgueres"],
  ["Snowland", "Pizza, burgers & café", "Pizza, hambúrgueres e cafeteria"],
  ["Restaurant La Table D´Or Méditerranée", "Mediterranean & French", "Mediterrânea e francesa"],
  ["Edelweiss", "Fondue", "Fondue"],
  ["São Pedro Casa de Pães e Café", "Bakery & café", "Padaria e cafeteria"],
  ["Cantina Pastasciutta", "Italian", "Italiana"],
  ["Garden Park Gramado", "Pizza, sandwiches & café", "Pizza, sanduíches e cafeteria"],
  ["Prawer Chocolates", "Chocolate & desserts", "Chocolates e sobremesas"],
  ["La Birra Cervejaria", "Pub food", "Comida de pub"],
]);

const CUISINES = new Map(MEAL_CUISINE_PAIRS.map(([name, english]) => [normaliseName(name), english]));

export function mealCuisineDescription(name) {
  if (isHouse(name)) return CUISINES.get(normaliseName("Casa do Sol"));
  return CUISINES.get(normaliseName(name)) ?? "";
}

function isHouse(name) {
  const normalised = normaliseName(name).replace(/[\uFE0E\uFE0F]/g, "");
  return normalised === "casa do sol" || normalised === "casa sol da serra" || normalised.startsWith("🏠");
}

function normaliseName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-GB");
}
